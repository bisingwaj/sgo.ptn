import type { Metadata } from "next";
import { Suspense } from "react";
import { TdrCreationClient } from "./TdrCreationClient";

export const metadata: Metadata = {
  title: "Nouveau TDR · PTN-RDC",
  description:
    "Rédaction de termes de référence, alimentée par le référentiel de passation et le plan annuel.",
};

export default function NewTdrPage() {
  // `useSearchParams` impose une frontière de suspense en rendu statique.
  return (
    <Suspense fallback={null}>
      <TdrCreationClient />
    </Suspense>
  );
}
