"use client";

/**
 * AuthContext — session réelle adossée à l'API.
 *
 * Remplace progressivement le sélecteur de profil en localStorage, qui
 * ne portait aucune identité vérifiée. Le profil actif découle désormais
 * de l'habilitation accordée par un administrateur, pas d'un choix de
 * l'utilisateur dans un menu.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import {
  authApi,
  getRefreshToken,
  setAccessToken,
  setRefreshToken,
  type AssignmentSummary,
  type LoginResponse,
  type ProfileKeyApi,
  type SessionUser,
} from "@/lib/api";
import { useProfile } from "@/components/profile/ProfileContext";
import type { ProfileKey } from "@/lib/profiles";

/** Les profils de l'API sont en majuscules ; ceux du design system en minuscules. */
const PROFILE_MAP: Record<ProfileKeyApi, ProfileKey> = {
  UGP: "ugp",
  MDA: "mda",
  PARTENAIRE: "partenaire",
  BAILLEUR: "bailleur",
  SOUMISSIONNAIRE: "soumissionnaire",
  SBP: "sbp",
  AUDITEUR: "auditeur",
  GOUVERNANCE: "gouvernance",
};

export function toProfileKey(profile: ProfileKeyApi): ProfileKey {
  return PROFILE_MAP[profile];
}

interface AuthContextValue {
  user: SessionUser | null;
  assignments: AssignmentSummary[];
  /** true tant que la session initiale n'a pas été résolue */
  loading: boolean;
  login: (email: string, password: string) => Promise<LoginResponse>;
  logout: () => Promise<void>;
  changePassword: (current: string, next: string) => Promise<void>;
  switchAssignment: (assignmentId: string) => Promise<void>;
  /** Vérifie une permission de l'affectation active */
  can: (permission: string) => boolean;
}

const Ctx = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { setProfile } = useProfile();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [assignments, setAssignments] = useState<AssignmentSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const applySession = useCallback(
    (session: { user: SessionUser; availableAssignments: AssignmentSummary[] }) => {
      setUser(session.user);
      setAssignments(session.availableAssignments);
      setProfile(toProfileKey(session.user.profile));
    },
    [setProfile],
  );

  // Restauration de session au chargement, via le jeton de rafraîchissement.
  useEffect(() => {
    let cancelled = false;

    async function restore() {
      if (!getRefreshToken()) {
        setLoading(false);
        return;
      }
      try {
        const { api } = await import("@/lib/api");
        const renewed = await api.refresh();
        if (!renewed || cancelled) {
          setLoading(false);
          return;
        }
        const session = await authApi.me();
        if (!cancelled) applySession(session);
      } catch {
        setAccessToken(null);
        setRefreshToken(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void restore();
    return () => {
      cancelled = true;
    };
  }, [applySession]);

  const login = useCallback(
    async (email: string, password: string) => {
      const result = await authApi.login(email, password);
      setAccessToken(result.accessToken);
      setRefreshToken(result.refreshToken);
      applySession(result);
      return result;
    },
    [applySession],
  );

  const logout = useCallback(async () => {
    const refreshToken = getRefreshToken();
    try {
      if (refreshToken) await authApi.logout(refreshToken);
    } catch {
      // La session locale est close quoi qu'il arrive.
    }
    setAccessToken(null);
    setRefreshToken(null);
    setUser(null);
    setAssignments([]);
    router.push("/login");
  }, [router]);

  const changePassword = useCallback(
    async (current: string, next: string) => {
      await authApi.changePassword(current, next);
      // Le changement de mot de passe révoque les sessions : on rejoue
      // une connexion avec le nouveau mot de passe.
      if (user) {
        const result = await authApi.login(user.email, next);
        setAccessToken(result.accessToken);
        setRefreshToken(result.refreshToken);
        applySession(result);
      }
    },
    [user, applySession],
  );

  const switchAssignment = useCallback(
    async (assignmentId: string) => {
      const result = await authApi.switchAssignment(assignmentId);
      setAccessToken(result.accessToken);
      setRefreshToken(result.refreshToken);
      applySession(result);
    },
    [applySession],
  );

  const can = useCallback(
    (permission: string) => user?.permissions.includes(permission) ?? false,
    [user],
  );

  const value = useMemo<AuthContextValue>(
    () => ({ user, assignments, loading, login, logout, changePassword, switchAssignment, can }),
    [user, assignments, loading, login, logout, changePassword, switchAssignment, can],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth doit être utilisé dans un <AuthProvider>");
  return ctx;
}
