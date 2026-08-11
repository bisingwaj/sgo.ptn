import type { Metadata } from "next";
import { Shell } from "@/components/shell/Shell";
import { TravauxWizardClient } from "./Client";

export const metadata: Metadata = { title: "Wizard TDR · Travaux · PTN-RDC" };

export default function Page() {
  return (
    <Shell
      crumbs={[
        { label: "Accueil", href: "/home" },
        { label: "TDR", href: "/tdr" },
        { label: "Travaux" },
      ]}
    >
      <TravauxWizardClient />
    </Shell>
  );
}
