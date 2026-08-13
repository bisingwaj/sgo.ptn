/**
 * PTN-RDC · Données projet officielles
 *
 * Source : Manuel d'Exécution du Projet (MEP) du 23 juin 2025,
 * validé par le Gouvernement RDC, la Banque mondiale et l'AFD.
 *
 * Ces valeurs sont **immuables** dans le code (constantes du projet).
 * Le mep-compliance-officer agent garantit qu'elles ne sont jamais altérées.
 */

export const PROJECT = {
  code: "P180495",
  name: "Projet de Transformation Numérique",
  acronym: "PTN-RDC",
  tutelle: "Ministère des Postes, Télécommunications et Numérique (MPTN)",
  arreteUgp: "CAB/MIN/PT&N/AKIM/KL/Kbs/017/2025",
  arreteDate: "2025-04-15",
  apm: "IDEA — Digitalisation Inclusive en Afrique Orientale et Australe",

  /** Dates clés (ISO 8601) */
  dates: {
    bmSignature: "2024-11-25",
    afdSignature: "2025-03-14",
    effectiveness: "2025-10-31",
    technicalCompletion: "2029-12-31",
    bmDisbursementDeadline: "2030-04-30",
    afdDisbursementDeadline: "2029-03-06",
  },

  /** Risques officiels (per MEP § 2.2.4) */
  risks: {
    environmentalSocial: "Substantiel",
    sea_sh: "Substantiel",
    isr: "MS", // Modérément Satisfaisant
  },
} as const;

/**
 * Composantes et financements (USD M).
 * Source : MEP Tableau 2 § 2.2.4. Total = 510 M USD.
 */
export const COMPONENTS = {
  C1: {
    code: "C1",
    label: "Élargissement de l'accès et de l'inclusion numériques",
    short: "Accès & Inclusion",
    total: 385,
    ida: 302,
    afd: 83,
    privateCapital: 160,
    color: "#0f62fe",
    subComponents: [
      {
        code: "1.1",
        label: "Cadres et facilitateurs pour l'accès et l'inclusion",
        amount: 15,
      },
      {
        code: "1.2",
        label: "Extension des réseaux de transmission",
        amount: 190,
      },
      {
        code: "1.3",
        label: "Connecter citoyens, universités, institutions publiques",
        amount: 180,
      },
    ],
  },
  C2: {
    code: "C2",
    label: "Mise en place de bases numériques pour la prestation de services",
    short: "Fondations Numériques",
    total: 55, // selon MEP Tableau 2 ; le PAD mentionne 95 M
    ida: 43.1,
    afd: 11.9,
    privateCapital: 5,
    color: "#8a3ffc",
    subComponents: [
      {
        code: "2.1",
        label: "Partage et gestion des données",
        amount: 23,
      },
      {
        code: "2.2",
        label: "Confiance dans les services numériques",
        amount: 17,
      },
      {
        code: "2.3",
        label: "Prestation de services dans secteurs clés",
        amount: 15,
      },
    ],
  },
  C3: {
    code: "C3",
    label: "Compétences numériques avancées et innovation",
    short: "Compétences & Innovation",
    total: 45, // selon Tableau 2 ; ~30 dans certaines sections du MEP
    ida: 35.3,
    afd: 9.7,
    privateCapital: 0,
    color: "#007d79",
    subComponents: [
      {
        code: "3.1",
        label: "Capacités compétences numériques avancées (EES, hubs)",
        amount: 32,
      },
      {
        code: "3.2",
        label: "Système de contenu local et innovation",
        amount: 13,
      },
    ],
  },
  C4: {
    code: "C4",
    label: "Coordination institutionnelle et gestion de Projet",
    short: "Coordination & Gestion",
    total: 25, // selon Tableau 2
    ida: 19.6,
    afd: 5.4,
    privateCapital: 0,
    color: "#24a148",
    subComponents: [],
  },
  C5: {
    code: "C5",
    label: "Composante de réponse d'urgence aux imprévus (CERC)",
    short: "CERC",
    total: 0,
    ida: 0,
    afd: 0,
    privateCapital: 0,
    color: "#525252",
    subComponents: [],
  },
} as const;

export const FINANCING = {
  ida: { amount: 400, share: 0.79, currency: "USD" },
  afd: { amount: 110, share: 0.21, currency: "USD", originalEur: 100 },
  total: 510,
  privateCapitalTarget: 165,
} as const;

/**
 * Indicateurs ODP (Objectif de Développement du Projet).
 * Source : MEP Tableau 1 § 2.2.3.1.
 */
export const ODP_INDICATORS = [
  {
    code: "ODP-1",
    label: "Personnes utilisant l'internet HD",
    baseline: 0,
    target: 30_000_000,
    unit: "personnes",
    targetWomen: 15_000_000,
  },
  {
    code: "ODP-2",
    label: "Bande passante internationale",
    baseline: 6.56,
    target: 20,
    unit: "kbit/s/habitant",
  },
  {
    code: "ODP-3",
    label: "Personnes utilisant des services numériques",
    baseline: 0,
    target: 1_000_000,
    unit: "personnes",
    targetWomen: 500_000,
  },
  {
    code: "ODP-4",
    label: "Diplômés formations numériques avancées",
    baseline: 0,
    target: 3_000,
    unit: "personnes",
    targetWomen: 1_000,
  },
] as const;

/**
 * MDA / parties prenantes officielles (glossaire).
 * Source : MEP Lexique des abréviations + § 4.2.
 */
export const MDA_GLOSSARY = [
  { code: "MPTN", label: "Ministère des Postes, Télécommunications et Numérique" },
  { code: "ARPTC", label: "Autorité de Régulation de la Poste et des Télécommunications" },
  { code: "FDSU", label: "Fonds de Développement des Services Universels" },
  { code: "SOCOF", label: "Société Congolaise de Fibre Optique" },
  { code: "ADN", label: "Agence pour le Développement du Numérique" },
  { code: "ANCY", label: "Agence Nationale de Cybersécurité" },
  { code: "ONIP", label: "Office National d'Identification de la Population" },
  { code: "MIS", label: "Ministère de l'Intérieur et de la Sécurité" },
  { code: "MdJ", label: "Ministère de la Justice" },
  { code: "MCAP", label: "Ministère de la Culture, Arts et Patrimoine" },
  { code: "MEPME", label: "Ministère de l'Entrepreneuriat, des PME" },
  { code: "MESU", label: "Ministère de l'Enseignement Supérieur et Universitaire" },
  { code: "Présidence", label: "Présidence de la République (ADN)" },
  { code: "Primature", label: "Primature" },
  { code: "MINFIN-CSPP", label: "Ministère des Finances — CSPP" },
  { code: "Ebale", label: "Réseau National de Recherche et d'Éducation (NREN)" },
  { code: "SCPT", label: "Société Congolaise des Postes et Télécommunications" },
  { code: "INACO", label: "Institut National des Archives du Congo" },
  { code: "PAAF", label: "Projet d'Appui à l'Amélioration de l'Éducation des Filles et Femmes" },
  { code: "TRANSFORME", label: "Projet TRANSFORME (Entreprenariat Féminin)" },
] as const;

/**
 * 26 provinces RDC (pour cartographie SIG / GEMS).
 * 10 provinces prioritaires CPF en premier.
 */
export const PROVINCES_PRIORITY_CPF = [
  "Kinshasa",
  "Kwilu",
  "Kongo Central",
  "Kasaï",
  "Kasaï Central",
  "Kasaï Oriental",
  "Nord-Kivu",
  "Sud-Kivu",
  "Ituri",
  "Lomami",
] as const;

export const PROVINCES_OTHER = [
  "Bas-Uele",
  "Équateur",
  "Haut-Katanga",
  "Haut-Lomami",
  "Haut-Uele",
  "Kwango",
  "Lualaba",
  "Mai-Ndombe",
  "Maniema",
  "Mongala",
  "Nord-Ubangi",
  "Sankuru",
  "Sud-Ubangi",
  "Tanganyika",
  "Tshopo",
  "Tshuapa",
] as const;

export const ALL_PROVINCES = [
  ...PROVINCES_PRIORITY_CPF,
  ...PROVINCES_OTHER,
] as const;

/**
 * Langues supportées (per MEP — communications publiques).
 */
export const SUPPORTED_LANGUAGES = [
  { code: "fr", label: "Français", isDefault: true },
  { code: "en", label: "English" },
  { code: "ln", label: "Lingala" },
  { code: "sw", label: "Swahili" },
  { code: "ts", label: "Tshiluba" },
  { code: "kk", label: "Kikongo" },
] as const;
