import { Shell } from "@/components/shell/Shell";
import { SoumissionsClient } from "./SoumissionsClient";

export const metadata = { title: "Mes soumissions · Espace soumissionnaire · PTN-RDC" };

export default function SoumissionsPage() {
  return (
    <Shell
      crumbs={[
        { label: "Accueil", href: "/soumissionnaire" },
        { label: "Marketplace", href: "/soumissionnaire/marketplace" },
        { label: "Mes soumissions" },
      ]}
    >
      <SoumissionsClient />
    </Shell>
  );
}
