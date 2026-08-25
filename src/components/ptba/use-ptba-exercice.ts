"use client";

/**
 * Chargement d'un exercice PTBA.
 *
 * Partagé par le registre et les écrans de saisie : chacun a besoin des
 * mêmes trois choses — l'exercice, ses allocations, le référentiel des
 * provinces — et les charger séparément les ferait diverger au premier
 * changement d'endpoint.
 *
 * Ce hook n'utilise pas TanStack Query, contrairement à la règle du dépôt :
 * le domaine PTBA passe par `src/lib/api.ts`, l'autre couche client, qui
 * n'est pas branchée sur le cache. Cette fourche est une dette identifiée ;
 * la refermer est un chantier à part, et l'ouvrir ici mêlerait deux sujets.
 */

import { useCallback, useEffect, useState } from "react";
import {
  ptbaApi,
  referentielApi,
  type ProvinceApi,
  type PtbaActivityApi,
  type PtbaAllocationRowApi,
  type PtbaYearApi,
} from "@/lib/api";

interface Options {
  /** Le registre en a besoin ; les écrans de saisie non. */
  avecActivites?: boolean;
  /** Exercice à ouvrir. Par défaut, le plus récent. */
  annee?: number;
}

export interface ExercicePtba {
  year: PtbaYearApi | null;
  exercices: PtbaYearApi[];
  activities: PtbaActivityApi[];
  allocations: PtbaAllocationRowApi[];
  chargement: boolean;
  /** Panne qui empêche de lire le plan. */
  error: string | null;
  /** Panne partielle : le plan est là, son cadrage budgétaire non. */
  avertissement: string | null;
  relire: () => Promise<void>;
}

export function usePtbaExercice({ avecActivites = false, annee }: Options = {}): ExercicePtba {
  const [exercices, setExercices] = useState<PtbaYearApi[]>([]);
  const [year, setYear] = useState<PtbaYearApi | null>(null);
  const [activities, setActivities] = useState<PtbaActivityApi[]>([]);
  const [allocations, setAllocations] = useState<PtbaAllocationRowApi[]>([]);
  const [chargement, setChargement] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [avertissement, setAvertissement] = useState<string | null>(null);

  const lire = useCallback(
    async (signalAnnule: () => boolean, premier: boolean) => {
      try {
        const liste = await ptbaApi.years();
        if (signalAnnule()) return;
        setExercices(liste);

        const cible = annee ?? liste[0]?.year;
        if (!cible) {
          setYear(null);
          return;
        }

        // Le plan est le contenu de l'écran, les allocations son cadrage :
        // les lier ferait disparaître l'exercice entier dès que le cadrage
        // échoue, et l'écran annoncerait le contraire de la vérité.
        const [plan, alloc] = await Promise.allSettled([
          avecActivites ? ptbaApi.activities(cible) : Promise.resolve(null),
          ptbaApi.allocations(cible),
        ]);
        if (signalAnnule()) return;

        if (plan.status === "rejected") throw plan.reason;
        if (plan.value) {
          setYear(plan.value.year);
          setActivities(plan.value.activities);
        }

        if (alloc.status === "fulfilled") {
          setAllocations(alloc.value.rows);
          if (!plan.value) setYear(alloc.value.year);
          setAvertissement(null);
        } else {
          setAvertissement(
            "Les allocations de l’exercice n’ont pas pu être lues : les soldes par " +
              "composante ne sont pas affichés, et aucune activité ne peut être inscrite " +
              "tant qu’ils manquent.",
          );
        }
        setError(null);
      } catch (e) {
        if (!signalAnnule()) {
          setError(e instanceof Error ? e.message : "Chargement impossible.");
        }
      } finally {
        if (!signalAnnule() && premier) setChargement(false);
      }
    },
    [annee, avecActivites],
  );

  useEffect(() => {
    let annule = false;
    // L'appel est enveloppé plutôt que direct : tout `setState` doit tomber
    // après un `await`, jamais dans le corps synchrone de l'effet, sous
    // peine de rendus en cascade.
    void (async () => {
      await lire(() => annule, true);
    })();
    return () => {
      annule = true;
    };
  }, [lire]);

  /**
   * Relecture après écriture. Ne repasse pas par l'état de chargement :
   * le tableau clignoterait après chaque inscription.
   */
  const relire = useCallback(() => lire(() => false, false), [lire]);

  return {
    year,
    exercices,
    activities,
    allocations,
    chargement,
    error,
    avertissement,
    relire,
  };
}

/** Provinces du référentiel. Séparé : seuls les écrans de saisie en ont besoin. */
export function useProvinces(): ProvinceApi[] {
  const [provinces, setProvinces] = useState<ProvinceApi[]>([]);

  useEffect(() => {
    let annule = false;
    void referentielApi
      .provinces()
      .then((p) => {
        if (!annule) setProvinces(p);
      })
      // Une province absente dégrade la saisie sans l'empêcher : le champ
      // est facultatif, et le périmètre reste alors non renseigné.
      .catch(() => undefined);
    return () => {
      annule = true;
    };
  }, []);

  return provinces;
}
