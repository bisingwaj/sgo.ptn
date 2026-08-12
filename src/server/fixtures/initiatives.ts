import type { Initiative } from "@/lib/schemas/initiative";
import { ACTORS } from "./actors";

/**
 * Portefeuille de démonstration.
 *
 * Les activités reflètent les composantes réelles du PTN-RDC (MEP Tableau 2) ;
 * les références, montants unitaires et personnes sont fictifs. Aucun total ne
 * doit être présenté comme un chiffre officiel du projet.
 *
 * Dates : ancrées sur SEED_NOW plutôt que sur l'horloge, pour que le rendu
 * serveur et le rendu client concordent et que les captures de référence
 * restent stables d'un jour à l'autre.
 */

/**
 * Instant de référence du jeu de données.
 *
 * Ancré sur la date du jour, ramenée à 09:00 UTC, et NON sur une date figée.
 *
 * Une date figée avait un attrait — des captures d'écran reproductibles — mais
 * un défaut rédhibitoire : les échéances vieillissent alors que l'horloge du
 * serveur avance, et le jeu de démonstration finit par afficher « 7 dossiers
 * en retard sur 7 ». Une démonstration entièrement dans le rouge ne montre
 * plus rien : ni le tri par urgence, ni la distinction entre un délai tendu et
 * un délai dépassé.
 *
 * La troncature à 09:00 UTC garde les valeurs stables sur une journée entière,
 * ce qui suffit à la comparaison de captures au cours d'une même session.
 */
export const SEED_NOW = (() => {
  const d = new Date();
  d.setUTCHours(9, 0, 0, 0);
  return d;
})();

/** Décalage en jours à partir de SEED_NOW, en ISO complet. */
export function seedAt(days: number, hours = 0): string {
  const d = new Date(SEED_NOW);
  d.setUTCDate(d.getUTCDate() + days);
  d.setUTCHours(d.getUTCHours() + hours);
  return d.toISOString();
}

/** Décalage en jours à partir de SEED_NOW, en date seule. */
export function seedDate(days: number): string {
  return seedAt(days).slice(0, 10);
}

/** Dollars → cents, pour éviter tout flottant sur les montants. */
const usd = (dollars: number) => ({
  minor: Math.round(dollars * 100),
  currency: "USD" as const,
});

export const INITIATIVES: Initiative[] = [
  {
    ref: "PTN-2026-019",
    title: "Plateforme nationale d'identité numérique",
    description:
      "Mise en place d'une plateforme d'identité numérique inclusive, conforme aux standards ICAO 9303 et ID4D. AMOA pour accompagner l'ANIE dans la conception et le déploiement.",
    component: "C2",
    ptbaCode: "A2.3.1",
    procurementMethod: "SFQC",
    status: "ANO_EN_ATTENTE",
    currentStage: "ANO",
    amount: usd(8_700_000),
    funding: { ida: usd(6_873_000), afd: usd(1_827_000) },
    donors: ["IDA", "AFD"],
    riskES: "SUBSTANTIEL",
    priorReview: true,
    provinceCode: "KIN",
    team: [ACTORS.rc2, ACTORS.anie, ACTORS.speEs, ACTORS.ttlBm],
    documents: [
      {
        id: "doc-019-1",
        name: "TDR_Identite_Numerique_v2.pdf",
        kind: "TDR",
        sizeBytes: 2_516_582,
        uploadedAt: seedAt(-5),
        status: "EN_REVUE",
      },
      {
        id: "doc-019-2",
        name: "Grille_evaluation_SFQC.xlsx",
        kind: "ANNEXE",
        sizeBytes: 184_320,
        uploadedAt: seedAt(-5),
        status: "BROUILLON",
      },
      {
        id: "doc-019-3",
        name: "Note_cadrage_ANIE.pdf",
        kind: "NOTE",
        sizeBytes: 870_400,
        uploadedAt: seedAt(-21),
        status: "SIGNE",
      },
    ],
    timeline: [
      { stage: "INITIATIVE", status: "FAIT", occurredAt: seedAt(-48), actor: ACTORS.anie },
      { stage: "TDR", status: "FAIT", occurredAt: seedAt(-21), actor: ACTORS.rc2 },
      { stage: "REVUE_UGP", status: "FAIT", occurredAt: seedAt(-8), actor: ACTORS.rpm },
      { stage: "ANO", status: "EN_COURS", occurredAt: seedAt(-5), actor: ACTORS.ttlBm },
      { stage: "DAO", status: "A_VENIR", occurredAt: null, actor: null },
      { stage: "EVALUATION", status: "A_VENIR", occurredAt: null, actor: null },
      { stage: "ATTRIBUTION", status: "A_VENIR", occurredAt: null, actor: null },
    ],
    createdAt: seedAt(-48),
    updatedAt: seedAt(0, -2),
    currentStageDueOn: seedDate(4),
    hasAiSuggestions: true,
  },
  {
    ref: "PTN-2026-021",
    title: "Backbone fibre optique Goma – Bukavu",
    description:
      "Travaux de déploiement de 180 km de fibre optique sur le corridor Goma–Bukavu. Traversée de zones partiellement minées : plan de déminage préalable requis.",
    component: "C1",
    ptbaCode: "A1.2.4",
    procurementMethod: "AOI",
    status: "ANO_EN_ATTENTE",
    currentStage: "ANO",
    amount: usd(12_400_000),
    funding: { ida: usd(9_796_000), afd: usd(2_604_000) },
    donors: ["IDA", "AFD"],
    riskES: "ELEVE",
    priorReview: true,
    provinceCode: "NKI",
    team: [ACTORS.rc1, ACTORS.speEs, ACTORS.ttlBm, ACTORS.refAfd],
    documents: [
      {
        id: "doc-021-1",
        name: "TDR_Backbone_Goma_Bukavu.pdf",
        kind: "TDR",
        sizeBytes: 3_355_443,
        uploadedAt: seedAt(-14),
        status: "EN_REVUE",
      },
      {
        id: "doc-021-2",
        name: "EIES_corridor_Kivu.pdf",
        kind: "ANNEXE",
        sizeBytes: 7_340_032,
        uploadedAt: seedAt(-14),
        status: "SIGNE",
      },
    ],
    timeline: [
      { stage: "INITIATIVE", status: "FAIT", occurredAt: seedAt(-70), actor: ACTORS.rc1 },
      { stage: "TDR", status: "FAIT", occurredAt: seedAt(-30), actor: ACTORS.rc1 },
      { stage: "REVUE_UGP", status: "FAIT", occurredAt: seedAt(-16), actor: ACTORS.rpm },
      { stage: "ANO", status: "EN_COURS", occurredAt: seedAt(-14), actor: ACTORS.ttlBm },
      { stage: "DAO", status: "A_VENIR", occurredAt: null, actor: null },
      { stage: "EVALUATION", status: "A_VENIR", occurredAt: null, actor: null },
      { stage: "ATTRIBUTION", status: "A_VENIR", occurredAt: null, actor: null },
    ],
    createdAt: seedAt(-70),
    updatedAt: seedAt(-1),
    currentStageDueOn: seedDate(9),
    hasAiSuggestions: false,
  },
  {
    ref: "PTN-2026-031",
    title: "Formation de 200 enseignants EESU au numérique",
    description:
      "Programme de renforcement des compétences numériques avancées pour 200 enseignants d'établissements d'enseignement supérieur et universitaire. Modalité subvention basée sur la performance.",
    component: "C3",
    ptbaCode: "A3.1.2",
    procurementMethod: "SBP",
    status: "ANO_CLARIFICATION",
    currentStage: "ANO",
    amount: usd(1_900_000),
    funding: { ida: usd(1_501_000), afd: usd(399_000) },
    donors: ["AFD"],
    riskES: "FAIBLE",
    priorReview: false,
    provinceCode: null,
    team: [ACTORS.coordonnateur, ACTORS.refAfd],
    documents: [
      {
        id: "doc-031-1",
        name: "TDR_Formation_EESU.pdf",
        kind: "TDR",
        sizeBytes: 1_258_291,
        uploadedAt: seedAt(-30),
        status: "EN_REVUE",
      },
    ],
    timeline: [
      { stage: "INITIATIVE", status: "FAIT", occurredAt: seedAt(-90), actor: ACTORS.coordonnateur },
      { stage: "TDR", status: "FAIT", occurredAt: seedAt(-40), actor: ACTORS.coordonnateur },
      { stage: "REVUE_UGP", status: "FAIT", occurredAt: seedAt(-32), actor: ACTORS.rpm },
      { stage: "ANO", status: "EN_COURS", occurredAt: seedAt(-30), actor: ACTORS.refAfd },
      { stage: "DAO", status: "A_VENIR", occurredAt: null, actor: null },
      { stage: "EVALUATION", status: "A_VENIR", occurredAt: null, actor: null },
      { stage: "ATTRIBUTION", status: "A_VENIR", occurredAt: null, actor: null },
    ],
    createdAt: seedAt(-90),
    updatedAt: seedAt(-3),
    currentStageDueOn: seedDate(-2), // en retard
    hasAiSuggestions: true,
  },
  {
    ref: "PTN-2026-009",
    title: "Centre des opérations de sécurité (SOC) national",
    description:
      "Mise en place d'un SOC national de cybersécurité : outillage, procédures et transfert de compétences vers les équipes de l'ARPTC.",
    component: "C2",
    ptbaCode: "A2.2.1",
    procurementMethod: "AOI",
    status: "ANO_DELIVRE",
    currentStage: "DAO",
    amount: usd(14_200_000),
    funding: { ida: usd(11_218_000), afd: usd(2_982_000) },
    donors: ["IDA"],
    riskES: "MODERE",
    priorReview: true,
    provinceCode: "KIN",
    team: [ACTORS.rc2, ACTORS.arptc, ACTORS.specialisteBm],
    documents: [
      {
        id: "doc-009-1",
        name: "TDR_SOC_National.pdf",
        kind: "TDR",
        sizeBytes: 2_936_012,
        uploadedAt: seedAt(-60),
        status: "SIGNE",
      },
      {
        id: "doc-009-2",
        name: "ANO_BM_SOC.pdf",
        kind: "NOTE",
        sizeBytes: 512_000,
        uploadedAt: seedAt(-27),
        status: "SIGNE",
      },
    ],
    timeline: [
      { stage: "INITIATIVE", status: "FAIT", occurredAt: seedAt(-120), actor: ACTORS.rc2 },
      { stage: "TDR", status: "FAIT", occurredAt: seedAt(-60), actor: ACTORS.rc2 },
      { stage: "REVUE_UGP", status: "FAIT", occurredAt: seedAt(-45), actor: ACTORS.rpm },
      { stage: "ANO", status: "FAIT", occurredAt: seedAt(-27), actor: ACTORS.specialisteBm },
      { stage: "DAO", status: "EN_COURS", occurredAt: seedAt(-20), actor: ACTORS.rpm },
      { stage: "EVALUATION", status: "A_VENIR", occurredAt: null, actor: null },
      { stage: "ATTRIBUTION", status: "A_VENIR", occurredAt: null, actor: null },
    ],
    createdAt: seedAt(-120),
    updatedAt: seedAt(-6),
    currentStageDueOn: seedDate(21),
    hasAiSuggestions: false,
  },
  {
    ref: "PTN-2026-014",
    title: "Étude d'impact — centre de données Tier III",
    description:
      "Études préalables, EIES et PGES pour l'implantation d'un centre de données national de niveau Tier III.",
    component: "C2",
    ptbaCode: "A2.1.3",
    procurementMethod: "CQS",
    status: "ANO_EN_ATTENTE",
    currentStage: "ANO",
    amount: usd(3_200_000),
    funding: { ida: usd(2_528_000), afd: usd(672_000) },
    donors: ["AFD"],
    riskES: "SUBSTANTIEL",
    priorReview: false,
    provinceCode: "KIN",
    team: [ACTORS.rc2, ACTORS.speEs, ACTORS.refAfd],
    documents: [
      {
        id: "doc-014-1",
        name: "TDR_Etude_Datacenter.pdf",
        kind: "TDR",
        sizeBytes: 1_887_436,
        uploadedAt: seedAt(-20),
        status: "EN_REVUE",
      },
    ],
    timeline: [
      { stage: "INITIATIVE", status: "FAIT", occurredAt: seedAt(-75), actor: ACTORS.rc2 },
      { stage: "TDR", status: "FAIT", occurredAt: seedAt(-25), actor: ACTORS.rc2 },
      { stage: "REVUE_UGP", status: "FAIT", occurredAt: seedAt(-22), actor: ACTORS.rpm },
      { stage: "ANO", status: "EN_COURS", occurredAt: seedAt(-20), actor: ACTORS.refAfd },
      { stage: "DAO", status: "A_VENIR", occurredAt: null, actor: null },
      { stage: "EVALUATION", status: "A_VENIR", occurredAt: null, actor: null },
      { stage: "ATTRIBUTION", status: "A_VENIR", occurredAt: null, actor: null },
    ],
    createdAt: seedAt(-75),
    updatedAt: seedAt(-2),
    currentStageDueOn: seedDate(18),
    hasAiSuggestions: false,
  },
  {
    ref: "PTN-2026-027",
    title: "Hubs technologiques de Lubumbashi et Goma",
    description:
      "Équipement et mise en service de deux hubs technologiques régionaux destinés à l'incubation de startups numériques.",
    component: "C3",
    ptbaCode: "A3.2.1",
    procurementMethod: "AON",
    status: "EN_REVUE_UGP",
    currentStage: "REVUE_UGP",
    amount: usd(4_600_000),
    funding: { ida: usd(3_634_000), afd: usd(966_000) },
    donors: ["IDA"],
    riskES: "FAIBLE",
    priorReview: false,
    provinceCode: "HKA",
    team: [ACTORS.coordonnateur, ACTORS.rpm],
    documents: [
      {
        id: "doc-027-1",
        name: "TDR_Hubs_Technologiques.pdf",
        kind: "TDR",
        sizeBytes: 1_572_864,
        uploadedAt: seedAt(-4),
        status: "BROUILLON",
      },
    ],
    timeline: [
      { stage: "INITIATIVE", status: "FAIT", occurredAt: seedAt(-35), actor: ACTORS.coordonnateur },
      { stage: "TDR", status: "FAIT", occurredAt: seedAt(-4), actor: ACTORS.coordonnateur },
      { stage: "REVUE_UGP", status: "EN_COURS", occurredAt: seedAt(-2), actor: ACTORS.rpm },
      { stage: "ANO", status: "A_VENIR", occurredAt: null, actor: null },
      { stage: "DAO", status: "A_VENIR", occurredAt: null, actor: null },
      { stage: "EVALUATION", status: "A_VENIR", occurredAt: null, actor: null },
      { stage: "ATTRIBUTION", status: "A_VENIR", occurredAt: null, actor: null },
    ],
    createdAt: seedAt(-35),
    updatedAt: seedAt(-2),
    currentStageDueOn: seedDate(6),
    hasAiSuggestions: true,
  },
  {
    ref: "PTN-2026-033",
    title: "Connexion haut débit de 120 institutions publiques",
    description:
      "Raccordement de ministères, universités et hôpitaux de référence au réseau national haut débit.",
    component: "C1",
    ptbaCode: "A1.3.2",
    procurementMethod: "AOI",
    status: "EN_EVALUATION",
    currentStage: "EVALUATION",
    amount: usd(22_800_000),
    funding: { ida: usd(18_012_000), afd: usd(4_788_000) },
    donors: ["IDA", "AFD"],
    riskES: "MODERE",
    priorReview: true,
    provinceCode: null,
    team: [ACTORS.rc1, ACTORS.rpm, ACTORS.specialisteBm],
    documents: [
      {
        id: "doc-033-1",
        name: "DAO_Connexion_Institutions.pdf",
        kind: "DAO",
        sizeBytes: 5_242_880,
        uploadedAt: seedAt(-40),
        status: "SIGNE",
      },
      {
        id: "doc-033-2",
        name: "PV_ouverture_plis.pdf",
        kind: "PV",
        sizeBytes: 655_360,
        uploadedAt: seedAt(-10),
        status: "SIGNE",
      },
    ],
    timeline: [
      { stage: "INITIATIVE", status: "FAIT", occurredAt: seedAt(-150), actor: ACTORS.rc1 },
      { stage: "TDR", status: "FAIT", occurredAt: seedAt(-110), actor: ACTORS.rc1 },
      { stage: "REVUE_UGP", status: "FAIT", occurredAt: seedAt(-95), actor: ACTORS.rpm },
      { stage: "ANO", status: "FAIT", occurredAt: seedAt(-70), actor: ACTORS.specialisteBm },
      { stage: "DAO", status: "FAIT", occurredAt: seedAt(-40), actor: ACTORS.rpm },
      { stage: "EVALUATION", status: "EN_COURS", occurredAt: seedAt(-10), actor: ACTORS.rpm },
      { stage: "ATTRIBUTION", status: "A_VENIR", occurredAt: null, actor: null },
    ],
    createdAt: seedAt(-150),
    updatedAt: seedAt(-4),
    currentStageDueOn: seedDate(12),
    hasAiSuggestions: false,
  },
  {
    ref: "PTN-2026-036",
    title: "Audit externe des comptes du projet — exercice 2026",
    description:
      "Sélection d'un cabinet d'audit externe pour la certification des états financiers du projet au titre de l'exercice 2026.",
    component: "C4",
    ptbaCode: "A4.1.5",
    procurementMethod: "SBQ",
    status: "BROUILLON",
    currentStage: "TDR",
    amount: usd(320_000),
    funding: { ida: usd(252_800), afd: usd(67_200) },
    donors: ["IDA"],
    riskES: "FAIBLE",
    priorReview: false,
    provinceCode: "KIN",
    team: [ACTORS.raf],
    documents: [],
    timeline: [
      { stage: "INITIATIVE", status: "FAIT", occurredAt: seedAt(-12), actor: ACTORS.raf },
      { stage: "TDR", status: "EN_COURS", occurredAt: seedAt(-3), actor: ACTORS.raf },
      { stage: "REVUE_UGP", status: "A_VENIR", occurredAt: null, actor: null },
      { stage: "ANO", status: "A_VENIR", occurredAt: null, actor: null },
      { stage: "DAO", status: "A_VENIR", occurredAt: null, actor: null },
      { stage: "EVALUATION", status: "A_VENIR", occurredAt: null, actor: null },
      { stage: "ATTRIBUTION", status: "A_VENIR", occurredAt: null, actor: null },
    ],
    createdAt: seedAt(-12),
    updatedAt: seedAt(-3),
    currentStageDueOn: seedDate(15),
    hasAiSuggestions: false,
  },
  {
    ref: "PTN-2026-040",
    title: "Campagne d'inclusion numérique des femmes rurales",
    description:
      "Actions de sensibilisation et de formation de base au numérique dans les zones rurales, avec ciblage prioritaire des femmes.",
    component: "C1",
    ptbaCode: "A1.1.3",
    procurementMethod: "AON",
    status: "ATTRIBUE",
    currentStage: "ATTRIBUTION",
    amount: usd(2_100_000),
    funding: { ida: usd(1_659_000), afd: usd(441_000) },
    donors: ["AFD"],
    riskES: "FAIBLE",
    priorReview: false,
    provinceCode: "KWL",
    team: [ACTORS.rc1, ACTORS.speEs, ACTORS.refAfd],
    documents: [
      {
        id: "doc-040-1",
        name: "Contrat_Inclusion_Numerique.pdf",
        kind: "CONTRAT",
        sizeBytes: 1_048_576,
        uploadedAt: seedAt(-8),
        status: "SIGNE",
      },
    ],
    timeline: [
      { stage: "INITIATIVE", status: "FAIT", occurredAt: seedAt(-200), actor: ACTORS.rc1 },
      { stage: "TDR", status: "FAIT", occurredAt: seedAt(-160), actor: ACTORS.rc1 },
      { stage: "REVUE_UGP", status: "FAIT", occurredAt: seedAt(-140), actor: ACTORS.rpm },
      { stage: "ANO", status: "FAIT", occurredAt: seedAt(-120), actor: ACTORS.refAfd },
      { stage: "DAO", status: "FAIT", occurredAt: seedAt(-80), actor: ACTORS.rpm },
      { stage: "EVALUATION", status: "FAIT", occurredAt: seedAt(-30), actor: ACTORS.rpm },
      { stage: "ATTRIBUTION", status: "FAIT", occurredAt: seedAt(-8), actor: ACTORS.coordonnateur },
    ],
    createdAt: seedAt(-200),
    updatedAt: seedAt(-8),
    currentStageDueOn: null,
    hasAiSuggestions: false,
  },
];
