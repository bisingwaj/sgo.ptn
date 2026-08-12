import { z } from "zod";

/**
 * PTN-RDC · Vocabulaire partagé du contrat d'API.
 *
 * ---------------------------------------------------------------------------
 * RÈGLE FONDATRICE : l'API transporte des DONNÉES, l'interface en fait la
 * PRÉSENTATION.
 *
 * Les jeux de données de la version précédente stockaient du rendu :
 * `amount: "8,7 M USD"`, `lastAction: "il y a 2h"`, `componentTone: "purple"`.
 * Trois problèmes, dans l'ordre de gravité :
 *
 *   1. Intraduisible. « il y a 2h » et la virgule décimale française ne
 *      survivent pas au passage en anglais, exigé pour les TTL de la Banque
 *      mondiale.
 *   2. Incalculable. On ne trie pas, on n'additionne pas, on ne compare pas
 *      une chaîne « 8,7 M USD ».
 *   3. Mélange des responsabilités. Une teinte est une décision d'interface ;
 *      elle n'a rien à faire dans une réponse d'API.
 *
 * Ici : montants en nombres, dates en ISO 8601, énumérations en codes stables.
 * Le formatage se fait au rendu, via Intl et la locale active.
 * ---------------------------------------------------------------------------
 */

/* ------------------------------------------------------------------ */
/* Primitives                                                          */
/* ------------------------------------------------------------------ */

/** Référence de marché — format imposé par le PPM : PTN-AAAA-NNN. */
export const RefSchema = z
  .string()
  .regex(/^PTN-\d{4}-\d{3}$/, "Référence attendue au format PTN-AAAA-NNN");

/** Date seule, sans heure ni fuseau (échéance, date de séance). */
export const DateOnlySchema = z.iso.date();

/** Horodatage complet — toujours en UTC, converti à l'affichage. */
export const TimestampSchema = z.iso.datetime();

/**
 * Montant monétaire.
 *
 * Stocké en unités entières (centimes de dollar) et non en flottant : un
 * `number` JavaScript ne représente pas 0,1 exactement, et une erreur
 * d'arrondi sur une enveloppe de 510 M USD n'est pas défendable devant un
 * auditeur. La devise voyage avec le montant — le projet est cofinancé en
 * USD et en EUR.
 */
export const MoneySchema = z.object({
  /** Montant en plus petite unité (cents). 8_700_000 USD → 870_000_000 */
  minor: z.int(),
  currency: z.enum(["USD", "EUR", "CDF"]),
});
export type Money = z.infer<typeof MoneySchema>;

/* ------------------------------------------------------------------ */
/* Énumérations métier — alignées sur le MEP du 23 juin 2025           */
/* ------------------------------------------------------------------ */

/** Bailleurs. IDA = Banque mondiale (400 M USD), AFD (110 M USD). */
export const DonorSchema = z.enum(["IDA", "AFD"]);
export type Donor = z.infer<typeof DonorSchema>;

/** Composantes du projet — MEP Tableau 2. C5 (CERC) n'est pas dotée. */
export const ComponentCodeSchema = z.enum(["C1", "C2", "C3", "C4", "C5"]);
export type ComponentCode = z.infer<typeof ComponentCodeSchema>;

/**
 * Niveau de risque environnemental et social.
 * Le projet est classé « Substantiel » au global (E&S et EAS/HS).
 */
export const RiskLevelSchema = z.enum([
  "FAIBLE",
  "MODERE",
  "SUBSTANTIEL",
  "ELEVE",
]);
export type RiskLevel = z.infer<typeof RiskLevelSchema>;

/**
 * Méthodes de passation — Règlement de Passation des Marchés
 * de la Banque mondiale, février 2025.
 */
export const ProcurementMethodSchema = z.enum([
  "AOI", // Appel d'offres international
  "AON", // Appel d'offres national
  "SFQC", // Sélection fondée sur la qualité et le coût
  "SBQ", // Sélection fondée sur la qualité
  "CQS", // Sélection fondée sur les qualifications du consultant
  "MD", // Marché de gré à gré (entente directe)
  "SBP", // Subvention basée sur la performance
]);
export type ProcurementMethod = z.infer<typeof ProcurementMethodSchema>;

/** Nature du dossier soumis à non-objection. */
export const AnoObjectTypeSchema = z.enum([
  "TDR",
  "DAO",
  "PV_EVALUATION",
  "CONTRAT",
  "AVENANT",
]);
export type AnoObjectType = z.infer<typeof AnoObjectTypeSchema>;

/** Les 8 profils. Majuscules pour rester aligné sur le backend NestJS. */
export const ProfileKeySchema = z.enum([
  "UGP",
  "MDA",
  "PARTENAIRE",
  "BAILLEUR",
  "SOUMISSIONNAIRE",
  "SBP",
  "AUDITEUR",
  "GOUVERNANCE",
]);
export type ProfileKeyApi = z.infer<typeof ProfileKeySchema>;

/* ------------------------------------------------------------------ */
/* Acteurs                                                             */
/* ------------------------------------------------------------------ */

export const ActorSchema = z.object({
  id: z.string(),
  /** Nom affiché tel qu'enregistré — jamais reconstruit côté client. */
  displayName: z.string(),
  role: z.string(),
  organisationCode: z.string(),
  organisationName: z.string(),
});
export type Actor = z.infer<typeof ActorSchema>;

/* ------------------------------------------------------------------ */
/* Enveloppes de réponse                                               */
/* ------------------------------------------------------------------ */

/**
 * Pagination. `total` est indispensable : sans lui, impossible d'afficher
 * « 78 marchés » sans tout télécharger — or ce compteur est en tête du
 * cockpit UGP.
 */
export function paginated<T extends z.ZodType>(item: T) {
  return z.object({
    items: z.array(item),
    total: z.int().nonnegative(),
    page: z.int().positive(),
    pageSize: z.int().positive(),
  });
}

/**
 * Règle métier renvoyée par les garde-fous.
 *
 * Cette forme reproduit exactement celle déjà produite par le backend NestJS
 * (`Guardrail` dans src/lib/api.ts) : le jour de la bascule, le client n'a
 * rien à réapprendre.
 *
 * `blockers` interdit l'action ; `warnings` la laisse passer en alertant.
 * La distinction compte : un dépassement de seuil d'ANO bloque, un délai
 * SLA tendu avertit.
 */
export const GuardrailSchema = z.object({
  code: z.string(),
  message: z.string(),
  /** Article du MEP fondant la règle — affiché pour que l'agent puisse vérifier. */
  reference: z.string().optional(),
});
export type Guardrail = z.infer<typeof GuardrailSchema>;

export const ApiErrorSchema = z.object({
  message: z.string(),
  blockers: z.array(GuardrailSchema).default([]),
  warnings: z.array(GuardrailSchema).default([]),
});
