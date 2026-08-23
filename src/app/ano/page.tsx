import type { Metadata } from "next";
import { AnoClient } from "./AnoClient";

export const metadata: Metadata = {
  title: "Non-objections · PTN-RDC",
  description:
    "Les dossiers d’appel d’offres déposés auprès des bailleurs, et leur décision.",
};

export default function AnoPage() {
  return <AnoClient />;
}
