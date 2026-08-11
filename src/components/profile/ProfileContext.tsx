"use client";

/**
 * ProfileContext + ProfileTheme provider.
 *
 * Source de vérité runtime du profil actif. Synchronisé avec localStorage
 * et reflété sur <html data-profile="..."> pour que les CSS variables
 * --ptn-accent* soient activées au niveau global.
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
import {
  PROFILES,
  type ProfileKey,
  type ProfileDefinition,
} from "@/lib/profiles";

const STORAGE_KEY = "ptn-rdc.activeProfile";
const THEME_STORAGE_KEY = "ptn-rdc.theme";

type Theme = "g10" | "g100";

interface ProfileContextValue {
  profile: ProfileKey;
  config: ProfileDefinition;
  setProfile: (key: ProfileKey) => void;
  theme: Theme;
  setTheme: (t: Theme) => void;
}

const Ctx = createContext<ProfileContextValue | null>(null);

interface ProfileProviderProps {
  children: ReactNode;
  /** Profil initial (utile pour SSR ou pages publiques) */
  initialProfile?: ProfileKey;
  /** Thème initial (utile pour SSR ou prefers-color-scheme) */
  initialTheme?: Theme;
}

export function ProfileProvider({
  children,
  initialProfile = "ugp",
  initialTheme = "g10",
}: ProfileProviderProps) {
  const [profile, setProfileState] = useState<ProfileKey>(initialProfile);
  const [theme, setThemeState] = useState<Theme>(initialTheme);

  // Hydratation depuis localStorage
  useEffect(() => {
    try {
      const savedProfile = window.localStorage.getItem(STORAGE_KEY);
      if (savedProfile && savedProfile in PROFILES) {
        setProfileState(savedProfile as ProfileKey);
      }
      const savedTheme = window.localStorage.getItem(THEME_STORAGE_KEY) as Theme | null;
      if (savedTheme === "g10" || savedTheme === "g100") {
        setThemeState(savedTheme);
      }
    } catch {
      // localStorage indisponible (SSR strict, mode privé)
    }
  }, []);

  // Synchronisation avec <html data-profile> et data-carbon-theme
  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute("data-profile", profile);
    root.setAttribute("data-carbon-theme", theme);
  }, [profile, theme]);

  const setProfile = useCallback((key: ProfileKey) => {
    setProfileState(key);
    try {
      window.localStorage.setItem(STORAGE_KEY, key);
    } catch {
      /* ignore */
    }
  }, []);

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, t);
    } catch {
      /* ignore */
    }
  }, []);

  const value = useMemo<ProfileContextValue>(
    () => ({
      profile,
      config: PROFILES[profile],
      setProfile,
      theme,
      setTheme,
    }),
    [profile, setProfile, theme, setTheme],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useProfile(): ProfileContextValue {
  const ctx = useContext(Ctx);
  if (!ctx) {
    throw new Error("useProfile must be used inside <ProfileProvider>");
  }
  return ctx;
}

export type { Theme };
