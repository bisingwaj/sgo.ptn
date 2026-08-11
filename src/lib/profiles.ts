/**
 * PTN-RDC · Définition des 8 profils utilisateurs
 *
 * Aligné sur le MEP du 23 juin 2025 :
 * - 4 familles principales (UGP, Bailleurs, Bénéficiaires & Soumissionnaires, Contrôle)
 * - Sous-rôles regroupés en 8 parcours d'onboarding
 *
 * Source de vérité pour la logique multi-profil de l'application.
 */

export type ProfileKey =
  | "ugp"
  | "mda"
  | "partenaire"
  | "bailleur"
  | "soumissionnaire"
  | "sbp"
  | "auditeur"
  | "gouvernance";

export type ProfileFamily =
  | "ugp"
  | "bailleurs"
  | "beneficiaires"
  | "controle";

export interface ProfileDefinition {
  key: ProfileKey;
  family: ProfileFamily;
  label: string;
  short: string;
  description: string;
  illustration: string;
  /**
   * Couleurs d'accent — appliquées via [data-profile] dans tokens.scss
   * Ces valeurs sont à titre indicatif (ex. preview de carte) ; les CSS variables
   * --ptn-accent* sont la source de vérité au runtime.
   */
  accent: {
    base: string;
    hover: string;
    surface: string;
  };
  /** Liste des sous-rôles couverts par ce parcours d'onboarding */
  subroles: string[];
  /** Peut rédiger des TDR ? */
  canAuthorTdr: boolean;
  /** Lecture seule (pas de boutons d'édition globaux) */
  readOnly: boolean;
  /** Tonalité du micro-copy par défaut */
  greeting: string;
  /** Page d'accueil après login */
  homePath: string;
}

export const PROFILES: Record<ProfileKey, ProfileDefinition> = {
  ugp: {
    key: "ugp",
    family: "ugp",
    label: "UGP / Gouvernement",
    short: "UGP",
    description:
      "Coordination, exécution, supervision technique et fiduciaire du PTN-RDC. Arrêté CAB/MIN/PT&N/AKIM/KL/Kbs/017/2025.",
    illustration: "ugp-coordination",
    accent: {
      base: "#0f62fe",
      hover: "#0043ce",
      surface: "#edf5ff",
    },
    subroles: [
      "Coordonnateur",
      "Coordonnateur Adjoint",
      "Auditeur Interne",
      "Responsable Composante 1",
      "Responsable Composante 2",
      "Responsable Composante 3",
      "RAF",
      "Comptable",
      "Caissier",
      "Logisticien",
      "RPM",
      "Chargé Passation des Marchés",
      "Spé Environnement",
      "Spé Développement Social",
      "Spé VBG/EAS",
      "Spé Suivi & Évaluation",
      "Spé Communication",
      "IT",
      "Agent de liaison provincial",
    ],
    canAuthorTdr: true,
    readOnly: false,
    greeting: "Vous coordonnez. Voici votre vue d'ensemble.",
    homePath: "/cockpit",
  },

  mda: {
    key: "mda",
    family: "beneficiaires",
    label: "Entité bénéficiaire (MDA)",
    short: "MDA",
    description:
      "Ministères, départements et agences bénéficiaires du PTN-RDC. Initiation des besoins, rédaction des TDR sectoriels, suivi des marchés.",
    illustration: "mda-ministry",
    accent: {
      base: "#1192e8",
      hover: "#0072c3",
      surface: "#e5f6ff",
    },
    subroles: [
      "Ministre / Cabinet",
      "Secrétaire Général",
      "Directeur sectoriel",
      "Point focal projet",
      "Responsable budget",
    ],
    canAuthorTdr: true,
    readOnly: false,
    greeting: "Bonjour. Vos initiatives, en un coup d'œil.",
    homePath: "/dashboard",
  },

  partenaire: {
    key: "partenaire",
    family: "beneficiaires",
    label: "Partie prenante / Institution partenaire",
    short: "Partenaire",
    description:
      "Ministères sectoriels, agences (ANIE, ARPTC, ONIP), OSC, universités, fédérations. Soumet des activités à l'UGP.",
    illustration: "partenaire-network",
    accent: {
      base: "#007d79",
      hover: "#005d5d",
      surface: "#d9fbfb",
    },
    subroles: [
      "Coordonnateur agence partenaire",
      "Représentant ANIE",
      "Représentant ARPTC",
      "Représentant ONIP",
      "Représentant OSC",
      "Représentant université",
      "Représentant fédération privée",
    ],
    canAuthorTdr: true,
    readOnly: false,
    greeting: "Espace partenaire. Co-construisons.",
    homePath: "/partenaire",
  },

  bailleur: {
    key: "bailleur",
    family: "bailleurs",
    label: "Bailleur (BM / AFD)",
    short: "Bailleur",
    description:
      "Avis de Non-Objection, supervision stratégique, missions conjointes. IDA 400 M USD (79 %) + AFD 110 M USD (21 %).",
    illustration: "bailleur-governance",
    accent: {
      base: "#8a3ffc",
      hover: "#6929c4",
      surface: "#f6f2ff",
    },
    subroles: [
      "TTL Banque mondiale",
      "Spécialiste BM",
      "AFD Référent",
      "AFD Spécialiste",
    ],
    canAuthorTdr: false,
    readOnly: false,
    greeting: "Welcome. Your portfolio at a glance.",
    homePath: "/bailleur",
  },

  soumissionnaire: {
    key: "soumissionnaire",
    family: "beneficiaires",
    label: "Soumissionnaire / Entreprise candidate",
    short: "Soumissionnaire",
    description:
      "Entreprises et consultants firmes participant aux marchés publics du PTN-RDC. Marketplace, soumissions, contrats, paiements.",
    illustration: "soumissionnaire-blocks",
    accent: {
      base: "#198038",
      hover: "#0e6027",
      surface: "#defbe6",
    },
    subroles: [
      "Représentant légal entreprise",
      "Chargé d'offres",
      "Consultant individuel",
    ],
    canAuthorTdr: false,
    readOnly: false,
    greeting: "Bienvenue. Opportunités et suivi.",
    homePath: "/soumissionnaire",
  },

  sbp: {
    key: "sbp",
    family: "beneficiaires",
    label: "Bénéficiaire SBP / Sous-projet",
    short: "SBP",
    description:
      "EESU, hubs technologiques, startups bénéficiaires de subventions basées sur la performance. Composantes 3.1 et 3.2.",
    illustration: "sbp-trajectory",
    accent: {
      base: "#d02670",
      hover: "#9f1853",
      surface: "#fff0f7",
    },
    subroles: [
      "EESU bénéficiaire",
      "Hub technologique",
      "Startup numérique",
      "Centre d'innovation",
    ],
    canAuthorTdr: true,
    readOnly: false,
    greeting: "Votre programme avance. Voici où vous en êtes.",
    homePath: "/sbp",
  },

  auditeur: {
    key: "auditeur",
    family: "controle",
    label: "Auditeur / Contrôle externe",
    short: "Auditeur",
    description:
      "Audit externe, TPM, Cour des Comptes, IGF, ACE. Lecture seule, traçabilité complète, exports signés.",
    illustration: "auditeur-magnifier",
    accent: {
      base: "#525252",
      hover: "#393939",
      surface: "#f4f4f4",
    },
    subroles: [
      "Cabinet audit externe",
      "TPM (Tierce Partie Monitoring)",
      "ACE (Agence Congolaise Environnement)",
      "Cour des Comptes",
      "IGF",
    ],
    canAuthorTdr: false,
    readOnly: true,
    greeting: "Lecture seule. Registre intègre.",
    homePath: "/auditeur",
  },

  gouvernance: {
    key: "gouvernance",
    family: "ugp",
    label: "Gouvernance (COPIL / CTP)",
    short: "COPIL/CTP",
    description:
      "Comité de Pilotage et Comité Technique du Projet. Sessions semestrielles (COPIL) ou trimestrielles (CTP).",
    illustration: "gouvernance-table",
    accent: {
      base: "#0043ce",
      hover: "#002d9c",
      surface: "#d0e2ff",
    },
    subroles: [
      "Membre COPIL",
      "Membre CTP",
      "Président de séance",
      "Secrétaire de séance",
    ],
    canAuthorTdr: false,
    readOnly: false,
    greeting: "Session. Ordre du jour.",
    homePath: "/gouvernance",
  },
};

export const PROFILE_KEYS = Object.keys(PROFILES) as ProfileKey[];

export function getProfile(key: ProfileKey): ProfileDefinition {
  return PROFILES[key];
}
