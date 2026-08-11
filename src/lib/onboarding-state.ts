/**
 * État partagé pour les onboardings.
 * Chaque profil utilise un sous-ensemble selon ses besoins.
 */

export interface OnboardingState {
  // Étape Identité (commune)
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  preferredLanguage: "fr" | "en" | "ln" | "sw" | "ts" | "kk";

  // UGP / MDA / Partenaire / SBP : composante & affectation
  componentKey?: "C1" | "C2" | "C3" | "C4";
  organizationName?: string;
  organizationType?: string;
  province?: string;

  // Partenaire : sigle court (affiché dans la sidenav)
  partenaireSigle?: string;
  /** Niveau KYC initial choisi (1 = déclaratif, 3 = vérifié) */
  partenaireKycLevel?: 1 | 2 | 3;

  // UGP : sous-rôle et affectation détaillée
  ugpSubrole?: string;

  // Bailleur : institution + zone
  bailleurInstitution?: "BM" | "AFD" | "CONJOINT";
  bailleurExpertise?: string;

  // Soumissionnaire : KYC entreprise
  rccm?: string;
  nif?: string;
  legalForm?: "SA" | "SARL" | "SNC" | "Autre";
  sectors?: string[];
  employeeCount?: number;
  yearlyRevenue?: number;

  // SBP : type de structure
  sbpType?: "EESU" | "Hub" | "Startup" | "Centre";
  womanLed?: boolean;
  participantsTarget?: number;

  // Auditeur : cabinet & mission
  auditFirm?: string;
  auditScope?: string;
  auditAccreditation?: string;

  // COPIL/CTP : institution représentée
  governanceBody?: "COPIL" | "CTP";
  representedInstitution?: string;
  mandate?: string;

  // Permissions / engagements (variables selon profil)
  selectedRoles: Set<string>;
  codeOfConductSigned: boolean;
  coiDeclared: boolean;
  readOnlyAcknowledged: boolean;
  dataPrivacyAcknowledged: boolean;
}

export function createInitialState(profile: string): OnboardingState {
  const base: OnboardingState = {
    firstName: "",
    lastName: "",
    email: profile === "ugp" ? "prenom.nom@ptn-rdc.gov.cd" : "",
    phone: "+243 ",
    preferredLanguage: "fr",
    selectedRoles: new Set(),
    codeOfConductSigned: false,
    coiDeclared: false,
    readOnlyAcknowledged: false,
    dataPrivacyAcknowledged: false,
  };

  // Pré-remplissages selon profil (mock data)
  switch (profile) {
    case "ugp":
      return { ...base, componentKey: "C2" };
    case "mda":
      return { ...base, organizationType: "Ministère sectoriel" };
    case "partenaire":
      return { ...base, organizationType: "Agence publique" };
    case "bailleur":
      return { ...base, bailleurInstitution: "BM" };
    case "soumissionnaire":
      return { ...base, legalForm: "SARL", sectors: [] };
    case "sbp":
      return { ...base, sbpType: "Hub", womanLed: false };
    case "auditeur":
      return { ...base, readOnlyAcknowledged: false };
    case "gouvernance":
      return { ...base, governanceBody: "COPIL" };
    default:
      return base;
  }
}
