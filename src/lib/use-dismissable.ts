"use client";

import { useEffect, type RefObject } from "react";

/**
 * Ferme un élément flottant au clic extérieur et à la touche Échap.
 *
 * Extrait pour une raison concrète : le sélecteur de langue était le seul
 * menu du bandeau à ne pas se refermer au clic extérieur — il fallait
 * recliquer sur son déclencheur. Quatre menus voisins, trois comportements
 * identiques et un différent : c'est exactement ce que produit une logique
 * recopiée à la main dans chaque composant.
 *
 * Le `pointerdown` est écouté plutôt que le `click` : un menu qui se ferme
 * seulement au relâchement paraît collant, et surtout un `click` parti d'un
 * élément qui disparaît entre-temps n'atteint jamais sa cible.
 */
export function useDismissable(
  ref: RefObject<HTMLElement | null>,
  open: boolean,
  onDismiss: () => void,
): void {
  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: PointerEvent) => {
      if (!ref.current?.contains(event.target as Node)) onDismiss();
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      // Empêche un conteneur englobant — tiroir, boîte de dialogue — de se
      // fermer en même temps : Échap ne referme qu'une couche à la fois.
      event.stopPropagation();
      onDismiss();
    };

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [ref, open, onDismiss]);
}
