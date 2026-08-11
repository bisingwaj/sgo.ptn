import type { Metadata } from "next";
import { Shell } from "@/components/shell/Shell";
import { ConsultantsWizardClient } from "./Client";

export const metadata: Metadata = { title: "Wizard TDR · Services consultants v2 · PTN-RDC" };

export default function Page() {
  return (
    <Shell
      crumbs={[
        { label: "Accueil", href: "/home" },
        { label: "TDR", href: "/tdr" },
        { label: "Services consultants v2" },
      ]}
    >
      <ConsultantsWizardClient />
    </Shell>
  );
}
