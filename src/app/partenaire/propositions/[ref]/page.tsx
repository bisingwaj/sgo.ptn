import { Shell } from "@/components/shell/Shell";
import { PropositionDetailClient } from "./PropositionDetailClient";

export const metadata = { title: "Détail proposition · Espace partenaire · PTN-RDC" };

interface Props {
  params: Promise<{ ref: string }>;
}

export default async function PropositionDetailPage({ params }: Props) {
  const { ref } = await params;
  return (
    <Shell
      crumbs={[
        { label: "Espace partenaire", href: "/partenaire" },
        { label: "Mes propositions", href: "/partenaire/propositions" },
        { label: ref },
      ]}
    >
      <PropositionDetailClient propRef={ref} />
    </Shell>
  );
}
