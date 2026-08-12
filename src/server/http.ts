import "server-only";

import { NextResponse } from "next/server";
import { z } from "zod";
import type { Guardrail } from "@/lib/schemas/common";

/**
 * Utilitaires partagés des gestionnaires de route.
 *
 * Objectif : que tous les endpoints échouent de la MÊME façon. Un client qui
 * sait traiter une erreur les sait toutes, et la forme retenue est exactement
 * celle que produit déjà le backend NestJS (`message` / `blockers` /
 * `warnings`) — le jour de la bascule, rien à réécrire côté client.
 */

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

export function fail(
  status: number,
  message: string,
  extra?: { blockers?: Guardrail[]; warnings?: Guardrail[] },
) {
  return NextResponse.json(
    {
      message,
      blockers: extra?.blockers ?? [],
      warnings: extra?.warnings ?? [],
    },
    { status },
  );
}

/** 422 dédié aux règles métier — distinct du 400 de validation de forme. */
export function failGuardrails(blockers: Guardrail[], warnings: Guardrail[] = []) {
  return fail(422, blockers[0]?.message ?? "Action refusée par une règle métier.", {
    blockers,
    warnings,
  });
}

/**
 * Valide les paramètres d'URL contre un schéma.
 *
 * Les messages Zod sont renvoyés tels quels : ils nomment le champ fautif, ce
 * qui rend une erreur d'intégration diagnosticable sans lire le code du serveur.
 */
export function parseQuery<S extends z.ZodType>(
  url: string,
  schema: S,
): { data: z.infer<S>; error: null } | { data: null; error: NextResponse } {
  const params = Object.fromEntries(new URL(url).searchParams);
  const result = schema.safeParse(params);

  if (!result.success) {
    return {
      data: null,
      error: fail(400, "Paramètres de requête invalides.", {
        blockers: result.error.issues.map((i) => ({
          code: `QUERY_${i.path.join("_").toUpperCase() || "ROOT"}`,
          message: `${i.path.join(".") || "requête"} : ${i.message}`,
        })),
      }),
    };
  }
  return { data: result.data, error: null };
}

export async function parseBody<S extends z.ZodType>(
  request: Request,
  schema: S,
): Promise<{ data: z.infer<S>; error: null } | { data: null; error: NextResponse }> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return { data: null, error: fail(400, "Corps de requête JSON illisible.") };
  }

  const result = schema.safeParse(raw);
  if (!result.success) {
    return {
      data: null,
      error: fail(400, "Données invalides.", {
        blockers: result.error.issues.map((i) => ({
          code: `BODY_${i.path.join("_").toUpperCase() || "ROOT"}`,
          message: `${i.path.join(".") || "corps"} : ${i.message}`,
        })),
      }),
    };
  }
  return { data: result.data, error: null };
}

/**
 * Latence simulée.
 *
 * Sans elle, une API locale répond en une milliseconde et donne l'illusion
 * qu'aucun état de chargement n'est nécessaire — puis les squelettes manquants
 * se découvrent en production. Le délai est ici pour que les états de
 * chargement soient conçus, et visibles pendant le développement.
 */
export async function simulateLatency(ms = 220) {
  if (process.env.NODE_ENV === "production") return;
  await new Promise((r) => setTimeout(r, ms));
}
