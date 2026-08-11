import type { Metadata } from "next";
import { Shell } from "@/components/shell/Shell";
import { FournituresWizardClient } from "./Client";

export const metadata: Metadata = { title: "Wizard TDR · Fournitures · PTN-RDC" };

export default function Page() {
  return (
    <Shell
      crumbs={[
        { label: "Accueil", href: "/home" },
        { label: "TDR", href: "/tdr" },
        { label: "Fournitures" },
      ]}
    >
      <FournituresWizardClient />
    </Shell>
  );
}
