import type { Metadata } from "next";
import { RevueClient } from "./RevueClient";

export const metadata: Metadata = {
  title: "Instruction des TDR · PTN-RDC",
  description:
    "Les dossiers transmis à l’UGP, en attente de revue, de retour à leur auteur ou de validation.",
};

export default function RevueTdrPage() {
  return <RevueClient />;
}
