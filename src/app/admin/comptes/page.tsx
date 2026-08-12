import type { Metadata } from "next";
import { AccountsListClient } from "./AccountsListClient";

export const metadata: Metadata = {
  title: "Registre des comptes · Administration · PTN-RDC",
  description:
    "Comptes et habilitations de la plateforme PTN-RDC. Aucune suppression : archivage seul, pour préserver la piste d’audit.",
};

export default function AccountsPage() {
  return <AccountsListClient />;
}
