import type { Metadata } from "next";
import { PtbaRegistryClient } from "./PtbaRegistryClient";

export const metadata: Metadata = {
  title: "PTBA · Plan de Travail et Budget Annuel · PTN-RDC",
  description:
    "Activités inscrites au plan annuel et solde des allocations par composante. Toute activité du plan devient un rattachement possible pour un TDR.",
};

export default function PtbaPage() {
  return <PtbaRegistryClient />;
}
