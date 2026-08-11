"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

/**
 * Quatre origines fonctionnelles du PTN-RDC.
 * Seuls UGP, PARTENAIRE et SBP peuvent rédiger des TDR.
 * Les BAILLEURS consultent et émettent des ANO uniquement.
 */
export type Profile = "ugp" | "partenaire" | "bailleur" | "sbp";

export const PROFILES: Record<
  Profile,
  {
    key: Profile;
    label: string;
    short: string;
    accent: string;
    accentHover: string;
    accentSurface: string;
    canAuthorTdr: boolean;
    description: string;
  }
> = {
  ugp: {
    key: "ugp",
    label: "UGP / Gouvernement",
    short: "UGP",
    accent: "var(--c-blue-60)",
    accentHover: "var(--c-blue-70)",
    accentSurface: "var(--c-blue-10)",
    canAuthorTdr: true,
    description:
      "Coordination, exécution, supervision technique et fiduciaire du PTN-RDC.",
  },
  partenaire: {
    key: "partenaire",
    label: "Partie prenante / institution partenaire",
    short: "Partenaire",
    accent: "var(--c-teal-60)",
    accentHover: "#005d5d",
    accentSurface: "var(--c-teal-10)",
    canAuthorTdr: true,
    description:
      "Ministères sectoriels, agences (ANIE, ARPTC, ONIP), OSC, universités. Soumet des activités à l'UGP.",
  },
  bailleur: {
    key: "bailleur",
    label: "Bailleur (BM / AFD)",
    short: "Bailleur",
    accent: "var(--c-purple-60)",
    accentHover: "#6929c4",
    accentSurface: "var(--c-purple-10)",
    canAuthorTdr: false,
    description:
      "Avis de Non-Objection, supervision stratégique, missions conjointes. Lecture + ANO uniquement.",
  },
  sbp: {
    key: "sbp",
    label: "Bénéficiaire SBP / sous-projet",
    short: "SBP",
    accent: "var(--c-magenta-60)",
    accentHover: "#9f1853",
    accentSurface: "var(--c-magenta-10)",
    canAuthorTdr: true,
    description:
      "EESU, hubs, startups bénéficiaires de subventions. Rédigent leurs propres TDR de sous-projet.",
  },
};

interface ProfileCtx {
  profile: Profile;
  setProfile: (p: Profile) => void;
  config: (typeof PROFILES)[Profile];
}

const Ctx = createContext<ProfileCtx | null>(null);

const STORAGE_KEY = "ptn.profile";

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfileState] = useState<Profile>("ugp");

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY) as Profile | null;
      if (saved && saved in PROFILES) setProfileState(saved);
    } catch {
      /* ignore */
    }
  }, []);

  const setProfile = useCallback((p: Profile) => {
    setProfileState(p);
    try {
      window.localStorage.setItem(STORAGE_KEY, p);
    } catch {
      /* ignore */
    }
  }, []);

  const value = useMemo<ProfileCtx>(
    () => ({ profile, setProfile, config: PROFILES[profile] }),
    [profile, setProfile],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useProfile() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useProfile must be used inside ProfileProvider");
  return ctx;
}
