import type { Metadata } from "next";
import { ReferentielClient } from "./ReferentielClient";

export const metadata: Metadata = {
  title: "Référentiel de passation · Administration · PTN-RDC",
  description:
    "Types de TDR, méthodes, seuils et bibliothèques de contenu réglementaire, versionnés.",
};

export default function ReferentielPage() {
  return <ReferentielClient />;
}
