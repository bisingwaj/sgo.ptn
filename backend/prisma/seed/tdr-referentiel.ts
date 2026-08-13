/**
 * PTN-RDC · Référentiel de passation et bibliothèques TDR.
 *
 * Sources :
 *  - Règlements de Passation des Marchés BM pour Emprunteurs IPF,
 *    édition de février 2025
 *  - PPSD du PTN-RDC
 *  - MEP § 9 (passation) et § 15.4 (sélecteur de TDR)
 *
 * Le contenu des bibliothèques provient de `data/tdr-referentiel.json`,
 * extrait une fois pour toutes du registre qui vivait côté frontend. Ce
 * fichier fige le contenu initial ; les évolutions passent désormais par
 * le panneau d'administration, qui versionne chaque clause. Il n'est donc
 * pas destiné à être régénéré.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export type ProcurementCategoryName =
  | 'TRAVAUX'
  | 'FOURNITURES'
  | 'SERVICES_NON_CONSULTANTS'
  | 'SERVICES_CONSULTANTS';

export interface MethodDef {
  code: string;
  label: string;
  category: ProcurementCategoryName;
  description: string;
  /** Méthode d'exception : ne se déduit jamais d'un montant */
  isException?: boolean;
}

/** Méthodes de passation — MEP § 9.1. */
export const PROCUREMENT_METHODS: MethodDef[] = [
  // Travaux, fournitures, services non-consultants
  { code: 'AOI', label: 'Appel d’Offres International', category: 'TRAVAUX', description: 'Concurrence internationale ouverte. Revue préalable systématique.' },
  { code: 'AON', label: 'Appel d’Offres National', category: 'TRAVAUX', description: 'Concurrence nationale, sous les seuils AOI. Revue postérieure sur échantillon.' },
  { code: 'DC', label: 'Demande de Cotation', category: 'FOURNITURES', description: 'Consultation de fournisseurs pour les petits montants. Revue postérieure.' },
  { code: 'MD', label: 'Marché Direct (gré à gré)', category: 'FOURNITURES', description: 'Exception justifiée par l’urgence ou la source unique. Revue préalable systématique et déclaration de conflit d’intérêts.', isException: true },
  { code: 'AC', label: 'Accord-Cadre', category: 'FOURNITURES', description: 'Besoins répétitifs : préqualification puis tirage.', isException: true },

  // Services de consultants
  { code: 'SFQC', label: 'Sélection Fondée sur la Qualité et le Coût', category: 'SERVICES_CONSULTANTS', description: 'Méthode standard. Pondération 80/20 ou 90/10 qualité/coût.' },
  { code: 'SBQ', label: 'Sélection Basée sur la Qualité', category: 'SERVICES_CONSULTANTS', description: 'Études complexes et conseils stratégiques, où la qualité prime largement.' },
  { code: 'SCBD', label: 'Sélection au Coût/Budget Déterminé', category: 'SERVICES_CONSULTANTS', description: 'Budget connu : meilleure offre technique dans l’enveloppe.' },
  { code: 'SMC', label: 'Sélection au Moindre Coût', category: 'SERVICES_CONSULTANTS', description: 'Tâches standard à qualité minimale requise.' },
  { code: 'SQC', label: 'Sélection sur Qualifications des Consultants', category: 'SERVICES_CONSULTANTS', description: 'Petites missions.' },
  { code: 'CI', label: 'Consultant Individuel', category: 'SERVICES_CONSULTANTS', description: 'Mission confiée à une personne physique, sans firme.' },
  { code: 'SS', label: 'Sélection par Source Unique', category: 'SERVICES_CONSULTANTS', description: 'Exception justifiée. Revue préalable systématique.', isException: true },
];

export interface ThresholdDef {
  methodCode: string;
  category: ProcurementCategoryName;
  minUsd?: number;
  maxUsd?: number;
  reviewType: 'PRIOR' | 'POST';
  note?: string;
}

/**
 * Seuils PTN-RDC. Bornes en USD ; `maxUsd` absent signifie « sans plafond ».
 * Ces valeurs conditionnent la méthode applicable et le type de revue :
 * elles sont destinées à être ajustées depuis le panneau d'administration
 * à chaque évolution des règlements.
 */
export const THRESHOLDS: ThresholdDef[] = [
  { methodCode: 'AOI', category: 'TRAVAUX', minUsd: 15_000_000, reviewType: 'PRIOR' },
  { methodCode: 'AOI', category: 'FOURNITURES', minUsd: 4_000_000, reviewType: 'PRIOR' },
  { methodCode: 'AOI', category: 'SERVICES_NON_CONSULTANTS', minUsd: 4_000_000, reviewType: 'PRIOR' },

  { methodCode: 'AON', category: 'TRAVAUX', maxUsd: 15_000_000, reviewType: 'POST', note: 'Revue postérieure sur échantillon.' },
  { methodCode: 'AON', category: 'FOURNITURES', maxUsd: 4_000_000, reviewType: 'POST', note: 'Revue postérieure sur échantillon.' },
  { methodCode: 'AON', category: 'SERVICES_NON_CONSULTANTS', maxUsd: 4_000_000, reviewType: 'POST', note: 'Revue postérieure sur échantillon.' },

  { methodCode: 'DC', category: 'FOURNITURES', maxUsd: 100_000, reviewType: 'POST' },
  { methodCode: 'DC', category: 'SERVICES_NON_CONSULTANTS', maxUsd: 100_000, reviewType: 'POST' },

  { methodCode: 'MD', category: 'TRAVAUX', reviewType: 'PRIOR', note: 'Exception justifiée. Déclaration de conflit d’intérêts obligatoire.' },
  { methodCode: 'MD', category: 'FOURNITURES', reviewType: 'PRIOR', note: 'Exception justifiée. Déclaration de conflit d’intérêts obligatoire.' },

  { methodCode: 'SQC', category: 'SERVICES_CONSULTANTS', maxUsd: 200_000, reviewType: 'POST', note: 'Petites missions.' },
  { methodCode: 'SFQC', category: 'SERVICES_CONSULTANTS', minUsd: 200_000, reviewType: 'PRIOR' },
  { methodCode: 'SS', category: 'SERVICES_CONSULTANTS', reviewType: 'PRIOR', note: 'Exception justifiée.' },
];

export type OriginName = 'UGP' | 'PARTENAIRE' | 'BAILLEUR' | 'SBP';

export interface TdrTypeMeta {
  slug: string;
  familyLabel: string;
  /**
   * Origines autorisées à rédiger. BAILLEUR n'apparaît nulle part :
   * « Bailleurs : consultation et émission d'ANO uniquement » (MEP § 15.4).
   */
  allowedOrigins: OriginName[];
  stepCount: number;
  requiresPges?: boolean;
  displayOrder: number;
  /**
   * Convention de denomination du marche. Le tiret plutot qu'une preposition :
   * un gabarit « Travaux de {{ptbaTitle}} » produit « Travaux de SOC national »
   * la ou il faudrait « du ». L'elision francaise ne se resout pas par
   * concatenation, et l'intitule doit rester juste quel que soit le libelle.
   */
  titleTemplate: string;
}

const FAMILY_LABELS: Record<number, string> = {
  1: 'Passation classique',
  2: 'Activités opérationnelles',
  3: 'Subventions & contrôles',
};

/** Métadonnées des 11 types officiels. `generic` est ignoré : ce n'est pas un type du MEP. */
export const TDR_TYPE_META: Record<string, TdrTypeMeta> = {
  travaux: { slug: 'travaux', titleTemplate: 'Travaux — {{ptbaTitle}}', familyLabel: FAMILY_LABELS[1], allowedOrigins: ['UGP'], stepCount: 5, requiresPges: true, displayOrder: 1 },
  fournitures: { slug: 'fournitures', titleTemplate: 'Fourniture et installation — {{ptbaTitle}}', familyLabel: FAMILY_LABELS[1], allowedOrigins: ['UGP', 'PARTENAIRE'], stepCount: 5, displayOrder: 2 },
  'services-consultants': { slug: 'services-consultants', titleTemplate: 'Services de consultants — {{ptbaTitle}}', familyLabel: FAMILY_LABELS[1], allowedOrigins: ['UGP', 'PARTENAIRE'], stepCount: 5, displayOrder: 3 },
  'services-non-consultants': { slug: 'services-non-consultants', titleTemplate: 'Services non intellectuels — {{ptbaTitle}}', familyLabel: FAMILY_LABELS[1], allowedOrigins: ['UGP', 'PARTENAIRE'], stepCount: 5, displayOrder: 4 },

  atelier: { slug: 'atelier', titleTemplate: 'Atelier — {{ptbaTitle}}', familyLabel: FAMILY_LABELS[2], allowedOrigins: ['UGP', 'PARTENAIRE', 'SBP'], stepCount: 5, displayOrder: 5 },
  formation: { slug: 'formation', titleTemplate: 'Formation — {{ptbaTitle}}', familyLabel: FAMILY_LABELS[2], allowedOrigins: ['UGP', 'PARTENAIRE', 'SBP'], stepCount: 5, displayOrder: 6 },
  mission: { slug: 'mission', titleTemplate: 'Mission internationale — {{ptbaTitle}}', familyLabel: FAMILY_LABELS[2], allowedOrigins: ['UGP', 'PARTENAIRE', 'SBP'], stepCount: 4, displayOrder: 7 },
  etude: { slug: 'etude', titleTemplate: 'Étude — {{ptbaTitle}}', familyLabel: FAMILY_LABELS[2], allowedOrigins: ['UGP', 'PARTENAIRE', 'SBP'], stepCount: 5, displayOrder: 8 },
  communication: { slug: 'communication', titleTemplate: 'Communication et sensibilisation — {{ptbaTitle}}', familyLabel: FAMILY_LABELS[2], allowedOrigins: ['UGP', 'PARTENAIRE', 'SBP'], stepCount: 4, displayOrder: 9 },

  sbp: { slug: 'sbp', titleTemplate: 'Sous-projet SBP — {{ptbaTitle}}', familyLabel: FAMILY_LABELS[3], allowedOrigins: ['UGP', 'SBP', 'PARTENAIRE'], stepCount: 6, displayOrder: 10 },
  audit: { slug: 'audit', titleTemplate: 'Audit — {{ptbaTitle}}', familyLabel: FAMILY_LABELS[3], allowedOrigins: ['UGP'], stepCount: 5, displayOrder: 11 },
};

// ============================================================
// Contenu extrait du registre frontend
// ============================================================

export interface ExtractedClause {
  label: string;
  text: string;
  cat: 'reg' | 'tech' | 'conf' | 'safe' | 'gov';
}
export interface ExtractedIndicator {
  label: string;
  measure: string;
  target: string;
}
export interface ExtractedRisk {
  label: string;
  description: string;
  mitigation: string;
  level: 'faible' | 'modéré' | 'substantiel' | 'élevé';
}
export interface ExtractedType {
  slug: string;
  code: string;
  name: string;
  family: number;
  defaultMethod: string | null;
  contextTemplate: string;
  clauses: ExtractedClause[];
  indicators: ExtractedIndicator[];
  risks: ExtractedRisk[];
}
export interface ExtractedPayload {
  types: ExtractedType[];
  crossIndicators: ExtractedIndicator[];
  crossRisks: ExtractedRisk[];
}

export function loadExtractedContent(): ExtractedPayload {
  const path = join(__dirname, 'data', 'tdr-referentiel.json');
  return JSON.parse(readFileSync(path, 'utf8')) as ExtractedPayload;
}

export const CLAUSE_CATEGORY: Record<ExtractedClause['cat'], 'REG' | 'TECH' | 'CONF' | 'SAFE' | 'GOV'> = {
  reg: 'REG',
  tech: 'TECH',
  conf: 'CONF',
  safe: 'SAFE',
  gov: 'GOV',
};

export const RISK_LEVEL: Record<ExtractedRisk['level'], 'FAIBLE' | 'MODERE' | 'SUBSTANTIEL' | 'ELEVE'> = {
  faible: 'FAIBLE',
  modéré: 'MODERE',
  substantiel: 'SUBSTANTIEL',
  élevé: 'ELEVE',
};

/**
 * Clé stable partagée par toutes les versions d'un même élément de
 * bibliothèque. Dérivée du libellé : deux versions successives d'une
 * clause gardent la même clé, ce qui permet de les relier.
 */
export function familyKeyFor(scope: string, label: string): string {
  const slug = label
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);
  return `${scope}:${slug}`;
}
