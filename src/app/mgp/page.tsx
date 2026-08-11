import type { Metadata } from "next";
import { MgpClient } from "./MgpClient";

export const metadata: Metadata = {
  title: "Mécanisme de Gestion des Plaintes (MGP) · PTN-RDC",
  description:
    "Déposez une plainte, signalement ou suggestion concernant le Projet de Transformation Numérique de la République Démocratique du Congo. Réponse garantie sous 30 jours.",
};

export default function MgpPage() {
  return <MgpClient />;
}
