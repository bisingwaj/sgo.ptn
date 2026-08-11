"use client";

/**
 * OrganisationContext — source de vérité du nom + métadonnées de
 * l'organisation partenaire active. Persisté localStorage pour démo.
 *
 * Le nom choisi ici est diffusé partout : SideNav, headers de page,
 * eyebrow des wizards, etc.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

export interface OrganisationProfile {
  name: string;
  fullName: string;
  sigle: string;
  ref: string;
  rccm: string;
  nif: string;
  province: string;
  email: string;
  phone: string;
  /** Niveau KYC : 1 (déclaratif) / 2 (vérifié) / 3 (signataires habilités) */
  kycLevel: 1 | 2 | 3;
}

const DEFAULT_ORG: OrganisationProfile = {
  name: "ANIE",
  fullName: "Office National d'Identité",
  sigle: "ANIE",
  ref: "PART-RDC-027",
  rccm: "CD/KIN/RCCM/2024-A-00184",
  nif: "A0500127K",
  province: "Kinshasa",
  email: "contact@anie.gouv.cd",
  phone: "+243 81 234 56 78",
  kycLevel: 3,
};

interface OrganisationContextValue {
  org: OrganisationProfile;
  updateOrg: (patch: Partial<OrganisationProfile>) => void;
  reset: () => void;
}

const Ctx = createContext<OrganisationContextValue | null>(null);

const STORAGE_KEY = "ptn-rdc.organisation";

export function OrganisationProvider({ children }: { children: ReactNode }) {
  const [org, setOrg] = useState<OrganisationProfile>(DEFAULT_ORG);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as Partial<OrganisationProfile>;
        setOrg({ ...DEFAULT_ORG, ...parsed });
      }
    } catch {
      // localStorage indisponible
    }
  }, []);

  const persist = useCallback((next: OrganisationProfile) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // ignore
    }
  }, []);

  const updateOrg = useCallback(
    (patch: Partial<OrganisationProfile>) => {
      setOrg((cur) => {
        const next = { ...cur, ...patch };
        persist(next);
        return next;
      });
    },
    [persist],
  );

  const reset = useCallback(() => {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
    setOrg(DEFAULT_ORG);
  }, []);

  return <Ctx.Provider value={{ org, updateOrg, reset }}>{children}</Ctx.Provider>;
}

export function useOrganisation(): OrganisationContextValue {
  const ctx = useContext(Ctx);
  if (!ctx) {
    throw new Error("useOrganisation doit être utilisé dans un <OrganisationProvider>");
  }
  return ctx;
}
