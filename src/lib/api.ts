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

import { texteEnv } from "./env";

const API_BASE = texteEnv(process.env.NEXT_PUBLIC_API_URL, "http://localhost:3333/api");
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
  return new ApiError(
    messageLisible(payload.message, response.status),
    response.status,
    payload.blockers ?? [],
    payload.warnings ?? [],
  );
}

/**
 * Le message qu'un agent public peut lire.
 *
 * Trois origines se mêlent dans la réponse d'erreur du serveur, et elles
 * n'ont pas la même valeur pour celui qui la lit.
 *
 * UN TABLEAU ne vient jamais d'une décision métier : c'est le contrôle de
 * saisie de la plateforme. Il écrit en anglais et nomme les colonnes de la
 * base — « firstName must be a string », « property x should not exist ».
 * Une quinzaine d'écrans réaffichent ce texte tel quel ; on ne garde donc
 * que les phrases rédigées à la main, qui sont en français, et les
 * tournures automatiques partent au journal.
 *
 * UNE CHAÎNE a été écrite par quelqu'un, en français, et dit quoi faire :
 * « L'exercice 2026 est clos. » On la relaie mot pour mot — la remplacer par
 * une paraphrase priverait le lecteur du seul motif qui lui permette d'agir.
 * Seule exception, le libellé que la plateforme émet d'elle-même sur une
 * panne interne, unique texte anglais qu'elle produise.
 *
 * RIEN DU TOUT, enfin : un code de réponse ne dit rien à un agent et ne lui
 * indique aucune suite. Il part au journal, où l'exploitant le cherchera.
 */
function messageLisible(brut: string | string[] | undefined, status: number): string {
  const GENERIQUE =
    "Le service n’a pas pu traiter cette demande. Réessayez dans un instant ; si cela persiste, signalez-le à votre administrateur en précisant l’heure et l’écran concerné.";

  // Les tournures de la bibliothèque de validation, reconnaissables à ces
  // deux verbes anglais qu'aucun message français du projet n'emploie.
  const AUTOMATIQUE = /\b(must|should)\b/i;

  if (Array.isArray(brut)) {
    const redigees = brut.filter((m) => !AUTOMATIQUE.test(m));
    if (redigees.length < brut.length) {
      console.error("[api] contrôle de saisie refusé :", brut);
    }
    return redigees.length > 0
      ? redigees.join(" · ")
      : "Certaines informations saisies n’ont pas été acceptées. Reprenez le formulaire et vérifiez les champs renseignés avant de le renvoyer.";
  }

  if (brut && brut !== "Internal server error") return brut;

  console.error(`[api] réponse ${status} sans message exploitable`);
  return GENERIQUE;
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
    // Le message ne nomme ni adresse, ni port, ni service à redémarrer :
    // celui qui le lit est un agent public, pas un exploitant. Il ne peut
    // rien faire d'une adresse technique, et la lui montrer donne le
    // sentiment d'une panne qui lui incombe. Ce qu'il peut faire : attendre
    // et réessayer, signaler si cela dure. L'adresse reste à la console.
    console.error(`[api] service injoignable à ${API_BASE}`);
    throw new ApiError(
      "Le service est momentanément indisponible. Réessayez dans un instant ; si cela persiste, signalez-le à votre administrateur.",
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

/**
 * Requête dont la réponse est un FICHIER, non du JSON.
 *
 * Doublon assumé de `request` sur le rafraîchissement du jeton : un lien
 * `<a href>` ne peut pas porter d'en-tête `Authorization`, et les documents
 * contractuels sont derrière une permission. Il faut donc les chercher en
 * `fetch`, puis fabriquer une URL d'objet — c'est le seul chemin qui
 * conserve l'habilitation.
 *
 * Le corps n'étant lisible qu'une fois, il n'est pas mutualisé avec
 * `request` : celui-ci lirait du JSON là où il y a un PDF.
 */
async function requestBlob(path: string, skipRefresh = false): Promise<Blob> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      method: "GET",
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
    });
  } catch {
    throw new ApiError(
      `Service injoignable à l'adresse ${API_BASE}. Vérifiez que l'API est démarrée.`,
      0,
    );
  }

  if (response.status === 401 && !skipRefresh) {
    const hadSession = accessToken !== null;
    if (await tryRefresh()) return requestBlob(path, true);
    if (hadSession) {
      setAccessToken(null);
      setRefreshToken(null);
      sessionExpiredHandler?.();
    }
  }

  if (!response.ok) throw await parseError(response);
  return response.blob();
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

/**
 * Récupère un fichier protégé.
 *
 * Le jeton d'accès vit en mémoire, jamais dans un cookie : ni un lien nu ni
 * une balise `<img>` ne peuvent le porter, et la route répondrait 401. Tout
 * fichier du dossier passe donc par ici.
 */
/**
 * L'adresse locale d'une pièce, pour l'afficher.
 *
 * Distincte de l'enregistrement sur disque à dessein : celui-ci révoque
 * l'URL sitôt le téléchargement engagé, et une vignette bâtie dessus
 * deviendrait blanche. Ici l'adresse est rendue à l'appelant, à qui il
 * revient de la révoquer au démontage.
 *
 * Passe par `requestBlob`, comme le document : une pièce est derrière la
 * même permission, et une vignette ne doit pas être le seul appel du
 * dossier à ignorer la rotation du jeton.
 */
export async function apercuDePiece(tdrId: string, pieceId: string): Promise<string> {
  return URL.createObjectURL(await requestBlob(`/tdr/${tdrId}/pieces/${pieceId}`));
}

export const api = {
  get: <T>(path: string) => request<T>(path, { method: "GET" }),
  post: <T>(path: string, body?: unknown) => request<T>(path, { method: "POST", body }),
  put: <T>(path: string, body?: unknown) => request<T>(path, { method: "PUT", body }),
  del: <T>(path: string) => request<T>(path, { method: "DELETE" }),
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
  /** Catégorie de passation, ou null si le type n'en relève pas */
  procurementCategory: string | null;
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

/** Ce qu'une activité porte en propre, saisi avec elle au plan. */
export interface PtbaObjectiveApi { title: string; criteria: string | null }
export interface PtbaDeliverableApi { title: string; format: string | null; deadline: string | null }
export interface PtbaIndicatorApi { label: string; measure: string | null; target: string | null }
export interface PtbaRiskApi {
  label: string;
  description: string | null;
  mitigation: string | null;
  level: "FAIBLE" | "MODERE" | "SUBSTANTIEL" | "ELEVE" | null;
}
export interface PtbaClauseApi { label: string; text: string | null }

export interface PtbaActivityApi {
  id: string;
  code: string;
  title: string;
  componentCode: string;
  subComponent: string | null;
  envelopeUsd: string;
  idaUsd: string | null;
  afdUsd: string | null;
  /**
   * Couverture géographique. Liste vide = couverture nationale, et c'est
   * une valeur, non une absence.
   */
  provinces?: Array<{ province: { code: string; label: string } }>;
  component?: { code: string; shortLabel: string };
  objectives?: PtbaObjectiveApi[];
  deliverables?: PtbaDeliverableApi[];
  indicators?: PtbaIndicatorApi[];
  risks?: PtbaRiskApi[];
  clauses?: PtbaClauseApi[];
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

/**
 * Allocation annuelle d'une composante, avec ce qu'elle borne.
 *
 * `allocationUsd` à `null` signifie « pas encore arrêtée » — distinct de
 * zéro, qui veut dire « rien sur cet exercice », comme la CERC.
 *
 * Tous les montants sont des USD entiers : l'API transporte des données,
 * l'interface en fait la présentation.
 */
export interface PtbaAllocationRowApi {
  componentCode: string;
  label: string;
  shortLabel: string;
  reconciliation: string | null;
  /** Dotation de projet du MEP, 2025-2029 */
  projectCeilingUsd: number;
  /** Cumul des allocations de cette composante, tous exercices confondus */
  allocatedAllYearsUsd: number;
  allocationUsd: number | null;
  idaUsd: number | null;
  afdUsd: number | null;
  note: string | null;
  /** Ce que le plan de l'exercice engage déjà sur cette composante */
  plannedUsd: number;
  activityCount: number;
}

/** Fiche d'activité : l'activité, son exercice, et les TDR qui en découlent. */
export interface PtbaActivityDetailApi extends PtbaActivityApi {
  component?: { code: string; shortLabel: string; label: string };
  ptbaYear: { year: number; label: string; status: PtbaYearApi["status"]; validatedAt: string | null };
  tdrs: Array<{
    id: string;
    reference: string;
    title: string;
    status: TdrStatusApi;
    updatedAt: string;
  }>;
}

export const ptbaApi = {
  years: () => api.get<PtbaYearApi[]>("/ptba/exercices"),

  /**
   * Ouvrir un exercice budgétaire.
   *
   * L'acte n'existait nulle part : l'exercice 2026 venait du peuplement de
   * la base, et l'arrivée de 2027 aurait demandé une intervention en base
   * de données. L'intitulé est facultatif — le serveur en compose un.
   */
  openYear: (year: number, label?: string) =>
    api.post<PtbaYearApi>("/ptba/exercices", { year, ...(label ? { label } : {}) }),
  activity: (id: string) => api.get<PtbaActivityDetailApi>(`/ptba/activites/${id}`),
  allocations: (year: number) =>
    api.get<{ year: PtbaYearApi; rows: PtbaAllocationRowApi[] }>(
      `/ptba/exercices/${year}/allocations`,
    ),
  setAllocation: (year: number, payload: Record<string, unknown>) =>
    api.put<unknown>(`/ptba/exercices/${year}/allocations`, payload),
  activities: (year: number) =>
    api.get<{ year: PtbaYearApi; activities: PtbaActivityApi[]; totalUsd: number }>(
      `/ptba/exercices/${year}/activites`,
    ),
  createActivity: (year: number, payload: Record<string, unknown>) =>
    api.post<PtbaActivityApi>(`/ptba/exercices/${year}/activites`, payload),
  updateActivity: (id: string, payload: Record<string, unknown>) =>
    api.put<PtbaActivityApi>(`/ptba/activites/${id}`, payload),
  /** Le motif est exigé par le service : il est consigné au journal d'audit. */
  deactivate: (id: string, motif: string) =>
    api.post<{ id: string }>(`/ptba/activites/${id}/retirer`, { motif }),
  validateYear: (year: number) => api.post<PtbaYearApi>(`/ptba/exercices/${year}/valider`),
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

/**
 * Ce que la ligne du plan porte déjà, du point de vue d'un dossier.
 *
 * Montants en USD entiers — ce sont des dotations budgétaires, jamais des
 * écritures au centime. `idaUsd` / `afdUsd` sont la ventilation ARRÊTÉE AU
 * PLAN pour l'activité : une référence, pas une règle imposée au marché.
 */
export interface TdrEnvelopeApi {
  activityCode: string;
  activityTitle: string;
  envelopeUsd: number;
  idaUsd: number | null;
  afdUsd: number | null;
  /** Cumul des autres dossiers visant cette ligne, brouillons compris. */
  engagedUsd: number;
  otherCount: number;
  remainingUsd: number;
}

/**
 * Le document, tel que le serveur le compose — avant d'en fabriquer un
 * fichier.
 *
 * Un seul plan pour trois rendus : le PDF, le DOCX, et la page qui
 * s'affiche et s'imprime. Les trois doivent dire la même chose, faute de
 * quoi deux versions d'une pièce contractuelle circuleraient en se
 * contredisant. Aucun modèle n'intervient dans sa composition.
 *
 * `absent` n'est pas une section vide : c'est le vide DIT. Un relecteur
 * doit voir ce qui manque, pas une section muette.
 */
export type BlocDocumentApi =
  /** Nomme une partie dans une section — voir `document-plan.ts` côté serveur. */
  | { genre: "sousTitre"; texte: string }
  | { genre: "paragraphe"; texte: string }
  | { genre: "liste"; entrees: string[] }
  | { genre: "definitions"; lignes: Array<{ cle: string; valeur: string }> }
  | { genre: "absent"; mention: string };

export interface SectionDocumentApi {
  numero: string;
  titre: string;
  blocs: BlocDocumentApi[];
}

export interface PlanDocumentApi {
  reference: string;
  titre: string;
  typeCode: string;
  typeNom: string;
  organisation: string;
  statut: string;
  /** Date de composition, déjà en toutes lettres : c'est le serveur qui date. */
  dateComposition: string;
  entete: Array<{ cle: string; valeur: string }>;
  sections: SectionDocumentApi[];
  /** Champs auxquels l'assistant a contribué — déclarés en tête du document. */
  champsAssistes: string[];
  /** Qui a rédigé, et sous quelle entité. */
  auteur: { nom: string; entite: string } | null;
  /** Engagements de l'auteur, horodatés par le serveur. `date` nulle = non portée. */
  attestations: Array<{ intitule: string; date: string | null }>;
  /** Intitulés des pièces versées au dossier. */
  annexes: string[];
}

/**
 * Identification institutionnelle de la page de garde.
 *
 * Reprise telle quelle du composeur serveur (`document-plan.ts`) : l'écran
 * et le fichier doivent porter le même en-tête, sans quoi deux versions
 * d'une pièce contractuelle circuleraient.
 */
export const EN_TETE_INSTITUTIONNEL = [
  "RÉPUBLIQUE DÉMOCRATIQUE DU CONGO",
  "Ministère des Postes, Télécommunications et Numérique",
  "Unité de Gestion du Projet de Transformation Numérique",
] as const;

export const PROJET_DOCUMENT = {
  intitule: "Projet de Transformation Numérique de la République Démocratique du Congo",
  sigle: "PTN-RDC",
  code: "P180495",
} as const;

export interface TdrApi {
  id: string;
  reference: string;
  title: string;
  status: TdrStatusApi;
  /**
   * L'auteur du dossier. Le serveur le sert depuis toujours ; le type ne
   * le déclarait pas, si bien que l'écran de détail tenait pour auteur
   * QUICONQUE était connecté. Le bouton « Supprimer » s'affichait alors à
   * tout le monde, pour échouer en 403 au clic.
   */
  authorId: string;
  origin: string;
  tdrTypeCode: string;
  tdrType?: { code: string; name: string; requiresPges: boolean; stepCount: number };
  ptbaActivityId: string | null;
  ptbaActivity?: { code: string; title: string; envelopeUsd: string; componentCode: string } | null;
  beneficiaryOrganisationId: string | null;
  expectedResults: string | null;
  effortDays: number | null;
  deliverableFormat: string | null;
  reportingRhythm: string | null;
  beneficiaryOrganisation?: { code: string; name: string; fullName: string } | null;
  context: string | null;
  justification: string | null;
  beneficiaries: string | null;
  approach: string | null;
  methodology: string | null;
  constraints: string | null;
  startDate: string | null;
  durationMonths: number | null;
  /** Couverture géographique — plusieurs provinces possibles */
  provinces: Array<{ provinceCode: string; province: { code: string; label: string; isPriorityCpf: boolean } }>;
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
  /** Champs auxquels l'assistant a contribué */
  aiAssistedFields: string[];
  objectives: TdrObjectiveApi[];
  deliverables: TdrDeliverableApi[];
  clauses: TdrClauseApi[];
  indicators: TdrIndicatorApi[];
  risks: TdrRiskApi[];
}

/** Ligne de la liste des TDR — l'API renvoie le document entier, la liste
 *  n'en consomme que l'en-tête. */
export interface TdrListItem {
  id: string;
  reference: string;
  title: string;
  status: TdrStatusApi;
  /** Voir `TdrApi.authorId` : seul l'auteur supprime son brouillon. */
  authorId: string;
  origin: string;
  tdrTypeCode: string;
  budgetTotalUsd: string | null;
  procurementMethodCode: string | null;
  reviewType: "PRIOR" | "POST" | null;
  updatedAt: string;
  submittedAt: string | null;
  tdrType: { code: string; name: string };
  ptbaActivity: { code: string; componentCode: string } | null;
  organisation: { code: string; name: string };
}

/** Une pièce apportée au dossier, vue du rédacteur. */
export interface PieceJointeApi {
  id: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  uploadedAt: string;
  /** L'assistant lit-il cette pièce, ou la garde-t-on à l'archive seulement ? */
  lisibleParAssistant: boolean;
}

/**
 * Ce que l'assistance sait faire sur ce serveur.
 *
 * Lu au fournisseur, non codé en dur : l'écran n'a pas à connaître les
 * modèles ni leurs modalités. Il rend ce que le serveur lui dit — et
 * change de comportement quand la configuration change, sans redéploiement.
 */
export interface CapacitesIa {
  modele: string;
  intitule?: string;
  image: boolean;
  fichier: boolean;
  outils: boolean;
  contexte?: number;
  /** Vrai si les pièces jointes sont réellement soumises au modèle. */
  pieces: boolean;
  configuree: boolean;
  indetermine: boolean;
  /** Dit à l'auteur POURQUOI, en français. À afficher tel quel. */
  motifPiecesFermees?: string;
}

export const aiApi = {
  capacites: () => api.get<CapacitesIa>("/ai/capacites"),
};

export const tdrApi = {
  list: (statut?: string) =>
    api.get<TdrListItem[]>(`/tdr${statut ? `?statut=${statut}` : ""}`),
  get: (id: string) => api.get<TdrApi>(`/tdr/${id}`),
  remove: (id: string) =>
    api.del<{ id: string; reference: string }>(`/tdr/${id}`),
  completeness: (id: string) =>
    api.get<{ blockers: string[]; warnings: string[] }>(`/tdr/${id}/completude`),
  /**
   * Situation de l'enveloppe de la ligne du plan.
   *
   * `null` quand le dossier n'est rattaché à aucune activité. Le cumul des
   * autres dossiers n'est pas calculable côté navigateur : la liste des TDR
   * est restreinte à l'organisation de l'appelant.
   */
  envelope: (id: string) => api.get<TdrEnvelopeApi | null>(`/tdr/${id}/enveloppe`),
  /** Les pièces apportées au dossier */
  pieces: (id: string) => api.get<PieceJointeApi[]>(`/tdr/${id}/pieces`),
  /**
   * Verse une pièce. Passe par `fetch` sans en-tête de type : le navigateur
   * doit poser lui-même la frontière du multipart, qu'on ne peut pas deviner.
   */
  verserPiece: async (id: string, fichier: File): Promise<PieceJointeApi> => {
    const corps = new FormData();
    corps.append("fichier", fichier);
    const reponse = await fetch(`${API_BASE}/tdr/${id}/pieces`, {
      method: "POST",
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
      body: corps,
    });
    if (!reponse.ok) throw await parseError(reponse);
    return (await reponse.json()) as PieceJointeApi;
  },
  retirerPiece: (id: string, pieceId: string) =>
    api.del<{ id: string }>(`/tdr/${id}/pieces/${pieceId}`),

  /** Le contenu du document, pour l'afficher et l'imprimer sans produire de fichier. */
  planDocument: (id: string) => api.get<PlanDocumentApi>(`/tdr/${id}/document/apercu`),

  /**
   * Le document composé. Chaque appel est journalisé côté serveur : une
   * pièce contractuelle doit pouvoir être rattachée à qui l'a produite.
   */
  fichierDocument: (id: string, format: "pdf" | "docx" = "pdf") =>
    requestBlob(`/tdr/${id}/document${format === "docx" ? "?format=docx" : ""}`),

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
  /**
   * Assistance sur un champ de texte quelconque.
   *
   * Point d'entrée unique : le registre du backend porte la nature de chaque
   * champ. Les montants et les dates sont refusés par le service — ils se
   * dictent, ils ne se proposent pas.
   */
  assistField: (id: string, champ: string) =>
    api.post<{
      proposal: string;
      model: string;
      groundedOn: string[];
      mode?: "redaction" | "reprise";
    }>(`/tdr/${id}/assistance/champ`, { champ }),
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
  assistDeliverables: (id: string) =>
    api.post<{
      proposal: Array<{ title: string; format: string; deadline: string }>;
      model: string;
      groundedOn: string[];
    }>(`/tdr/${id}/assistance/livrables`),
};

// ============================================================
// Instruction des dossiers transmis — la revue de l'UGP
// ============================================================

/**
 * Une ligne de la file d'instruction.
 *
 * Le serveur ne sert que des données : montants en unités entières, dates
 * ISO, statuts en codes. Les libellés et les formats sont l'affaire de
 * l'écran.
 */
export interface DossierAInstruire {
  id: string;
  reference: string;
  title: string;
  status: TdrStatusApi;
  submittedAt: string | null;
  methodCode: string | null;
  reviewType: "PRIOR" | "POST" | null;
  budgetTotalUsd: number | null;
  organisation: string | null;
  ptbaCode: string | null;
  componentCode: string | null;
  marche: { id: string; status: string } | null;
}

/**
 * Les actes de la revue.
 *
 * Ils existaient côté serveur depuis leur écriture, et aucun écran ne les
 * appelait : un TDR pouvait être transmis, et plus rien après. La chaîne
 * s'arrêtait là.
 */
/** Nature d'un document de référence, telle que le serveur la connaît. */
export type NatureDocumentApi =
  | "MEP" | "PPSD" | "PLAN_PASSATION" | "CGES" | "CPR" | "PMPP" | "PGMO"
  | "PEES" | "PPA" | "REGLEMENT_BAILLEUR" | "ACCORD_FINANCEMENT" | "MANUEL"
  | "PROCES_VERBAL" | "AUTRE";

/** Une pièce du corpus documentaire du projet. */
export interface DocumentReferenceApi {
  id: string;
  titre: string;
  nature: NatureDocumentApi;
  resume: string | null;
  version: string | null;
  effectiveFrom: string | null;
  supersededAt: string | null;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  isActive: boolean;
  uploadedAt: string;
  /** Le format se prête-t-il à une lecture par l'assistant ? */
  lisibleParAssistant: boolean;
  formatLisible: string;
  /** Ni futur, ni remplacé, ni retiré. */
  enVigueur: boolean;
}

/**
 * Le corpus documentaire du projet.
 *
 * C'est ce que l'assistant consulte quand une question porte sur ce que le
 * projet PRESCRIT — le MEP, le PPSD, un plan de passation. Il y va avant
 * d'aller sur internet : ces pièces font autorité, une page trouvée en
 * ligne non.
 */
export const documentsApi = {
  lister: (inactifs = false) =>
    api.get<{ rows: DocumentReferenceApi[] }>(
      `/documents${inactifs ? "?inactifs=true" : ""}`,
    ),

  /**
   * Dépose un document.
   *
   * `FormData` sans en-tête de type : le navigateur pose lui-même la
   * frontière multipart, et la fixer à la main la rendrait fausse.
   */
  deposer: async (
    fichier: File,
    champs: {
      titre: string;
      nature: NatureDocumentApi;
      resume?: string;
      version?: string;
      effectiveFrom?: string;
    },
  ): Promise<DocumentReferenceApi> => {
    const corps = new FormData();
    corps.append("fichier", fichier);
    corps.append("titre", champs.titre);
    corps.append("nature", champs.nature);
    if (champs.resume) corps.append("resume", champs.resume);
    if (champs.version) corps.append("version", champs.version);
    if (champs.effectiveFrom) corps.append("effectiveFrom", champs.effectiveFrom);
    // `fetch` direct, non le passeur générique : celui-ci sérialise son
    // corps en JSON et impose l'en-tête correspondant, ce qui détruirait
    // le multipart. Même raison que pour le versement d'une pièce jointe.
    const reponse = await fetch(`${API_BASE}/documents`, {
      method: "POST",
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
      body: corps,
    });
    if (!reponse.ok) throw await parseError(reponse);
    return (await reponse.json()) as DocumentReferenceApi;
  },

  retirer: (id: string) =>
    api.post<{ id: string; titre: string; retire: boolean }>(
      `/documents/${id}/retirer`,
    ),

  /**
   * Le fichier lui-même.
   *
   * En `Blob` plutôt qu'une adresse : le document est derrière une
   * permission, et un `<a href>` nu ne porte pas d'en-tête `Authorization`.
   */
  fichier: (id: string) => requestBlob(`/documents/${id}/fichier`),
};

export const passationApi = {
  aInstruire: () => api.get<DossierAInstruire[]>("/passation/a-instruire"),
  ouvrirRevue: (id: string) =>
    api.post<{ id: string; reference: string; status: string }>(`/tdr/${id}/revue`),
  retourner: (id: string, motif: string) =>
    api.post<{ id: string; reference: string; status: string }>(`/tdr/${id}/retourner`, {
      motif,
    }),
  valider: (id: string) =>
    api.post<{ id: string; reference: string; marcheId: string }>(`/tdr/${id}/valider`),

  /**
   * La demande de non-objection.
   *
   * Elle porte sur le MARCHÉ, non sur le TDR : c'est le dossier d'appel
   * d'offres qui part au bailleur. Aucun corps de requête — le bailleur
   * saisi se déduit de la ventilation du financement, côté serveur.
   */
  demanderAno: (marcheId: string) =>
    api.post<{ id: string; reference: string; donor: string; decision: string }>(
      `/marches/${marcheId}/ano`,
    ),

  anosEnCours: () => api.get<AnoEnCours[]>("/anos/en-cours"),

  deciderAno: (anoId: string, decision: AnoDecisionApi, motif?: string) =>
    api.post<{ id: string; reference: string; decision: AnoDecisionApi }>(
      `/anos/${anoId}/decision`,
      { decision, ...(motif ? { motif } : {}) },
    ),

  publier: (marcheId: string, avis: AvisAPublier) =>
    api.post<{ id: string; reference: string; cloture: string }>(
      `/marches/${marcheId}/publier`,
      avis,
    ),
};

export type AnoDecisionApi = "NON_OBJECTION" | "REFUS" | "DEMANDE_MODIFICATION";

/** Une demande en attente, vue du bailleur qui doit trancher. */
export interface AnoEnCours {
  id: string;
  reference: string;
  objet: string;
  objetRef: string;
  donor: string;
  submittedAt: string;
  /** Fin du délai de service : 14 jours BM, 21 jours AFD. */
  dueAt: string;
  delaiJours: number;
  marcheId: string | null;
  methodCode: string | null;
  reviewType: "PRIOR" | "POST" | null;
  tdrId: string | null;
  title: string | null;
  budgetTotalUsd: number | null;
  budgetIdaUsd: number | null;
  budgetAfdUsd: number | null;
  ptbaCode: string | null;
  componentCode: string | null;
  organisation: string | null;
}

/** Ce qu'un avis dit au candidat. Le reste vient du marché. */
export interface AvisAPublier {
  objet?: string;
  resume: string;
  qualifications?: string[];
  joursDeDepot?: number;
}

// ============================================================
// Marketplace — les avis publiés, et les offres du candidat
// ============================================================

/** Suites données à une offre, côté serveur. */
export type SoumissionStatusApi =
  | "BROUILLON"
  | "DEPOSEE"
  | "IRRECEVABLE"
  | "RECEVABLE"
  | "ATTRIBUTAIRE"
  | "ECARTEE";

/**
 * Un avis d'appel d'offres.
 *
 * Aucun score de pertinence : l'écran en affichait un, présenté comme
 * calculé depuis le KYC et l'historique du candidat. Rien de tout cela
 * n'existe, et un nombre fabriqué orienterait une décision commerciale.
 */
export interface AvisApi {
  id: string;
  /** Référence de publication — AOI-2026-004 */
  reference: string;
  objet: string;
  resume: string;
  qualifications: string[];
  publishedAt: string;
  closingAt: string;
  /** Référence du marché, reprise de son TDR */
  marcheReference: string;
  methodCode: string;
  methodLabel: string;
  estimatedUsd: number;
  tdrTypeCode: string;
  esCategory: string | null;
  componentCode: string | null;
  componentLabel: string | null;
  ptbaCode: string | null;
  /** Renseigné si votre organisation a déjà déposé sur cet avis */
  maSoumission: SoumissionStatusApi | null;
}

export interface AvisDetailApi extends Omit<AvisApi, "maSoumission"> {
  openingNote: string | null;
  maSoumission: {
    id: string;
    reference: string;
    status: SoumissionStatusApi;
    montantUsd: number | null;
    submittedAt: string | null;
  } | null;
}

export interface MaSoumissionApi {
  id: string;
  reference: string;
  status: SoumissionStatusApi;
  montantUsd: number | null;
  submittedAt: string | null;
  avis: {
    id: string;
    reference: string;
    objet: string;
    closingAt: string;
    methodCode: string;
    marcheStatus: string;
  };
}

export const marketplaceApi = {
  /** Les avis ouverts. `clos` y ajoute ceux dont la date limite est passée. */
  avis: (clos?: boolean) => api.get<AvisApi[]>(`/marketplace/avis${clos ? "?clos=1" : ""}`),
  detail: (id: string) => api.get<AvisDetailApi>(`/marketplace/avis/${id}`),
  /** Bornées à votre organisation : les offres concurrentes ne sortent jamais. */
  mesSoumissions: () => api.get<MaSoumissionApi[]>("/marketplace/mes-soumissions"),
  deposer: (avisId: string, corps: { montantUsd: number; note?: string }) =>
    api.post<{ id: string; reference: string; status: SoumissionStatusApi; submittedAt: string }>(
      `/marketplace/avis/${avisId}/soumission`,
      corps,
    ),
};
