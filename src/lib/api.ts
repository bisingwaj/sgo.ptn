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

  const response = await fetch(`${API_BASE}${path}`, {
    ...rest,
    headers: {
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...headers,
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });

  // Jeton d'accès expiré : une tentative de rafraîchissement, puis rejeu.
  if (response.status === 401 && !skipRefresh) {
    const renewed = await tryRefresh();
    if (renewed) {
      return request<T>(path, { ...options, skipRefresh: true });
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
  subroles: SubroleApi[];
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

// ============================================================
// Points d'entrée
// ============================================================

export const authApi = {
  login: (email: string, password: string) =>
    api.post<LoginResponse>("/auth/login", { email, password }),
  me: () => api.get<{ user: SessionUser; availableAssignments: AssignmentSummary[] }>("/auth/me"),
  changePassword: (currentPassword: string, newPassword: string) =>
    api.post<void>("/auth/change-password", { currentPassword, newPassword }),
  logout: (refreshToken: string) => api.post<void>("/auth/logout", { refreshToken }),
  switchAssignment: (assignmentId: string) =>
    api.post<LoginResponse>("/auth/switch-assignment", { assignmentId }),
};

export const referentielApi = {
  familles: () => api.get<FamilyApi[]>("/referentiel/profils"),
  organisations: () => api.get<OrganisationApi[]>("/referentiel/organisations"),
  provinces: () => api.get<ProvinceApi[]>("/referentiel/provinces"),
  composantes: () => api.get<ComponentApi[]>("/referentiel/composantes"),
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
  resetPassword: (id: string) =>
    api.post<{ temporaryPassword: string; expiresInHours: number }>(
      `/admin/comptes/${id}/reinitialiser-mot-de-passe`,
    ),
  suspend: (id: string, reason: string) =>
    api.post<{ id: string; status: UserStatusApi }>(`/admin/comptes/${id}/suspendre`, { reason }),
  reactivate: (id: string) =>
    api.post<{ id: string; status: UserStatusApi }>(`/admin/comptes/${id}/reactiver`),
};
