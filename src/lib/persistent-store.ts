"use client";

import { useSyncExternalStore } from "react";

/**
 * Petite préférence persistée, lisible sans divergence d'hydratation.
 *
 * Le besoin revient partout — tiroir ouvert ou fermé, langue choisie, thème —
 * et les deux réflexes échouent :
 *
 *   · lire dans un effet puis `setState` : c'est ce que proscrit
 *     `react-hooks/set-state-in-effect`, et cela impose un rendu de plus à
 *     chaque montage ;
 *
 *   · lire dans l'initialiseur de `useState` : le serveur ne voit pas
 *     `localStorage`, il rendrait la valeur par défaut là où le client rend
 *     la valeur enregistrée — divergence d'hydratation.
 *
 * `useSyncExternalStore` est fait pour ce cas : instantané serveur pendant
 * l'hydratation, instantané client ensuite, sans avertissement.
 */
export function createPersistentStore<T extends string | boolean>(
  key: string,
  fallback: T,
  parse: (raw: string) => T,
) {
  let value: T | null = null;
  const listeners = new Set<() => void>();

  function read(): T {
    try {
      const raw = window.localStorage.getItem(key);
      return raw === null ? fallback : parse(raw);
    } catch {
      // localStorage indisponible (navigation privée).
      return fallback;
    }
  }

  function subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  }

  // Lecture différée au premier appel côté client, puis mise en cache :
  // un instantané doit être stable d'un appel à l'autre, sans quoi React
  // considère que le magasin change en boucle.
  function getSnapshot(): T {
    if (value === null) value = read();
    return value;
  }

  /** Le serveur ne connaît pas la préférence. */
  function getServerSnapshot(): T {
    return fallback;
  }

  function set(next: T): void {
    value = next;
    try {
      window.localStorage.setItem(key, String(next));
    } catch {
      /* sans effet */
    }
    listeners.forEach((l) => l());
  }

  function use(): T {
    return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  }

  return { use, set, get: getSnapshot };
}
