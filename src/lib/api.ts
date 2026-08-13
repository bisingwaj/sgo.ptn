/**
 * PTN-RDC · Client de l'API de gouvernance.
 *
 * Le jeton d'accès est gardé en mémoire (jamais dans localStorage : il
 * serait lisible par tout script injecté). Seul le jeton de
 * rafraîchissement est persisté, afin de survivre à un rechargement de
 * page.
 *
 * En production, ce jeton de rafraîchissement devra migrer vers un cookie
 * `httpOnly` + `SameSite=Strict`, avec protection CSRF côté serveur.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";
const REFRESH_STORAGE_KEY = "ptn-rdc.refreshToken";

let accessToken: string | null = null;

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export function getAccessToken(): string | null {
  return accessToken;
}

export function setRefreshToken(token: string | null): void {
  try {
    if (token) window.localStorage.setItem(REFRESH_STORAGE_KEY, token);
    else window.localStorage.removeItem(REFRESH_STORAGE_KEY);
  } catch {
    // localStorage indisponible (mode privé)
  }
}

export function getRefreshToken(): string | null {
  try {
    return window.localStorage.getItem(REFRESH_STORAGE_KEY);
  } catch {
    return null;
  }
}

/**
 * Notification d'expiration de session.
 *
 * Déclenchée quand une requête est refusée et que le rafraîchissement
 * échoue : le jeton de rafraîchissement est expiré, révoqué, ou
 * l'habilitation a été retirée. `AuthContext` s'y abonne pour vider la
 * session et ramener à l'écran de connexion — sans quoi l'utilisateur
 * resterait sur une interface qui ne répond plus.
 */
type SessionExpiredHandler = () => void;
let sessionExpiredHandler: SessionExpiredHandler | null = null;

export function setSessionExpiredHandler(handler: SessionExpiredHandler | null): void {
  sessionExpiredHandler = handler;
}

/** Règle métier renvoyée par les garde-fous du backend. */
export interface Guardrail {
  code: string;
  message: string;
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly blockers: Guardrail[] = [],
    readonly warnings: Guardrail[] = [],
  ) {
    super(message);
    this.name = "ApiError";
  }
}

interface ApiPayload {
  message?: string | string[];
  blockers?: Guardrail[];
  warnings?: Guardrail[];
}

async function parseError(response: Response): Promise<ApiError> {
  let payload: ApiPayload = {};
  try {
    payload = (await response.json()) as ApiPayload;
  } catch {
    // Réponse sans corps JSON
  }
  const message = Array.isArray(payload.message)
    ? payload.message.join(" · ")
    : (payload.message ?? `Erreur ${response.status}`);

  return new ApiError(message, response.status, payload.blockers ?? [], payload.warnings ?? []);
}

interface RequestOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  /** Empêche la tentative de rafraîchissement automatique (évite la boucle) */
  skipRefresh?: boolean;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { body, skipRefresh, headers, ...rest } = options;

  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...rest,
      headers: {
        "Content-Type": "application/json",
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        ...headers,
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
  } catch {
    // `fetch` ne rejette que sur une panne réseau : serveur arrêté, DNS,
    // CORS. Distinguer ce cas d'une erreur métier évite d'afficher un
    // « Failed to fetch » brut à l'utilisateur.
    throw new ApiError(
      `Service injoignable à l'adresse ${API_BASE}. Vérifiez que l'API est démarrée.`,
      0,
    );
  }

  // Jeton d'accès expiré : une tentative de rafraîchissement, puis rejeu.
  if (response.status === 401 && !skipRefresh) {
    // `hadSession` distingue une session qui s'éteint d'un simple échec
    // de connexion : sans ce test, un mot de passe erroné sur /auth/login
    // déclencherait une « expiration de session » inexistante.
    const hadSession = accessToken !== null;
    const renewed = await tryRefresh();
    if (renewed) {
      return request<T>(path, { ...options, skipRefresh: true });
    }
    if (hadSession) {
      setAccessToken(null);
      setRefreshToken(null);
      sessionExpiredHandler?.();
    }
  }

  if (!response.ok) throw await parseError(response);
  if (response.status === 204) return undefined as T;

  return (await response.json()) as T;
}

async function tryRefresh(): Promise<boolean> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;

  try {
    const response = await fetch(`${API_BASE}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });
    if (!response.ok) {
      setRefreshToken(null);
      setAccessToken(null);
      return false;
    }
    const tokens = (await response.json()) as { accessToken: string; refreshToken: string };
    setAccessToken(tokens.accessToken);
    setRefreshToken(tokens.refreshToken);
    return true;
  } catch {
    return false;
  }
}

export const api = {
  get: <T>(path: string) => request<T>(path, { method: "GET" }),
  post: <T>(path: string, body?: unknown) => request<T>(path, { method: "POST", body }),
  refresh: tryRefresh,
};

// ============================================================
// Types partagés avec le backend
// ============================================================

export type ProfileKeyApi =
  | "UGP"
  | "MDA"
  | "PARTENAIRE"
  | "BAILLEUR"
  | "SOUMISSIONNAIRE"
  | "SBP"
  | "AUDITEUR"
  | "GOUVERNANCE";

export type UserStatusApi = "INVITE" | "ACTIF" | "SUSPENDU" | "EXPIRE" | "ARCHIVE";

export interface SessionUser {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  mustChangePassword: boolean;
  onboardingCompleted: boolean;
  assignmentId: string;
  profile: ProfileKeyApi;
  subroleCode: string;
  subroleLabel: string;
  organisationId: string;
  organisationCode: string;
  organisationName: string;
  componentCode: string | null;
  provinceCode: string | null;
  permissions: string[];
}

export interface AssignmentSummary {
  id: string;
  profile: string;
  subroleLabel: string;
  organisationName: string;
  isPrimary: boolean;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
  user: SessionUser;
  availableAssignments: AssignmentSummary[];
}

export interface SubroleApi {
  id: string;
  code: string;
  label: string;
  isUnique: boolean;
  isSensitive: boolean;
  requiresComponent: boolean;
  requiresMission: boolean;
  incompatibleWith: string[];
  permissionCount: number;
}

export interface ProfileApi {
  key: ProfileKeyApi;
  label: string;
  short: string;
  readOnly: boolean;
  /** Ce que le profil ne peut pas faire — énoncé explicitement */
  restrictions: string[];
  subroles: SubroleApi[];
}

export interface PermissionApi {
  code: string;
  label: string;
  category: string;
  isWrite: boolean;
  isSensitive: boolean;
}

export interface EngagementsResponse {
  codeOfConductSignedAt: string;
  coiDeclaredAt: string;
  dataPrivacyAckAt: string;
  onboardingCompletedAt: string;
}

export interface FamilyApi {
  key: "UGP_GOUV" | "BAILLEURS" | "BENEFICIAIRES" | "CONTROLE";
  label: string;
  hint: string;
  profiles: ProfileApi[];
}

export interface OrganisationApi {
  id: string;
  code: string;
  name: string;
  fullName: string;
  type: string;
  provinceCode: string | null;
  kycLevel: number;
}

export interface ProvinceApi {
  code: string;
  label: string;
  isPriorityCpf: boolean;
}

export interface ComponentApi {
  code: string;
  label: string;
  shortLabel: string;
  totalUsdM: string;
  idaUsdM: string;
  afdUsdM: string;
  reconciliation: string | null;
}

export interface CreateAccountPayload {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  preferredLanguage?: string;
  profile: ProfileKeyApi;
  subroleCode: string;
  organisationId: string;
  componentCode?: string;
  provinceCode?: string;
  missionRef?: string;
  validUntil?: string;
  justification?: string;
  isPrimary?: boolean;
}

export interface GuardrailReport {
  blockers: Guardrail[];
  warnings: Guardrail[];
}

export interface CreateAccountResponse {
  user: { id: string; email: string; firstName: string; lastName: string; status: UserStatusApi };
  assignment: { id: string; subroleCode: string; subroleLabel: string };
  temporaryPassword: string;
  temporaryPasswordExpiresAt: string;
  warnings: Guardrail[];
}

export interface AccountListItem {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  status: UserStatusApi;
  lastLoginAt: string | null;
  createdAt: string;
  mustChangePassword: boolean;
  assignments: Array<{
    id: string;
    profile: ProfileKeyApi;
    isPrimary: boolean;
    validUntil: string | null;
    missionRef: string | null;
    subrole: { code: string; label: string; isSensitive: boolean };
    organisation: { code: string; name: string };
  }>;
}

export interface AccountListResponse {
  total: number;
  page: number;
  pageSize: number;
  items: AccountListItem[];
}

export interface AssignmentDetail {
  id: string;
  profile: ProfileKeyApi;
  status: "ACTIVE" | "SUSPENDED" | "EXPIRED" | "REVOKED";
  isPrimary: boolean;
  componentCode: string | null;
  provinceCode: string | null;
  missionRef: string | null;
  validFrom: string;
  validUntil: string | null;
  justification: string | null;
  createdAt: string;
  revokedAt: string | null;
  revokeReason: string | null;
  subrole: { code: string; label: string; isSensitive: boolean; isUnique: boolean };
  organisation: { code: string; name: string; fullName: string };
  grantedBy: { firstName: string; lastName: string; email: string } | null;
}

export interface AccountDetail {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  preferredLanguage: string;
  status: UserStatusApi;
  mustChangePassword: boolean;
  tempPasswordExpiresAt: string | null;
  lastLoginAt: string | null;
  codeOfConductSignedAt: string | null;
  coiDeclaredAt: string | null;
  onboardingCompletedAt: string | null;
  createdAt: string;
  createdBy: { firstName: string; lastName: string; email: string } | null;
  assignments: AssignmentDetail[];
}

export interface AddAssignmentPayload {
  profile: ProfileKeyApi;
  subroleCode: string;
  organisationId: string;
  componentCode?: string;
  provinceCode?: string;
  missionRef?: string;
  validUntil?: string;
  justification?: string;
  isPrimary?: boolean;
}

// ============================================================
// Points d'entrée
// ============================================================

export type FamilyKey = "UGP_GOUV" | "BAILLEURS" | "BENEFICIAIRES" | "CONTROLE";

export const authApi = {
  /**
   * `family` détermine l'habilitation activée pour la session : une même
   * personne peut en détenir plusieurs, dans des familles différentes.
   * L'API refuse la connexion si le compte n'en détient aucune dans la
   * famille demandée.
   */
  login: (email: string, password: string, family?: FamilyKey) =>
    api.post<LoginResponse>("/auth/login", { email, password, family }),
  me: () => api.get<{ user: SessionUser; availableAssignments: AssignmentSummary[] }>("/auth/me"),
  changePassword: (currentPassword: string, newPassword: string) =>
    api.post<void>("/auth/change-password", { currentPassword, newPassword }),
  logout: (refreshToken: string) => api.post<void>("/auth/logout", { refreshToken }),
  switchAssignment: (assignmentId: string) =>
    api.post<LoginResponse>("/auth/switch-assignment", { assignmentId }),
  signEngagements: () =>
    api.post<EngagementsResponse>("/auth/engagements", {
      codeOfConduct: true,
      coi: true,
      dataPrivacy: true,
    }),
  updatePreferences: (data: { phone?: string; preferredLanguage?: string }) =>
    api.post<{ phone: string | null; preferredLanguage: string }>("/auth/preferences", data),
};

export const referentielApi = {
  familles: () => api.get<FamilyApi[]>("/referentiel/profils"),
  organisations: () => api.get<OrganisationApi[]>("/referentiel/organisations"),
  provinces: () => api.get<ProvinceApi[]>("/referentiel/provinces"),
  composantes: () => api.get<ComponentApi[]>("/referentiel/composantes"),
  permissions: () => api.get<PermissionApi[]>("/referentiel/permissions"),
};

export const accountsApi = {
  verify: (payload: CreateAccountPayload) =>
    api.post<GuardrailReport>("/admin/comptes/verifier", payload),
  create: (payload: CreateAccountPayload) =>
    api.post<CreateAccountResponse>("/admin/comptes", payload),
  list: (params: { profile?: string; status?: string; search?: string; page?: number }) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== "") query.set(key, String(value));
    });
    const suffix = query.toString();
    return api.get<AccountListResponse>(`/admin/comptes${suffix ? `?${suffix}` : ""}`);
  },
  get: (id: string) => api.get<AccountDetail>(`/admin/comptes/${id}`),
  dormants: () => api.get<AccountListItem[]>("/admin/comptes/dormants"),

  resetPassword: (id: string) =>
    api.post<{ temporaryPassword: string; expiresInHours: number }>(
      `/admin/comptes/${id}/reinitialiser-mot-de-passe`,
    ),
  suspend: (id: string, reason: string) =>
    api.post<{ id: string; status: UserStatusApi }>(`/admin/comptes/${id}/suspendre`, { reason }),
  reactivate: (id: string) =>
    api.post<{ id: string; status: UserStatusApi }>(`/admin/comptes/${id}/reactiver`),
  archive: (id: string, reason: string) =>
    api.post<{ id: string; status: UserStatusApi }>(`/admin/comptes/${id}/archiver`, { reason }),

  // --- Habilitations d'un compte existant ---
  checkAssignment: (id: string, payload: AddAssignmentPayload) =>
    api.post<GuardrailReport>(`/admin/comptes/${id}/habilitations/verifier`, payload),
  addAssignment: (id: string, payload: AddAssignmentPayload) =>
    api.post<{ assignment: { id: string; subroleCode: string; subroleLabel: string }; warnings: Guardrail[] }>(
      `/admin/comptes/${id}/habilitations`,
      payload,
    ),
  revokeAssignment: (id: string, assignmentId: string, reason: string) =>
    api.post<{ id: string; status: string }>(
      `/admin/comptes/${id}/habilitations/${assignmentId}/revoquer`,
      { reason },
    ),
};

// ============================================================
// Référentiel TDR et PTBA
// ============================================================

export type TemplateStatusApi = "BROUILLON" | "PUBLIE" | "ARCHIVE";
export type LibraryKind = "clauses" | "indicateurs" | "risques";

export interface TdrTypeApi {
  code: string;
  slug: string;
  name: string;
  family: number;
  familyLabel: string;
  defaultMethodCode: string | null;
  defaultMethod: { code: string; label: string } | null;
  allowedOrigins: string[];
  stepCount: number;
  requiresPges: boolean;
  isActive: boolean;
  /** Gabarit de contexte, marqueurs {{ptbaCode}} et {{ptbaTitle}} à substituer */
  contextTemplate: string | null;
  /** Convention de dénomination du marché, mêmes marqueurs */
  titleTemplate: string | null;
}

export interface ThresholdApi {
  id: string;
  category: string;
  minUsd: string | null;
  maxUsd: string | null;
  reviewType: "PRIOR" | "POST";
  note: string | null;
}

export interface MethodApi {
  code: string;
  label: string;
  category: string;
  description: string | null;
  isException: boolean;
  isActive: boolean;
  thresholds: ThresholdApi[];
}

interface TemplateBase {
  id: string;
  familyKey: string;
  version: number;
  tdrTypeCode: string | null;
  label: string;
  status: TemplateStatusApi;
  effectiveFrom: string | null;
  supersededAt: string | null;
  createdAt: string;
}

export interface ClauseApi extends TemplateBase {
  category: "REG" | "TECH" | "CONF" | "SAFE" | "GOV";
  text: string;
}
export interface IndicatorApi extends TemplateBase {
  measure: string;
  target: string;
}
export interface RiskApi extends TemplateBase {
  description: string;
  mitigation: string;
  level: "FAIBLE" | "MODERE" | "SUBSTANTIEL" | "ELEVE";
}
export type LibraryEntry = ClauseApi | IndicatorApi | RiskApi;

export interface PtbaYearApi {
  id: string;
  year: number;
  label: string;
  status: "BROUILLON" | "VALIDE" | "CLOS";
  validatedAt: string | null;
  _count?: { activities: number };
}

export interface PtbaActivityApi {
  id: string;
  code: string;
  title: string;
  componentCode: string;
  subComponent: string | null;
  envelopeUsd: string;
  idaUsd: string | null;
  afdUsd: string | null;
  provinceCode: string | null;
  component?: { code: string; shortLabel: string };
  province?: { code: string; label: string } | null;
}

export const tdrReferentielApi = {
  types: () => api.get<TdrTypeApi[]>("/referentiel-tdr/types"),
  methods: () => api.get<MethodApi[]>("/referentiel-tdr/methodes"),
  resolveMethod: (categorie: string, montantUsd: number) =>
    api.get<{
      method: { code: string; label: string };
      reviewType: "PRIOR" | "POST";
      note: string | null;
      threshold: { minUsd: number | null; maxUsd: number | null };
    } | null>(`/referentiel-tdr/methode-applicable?categorie=${categorie}&montantUsd=${montantUsd}`),

  library: (kind: LibraryKind, params: { type?: string; status?: TemplateStatusApi } = {}) => {
    const q = new URLSearchParams();
    if (params.type) q.set("type", params.type);
    if (params.status) q.set("status", params.status);
    const suffix = q.toString();
    return api.get<LibraryEntry[]>(`/referentiel-tdr/bibliotheque/${kind}${suffix ? `?${suffix}` : ""}`);
  },
  history: (kind: LibraryKind, familyKey: string) =>
    api.get<LibraryEntry[]>(
      `/referentiel-tdr/bibliotheque/${kind}/historique/${encodeURIComponent(familyKey)}`,
    ),
  draftClause: (payload: Record<string, unknown>, familyKey?: string) =>
    api.post<ClauseApi>(
      `/referentiel-tdr/bibliotheque/clauses${familyKey ? `?familyKey=${encodeURIComponent(familyKey)}` : ""}`,
      payload,
    ),
  publish: (kind: LibraryKind, id: string) =>
    api.post<LibraryEntry>(`/referentiel-tdr/bibliotheque/${kind}/${id}/publier`),
  archive: (kind: LibraryKind, id: string) =>
    api.post<{ id: string; status: string }>(`/referentiel-tdr/bibliotheque/${kind}/${id}/archiver`),
};

export const ptbaApi = {
  years: () => api.get<PtbaYearApi[]>("/ptba/exercices"),
  activities: (year: number) =>
    api.get<{ year: PtbaYearApi; activities: PtbaActivityApi[]; totalUsd: number }>(
      `/ptba/exercices/${year}/activites`,
    ),
  createActivity: (year: number, payload: Record<string, unknown>) =>
    api.post<PtbaActivityApi>(`/ptba/exercices/${year}/activites`, payload),
  deactivate: (id: string) => api.post<{ id: string }>(`/ptba/activites/${id}/retirer`),
};


// ============================================================
// Termes de référence
// ============================================================

export type TdrStatusApi =
  | "BROUILLON" | "SOUMIS_UGP" | "REVUE_UGP" | "RETOURNE"
  | "VALIDE_UGP" | "ANO_EN_COURS" | "ANO_OBTENU" | "ANO_REFUSE" | "ARCHIVE";

export interface TdrObjectiveApi { title: string; criteria: string }
export interface TdrDeliverableApi { title: string; format?: string | null; deadline?: string | null }
export interface TdrClauseApi {
  sourceFamilyKey?: string | null;
  sourceVersion?: number | null;
  category: "REG" | "TECH" | "CONF" | "SAFE" | "GOV";
  label: string;
  text: string;
}
export interface TdrIndicatorApi { sourceFamilyKey?: string | null; label: string; measure: string; target: string }
export interface TdrRiskApi {
  sourceFamilyKey?: string | null;
  label: string;
  description: string;
  mitigation: string;
  level: "FAIBLE" | "MODERE" | "SUBSTANTIEL" | "ELEVE";
}

export interface TdrApi {
  id: string;
  reference: string;
  title: string;
  status: TdrStatusApi;
  origin: string;
  tdrTypeCode: string;
  tdrType?: { code: string; name: string; requiresPges: boolean; stepCount: number };
  ptbaActivityId: string | null;
  ptbaActivity?: { code: string; title: string; envelopeUsd: string; componentCode: string } | null;
  beneficiaryOrganisationId: string | null;
  beneficiaryOrganisation?: { code: string; name: string; fullName: string } | null;
  context: string | null;
  justification: string | null;
  beneficiaries: string | null;
  approach: string | null;
  methodology: string | null;
  constraints: string | null;
  startDate: string | null;
  durationMonths: number | null;
  provinceCode: string | null;
  expertise: string | null;
  keyProfiles: string[];
  budgetTotalUsd: string | null;
  budgetIdaUsd: string | null;
  budgetAfdUsd: string | null;
  budgetGovUsd: string | null;
  procurementMethodCode: string | null;
  reviewType: "PRIOR" | "POST" | null;
  esCategory: "FAIBLE" | "MODERE" | "SUBSTANTIEL" | "ELEVE" | null;
  esRisks: string[];
  objectives: TdrObjectiveApi[];
  deliverables: TdrDeliverableApi[];
  clauses: TdrClauseApi[];
  indicators: TdrIndicatorApi[];
  risks: TdrRiskApi[];
}

export const tdrApi = {
  list: (statut?: string) => api.get<TdrApi[]>(`/tdr${statut ? `?statut=${statut}` : ""}`),
  get: (id: string) => api.get<TdrApi>(`/tdr/${id}`),
  completeness: (id: string) =>
    api.get<{ blockers: string[]; warnings: string[] }>(`/tdr/${id}/completude`),
  createDraft: (payload: { tdrTypeCode: string; title: string; ptbaActivityId?: string }) =>
    api.post<TdrApi>("/tdr", payload),
  update: (id: string, patch: Record<string, unknown>) =>
    request<TdrApi>(`/tdr/${id}`, { method: "PUT", body: patch }),
  submit: (id: string) => api.post<TdrApi>(`/tdr/${id}/soumettre`),

  /**
   * Assistance rédactionnelle. Renvoie une proposition : rien n'est
   * enregistré tant que l'auteur ne l'a pas reprise. Répond 503 si aucune
   * clé n'est configurée côté serveur — le parcours reste utilisable.
   */
  assistContext: (id: string) =>
    api.post<{ proposal: string; model: string; groundedOn: string[] }>(
      `/tdr/${id}/assistance/contexte`,
    ),
  assistJustification: (id: string) =>
    api.post<{
      proposal: string;
      model: string;
      groundedOn: string[];
      mode: "redaction" | "reprise";
    }>(`/tdr/${id}/assistance/justification`),
  assistObjectives: (id: string) =>
    api.post<{
      proposal: Array<{ title: string; criteria: string }>;
      model: string;
      groundedOn: string[];
    }>(`/tdr/${id}/assistance/objectifs`),
};
