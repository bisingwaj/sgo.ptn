import "server-only";

import type { Guardrail } from "@/lib/schemas/common";
import type { AnoDecision, AnoQuery, AnoRequest } from "@/lib/schemas/ano";
import { OPEN_ANO_STATUSES } from "@/lib/schemas/ano";
import type { Initiative, InitiativeQuery } from "@/lib/schemas/initiative";
import { INITIATIVES } from "./fixtures/initiatives";
import { ANO_REQUESTS } from "./fixtures/ano";

/**
 * Magasin de données en mémoire.
 *
 * Tient lieu de base tant que le backend NestJS n'expose pas ces domaines.
 * Les écritures survivent le temps du processus, ce qui suffit à éprouver les
 * parcours (décider un ANO, voir la liste se mettre à jour) sans PostgreSQL.
 *
 * Le module est marqué `server-only` : une importation accidentelle depuis un
 * composant client échouerait à la compilation plutôt que d'expédier les
 * jeux de données au navigateur.
 *
 * IMPORTANT — ce fichier n'est pas un brouillon jetable. Les règles métier
 * qu'il applique (garde-fous ci-dessous) sont la spécification que le backend
 * devra reprendre. Elles vivent ici parce que l'interface les découvre en
 * premier, pas parce qu'elles sont provisoires.
 */

/* ------------------------------------------------------------------ */
/* État                                                                */
/* ------------------------------------------------------------------ */

// Copies défensives : les fixtures restent la référence immuable.
const initiatives: Initiative[] = INITIATIVES.map((i) => structuredClone(i));
const anoRequests: AnoRequest[] = ANO_REQUESTS.map((a) => structuredClone(a));

/* ------------------------------------------------------------------ */
/* Initiatives                                                         */
/* ------------------------------------------------------------------ */

export function listInitiatives(q: InitiativeQuery) {
  let rows = initiatives.slice();

  if (q.component) rows = rows.filter((r) => r.component === q.component);
  if (q.status) rows = rows.filter((r) => r.status === q.status);
  if (q.donor) rows = rows.filter((r) => r.donors.includes(q.donor!));
  if (q.q) {
    const needle = q.q.toLowerCase();
    rows = rows.filter(
      (r) =>
        r.ref.toLowerCase().includes(needle) ||
        r.title.toLowerCase().includes(needle),
    );
  }

  const dir = q.order === "asc" ? 1 : -1;
  rows.sort((a, b) => {
    switch (q.sort) {
      case "amount":
        return (a.amount.minor - b.amount.minor) * dir;
      case "ref":
        return a.ref.localeCompare(b.ref) * dir;
      case "dueOn":
        // Les activités sans échéance passent en dernier, quel que soit le sens.
        if (!a.currentStageDueOn) return 1;
        if (!b.currentStageDueOn) return -1;
        return a.currentStageDueOn.localeCompare(b.currentStageDueOn) * dir;
      default:
        return a.updatedAt.localeCompare(b.updatedAt) * dir;
    }
  });

  const total = rows.length;
  const start = (q.page - 1) * q.pageSize;

  return {
    items: rows.slice(start, start + q.pageSize),
    total,
    page: q.page,
    pageSize: q.pageSize,
  };
}

export function getInitiative(ref: string): Initiative | undefined {
  return initiatives.find((i) => i.ref === ref);
}

/* ------------------------------------------------------------------ */
/* ANO                                                                 */
/* ------------------------------------------------------------------ */

export function listAno(q: AnoQuery) {
  let rows = anoRequests.slice();

  if (q.donor) rows = rows.filter((r) => r.donor === q.donor);
  if (q.status) rows = rows.filter((r) => r.status === q.status);
  if (q.objectType) rows = rows.filter((r) => r.objectType === q.objectType);
  if (q.openOnly) rows = rows.filter((r) => OPEN_ANO_STATUSES.includes(r.status));

  const dir = q.order === "asc" ? 1 : -1;
  rows.sort((a, b) => {
    switch (q.sort) {
      case "amount":
        return (a.amount.minor - b.amount.minor) * dir;
      case "submittedAt":
        return a.submittedAt.localeCompare(b.submittedAt) * dir;
      default:
        return a.dueOn.localeCompare(b.dueOn) * dir;
    }
  });

  const total = rows.length;
  const start = (q.page - 1) * q.pageSize;

  return {
    items: rows.slice(start, start + q.pageSize),
    total,
    page: q.page,
    pageSize: q.pageSize,
  };
}

export function getAno(id: string): AnoRequest | undefined {
  return anoRequests.find((a) => a.id === id);
}

/* ------------------------------------------------------------------ */
/* Garde-fous — spécification métier destinée au backend               */
/* ------------------------------------------------------------------ */

export interface DecisionOutcome {
  request?: AnoRequest;
  blockers: Guardrail[];
  warnings: Guardrail[];
}

/**
 * Applique une décision de bailleur sur une demande d'ANO.
 *
 * Les règles ci-dessous découlent du MEP § 15.5 et du Règlement de passation
 * des marchés de la Banque mondiale (février 2025). Elles sont volontairement
 * appliquées ici, côté serveur, et pas seulement en désactivant un bouton :
 * une interdiction qui n'existe que dans l'interface n'est pas une règle, c'est
 * une suggestion.
 */
export function decideAno(
  id: string,
  decision: AnoDecision,
  actorProfile: string,
): DecisionOutcome {
  const blockers: Guardrail[] = [];
  const warnings: Guardrail[] = [];

  const request = getAno(id);
  if (!request) return { blockers, warnings };

  // Seul un bailleur rend une non-objection. L'UGP soumet, elle ne décide pas.
  if (actorProfile !== "BAILLEUR") {
    blockers.push({
      code: "ANO_DECISION_RESERVEE_BAILLEUR",
      message:
        "Seul un bailleur peut se prononcer sur une demande de non-objection.",
      reference: "MEP § 15.5",
    });
  }

  // Un dossier déjà tranché ne se retranche pas : il faudrait un nouveau dépôt.
  if (!OPEN_ANO_STATUSES.includes(request.status)) {
    blockers.push({
      code: "ANO_DEJA_CLOTURE",
      message: `Cette demande est déjà close (${request.status}). Une nouvelle soumission est nécessaire.`,
    });
  }

  if (blockers.length > 0) return { blockers, warnings };

  // Avertissement — informe sans bloquer : la décision reste au bailleur.
  if (request.dueOn < new Date().toISOString().slice(0, 10)) {
    warnings.push({
      code: "ANO_HORS_DELAI",
      message:
        "Décision rendue au-delà de l'échéance : ce dossier pèsera sur l'indicateur de délai moyen.",
    });
  }

  const now = new Date().toISOString();
  const decided = decision.decision !== "CLARIFICATION";

  request.status =
    decision.decision === "DELIVRE"
      ? "DELIVRE"
      : decision.decision === "REJETE"
        ? "REJETE"
        : "CLARIFICATION";
  request.decidedAt = decided ? now : null;
  request.events = [
    ...request.events,
    {
      id: `ev-${id}-${request.events.length + 1}`,
      at: now,
      kind: decided ? "DECISION" : "DEMANDE_CLARIFICATION",
      actor: request.assignedTo ?? request.submittedBy,
      comment: decision.comment || null,
    },
  ];

  // Répercussion sur l'initiative : les deux vues doivent concorder.
  const initiative = getInitiative(request.initiativeRef);
  if (initiative) {
    if (decision.decision === "DELIVRE") {
      initiative.status = "ANO_DELIVRE";
      initiative.currentStage = "DAO";
    } else if (decision.decision === "REJETE") {
      initiative.status = "ANO_REJETE";
    } else {
      initiative.status = "ANO_CLARIFICATION";
    }
    initiative.updatedAt = now;
  }

  return { request, blockers, warnings };
}

/** Compteurs du cockpit — calculés côté serveur pour éviter de tout charger. */
export function anoStats() {
  const open = anoRequests.filter((a) => OPEN_ANO_STATUSES.includes(a.status));
  const today = new Date().toISOString().slice(0, 10);

  return {
    open: open.length,
    overdue: open.filter((a) => a.dueOn < today).length,
    byDonor: {
      IDA: open.filter((a) => a.donor === "IDA").length,
      AFD: open.filter((a) => a.donor === "AFD").length,
    },
    /** Délai moyen constaté sur les dossiers tranchés, en jours. */
    averageDecisionDays: (() => {
      const decided = anoRequests.filter((a) => a.decidedAt);
      if (decided.length === 0) return null;
      const total = decided.reduce((sum, a) => {
        const days =
          (Date.parse(a.decidedAt!) - Date.parse(a.submittedAt)) / 86_400_000;
        return sum + days;
      }, 0);
      return Math.round((total / decided.length) * 10) / 10;
    })(),
  };
}
