/**
 * PTN-RDC · Référentiel institutionnel.
 *
 * Source : Manuel d'Exécution du Projet (MEP) du 23 juin 2025.
 * Ces valeurs sont immuables. Servir les montants de composantes depuis
 * la base plutôt que depuis des littéraux d'écran est la parade
 * structurelle à la dérive constatée dans le frontend, où plusieurs
 * écrans réécrivaient les enveloppes à la main.
 */

export interface ComponentDef {
  code: 'C1' | 'C2' | 'C3' | 'C4' | 'C5';
  label: string;
  shortLabel: string;
  totalUsdM: number;
  idaUsdM: number;
  afdUsdM: number;
  privateUsdM: number;
  reconciliation?: string;
}

/** MEP Tableau 2 § 2.2.4 — total 510 M USD = IDA 400 + AFD 110. */
export const COMPONENTS: ComponentDef[] = [
  {
    code: 'C1',
    label: "Élargissement de l'accès et de l'inclusion numériques",
    shortLabel: 'Accès & Inclusion',
    totalUsdM: 385,
    idaUsdM: 302,
    afdUsdM: 83,
    privateUsdM: 160,
  },
  {
    code: 'C2',
    label: 'Mise en place de bases numériques pour la prestation de services',
    shortLabel: 'Fondations Numériques',
    totalUsdM: 55,
    idaUsdM: 43.1,
    afdUsdM: 11.9,
    privateUsdM: 5,
    reconciliation:
      'Dotée de 55 M USD selon le Tableau 2 du MEP ; certaines sections du PAD mentionnent environ 95 M USD.',
  },
  {
    code: 'C3',
    label: 'Compétences numériques avancées et innovation',
    shortLabel: 'Compétences & Innovation',
    totalUsdM: 45,
    idaUsdM: 35.3,
    afdUsdM: 9.7,
    privateUsdM: 0,
    reconciliation:
      'Dotée de 45 M USD selon le Tableau 2 ; environ 30 M USD sont mentionnés dans d’autres sections du MEP. La valeur retenue assure la cohérence du total à 510 M USD.',
  },
  {
    code: 'C4',
    label: 'Coordination institutionnelle et gestion de Projet',
    shortLabel: 'Coordination & Gestion',
    totalUsdM: 25,
    idaUsdM: 19.6,
    afdUsdM: 5.4,
    privateUsdM: 0,
  },
  {
    code: 'C5',
    label: "Composante de réponse d'urgence aux imprévus (CERC)",
    shortLabel: 'CERC',
    totalUsdM: 0,
    idaUsdM: 0,
    afdUsdM: 0,
    privateUsdM: 0,
    reconciliation: 'Réserve non dotée à ce stade, mobilisable en cas de crise éligible.',
  },
];

/** 26 provinces. Les 10 premières sont prioritaires au titre du CPF. */
export const PROVINCES: Array<{ code: string; label: string; isPriorityCpf: boolean }> = [
  { code: 'KINSHASA', label: 'Kinshasa', isPriorityCpf: true },
  { code: 'KWILU', label: 'Kwilu', isPriorityCpf: true },
  { code: 'KONGO_CENTRAL', label: 'Kongo Central', isPriorityCpf: true },
  { code: 'KASAI', label: 'Kasaï', isPriorityCpf: true },
  { code: 'KASAI_CENTRAL', label: 'Kasaï Central', isPriorityCpf: true },
  { code: 'KASAI_ORIENTAL', label: 'Kasaï Oriental', isPriorityCpf: true },
  { code: 'NORD_KIVU', label: 'Nord-Kivu', isPriorityCpf: true },
  { code: 'SUD_KIVU', label: 'Sud-Kivu', isPriorityCpf: true },
  { code: 'ITURI', label: 'Ituri', isPriorityCpf: true },
  { code: 'LOMAMI', label: 'Lomami', isPriorityCpf: true },
  { code: 'BAS_UELE', label: 'Bas-Uele', isPriorityCpf: false },
  { code: 'EQUATEUR', label: 'Équateur', isPriorityCpf: false },
  { code: 'HAUT_KATANGA', label: 'Haut-Katanga', isPriorityCpf: false },
  { code: 'HAUT_LOMAMI', label: 'Haut-Lomami', isPriorityCpf: false },
  { code: 'HAUT_UELE', label: 'Haut-Uele', isPriorityCpf: false },
  { code: 'KWANGO', label: 'Kwango', isPriorityCpf: false },
  { code: 'LUALABA', label: 'Lualaba', isPriorityCpf: false },
  { code: 'MAI_NDOMBE', label: 'Mai-Ndombe', isPriorityCpf: false },
  { code: 'MANIEMA', label: 'Maniema', isPriorityCpf: false },
  { code: 'MONGALA', label: 'Mongala', isPriorityCpf: false },
  { code: 'NORD_UBANGI', label: 'Nord-Ubangi', isPriorityCpf: false },
  { code: 'SANKURU', label: 'Sankuru', isPriorityCpf: false },
  { code: 'SUD_UBANGI', label: 'Sud-Ubangi', isPriorityCpf: false },
  { code: 'TANGANYIKA', label: 'Tanganyika', isPriorityCpf: false },
  { code: 'TSHOPO', label: 'Tshopo', isPriorityCpf: false },
  { code: 'TSHUAPA', label: 'Tshuapa', isPriorityCpf: false },
];

export type OrgType =
  | 'UGP'
  | 'MINISTERE'
  | 'AGENCE'
  | 'UNIVERSITE'
  | 'OSC'
  | 'FEDERATION'
  | 'ENTREPRISE'
  | 'CABINET_AUDIT'
  | 'BAILLEUR'
  | 'HUB'
  | 'STARTUP'
  | 'EESU'
  | 'AUTRE';

export interface OrganisationDef {
  code: string;
  name: string;
  fullName: string;
  type: OrgType;
  provinceCode?: string;
}

/**
 * Glossaire officiel des MDA et parties prenantes — présentation UGPTN § 13.1,
 * complété par l'UGP elle-même et les deux bailleurs.
 * Aucun acronyme hors de ce glossaire ne doit être introduit.
 */
export const ORGANISATIONS: OrganisationDef[] = [
  {
    code: 'UGP-PTN',
    name: 'UGP-PTN',
    fullName: 'Unité de Gestion du Projet de Transformation Numérique',
    type: 'UGP',
    provinceCode: 'KINSHASA',
  },
  { code: 'MPTN', name: 'MPTN', fullName: 'Ministère des Postes, Télécommunications et Numérique', type: 'MINISTERE', provinceCode: 'KINSHASA' },
  { code: 'ARPTC', name: 'ARPTC', fullName: 'Autorité de Régulation de la Poste et des Télécommunications', type: 'AGENCE', provinceCode: 'KINSHASA' },
  { code: 'FDSU', name: 'FDSU', fullName: 'Fonds de Développement des Services Universels', type: 'AGENCE', provinceCode: 'KINSHASA' },
  { code: 'SOCOF', name: 'SOCOF', fullName: 'Société Congolaise de Fibre Optique', type: 'AGENCE', provinceCode: 'KINSHASA' },
  { code: 'ADN', name: 'ADN', fullName: 'Agence pour le Développement du Numérique', type: 'AGENCE', provinceCode: 'KINSHASA' },
  { code: 'ANCY', name: 'ANCY', fullName: 'Agence Nationale de Cybersécurité', type: 'AGENCE', provinceCode: 'KINSHASA' },
  { code: 'ONIP', name: 'ONIP', fullName: "Office National d'Identification de la Population", type: 'AGENCE', provinceCode: 'KINSHASA' },
  { code: 'MIS', name: 'MIS', fullName: "Ministère de l'Intérieur et de la Sécurité", type: 'MINISTERE', provinceCode: 'KINSHASA' },
  { code: 'MdJ', name: 'MdJ', fullName: 'Ministère de la Justice', type: 'MINISTERE', provinceCode: 'KINSHASA' },
  { code: 'MCAP', name: 'MCAP', fullName: 'Ministère de la Culture, Arts et Patrimoine', type: 'MINISTERE', provinceCode: 'KINSHASA' },
  { code: 'MEPME', name: 'MEPME', fullName: "Ministère de l'Entrepreneuriat et des PME", type: 'MINISTERE', provinceCode: 'KINSHASA' },
  { code: 'MESU', name: 'MESU', fullName: "Ministère de l'Enseignement Supérieur et Universitaire", type: 'MINISTERE', provinceCode: 'KINSHASA' },
  { code: 'PRESIDENCE', name: 'Présidence', fullName: 'Présidence de la République (ADN)', type: 'MINISTERE', provinceCode: 'KINSHASA' },
  { code: 'PRIMATURE', name: 'Primature', fullName: 'Primature', type: 'MINISTERE', provinceCode: 'KINSHASA' },
  { code: 'MINFIN-CSPP', name: 'MINFIN-CSPP', fullName: 'Ministère des Finances — CSPP', type: 'MINISTERE', provinceCode: 'KINSHASA' },
  { code: 'EBALE', name: 'Ebale', fullName: "Réseau National de Recherche et d'Éducation (NREN)", type: 'AGENCE', provinceCode: 'KINSHASA' },
  { code: 'SCPT', name: 'SCPT', fullName: 'Société Congolaise des Postes et Télécommunications', type: 'AGENCE', provinceCode: 'KINSHASA' },
  { code: 'INACO', name: 'INACO', fullName: 'Institut National des Archives du Congo', type: 'AGENCE', provinceCode: 'KINSHASA' },
  { code: 'PAAF', name: 'PAAF', fullName: "Projet d'Appui à l'Amélioration de l'Éducation des Filles et Femmes", type: 'AUTRE', provinceCode: 'KINSHASA' },
  { code: 'TRANSFORME', name: 'TRANSFORME', fullName: 'Projet TRANSFORME (Entrepreneuriat Féminin)', type: 'AUTRE', provinceCode: 'KINSHASA' },

  // Bailleurs
  { code: 'BM', name: 'Banque mondiale', fullName: 'Banque mondiale — Association Internationale de Développement (IDA)', type: 'BAILLEUR' },
  { code: 'AFD', name: 'AFD', fullName: 'Agence Française de Développement', type: 'BAILLEUR' },
];
