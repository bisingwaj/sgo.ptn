import { Shell } from "@/components/shell/Shell";
import { MarketplaceClient } from "./MarketplaceClient";

export const metadata = { title: "Marketplace · Espace soumissionnaire · PTN-RDC" };

export default function MarketplacePage() {
  return (
    <Shell crumbs={[{ label: "Accueil", href: "/soumissionnaire" }, { label: "Marketplace" }]}>
      <MarketplaceClient />
    </Shell>
  );
}
