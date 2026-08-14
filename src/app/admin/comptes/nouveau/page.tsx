import { AuthGate } from "@/components/auth/AuthGate";
import type { Metadata } from "next";
import { CreateAccountClient } from "./CreateAccountClient";

export const metadata: Metadata = {
  title: "Créer un compte · Administration · PTN-RDC",
  description:
    "Habilitation d’un utilisateur de la plateforme PTN-RDC : famille, profil, sous-rôle, périmètre et durée.",
};

export default function CreateAccountPage() {
  return (
    <AuthGate>
      <CreateAccountClient />
    </AuthGate>
  );
}
