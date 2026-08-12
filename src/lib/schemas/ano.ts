import { z } from "zod";
import {
  ActorSchema,
  AnoObjectTypeSchema,
  ComponentCodeSchema,
  DateOnlySchema,
  DonorSchema,
  GuardrailSchema,
  MoneySchema,
  RefSchema,
  TimestampSchema,
  paginated,
} from "./common";

/**
 * PTN-RDC · Avis de Non-Objection (ANO).
 *
 * Le workflow phare : l'UGP soumet un dossier, le bailleur l'instruit et rend
 * une décision. Le délai de traitement est un indicateur suivi du projet, d'où
 * la modélisation explicite du SLA plutôt qu'un simple « daysLeft » pré-calculé
 * côté serveur — une valeur qui devient fausse dès le lendemain si la page
 * reste ouverte, ce qui arrive en permanence sur un poste de bureau.
 */

export const AnoStatusSchema = z.enum([
  "SOUMIS", // déposé, pas encore pris en charge
  "EN_INSTRUCTION", // le bailleur l'examine
  "CLARIFICATION", // le bailleur a demandé des précisions
  "DELIVRE", // non-objection accordée
  "REJETE", // refusée
  "RETIRE", // retiré par l'UGP
]);
export type AnoStatus = z.infer<typeof AnoStatusSchema>;

/** Statuts encore ouverts — l'inbox se règle sur cette liste. */
export const OPEN_ANO_STATUSES: AnoStatus[] = [
  "SOUMIS",
  "EN_INSTRUCTION",
  "CLARIFICATION",
];

export const AnoEventSchema = z.object({
  id: z.string(),
  at: TimestampSchema,
  kind: z.enum([
    "SOUMISSION",
    "PRISE_EN_CHARGE",
    "DEMANDE_CLARIFICATION",
    "REPONSE_CLARIFICATION",
    "RELANCE",
    "DECISION",
  ]),
  actor: ActorSchema,
  comment: z.string().nullable(),
});
export type AnoEvent = z.infer<typeof AnoEventSchema>;

export const AnoRequestSchema = z.object({
  id: z.string(),
  /** Marché concerné — permet de rejoindre l'initiative. */
  initiativeRef: RefSchema,
  title: z.string(),
  objectType: AnoObjectTypeSchema,
  component: ComponentCodeSchema,
  amount: MoneySchema,

  /**
   * Bailleur instructeur. Un dossier cofinancé donne lieu à DEUX demandes
   * distinctes, une par bailleur : la Banque mondiale et l'AFD instruisent
   * séparément, avec des délais propres. Les fusionner en « BM+AFD » — comme
   * le faisait la version précédente — rend impossible le suivi du délai réel
   * de chacun, alors que c'est un indicateur du projet.
   */
  donor: DonorSchema,

  status: AnoStatusSchema,
  submittedAt: TimestampSchema,
  /** Échéance contractuelle ; l'UI en déduit le retard à l'instant du rendu. */
  dueOn: DateOnlySchema,
  /** Nombre de jours ouvrés prévus au MEP pour ce type de dossier. */
  slaDays: z.int().positive(),
  /** Renseigné dès qu'une décision est rendue. */
  decidedAt: TimestampSchema.nullable(),

  submittedBy: ActorSchema,
  assignedTo: ActorSchema.nullable(),

  summary: z.string(),
  events: z.array(AnoEventSchema),
});
export type AnoRequest = z.infer<typeof AnoRequestSchema>;

export const AnoListSchema = paginated(AnoRequestSchema);
export type AnoList = z.infer<typeof AnoListSchema>;

/* ------------------------------------------------------------------ */
/* Écritures                                                           */
/* ------------------------------------------------------------------ */

/**
 * Décision d'un bailleur.
 *
 * `comment` devient obligatoire pour un rejet ou une demande de clarification :
 * une décision défavorable non motivée est ininstruisible par l'UGP, et le MEP
 * impose la traçabilité des motifs.
 */
export const AnoDecisionSchema = z
  .object({
    decision: z.enum(["DELIVRE", "REJETE", "CLARIFICATION"]),
    comment: z.string().trim().default(""),
  })
  .refine((v) => v.decision === "DELIVRE" || v.comment.length >= 10, {
    path: ["comment"],
    message:
      "Un rejet ou une demande de clarification doit être motivé (10 caractères minimum).",
  });
export type AnoDecision = z.infer<typeof AnoDecisionSchema>;

export const AnoDecisionResultSchema = z.object({
  request: AnoRequestSchema,
  warnings: z.array(GuardrailSchema).default([]),
});

export const AnoQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  donor: DonorSchema.optional(),
  status: AnoStatusSchema.optional(),
  objectType: AnoObjectTypeSchema.optional(),
  /** Restreint aux dossiers encore ouverts — vue par défaut de l'inbox. */
  openOnly: z
    .enum(["true", "false"])
    .transform((v) => v === "true")
    .optional(),
  sort: z.enum(["dueOn", "submittedAt", "amount"]).default("dueOn"),
  order: z.enum(["asc", "desc"]).default("asc"),
});
export type AnoQuery = z.infer<typeof AnoQuerySchema>;
