import type { Metadata } from "next";
import { ActivationClient } from "./ActivationClient";

export const metadata: Metadata = {
  title: "Première connexion · PTN-RDC",
  description:
    "Définition du mot de passe personnel après émission d’un mot de passe temporaire par l’administrateur.",
};

export default function ActivationPage() {
  return <ActivationClient />;
}
