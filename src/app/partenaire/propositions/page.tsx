import { Shell } from "@/components/shell/Shell";
import { PageHeader } from "@/components/ui/PageHeader";
import Link from "next/link";
import { Add } from "@carbon/icons-react";
import { OrgEyebrow } from "@/components/profile/OrgEyebrow";
import { PropositionsClient, type Proposition } from "./PropositionsClient";
import styles from "./propositions.module.scss";

export const metadata = { title: "Mes propositions · Espace partenaire · PTN-RDC" };

const PROPOSITIONS: Proposition[] = [
  {
    ref: "PROP-2026-019",
    title: "AMOA Plateforme nationale d'identité numérique",
    subtitle: "Assistance à maîtrise d'ouvrage · ANIE",
    composante: { code: "C2", label: "C2 · Fond.", tone: "purple" },
    amount: "8,7 M USD",
    amountUsd: 8_700_000,
    status: { label: "Arbitrage UGP", tone: "yellow", key: "ugp" },
    stage: 3,
    stageLabel: "Arbitrage",
    lastAction: "il y a 3h",
    lastWho: "UGP a accusé réception",
    createdAt: "12 avr. 2026",
  },
  {
    ref: "PROP-2026-014",
    title: "Étude PGES Centre de données Tier-3",
    subtitle: "Études environnementales et sociales",
    composante: { code: "C2", label: "C2 · Fond.", tone: "purple" },
    amount: "420 k USD",
    amountUsd: 420_000,
    status: { label: "Intégrée au PPM Q3", tone: "green", key: "ppm" },
    stage: 4,
    stageLabel: "PPM",
    lastAction: "hier 14:30",
    lastWho: "RPM UGP",
    createdAt: "28 mars 2026",
  },
  {
    ref: "PROP-2026-011",
    title: "Atelier ID4Africa Abidjan 2026 — délégation RDC",
    subtitle: "Formation et représentation institutionnelle",
    composante: { code: "C4", label: "C4 · Coord.", tone: "magenta" },
    amount: "85 k USD",
    amountUsd: 85_000,
    status: { label: "ANO bailleur", tone: "blue", key: "ano" },
    stage: 5,
    stageLabel: "ANO BM",
    lastAction: "il y a 2 jours",
    lastWho: "Soumis à TTL BM",
    createdAt: "15 mars 2026",
  },
  {
    ref: "PROP-2026-007",
    title: "Modernisation du registre des personnes",
    subtitle: "Composante 2.2.3 · Identité numérique",
    composante: { code: "C2", label: "C2 · Fond.", tone: "purple" },
    amount: "2,4 M USD",
    amountUsd: 2_400_000,
    status: { label: "Brouillon", tone: "gray", key: "draft" },
    stage: 1,
    stageLabel: "Brouillon",
    lastAction: "il y a 5 jours",
    lastWho: "ANIE — vous",
    createdAt: "01 mars 2026",
  },
];

export default function PropositionsPage() {
  return (
    <Shell crumbs={[{ label: "Espace partenaire", href: "/partenaire" }, { label: "Mes propositions" }]}>
      <PageHeader
        eyebrow={<OrgEyebrow suffix="PARTENAIRE INSTITUTIONNEL" />}
        title="Mes propositions"
        subtitle="Vos propositions de termes de référence et leur statut dans le cycle multi-acteurs."
        meta={
          <>
            <span>
              Total : <strong>4 propositions actives</strong>
            </span>
            <span>·</span>
            <span>
              Engagement cumulé : <span className="ptn-mono">11,6 M USD</span>
            </span>
          </>
        }
        actions={
          <Link href="/partenaire/propositions/nouveau" className={styles.btnPrimary}>
            <Add size={16} aria-hidden />
            Nouvelle proposition
          </Link>
        }
      />

      <PropositionsClient propositions={PROPOSITIONS} />
    </Shell>
  );
}
