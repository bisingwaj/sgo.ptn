import { Shell } from "@/components/shell/Shell";
import { DocumentEditorClient } from "./DocumentEditorClient";

export const metadata = { title: "Éditeur document · Espace partenaire · PTN-RDC" };

interface Props {
  params: Promise<{ ref: string }>;
}

export default async function DocumentEditorPage({ params }: Props) {
  const { ref } = await params;
  return (
    <Shell
      crumbs={[
        { label: "Espace partenaire", href: "/partenaire" },
        { label: "Mes propositions", href: "/partenaire/propositions" },
        { label: ref, href: `/partenaire/propositions/${ref}` },
        { label: "Document" },
      ]}
    >
      <DocumentEditorClient propRef={ref} />
    </Shell>
  );
}
