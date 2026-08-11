"use client";

/**
 * UserContext — identité de l'utilisateur connecté par profil.
 *
 * Mock pour la démo · chaque profil a son user par défaut.
 * En production : remplacer par les données réelles de session.
 *
 * Le greeting/nom diffère par profil et doit s'afficher correctement
 * partout (welcome message, eyebrow, signataire de Code de Conduite, etc.).
 */

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useProfile } from "./ProfileContext";
import type { ProfileKey } from "@/lib/profiles";

export interface UserIdentity {
  /** Prénom (utilisé dans "Bonjour …") */
  firstName: string;
  /** Nom de famille */
  lastName: string;
  /** Titre du poste (ex. "Coordonnateur UGP") */
  role: string;
  /** Entité d'appartenance (ex. "UGP PTN-RDC", "Ministère du Numérique") */
  entityShort: string;
  /** Nom long de l'entité */
  entityLong: string;
  /** Cycle / contexte affiché en en-tête (ex. "PTBA 2026-Q2") */
  cycleLabel: string;
  /** Email institutionnel */
  email: string;
}

export const USERS: Record<ProfileKey, UserIdentity> = {
  ugp: {
    firstName: "Joseph",
    lastName: "Mukendi",
    role: "Coordonnateur UGP",
    entityShort: "UGP",
    entityLong: "Unité de Gestion du Projet PTN-RDC",
    cycleLabel: "Cycle PTBA 2026-Q2",
    email: "j.mukendi@ptn-rdc.gov.cd",
  },
  mda: {
    firstName: "Marie",
    lastName: "Tshibanda",
    role: "Cheffe DSI Ministère du Numérique",
    entityShort: "MPTN",
    entityLong: "Ministère du Numérique",
    cycleLabel: "Cycle PTBA 2026-Q2",
    email: "m.tshibanda@minptn.gouv.cd",
  },
  partenaire: {
    firstName: "Marie",
    lastName: "Kabongo",
    role: "Directrice générale ANIE",
    entityShort: "ANIE",
    entityLong: "Office National d'Identité",
    cycleLabel: "Cycle PTBA 2026-Q2",
    email: "marie.kabongo@anie.gouv.cd",
  },
  bailleur: {
    firstName: "Sarah",
    lastName: "Adesina",
    role: "TTL Banque mondiale",
    entityShort: "BM",
    entityLong: "World Bank · IDA · Task Team Leader",
    cycleLabel: "Cycle de supervision 2026-S1",
    email: "sadesina@worldbank.org",
  },
  soumissionnaire: {
    firstName: "Jean",
    lastName: "Mbongo",
    role: "Directeur Général",
    entityShort: "DigitalCongo SARL",
    entityLong: "DigitalCongo SARL — soumissionnaire qualifié",
    cycleLabel: "Cycle d'appels d'offres 2026-Q2",
    email: "jean.mbongo@digitalcongo.cd",
  },
  sbp: {
    firstName: "Bénédicte",
    lastName: "Kasongo",
    role: "Coordinatrice Hub Lubumbashi",
    entityShort: "Hub Lubumbashi",
    entityLong: "Hub Numérique de Lubumbashi · Bénéficiaire SBP",
    cycleLabel: "Tranche 2 / 4 · Programme SBP-2026-042",
    email: "b.kasongo@hub-lubumbashi.cd",
  },
  auditeur: {
    firstName: "Patrick",
    lastName: "Mwendapole",
    role: "Senior Auditor",
    entityShort: "KPMG",
    entityLong: "Cabinet KPMG-DRC · Audit externe",
    cycleLabel: "Mission AUD-EXT-2026-T1",
    email: "p.mwendapole@kpmg.cd",
  },
  gouvernance: {
    firstName: "Hon. Augustin",
    lastName: "Bopundja",
    role: "Président COPIL",
    entityShort: "COPIL",
    entityLong: "Comité de Pilotage PTN-RDC",
    cycleLabel: "Session 1 / 2 · semestre 1 2026",
    email: "copil@minptn.gouv.cd",
  },
};

interface UserContextValue {
  user: UserIdentity;
}

const Ctx = createContext<UserContextValue | null>(null);

export function UserProvider({ children }: { children: ReactNode }) {
  const { profile } = useProfile();
  const value = useMemo<UserContextValue>(() => ({ user: USERS[profile] }), [profile]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useUser(): UserContextValue {
  const ctx = useContext(Ctx);
  if (!ctx) {
    throw new Error("useUser must be used within <UserProvider>");
  }
  return ctx;
}
