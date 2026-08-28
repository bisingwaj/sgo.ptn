import type { Metadata } from "next";
import { Shell } from "@/components/shell/Shell";
import { DocumentsClient } from "./DocumentsClient";

export const metadata: Metadata = {
  title: "Documents de référence · Administration · PTN-RDC",
  description:
    "Le corpus documentaire du projet — MEP, PPSD, plans de passation, instruments de sauvegarde — que l’assistant consulte pour répondre.",
};

export default function DocumentsPage() {
  return (
    <Shell crumbs={[{ label: "Administration" }, { label: "Documents de référence" }]}>
      <DocumentsClient />
    </Shell>
  );
}
