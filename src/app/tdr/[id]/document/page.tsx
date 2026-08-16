import type { Metadata } from "next";
import { DocumentClient } from "./DocumentClient";

export const metadata: Metadata = {
  title: "Document · Termes de référence · PTN-RDC",
  description: "Le document de termes de référence, à consulter, imprimer ou télécharger.",
};

export default async function TdrDocumentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <DocumentClient id={id} />;
}
