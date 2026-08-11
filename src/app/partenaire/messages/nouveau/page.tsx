import { Shell } from "@/components/shell/Shell";
import { NouveauMessageClient } from "./NouveauMessageClient";

export const metadata = { title: "Nouveau message · Espace partenaire · PTN-RDC" };

export default function NouveauMessagePage() {
  return (
    <Shell
      crumbs={[
        { label: "Espace partenaire", href: "/partenaire" },
        { label: "Messages", href: "/partenaire/messages" },
        { label: "Nouveau fil" },
      ]}
    >
      <NouveauMessageClient />
    </Shell>
  );
}
