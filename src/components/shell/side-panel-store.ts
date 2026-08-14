"use client";

import { createPersistentStore } from "@/lib/persistent-store";

/**
 * Préférence d'ouverture du panneau contextuel.
 *
 * Fermé par défaut : c'est tout l'intérêt du tiroir, rendre au contenu la
 * largeur que le panneau occupait en permanence.
 */
export const sidePanelStore = createPersistentStore(
  "ptn-rdc.sidePanelOpen",
  false,
  (raw) => raw === "true",
);
