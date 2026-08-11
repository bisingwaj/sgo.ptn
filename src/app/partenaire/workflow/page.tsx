import { Shell } from "@/components/shell/Shell";
import { PageHeader } from "@/components/ui/PageHeader";
import { WorkflowClient, type WorkflowProposition } from "./WorkflowClient";

export const metadata = { title: "Workflow multi-acteurs · Partenaire · PTN-RDC" };

const PROPOSITIONS: WorkflowProposition[] = [
  {
    ref: "PROP-2026-019",
    title: "AMOA Plateforme nationale d'identité numérique",
    budget: "8,7 M USD",
    status: { label: "Arbitrage UGP", tone: "yellow" },
    currentStage: 3,
    stageLabel: "Arbitrage UGP",
    delay: "J−4 / 7 j",
    stages: [
      { num: "01", label: "Brouillon", actor: "ANIE", actorOrg: "Partenaire", state: "done", date: "12 avr. 2026", description: "Rédaction de la proposition par l'institution partenaire." },
      { num: "02", label: "Soumission UGP", actor: "ANIE → UGP", actorOrg: "Partenaire", state: "done", date: "21 avr. 2026", description: "Transmission officielle au Coordonnateur UGP-PTN pour arbitrage." },
      { num: "03", label: "Arbitrage UGP", actor: "Coord. + RPM", actorOrg: "UGP", state: "current", date: "07 mai 2026", description: "Arbitrage UGP : alignement avec le PTBA, priorisation, validation technique. Échange de commentaires possible." },
      { num: "04", label: "Intégration PPM", actor: "RPM UGP", actorOrg: "UGP", state: "future", description: "Intégration de la proposition dans le Plan de Passation des Marchés (PPM)." },
      { num: "05", label: "ANO bailleur", actor: "TTL BM", actorOrg: "Bailleur", state: "future", description: "Soumission au bailleur compétent pour Avis de Non-Objection (SLA 14 j BM)." },
      { num: "06", label: "Exécution", actor: "Co-exécution", actorOrg: "Partenaire", state: "future", description: "Lancement de la passation puis exécution conjointe avec maîtrise d'ouvrage technique partenaire." },
    ],
  },
  {
    ref: "PROP-2026-014",
    title: "Étude PGES Centre de données Tier-3",
    budget: "420 k USD",
    status: { label: "Intégrée PPM Q3", tone: "green" },
    currentStage: 4,
    stageLabel: "PPM",
    delay: "Conforme",
    stages: [
      { num: "01", label: "Brouillon", actor: "ANIE", actorOrg: "Partenaire", state: "done", date: "28 mars 2026", description: "Étude environnementale et sociale rédigée avec un bureau d'études." },
      { num: "02", label: "Soumission UGP", actor: "ANIE → UGP", actorOrg: "Partenaire", state: "done", date: "02 avr. 2026", description: "Transmission au RPM UGP." },
      { num: "03", label: "Arbitrage UGP", actor: "Coord. + Expert E&S", actorOrg: "UGP", state: "done", date: "12 avr. 2026", description: "Validation technique et alignement E&S CGES." },
      { num: "04", label: "Intégration PPM", actor: "RPM UGP", actorOrg: "UGP", state: "current", date: "08 mai 2026", description: "Activité ajoutée au PPM Q3 — préparation du dossier ANO Banque mondiale." },
      { num: "05", label: "ANO bailleur", actor: "TTL BM", actorOrg: "Bailleur", state: "future", description: "Soumission TTL Banque mondiale prévue lundi." },
      { num: "06", label: "Exécution", actor: "Co-exécution", actorOrg: "Partenaire", state: "future", description: "Lancement de l'étude PGES une fois ANO obtenu." },
    ],
  },
  {
    ref: "PROP-2026-011",
    title: "Atelier ID4Africa Abidjan 2026",
    budget: "85 k USD",
    status: { label: "ANO bailleur", tone: "blue" },
    currentStage: 5,
    stageLabel: "ANO BM",
    delay: "J+2 / 14 j",
    stages: [
      { num: "01", label: "Brouillon", actor: "ANIE", actorOrg: "Partenaire", state: "done", date: "15 mars 2026", description: "Note de cadrage de la délégation ID4Africa." },
      { num: "02", label: "Soumission UGP", actor: "ANIE → UGP", actorOrg: "Partenaire", state: "done", date: "18 mars 2026", description: "Soumission rapide pour respecter le calendrier de la conférence." },
      { num: "03", label: "Arbitrage UGP", actor: "Coord", actorOrg: "UGP", state: "done", date: "22 mars 2026", description: "Validation du périmètre et de la composition de la délégation." },
      { num: "04", label: "Intégration PPM", actor: "RPM UGP", actorOrg: "UGP", state: "done", date: "01 avr. 2026", description: "Intégration au PPM Q2 sous la composante C4 Coordination." },
      { num: "05", label: "ANO bailleur", actor: "TTL BM", actorOrg: "Bailleur", state: "current", date: "07 mai 2026", description: "ANO en cours · délai cible 14 j ouvrables. Délégation sous tension calendrier conférence." },
      { num: "06", label: "Exécution", actor: "ANIE", actorOrg: "Partenaire", state: "future", description: "Délégation 5 personnes · 4 jours · 12 contacts institutionnels prévus." },
    ],
  },
  {
    ref: "PROP-2026-007",
    title: "Modernisation du registre des personnes",
    budget: "2,4 M USD",
    status: { label: "Brouillon", tone: "gray" },
    currentStage: 1,
    stageLabel: "Brouillon",
    delay: "Non applicable",
    stages: [
      { num: "01", label: "Brouillon", actor: "ANIE", actorOrg: "Partenaire", state: "current", date: "01 mars 2026", description: "Proposition en cours de rédaction côté partenaire — brouillon IA généré, à compléter manuellement." },
      { num: "02", label: "Soumission UGP", actor: "ANIE → UGP", actorOrg: "Partenaire", state: "future", description: "Transmission au Coordonnateur UGP-PTN une fois finalisée." },
      { num: "03", label: "Arbitrage UGP", actor: "Coord. + RPM", actorOrg: "UGP", state: "future", description: "Arbitrage UGP — alignement PTBA et seuils de procédure." },
      { num: "04", label: "Intégration PPM", actor: "RPM UGP", actorOrg: "UGP", state: "future", description: "Intégration au PPM si validée." },
      { num: "05", label: "ANO bailleur", actor: "TTL BM ou AFD", actorOrg: "Bailleur", state: "future", description: "Soumission au bailleur compétent." },
      { num: "06", label: "Exécution", actor: "Co-exécution", actorOrg: "Partenaire", state: "future", description: "Lancement de la passation puis exécution." },
    ],
  },
];

export default function WorkflowPage() {
  return (
    <Shell crumbs={[{ label: "Espace partenaire", href: "/partenaire" }, { label: "Workflow multi-acteurs" }]}>
      <PageHeader
        eyebrow="ANIE · WORKFLOW MULTI-ACTEURS"
        title="Suivi pipeline par proposition"
        subtitle="6 étapes par proposition · Brouillon → UGP → PPM → ANO → Exécution. Sélectionnez une proposition pour voir son cycle détaillé."
        meta={
          <>
            <span>
              <strong>{PROPOSITIONS.length} propositions</strong> en cours
            </span>
            <span>·</span>
            <span>
              Délai moyen UGP : <span className="ptn-mono">9 jours</span>
            </span>
          </>
        }
      />

      <WorkflowClient propositions={PROPOSITIONS} />
    </Shell>
  );
}
