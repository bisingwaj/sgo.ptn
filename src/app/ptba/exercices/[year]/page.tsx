import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Shell } from "@/components/shell/Shell";
import { ExerciceClient } from "./ExerciceClient";

export const metadata: Metadata = {
  title: "Exercice budgétaire · PTBA · PTN-RDC",
  description:
    "État d'un exercice du plan annuel et allocation de chaque composante : ce qui peut être engagé, ce qui l'est déjà, ce qui reste.",
};

export default async function ExercicePage({
  params,
}: {
  params: Promise<{ year: string }>;
}) {
  const { year } = await params;

  // Une année se lit en quatre chiffres. Laisser passer `/ptba/exercices/abc`
  // enverrait `NaN` au serveur, qui répondrait par une erreur de validation
  // là où la route est simplement inexistante.
  if (!/^\d{4}$/.test(year)) notFound();

  return (
    <Shell
      crumbs={[
        { label: "PTBA", href: "/ptba" },
        { label: "Exercices", href: "/ptba/exercices" },
        { label: year },
      ]}
    >
      <ExerciceClient annee={Number(year)} />
    </Shell>
  );
}
