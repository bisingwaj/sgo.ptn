"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * Lecture d'une media query depuis React.
 *
 * Le besoin naît d'une asymétrie : la colonne de navigation se replie de deux
 * façons — sur commande (`sideNavStore`) et automatiquement sous 1024 px, par
 * une règle CSS. Le JavaScript ne connaissait que la première. Les infobulles,
 * qui ne doivent apparaître que lorsque les intitulés sont masqués, s'en
 * trouvaient absentes précisément sur les écrans étroits, là où elles sont
 * indispensables.
 *
 * `useSyncExternalStore` et non un effet : voir persistent-store.ts. Le serveur
 * ne connaît pas la fenêtre, il rend donc l'hypothèse large ; l'hydratation
 * corrige au premier rendu client, sans divergence signalée.
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const mql = window.matchMedia(query);
      mql.addEventListener("change", onChange);
      return () => mql.removeEventListener("change", onChange);
    },
    [query],
  );

  const getSnapshot = useCallback(() => window.matchMedia(query).matches, [query]);

  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}
