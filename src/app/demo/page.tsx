import type { Metadata } from "next";
import { DemoLauncherClient } from "./DemoLauncherClient";

export const metadata: Metadata = {
  title: "Explorer les espaces · Démonstration · PTN-RDC",
  description:
    "Parcours de démonstration des huit espaces de la plateforme PTN-RDC. Aucune session n’est ouverte.",
};

export default function DemoPage() {
  return <DemoLauncherClient />;
}
