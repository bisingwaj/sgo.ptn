import type { Metadata } from "next";
import { DataLayerDemo } from "./DataLayerDemo";

export const metadata: Metadata = {
  title: "Couche de données · Design system · PTN-RDC",
  description:
    "Démonstration du contrat d'API : schémas Zod, états de chargement, garde-fous métier.",
};

export default function DataLayerPage() {
  return <DataLayerDemo />;
}
