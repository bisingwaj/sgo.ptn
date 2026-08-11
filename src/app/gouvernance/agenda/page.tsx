import { Shell } from "@/components/shell/Shell";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Tag } from "@/components/ui/Tag";
import { Document, TaskApproved, Time, Events } from "@carbon/icons-react";
import styles from "./agenda.module.scss";

export const metadata = { title: "Ordre du jour COPIL · PTN-RDC" };

interface AgendaItem {
  num: number;
  title: string;
  type: "approbation" | "discussion" | "decision" | "info";
  duration: string;
  rapporteur: string;
  documents: number;
  status: "pending" | "ready" | "draft";
}

const ITEMS: AgendaItem[] = [
  { num: 1, title: "Approbation PV session précédente (07 fév. 2026)", type: "approbation", duration: "15 min", rapporteur: "Coordonnateur UGP", documents: 1, status: "ready" },
  { num: 2, title: "Validation PTBA 2027", type: "decision", duration: "45 min", rapporteur: "RAF UGP", documents: 4, status: "ready" },
  { num: 3, title: "Examen rapport semestriel S1 2026", type: "discussion", duration: "30 min", rapporteur: "Spé S&E UGP", documents: 2, status: "ready" },
  { num: 4, title: "Avis stratégique restructuration C2 ↔ C3", type: "decision", duration: "30 min", rapporteur: "Coordonnateur UGP", documents: 3, status: "draft" },
  { num: 5, title: "Identification risques projet (T2 2026)", type: "discussion", duration: "20 min", rapporteur: "Auditeur Interne", documents: 1, status: "ready" },
  { num: 6, title: "Recommandations politiques numériques", type: "info", duration: "15 min", rapporteur: "ADN · Présidence", documents: 2, status: "pending" },
  { num: 7, title: "Divers", type: "info", duration: "10 min", rapporteur: "Tous", documents: 0, status: "pending" },
];

const TYPE_LABELS: Record<AgendaItem["type"], { label: string; tone: "blue" | "yellow" | "red" | "green" }> = {
  approbation: { label: "Approbation PV", tone: "green" },
  discussion: { label: "Discussion", tone: "blue" },
  decision: { label: "Décision requise", tone: "red" },
  info: { label: "Information", tone: "yellow" },
};

const STATUS_LABELS: Record<AgendaItem["status"], { label: string; tone: "green" | "yellow" | "red" }> = {
  ready: { label: "Prêt", tone: "green" },
  draft: { label: "Brouillon", tone: "yellow" },
  pending: { label: "À préparer", tone: "red" },
};

export default function AgendaPage() {
  const totalMinutes = ITEMS.reduce((s, i) => s + parseInt(i.duration), 0);

  return (
    <Shell crumbs={[{ label: "Sessions", href: "/gouvernance" }, { label: "Ordre du jour COPIL-2026-02" }]}>
      <PageHeader
        eyebrow="COPIL · SESSION 2026-02"
        title="Ordre du jour — 14 mai 2026"
        subtitle="Comité de Pilotage trimestriel · 7 points · durée estimée 2h45."
        meta={
          <>
            <span>
              Quorum : <strong>6 / 8 confirmés</strong>
            </span>
            <span>·</span>
            <span>
              Durée totale : <strong>{Math.floor(totalMinutes / 60)}h{totalMinutes % 60}</strong>
            </span>
            <span>·</span>
            <span>
              Salle : <strong>Hôtel du Gouvernement, Kinshasa</strong>
            </span>
          </>
        }
      />

      <Card title="Points à l'ordre du jour" badge={`${ITEMS.length} points`} noPadding>
        <ol className={styles.list}>
          {ITEMS.map((it) => {
            const type = TYPE_LABELS[it.type];
            const status = STATUS_LABELS[it.status];
            return (
              <li key={it.num} className={styles.item}>
                <span className={`${styles.num} ptn-mono`}>{String(it.num).padStart(2, "0")}</span>
                <div className={styles.body}>
                  <div className={styles.head}>
                    <Tag tone={type.tone} size="sm">{type.label}</Tag>
                    <strong>{it.title}</strong>
                  </div>
                  <div className={styles.meta}>
                    <span><Time size={12} aria-hidden /> {it.duration}</span>
                    <span>·</span>
                    <span>Rapporteur : <strong>{it.rapporteur}</strong></span>
                    <span>·</span>
                    <span>
                      <Document size={12} aria-hidden /> {it.documents} document{it.documents > 1 ? "s" : ""}
                    </span>
                  </div>
                </div>
                <div className={styles.right}>
                  <Tag tone={status.tone} size="sm">
                    {status.label === "Prêt" && <TaskApproved size={12} aria-hidden style={{ marginRight: 4 }} />}
                    {status.label}
                  </Tag>
                </div>
              </li>
            );
          })}
        </ol>
      </Card>

      <div style={{ marginTop: "var(--ptn-space-04)" }}>
        <Card title="Membres convoqués" badge="8 membres officiels">
          <ul className={styles.members}>
            {[
              { role: "Président", inst: "MPTN", name: "Ministre · Cabinet", confirmed: true },
              { role: "Membre", inst: "Présidence (ADN)", name: "Coord. ADN", confirmed: true },
              { role: "Membre", inst: "Primature", name: "Conseiller numérique", confirmed: true },
              { role: "Membre", inst: "MINFIN", name: "DG CSPP", confirmed: true },
              { role: "Membre", inst: "MIS", name: "DG ONIP", confirmed: false },
              { role: "Membre", inst: "MESU", name: "Conseiller", confirmed: true },
              { role: "Membre", inst: "MEPME", name: "Sec. Général", confirmed: false },
              { role: "Membre", inst: "Coord. UGP", name: "Coordonnateur", confirmed: true },
            ].map((m, i) => (
              <li key={i}>
                <Events size={14} aria-hidden style={{ color: m.confirmed ? "var(--ptn-status-success)" : "var(--cds-text-helper)" }} />
                <div>
                  <strong>{m.inst}</strong>
                  <span>{m.role} · {m.name}</span>
                </div>
                <Tag tone={m.confirmed ? "green" : "yellow"} size="sm">
                  {m.confirmed ? "Confirmé" : "En attente"}
                </Tag>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </Shell>
  );
}
