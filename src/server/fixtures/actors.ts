import type { Actor } from "@/lib/schemas/common";

/**
 * Acteurs de démonstration.
 *
 * Personnes fictives, organisations réelles : ANIE, ARPTC, ONIP et les
 * bailleurs existent et figurent au MEP ; les noms de personnes sont inventés
 * et ne doivent jamais être remplacés par ceux d'agents réels dans un jeu de
 * démonstration.
 */

export const ACTORS = {
  coordonnateur: {
    id: "usr-001",
    displayName: "S. Mbuyi",
    role: "Coordonnateur",
    organisationCode: "UGPTN",
    organisationName: "Unité de Gestion du Projet de Transformation Numérique",
  },
  rpm: {
    id: "usr-002",
    displayName: "P. Kabongo",
    role: "Responsable Passation des Marchés",
    organisationCode: "UGPTN",
    organisationName: "Unité de Gestion du Projet de Transformation Numérique",
  },
  raf: {
    id: "usr-003",
    displayName: "M. Tshibangu",
    role: "Responsable Administratif et Financier",
    organisationCode: "UGPTN",
    organisationName: "Unité de Gestion du Projet de Transformation Numérique",
  },
  speEs: {
    id: "usr-004",
    displayName: "A. Mukasa",
    role: "Spécialiste Développement Social",
    organisationCode: "UGPTN",
    organisationName: "Unité de Gestion du Projet de Transformation Numérique",
  },
  rc1: {
    id: "usr-005",
    displayName: "D. Ilunga",
    role: "Responsable Composante 1",
    organisationCode: "UGPTN",
    organisationName: "Unité de Gestion du Projet de Transformation Numérique",
  },
  rc2: {
    id: "usr-006",
    displayName: "J. Mukendi",
    role: "Responsable Composante 2",
    organisationCode: "UGPTN",
    organisationName: "Unité de Gestion du Projet de Transformation Numérique",
  },
  ttlBm: {
    id: "usr-101",
    displayName: "L. Walker",
    role: "Task Team Leader",
    organisationCode: "BM",
    organisationName: "Banque mondiale (IDA)",
  },
  specialisteBm: {
    id: "usr-102",
    displayName: "R. Nkemba",
    role: "Spécialiste passation des marchés",
    organisationCode: "BM",
    organisationName: "Banque mondiale (IDA)",
  },
  refAfd: {
    id: "usr-201",
    displayName: "C. Lefèvre",
    role: "Référent projet",
    organisationCode: "AFD",
    organisationName: "Agence Française de Développement",
  },
  anie: {
    id: "usr-301",
    displayName: "T. Kalala",
    role: "Point focal projet",
    organisationCode: "ANIE",
    organisationName: "Agence Nationale de l'Identité et de l'État civil",
  },
  arptc: {
    id: "usr-302",
    displayName: "B. Mwamba",
    role: "Coordonnateur agence partenaire",
    organisationCode: "ARPTC",
    organisationName:
      "Autorité de Régulation de la Poste et des Télécommunications du Congo",
  },
} as const satisfies Record<string, Actor>;

export type ActorKey = keyof typeof ACTORS;
