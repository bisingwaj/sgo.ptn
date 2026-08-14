"use client";

/**
 * DashboardWithUser — wrapper qui injecte le greeting dynamique
 * (Bonjour {firstName} — {entityLong}) dans la config du DashboardClient
 * et applique le bon profil au ProfileContext.
 *
 * L'identité vient de `useUser()`, qui fait primer la session réelle sur le
 * jeu d'exemple.
 *
 * La version précédente lisait `USERS[profile]` en direct, pour que le rendu
 * serveur produise déjà le bon nom. L'intention était juste, la conséquence
 * non : le nom affiché restait celui du jeu d'exemple même une fois la
 * personne connectée, et le cockpit accueillait « Bonjour Joseph » quelqu'un
 * qui s'appelle autrement. Un salut adressé à un autre nom que le sien, en
 * tête d'écran, jette le doute sur tout ce qui suit.
 *
 * Le serveur ne connaît pas la session — elle vit dans le navigateur — donc
 * le premier rendu porte encore le nom de repli, remplacé à l'hydratation.
 */

import { useEffect } from "react";
import {
  DashboardClient,
  type DashboardKpi,
  type DashboardProfileConfig,
} from "@/app/dashboard/DashboardClient";
import { useUser } from "@/components/profile/UserContext";
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
  const { user } = useUser();
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
