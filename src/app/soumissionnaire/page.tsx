import { Shell } from "@/components/shell/Shell";
import { PageHeader } from "@/components/ui/PageHeader";
import { AccueilClient } from "./AccueilClient";

export const metadata = { title: "Espace soumissionnaire · PTN-RDC" };

export default function SoumissionnairePage() {
  return (
    <Shell crumbs={[{ label: "Accueil", href: "/soumissionnaire" }]}>
      <PageHeader
        eyebrow="ESPACE SOUMISSIONNAIRE"
        title="Vos marchés"
        subtitle="Les avis publiés par l’UGPTN et les offres déposées au nom de votre organisation."
      />
      <AccueilClient />
    </Shell>
  );
}
