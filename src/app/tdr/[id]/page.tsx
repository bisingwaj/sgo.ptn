import type { Metadata } from "next";
import { TdrDetailClient } from "./TdrDetailClient";

export const metadata: Metadata = {
  title: "Termes de référence · PTN-RDC",
  description: "Consultation d’un dossier de termes de référence.",
};

export default async function TdrDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <TdrDetailClient id={id} />;
}
