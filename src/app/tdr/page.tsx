import { Shell } from "@/components/shell/Shell";
import { TdrSelectorClient } from "./TdrSelectorClient";

export const metadata = { title: "Sélecteur TDR · Nouveau TDR · PTN-RDC" };

export default function TdrSelectorPage() {
  return (
    <Shell
      crumbs={[
        { label: "Accueil", href: "/dashboard" },
        { label: "Mes TDR", href: "/dashboard/initiatives" },
        { label: "Nouveau TDR" },
      ]}
    >
      <TdrSelectorClient />
    </Shell>
  );
}
