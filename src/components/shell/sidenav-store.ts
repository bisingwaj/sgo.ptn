"use client";

import { createPersistentStore } from "@/lib/persistent-store";

/**
 * Repli de la navigation principale.
 *
 * Déployée par défaut : c'est la carte du produit, et la replier d'emblée
 * obligerait à la rouvrir pour se situer. Le repli sert à ceux qui
 * connaissent déjà les lieux et veulent la largeur.
 */
export const sideNavStore = createPersistentStore(
  "ptn-rdc.sideNavCollapsed",
  false,
  (raw) => raw === "true",
);
