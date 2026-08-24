import type { Metadata } from "next";
import { Suspense } from "react";
import { PtbaRegistryClient } from "./PtbaRegistryClient";

export const metadata: Metadata = {
  title: "PTBA · Plan de Travail et Budget Annuel · PTN-RDC",
  description:
    "Activités inscrites au plan annuel et solde des allocations par composante. Toute activité du plan devient un rattachement possible pour un TDR.",
};

export default function PtbaPage() {
  return (
    // `useSearchParams` — l'exercice affiché vient de l'URL — impose une
    // frontière de suspense en rendu statique.
    <Suspense fallback={null}>
      <PtbaRegistryClient />
    </Suspense>
  );
}
