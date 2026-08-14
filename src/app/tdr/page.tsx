import type { Metadata } from "next";
import { TdrListClient } from "./TdrListClient";

export const metadata: Metadata = {
  title: "Registre des TDR · PTN-RDC",
  description:
    "Termes de référence rédigés sur la plateforme, du brouillon à l’avis de non-objection.",
};

export default function TdrPage() {
  return <TdrListClient />;
}
