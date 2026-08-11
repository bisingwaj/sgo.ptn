import { Shell } from "@/components/shell/Shell";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Tag } from "@/components/ui/Tag";
import { Calendar, Time, Notification } from "@carbon/icons-react";
import styles from "./echeances.module.scss";

interface Deadline {
  date: string;
  day: string;
  month: string;
  title: string;
  ref: string;
  type: "submission" | "ano" | "report" | "session";
  daysLeft: number;
  description?: string;
}

const DEADLINES: Deadline[] = [
  {
    date: "2026-05-12",
    day: "12",
    month: "MAI",
    title: "Rapport S1 PTN-RDC",
    ref: "RP-S1-2026",
    type: "report",
    daysLeft: 4,
    description: "Rapport semestriel à transmettre à la BM et l'AFD avant le 12 mai.",
  },
  {
    date: "2026-05-14",
    day: "14",
    month: "MAI",
    title: "Session COPIL",
    ref: "COPIL-2026-02",
    type: "session",
    daysLeft: 6,
    description: "Comité de Pilotage trimestriel · 7 points à l'ordre du jour.",
  },
  {
    date: "2026-05-16",
    day: "16",
    month: "MAI",
    title: "Soumission DAO Backbone Goma-Bukavu",
    ref: "PTN-2026-021",
    type: "submission",
    daysLeft: 8,
    description: "DAO à publier après ANO BM (en cours).",
  },
  {
    date: "2026-05-22",
    day: "22",
    month: "MAI",
    title: "ANO BM — PTN-2026-019",
    ref: "PTN-2026-019",
    type: "ano",
    daysLeft: 14,
    description: "Plateforme nationale d'identité numérique · délai SLA 14 j.",
  },
  {
    date: "2026-06-02",
    day: "02",
    month: "JUIN",
    title: "Audit externe Cour des Comptes",
    ref: "AUD-EXT-2026",
    type: "report",
    daysLeft: 25,
    description: "Lancement audit externe annuel exercice 2025.",
  },
  {
    date: "2026-06-17",
    day: "17",
    month: "JUIN",
    title: "Soumission PPM v2",
    ref: "PPM-2026-V2",
    type: "submission",
    daysLeft: 40,
    description: "Mise à jour semestrielle du Plan de Passation des Marchés.",
  },
];

export const metadata = { title: "Échéances · PTN-RDC" };

const TYPE_LABELS: Record<Deadline["type"], { label: string; tone: "blue" | "red" | "yellow" | "green" }> = {
  submission: { label: "Soumission", tone: "blue" },
  ano: { label: "ANO bailleur", tone: "yellow" },
  report: { label: "Rapport", tone: "red" },
  session: { label: "Session", tone: "green" },
};

export default function EcheancesPage() {
  const urgent = DEADLINES.filter((d) => d.daysLeft <= 7);
  const upcoming = DEADLINES.filter((d) => d.daysLeft > 7);

  return (
    <Shell crumbs={[{ label: "Accueil", href: "/dashboard" }, { label: "Échéances" }]}>
      <PageHeader
        eyebrow="MES ÉCHÉANCES"
        title="Calendrier institutionnel"
        subtitle="Soumissions, ANO, rapports, sessions COPIL/CTP — vue chronologique."
        meta={
          <>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <Notification size={14} aria-hidden style={{ color: "var(--ptn-status-danger)" }} />
              <strong>{urgent.length} urgentes</strong> (≤ 7 jours)
            </span>
            <span>·</span>
            <span>
              <strong>{DEADLINES.length}</strong> échéances totales
            </span>
          </>
        }
      />

      {urgent.length > 0 && (
        <section style={{ marginBottom: "var(--ptn-space-05)" }}>
          <Card title="Échéances urgentes ≤ 7 jours" badge={String(urgent.length)} noPadding>
            <ul className={styles.list}>
              {urgent.map((d) => (
                <DeadlineItem key={d.ref} d={d} urgent />
              ))}
            </ul>
          </Card>
        </section>
      )}

      <Card title="À venir > 7 jours" badge={String(upcoming.length)} noPadding>
        <ul className={styles.list}>
          {upcoming.map((d) => (
            <DeadlineItem key={d.ref} d={d} />
          ))}
        </ul>
      </Card>
    </Shell>
  );
}

function DeadlineItem({ d, urgent }: { d: Deadline; urgent?: boolean }) {
  const typeMeta = TYPE_LABELS[d.type];
  return (
    <li className={`${styles.item} ${urgent ? styles.itemUrgent : ""}`}>
      <div className={`${styles.dateBlock} ${urgent ? styles.dateBlockUrgent : ""}`}>
        <span className={`${styles.day} ptn-mono`}>{d.day}</span>
        <span className={styles.month}>{d.month}</span>
      </div>
      <div className={styles.body}>
        <div className={styles.head}>
          <Tag tone={typeMeta.tone} size="sm">
            {typeMeta.label}
          </Tag>
          <strong className={styles.title}>{d.title}</strong>
          <span className={`${styles.ref} ptn-mono`}>{d.ref}</span>
        </div>
        {d.description && <p className={styles.desc}>{d.description}</p>}
      </div>
      <div className={styles.countdown}>
        <Time size={14} aria-hidden />
        <span className={`ptn-mono ${urgent ? styles.countdownUrgent : ""}`}>
          J−{d.daysLeft}
        </span>
      </div>
      <button type="button" className={styles.actionBtn}>
        <Calendar size={14} aria-hidden /> Voir
      </button>
    </li>
  );
}
