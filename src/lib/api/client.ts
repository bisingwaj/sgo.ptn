import type { z } from "zod";
import { ApiErrorSchema, type Guardrail } from "@/lib/schemas/common";

/**
 * PTN-RDC · Client HTTP typé.
 *
 * ---------------------------------------------------------------------------
 * BASCULE VERS LE BACKEND
 *
 * Chaque domaine déclare sa source dans DOMAIN_ROUTING. Les domaines déjà
 * livrés par NestJS pointent vers l'API réelle ; les autres vers les
 * gestionnaires de route Next qui servent les données de démonstration.
 *
 * Migrer un domaine = changer une ligne. Aucun composant, aucun hook, aucun
 * schéma n'est touché — c'était l'objectif de cette couche.
 * ---------------------------------------------------------------------------
 */

const NEST_API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";
const MOCK_API = "/api/v1";

type Source = "nest" | "mock";

/**
 * Où vit chaque domaine.
 *
 * État au 12 août 2026 : le backend expose l'authentification, le référentiel
 * et l'administration des comptes. Tout le reste — soit l'essentiel du
 * produit — est servi localement.
 */
const DOMAIN_ROUTING: Record<string, Source> = {
  auth: "nest",
  referentiel: "nest",
  "admin/comptes": "nest",

  initiatives: "mock",
  ano: "mock",
};

function baseFor(path: string): string {
  const domain = Object.keys(DOMAIN_ROUTING)
    .filter((d) => path === `/${d}` || path.startsWith(`/${d}/`))
    // Le préfixe le plus long gagne : « admin/comptes » avant « admin ».
    .sort((a, b) => b.length - a.length)[0];

  return DOMAIN_ROUTING[domain ?? ""] === "nest" ? NEST_API : MOCK_API;
}

/* ------------------------------------------------------------------ */

/**
 * Erreur d'API porteuse des règles métier.
 *
 * `blockers` = l'action a été refusée. `warnings` = elle est passée, mais
 * quelque chose mérite d'être signalé. L'interface doit traiter les deux
 * différemment : bloquer et expliquer d'un côté, informer sans interrompre
 * de l'autre.
 */
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly blockers: Guardrail[] = [],
    readonly warnings: Guardrail[] = [],
  ) {
    super(message);
    this.name = "ApiError";
  }

  /** Refus par une règle métier, par opposition à une panne technique. */
  get isGuardrail(): boolean {
    return this.status === 422 && this.blockers.length > 0;
  }
}

interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  signal?: AbortSignal;
  /** Profil de l'acteur — provisoire, voir la note du endpoint de décision. */
  profile?: string;
}

/**
 * Exécute une requête et VALIDE la réponse contre le schéma attendu.
 *
 * La validation n'est pas une précaution de principe. Ces schémas décrivent un
 * backend qui n'est pas encore écrit : le jour où il remplace les données de
 * démonstration, tout écart — un champ renommé, une date devenue timestamp, un
 * énuméré élargi — doit produire une erreur nette et localisée, ici, plutôt
 * qu'un `undefined` qui se propage jusqu'à un écran vide sans explication.
 */
export async function apiFetch<S extends z.ZodType>(
  path: string,
  schema: S,
  options: RequestOptions = {},
): Promise<z.infer<S>> {
  const { method = "GET", body, signal, profile } = options;

  const response = await fetch(`${baseFor(path)}${path}`, {
    method,
    signal,
    headers: {
      "Content-Type": "application/json",
      ...(profile ? { "x-ptn-profile": profile } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    const parsed = ApiErrorSchema.safeParse(payload);

    throw parsed.success
      ? new ApiError(
          parsed.data.message,
          response.status,
          parsed.data.blockers,
          parsed.data.warnings,
        )
      : new ApiError(
          `Erreur ${response.status} sur ${path}`,
          response.status,
        );
  }

  const json = await response.json();
  const result = schema.safeParse(json);

  if (!result.success) {
    // Journalisé en clair : c'est le symptôme d'une divergence de contrat entre
    // le frontend et le backend, et il doit être immédiatement diagnosticable.
    console.error(
      `[api] Réponse non conforme au contrat sur ${path}`,
      result.error.issues,
    );
    throw new ApiError(
      `La réponse de ${path} ne correspond pas au contrat attendu.`,
      response.status,
    );
  }

  return result.data;
}

/** Construit une chaîne de requête en omettant les valeurs vides. */
export function qs(params: Record<string, string | number | boolean | undefined>) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") search.set(key, String(value));
  }
  const str = search.toString();
  return str ? `?${str}` : "";
}
