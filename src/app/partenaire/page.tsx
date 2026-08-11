import { Shell } from "@/components/shell/Shell";
import { DashboardSidePanel } from "@/app/dashboard/DashboardSidePanel";
import { PartenaireDashboardClient } from "./PartenaireDashboardClient";
import { INITIATIVES } from "@/lib/mock-initiatives";

export const metadata = { title: "Tableau de bord · Espace partenaire · PTN-RDC" };

export default function PartenairePage() {
  return (
    <Shell
      crumbs={[{ label: "Accueil", href: "/partenaire" }, { label: "Tableau de bord" }]}
      sidePanel={<DashboardSidePanel />}
    >
      <PartenaireDashboardClient initiatives={INITIATIVES} />
    </Shell>
  );
}
