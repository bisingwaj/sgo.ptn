"use client";

/**
 * DashboardWithUser — wrapper qui injecte le greeting dynamique
 * (Bonjour {firstName} — {entityLong}) dans la config du DashboardClient
 * et applique le bon profil au ProfileContext.
 *
 * Lit les données utilisateur DIRECTEMENT depuis la map USERS (par `profile`),
 * pas via useUser() — ainsi le SSR rend le bon greeting dès le 1er HTML.
 */

import { useEffect } from "react";
import {
  DashboardClient,
  type DashboardKpi,
  type DashboardProfileConfig,
} from "@/app/dashboard/DashboardClient";
import { USERS } from "@/components/profile/UserContext";
import { useProfile } from "@/components/profile/ProfileContext";
import type { ProfileKey } from "@/lib/profiles";
import type { Initiative } from "@/lib/mock-initiatives";

interface DashboardWithUserProps {
  /** Profil cible — synchronise le ProfileContext si nécessaire */
  profile: ProfileKey;
  initiatives: Initiative[];
  kpis: DashboardKpi[];
  /** Override partiel du config (greeting est généré automatiquement) */
  config?: Omit<DashboardProfileConfig, "greeting" | "kpis">;
  /** Préfixe du greeting (défaut "Bonjour") — ex. "Welcome" pour le bailleur anglophone */
  welcomePrefix?: string;
}

export function DashboardWithUser({
  profile,
  initiatives,
  kpis,
  config,
  welcomePrefix = "Bonjour",
}: DashboardWithUserProps) {
  const user = USERS[profile];
  const { profile: current, setProfile } = useProfile();

  // Synchronise le profil actif si la route ne correspond pas
  useEffect(() => {
    if (current !== profile) {
      setProfile(profile);
    }
  }, [profile, current, setProfile]);

  const greeting = `${welcomePrefix} ${user.firstName} — ${user.entityLong}`;

  return (
    <DashboardClient
      initiatives={initiatives}
      config={{
        ...config,
        greeting,
        kpis,
      }}
    />
  );
}
