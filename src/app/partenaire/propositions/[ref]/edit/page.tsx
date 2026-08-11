import { TdrWizardClient, type TdrState } from "../../nouveau/TdrWizardClient";

export const metadata = { title: "Modifier proposition · Espace partenaire · PTN-RDC" };

interface Props {
  params: Promise<{ ref: string }>;
}

/** Mock — état initial pré-rempli pour l'édition.
 *  En production, ces données viennent de l'API. */
const PRELOAD: Record<string, Partial<TdrState>> = {
  "PROP-2026-019": {
    activityType: "amoa",
    composante: "C2",
    ptbaCode: "A2.3.1",
    contexte:
      "Le ministère du Numérique (MPTN) souhaite doter la République Démocratique du Congo d'une plateforme nationale d'identité numérique inclusive, conforme aux standards ICAO 9303 et au cadre ID4D.",
    objectifGeneral:
      "Doter l'État congolais d'une plateforme d'identité numérique inclusive, interopérable et conforme aux standards internationaux.",
    objectifsSpec:
      "O1 · Concevoir l'architecture technique cible.\nO2 · Accompagner la passation du marché de réalisation.\nO3 · Former les équipes ANIE.\nO4 · Définir le plan de continuité.",
    livrables:
      "L1 · Note de cadrage stratégique (J+15)\nL2 · Architecture technique cible (J+45)\nL3 · DAO complet de réalisation (J+90)",
    dateDebut: "2026-07-15",
    duree: "240 j-h sur 9 mois",
    province: "national",
    expertise:
      "Cabinet d'AMOA spécialisé en identité numérique, expérience ID4D, références Afrique centrale.",
    profilsCles: ["chef", "expert-tech", "expert-junior", "expert-es", "expert-genre"],
    budgetTotal: "8700000",
    partIda: "6873000",
    partAfd: "1827000",
    partGouv: "0",
    esCategory: "S",
    esRisks: ["travail", "biodiversite"],
  },
};

export default async function EditPropositionPage({ params }: Props) {
  const { ref } = await params;
  const initial = PRELOAD[ref] ?? {};
  return <TdrWizardClient mode="edit" propRef={ref} initial={initial} />;
}
