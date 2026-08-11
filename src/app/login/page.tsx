import type { Metadata } from "next";
import { LoginClient } from "./LoginClient";

export const metadata: Metadata = {
  title: "Connexion · PTN-RDC",
  description:
    "Plateforme de gouvernance du Projet de Transformation Numérique de la République Démocratique du Congo.",
};

export default function LoginPage() {
  return <LoginClient />;
}
