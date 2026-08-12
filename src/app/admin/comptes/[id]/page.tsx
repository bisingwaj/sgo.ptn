import type { Metadata } from "next";
import { AccountDetailClient } from "./AccountDetailClient";

export const metadata: Metadata = {
  title: "Fiche de compte · Administration · PTN-RDC",
  description: "Identité, habilitations, engagements et cycle de vie d’un compte de la plateforme.",
};

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AccountDetailPage({ params }: PageProps) {
  const { id } = await params;
  return <AccountDetailClient accountId={id} />;
}
