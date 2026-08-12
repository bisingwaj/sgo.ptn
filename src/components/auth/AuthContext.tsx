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
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import {
  authApi,
  getRefreshToken,
  setAccessToken,
  setRefreshToken,
  setSessionExpiredHandler,
  type AssignmentSummary,
  type LoginResponse,
  type ProfileKeyApi,
  type SessionUser,
} from "@/lib/api";
import { useProfile } from "@/components/profile/ProfileContext";
import type { ProfileKey } from "@/lib/profiles";
import styles from "./AuthContext.module.scss";

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

/**
 * Déconnexion automatique par inactivité.
 *
 * Doit rester aligné sur `SESSION_IDLE_TIMEOUT` côté backend, qui porte
 * l'application réelle : ici c'est le confort d'usage — retour immédiat et
 * message explicite — là-bas c'est la contrainte, non contournable.
 *
 * Une plateforme portant des habilitations fiduciaires et l'accès au canal
 * confidentiel EAS/HS ne peut pas laisser une session ouverte sur un poste
 * abandonné.
 */
const IDLE_MINUTES = Number(process.env.NEXT_PUBLIC_SESSION_IDLE_MINUTES ?? 30);
const IDLE_MS = IDLE_MINUTES * 60_000;
const WARNING_BEFORE_MS = 2 * 60_000;

/**
 * Seuls les gestes délibérés comptent comme activité. `mousemove` en est
 * volontairement exclu : un curseur bousculé par une vibration suffirait
 * à maintenir une session ouverte indéfiniment. `scroll` est retenu pour
 * que la lecture d'un long document ne soit pas interrompue.
 */
const ACTIVITY_EVENTS = ["mousedown", "keydown", "scroll", "touchstart", "pointerdown"] as const;

interface AuthContextValue {
  user: SessionUser | null;
  assignments: AssignmentSummary[];
  /** true tant que la session initiale n'a pas été résolue */
  loading: boolean;
  login: (email: string, password: string) => Promise<LoginResponse>;
  logout: (reason?: "inactivite") => Promise<void>;
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
  const [idleWarningSeconds, setIdleWarningSeconds] = useState<number | null>(null);
  const lastActivityRef = useRef(Date.now());

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

  const logout = useCallback(
    async (reason?: "inactivite") => {
      const refreshToken = getRefreshToken();
      try {
        // Révoque le jeton côté serveur : sans cela, il resterait valable
        // jusqu'à son expiration naturelle.
        if (refreshToken) await authApi.logout(refreshToken);
      } catch {
        // API injoignable ou jeton déjà révoqué : la session locale est
        // close quoi qu'il arrive.
      }
      setAccessToken(null);
      setRefreshToken(null);
      setUser(null);
      setAssignments([]);
      setIdleWarningSeconds(null);
      router.push(reason ? `/login?session=${reason}` : "/login");
    },
    [router],
  );

  // Surveillance de l'inactivité. Un intervalle d'une seconde compare
  // l'horodatage de la dernière action, plutôt que de réarmer un minuteur
  // à chaque événement — moins de travail sur des flux comme le défilement.
  useEffect(() => {
    if (!user) return;

    const registerActivity = () => {
      lastActivityRef.current = Date.now();
      setIdleWarningSeconds((current) => (current === null ? null : null));
    };

    ACTIVITY_EVENTS.forEach((event) =>
      window.addEventListener(event, registerActivity, { passive: true }),
    );

    const interval = window.setInterval(() => {
      const idleFor = Date.now() - lastActivityRef.current;
      if (idleFor >= IDLE_MS) {
        void logout("inactivite");
      } else if (idleFor >= IDLE_MS - WARNING_BEFORE_MS) {
        setIdleWarningSeconds(Math.ceil((IDLE_MS - idleFor) / 1000));
      }
    }, 1000);

    return () => {
      ACTIVITY_EVENTS.forEach((event) => window.removeEventListener(event, registerActivity));
      window.clearInterval(interval);
    };
  }, [user, logout]);

  // Session éteinte côté serveur (jeton expiré, habilitation révoquée,
  // compte suspendu) : on vide l'état local et on ramène à la connexion.
  useEffect(() => {
    setSessionExpiredHandler(() => {
      setUser(null);
      setAssignments([]);
      router.push("/login?session=expiree");
    });
    return () => setSessionExpiredHandler(null);
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

  return (
    <Ctx.Provider value={value}>
      {children}
      {idleWarningSeconds !== null && user && (
        <IdleWarning
          seconds={idleWarningSeconds}
          onStay={() => {
            lastActivityRef.current = Date.now();
            setIdleWarningSeconds(null);
          }}
          onLogout={() => void logout("inactivite")}
        />
      )}
    </Ctx.Provider>
  );
}

/**
 * Avertissement avant déconnexion automatique.
 *
 * Prévenir plutôt que déconnecter sans crier gare : quelqu'un qui rédige
 * un TDR depuis vingt minutes sans cliquer doit pouvoir prolonger sa
 * session plutôt que de perdre sa saisie.
 */
function IdleWarning({
  seconds,
  onStay,
  onLogout,
}: {
  seconds: number;
  onStay: () => void;
  onLogout: () => void;
}) {
  return (
    <div className={styles.overlay} role="alertdialog" aria-modal="true" aria-labelledby="idle-title">
      <div className={styles.dialog}>
        <span className={styles.eyebrow}>SESSION</span>
        <h2 id="idle-title">Déconnexion imminente</h2>
        <p>
          Aucune activité détectée depuis {IDLE_MINUTES - Math.ceil(WARNING_BEFORE_MS / 60_000)}{" "}
          minutes. Vous serez déconnecté dans{" "}
          <strong className="ptn-mono">
            {String(Math.floor(seconds / 60)).padStart(2, "0")}:
            {String(seconds % 60).padStart(2, "0")}
          </strong>
          .
        </p>
        <p className={styles.rationale}>
          Cette coupure protège les habilitations fiduciaires et l’accès au canal confidentiel
          EAS/HS sur un poste laissé sans surveillance.
        </p>
        <div className={styles.actions}>
          <button type="button" onClick={onLogout} className={styles.ghost}>
            Se déconnecter
          </button>
          <button type="button" onClick={onStay} className={styles.primary} autoFocus>
            Rester connecté
          </button>
        </div>
      </div>
    </div>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth doit être utilisé dans un <AuthProvider>");
  return ctx;
}
