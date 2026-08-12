import { z } from "zod";
import {
  ActorSchema,
  ComponentCodeSchema,
  DateOnlySchema,
  DonorSchema,
  MoneySchema,
  ProcurementMethodSchema,
  RefSchema,
  RiskLevelSchema,
  TimestampSchema,
  paginated,
} from "./common";

/**
 * PTN-RDC · Initiative / marché.
 *
 * Objet central du produit : une activité inscrite au PTBA, qui traverse le
 * cycle de passation jusqu'à l'attribution du marché.
 */

/**
 * Étapes du cycle de passation, dans l'ordre.
 *
 * Un tableau ordonné plutôt qu'un simple enum : la position dans le cycle est
 * une information d'affichage (« étape 4 sur 7 ») qu'on veut dériver du
 * contrat, sans la dupliquer dans chaque écran.
 */
export const PIPELINE_STAGES = [
  "INITIATIVE",
  "TDR",
  "REVUE_UGP",
  "ANO",
  "DAO",
  "EVALUATION",
  "ATTRIBUTION",
] as const;

export const PipelineStageSchema = z.enum(PIPELINE_STAGES);
export type PipelineStage = z.infer<typeof PipelineStageSchema>;

export function stageIndex(stage: PipelineStage): number {
  return PIPELINE_STAGES.indexOf(stage);
}

export const InitiativeStatusSchema = z.enum([
  "BROUILLON",
  "EN_REVUE_UGP",
  "ANO_EN_ATTENTE",
  "ANO_CLARIFICATION",
  "ANO_DELIVRE",
  "ANO_REJETE",
  "PUBLIE",
  "EN_EVALUATION",
  "ATTRIBUE",
  "ANNULE",
]);
export type InitiativeStatus = z.infer<typeof InitiativeStatusSchema>;

/** Répartition du financement entre les deux guichets. */
export const FundingSplitSchema = z.object({
  ida: MoneySchema,
  afd: MoneySchema,
});

export const DocumentRefSchema = z.object({
  id: z.string(),
  name: z.string(),
  kind: z.enum(["TDR", "DAO", "ANNEXE", "NOTE", "PV", "CONTRAT"]),
  /** Taille en octets — la mise en forme (« 2,4 Mo ») est faite au rendu. */
  sizeBytes: z.int().nonnegative(),
  uploadedAt: TimestampSchema,
  status: z.enum(["BROUILLON", "EN_REVUE", "SIGNE"]),
});

export const TimelineEntrySchema = z.object({
  stage: PipelineStageSchema,
  status: z.enum(["FAIT", "EN_COURS", "A_VENIR"]),
  /** Absent tant que l'étape n'a pas eu lieu. */
  occurredAt: TimestampSchema.nullable(),
  actor: ActorSchema.nullable(),
});

/* ------------------------------------------------------------------ */

export const InitiativeSchema = z.object({
  ref: RefSchema,
  title: z.string().min(1),
  description: z.string(),

  component: ComponentCodeSchema,
  /** Ligne du Plan de Travail et Budget Annuel, ex. « A2.3.1 ». */
  ptbaCode: z.string(),
  procurementMethod: ProcurementMethodSchema,

  status: InitiativeStatusSchema,
  currentStage: PipelineStageSchema,

  amount: MoneySchema,
  funding: FundingSplitSchema,
  donors: z.array(DonorSchema).min(1),

  riskES: RiskLevelSchema,
  /** Revue préalable du bailleur requise (seuil dépassé). */
  priorReview: z.boolean(),

  /** Code province ; national quand l'activité n'est pas localisée. */
  provinceCode: z.string().nullable(),

  team: z.array(ActorSchema),
  documents: z.array(DocumentRefSchema),
  timeline: z.array(TimelineEntrySchema),

  createdAt: TimestampSchema,
  updatedAt: TimestampSchema,
  /** Échéance de l'étape courante — sert au calcul de retard côté UI. */
  currentStageDueOn: DateOnlySchema.nullable(),

  /**
   * Marque les contenus produits ou suggérés par un modèle.
   *
   * Le MEP pose que « les acteurs restent décisionnaires » : une suggestion
   * doit donc être visiblement distinguée d'une donnée saisie ou validée par
   * un agent. Ce drapeau porte le marqueur violet dans l'interface.
   */
  hasAiSuggestions: z.boolean(),
});

export type Initiative = z.infer<typeof InitiativeSchema>;

export const InitiativeListSchema = paginated(InitiativeSchema);
export type InitiativeList = z.infer<typeof InitiativeListSchema>;

/* ------------------------------------------------------------------ */
/* Paramètres de requête                                               */
/* ------------------------------------------------------------------ */

export const InitiativeQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  component: ComponentCodeSchema.optional(),
  status: InitiativeStatusSchema.optional(),
  donor: DonorSchema.optional(),
  /** Recherche plein texte sur la référence et l'intitulé. */
  q: z.string().trim().optional(),
  sort: z.enum(["updatedAt", "amount", "ref", "dueOn"]).default("updatedAt"),
  order: z.enum(["asc", "desc"]).default("desc"),
});
export type InitiativeQuery = z.infer<typeof InitiativeQuerySchema>;
