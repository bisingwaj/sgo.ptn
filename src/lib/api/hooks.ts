"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryOptions,
} from "@tanstack/react-query";
import { z } from "zod";
import {
  AnoDecisionResultSchema,
  AnoListSchema,
  AnoRequestSchema,
  type AnoDecision,
  type AnoQuery,
} from "@/lib/schemas/ano";
import {
  InitiativeListSchema,
  InitiativeSchema,
  type InitiativeQuery,
} from "@/lib/schemas/initiative";
import { apiFetch, qs } from "./client";

/**
 * Accès aux données par domaine.
 *
 * Les composants n'appellent jamais `fetch` directement : ils consomment ces
 * hooks. Conséquence pratique — le cache, les états de chargement, les
 * nouvelles tentatives et l'invalidation sont traités une fois, ici, et non
 * réinventés dans chacun des 61 écrans.
 */

/* ------------------------------------------------------------------ */
/* Clés de cache                                                       */
/* ------------------------------------------------------------------ */

/**
 * Clés hiérarchiques : invalider `["ano"]` invalide la liste ET les fiches ET
 * les compteurs. C'est ce qui permet à une décision de rafraîchir le cockpit
 * sans que le code de la mutation ait à connaître les écrans concernés.
 */
export const queryKeys = {
  initiatives: {
    all: ["initiatives"] as const,
    list: (q: Partial<InitiativeQuery>) => ["initiatives", "list", q] as const,
    detail: (ref: string) => ["initiatives", "detail", ref] as const,
  },
  ano: {
    all: ["ano"] as const,
    list: (q: Partial<AnoQuery>) => ["ano", "list", q] as const,
    detail: (id: string) => ["ano", "detail", id] as const,
    stats: () => ["ano", "stats"] as const,
  },
};

/* ------------------------------------------------------------------ */
/* Initiatives                                                         */
/* ------------------------------------------------------------------ */

export function useInitiatives(query: Partial<InitiativeQuery> = {}) {
  return useQuery({
    queryKey: queryKeys.initiatives.list(query),
    queryFn: ({ signal }) =>
      apiFetch(`/initiatives${qs(query)}`, InitiativeListSchema, { signal }),
  });
}

export function useInitiative(
  ref: string | null,
  options?: Partial<UseQueryOptions<z.infer<typeof InitiativeSchema>>>,
) {
  return useQuery({
    queryKey: queryKeys.initiatives.detail(ref ?? ""),
    queryFn: ({ signal }) =>
      apiFetch(`/initiatives/${ref}`, InitiativeSchema, { signal }),
    enabled: Boolean(ref),
    ...options,
  });
}

/* ------------------------------------------------------------------ */
/* ANO                                                                 */
/* ------------------------------------------------------------------ */

export function useAnoInbox(query: Partial<AnoQuery> = {}) {
  return useQuery({
    queryKey: queryKeys.ano.list(query),
    queryFn: ({ signal }) => apiFetch(`/ano${qs(query)}`, AnoListSchema, { signal }),
  });
}

const AnoStatsSchema = z.object({
  open: z.int(),
  overdue: z.int(),
  byDonor: z.object({ IDA: z.int(), AFD: z.int() }),
  averageDecisionDays: z.number().nullable(),
});

export function useAnoStats() {
  return useQuery({
    queryKey: queryKeys.ano.stats(),
    queryFn: ({ signal }) => apiFetch("/ano/stats", AnoStatsSchema, { signal }),
    // Les compteurs tolèrent d'être légèrement en retard ; inutile de les
    // recharger à chaque retour d'onglet.
    staleTime: 30_000,
  });
}

/**
 * Décision d'un bailleur sur une demande d'ANO.
 *
 * Pas de mise à jour optimiste ici, volontairement : rendre une non-objection
 * est un acte engageant, tracé, potentiellement refusé par un garde-fou côté
 * serveur. Afficher « délivré » avant confirmation exposerait l'agent à voir
 * sa décision se rétracter sous ses yeux — inacceptable sur un geste de cette
 * nature. L'optimisme est réservé aux gestes anodins et réversibles.
 */
export function useAnoDecision(id: string, profile: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (decision: AnoDecision) =>
      apiFetch(`/ano/${id}/decision`, AnoDecisionResultSchema, {
        method: "POST",
        body: decision,
        profile,
      }),
    onSuccess: () => {
      // Une décision déplace aussi l'initiative : les deux domaines sont
      // invalidés, sinon la fiche marché afficherait encore l'état précédent.
      void queryClient.invalidateQueries({ queryKey: queryKeys.ano.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.initiatives.all });
    },
  });
}

/** Fiche d'une demande d'ANO — utilisée par le panneau latéral de l'inbox. */
export function useAnoRequest(id: string | null) {
  return useQuery({
    queryKey: queryKeys.ano.detail(id ?? ""),
    queryFn: ({ signal }) => apiFetch(`/ano/${id}`, AnoRequestSchema, { signal }),
    enabled: Boolean(id),
  });
}
