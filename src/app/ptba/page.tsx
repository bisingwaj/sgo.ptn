import type { Metadata } from "next";
import { PtbaClient } from "./PtbaClient";

export const metadata: Metadata = {
  title: "PTBA · Plan de Travail et Budget Annuel · PTN-RDC",
  description:
    "Activités inscrites au plan annuel et solde des enveloppes par composante. Toute activité du plan devient un rattachement possible pour un TDR.",
};

export default function PtbaPage() {
  return <PtbaClient />;
}
