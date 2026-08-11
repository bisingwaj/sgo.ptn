import type { Metadata } from "next";
import { Shell } from "@/components/shell/Shell";
import { TdrSelectorClient } from "./TdrSelectorClient";

export const metadata: Metadata = { title: "Sélecteur TDR v2 · PTN-RDC" };

export default function TdrPage() {
  return (
    <Shell crumbs={[{ label: "Accueil", href: "/home" }, { label: "TDR" }, { label: "Sélecteur" }]}>
      <TdrSelectorClient />
    </Shell>
  );
}
