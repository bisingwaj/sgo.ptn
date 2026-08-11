import { Shell } from "@/components/shell/Shell";
import { EditOrgClient } from "./EditOrgClient";

export const metadata = { title: "Modifier l'organisation · Espace partenaire · PTN-RDC" };

export default function OrganisationEditPage() {
  return (
    <Shell
      crumbs={[
        { label: "Espace partenaire", href: "/partenaire" },
        { label: "Organisation", href: "/partenaire/organisation" },
        { label: "Modifier" },
      ]}
    >
      <EditOrgClient />
    </Shell>
  );
}
