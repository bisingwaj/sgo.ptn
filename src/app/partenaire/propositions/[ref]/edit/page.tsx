import { redirect } from "next/navigation";

interface PageProps {
  params: Promise<{ ref: string }>;
}

/**
 * Édition d'une proposition — hors service.
 *
 * Cette page reposait sur l'ancien parcours partenaire, retiré au profit
 * du parcours unique `/tdr/nouveau`. La reprise en édition suppose de
 * charger un TDR réel par son identifiant, ce que ce chemin ne permet pas :
 * il travaillait sur des références de démonstration.
 *
 * À rebrancher lorsque le parcours unique supportera le mode édition.
 */
export default async function LegacyEditRedirect({ params }: PageProps) {
  const { ref } = await params;
  redirect(`/partenaire/propositions/${ref}`);
}
