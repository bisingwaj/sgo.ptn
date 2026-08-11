import { Shell } from "@/components/shell/Shell";
import { PageHeader } from "@/components/ui/PageHeader";
import {
  CaretLeft,
  CaretRight,
  Add,
  Calendar,
  Filter,
} from "@carbon/icons-react";
import styles from "./calendrier.module.scss";

export const metadata = { title: "Calendrier · Espace partenaire · PTN-RDC" };

type EventTone = "default" | "warn" | "err" | "ok";

interface CalEvent {
  title: string;
  tone?: EventTone;
}

const EVENTS: Record<number, CalEvent[]> = {
  4: [{ title: "Atelier de cadrage TDR", tone: "default" }],
  6: [{ title: "Restitution étude de marché", tone: "ok" }],
  9: [{ title: "Clarifications BM PTN-2026-019", tone: "err" }],
  11: [{ title: "Clôture soumissions Datacenter", tone: "warn" }],
  12: [{ title: "Audit interne S1", tone: "default" }],
  13: [
    { title: "Commission CE-2026-007", tone: "warn" },
    { title: "Sync ANIE — UGP", tone: "default" },
  ],
  14: [{ title: "COPIL semestriel", tone: "default" }],
  15: [{ title: "Validation Hub formation", tone: "warn" }],
  19: [{ title: "Soumission TDR v3", tone: "default" }],
  22: [{ title: "Briefing ID4Africa", tone: "default" }],
  26: [{ title: "Mission Lubumbashi (3 j)", tone: "ok" }],
  28: [{ title: "Réunion trimestrielle bailleurs", tone: "default" }],
};

interface DayCell {
  num: number;
  inMonth: boolean;
  today?: boolean;
}

/** Mai 2026 — premier jour = vendredi (index 4), 31 jours.
 *  Affichage Lun-Dim, 6 lignes, avec débordement avr./juin. */
function buildGrid(): DayCell[] {
  const cells: DayCell[] = [];
  // Avril 27-30 (Lun-Jeu)
  for (let d = 27; d <= 30; d++) cells.push({ num: d, inMonth: false });
  // Mai 1-31
  for (let d = 1; d <= 31; d++) {
    cells.push({ num: d, inMonth: true, today: d === 9 });
  }
  // Juin 1-? (compléter à 42 cellules)
  let nextDay = 1;
  while (cells.length < 42) {
    cells.push({ num: nextDay++, inMonth: false });
  }
  return cells;
}

function evClass(tone?: EventTone) {
  if (tone === "warn") return styles.evWarn;
  if (tone === "err") return styles.evErr;
  if (tone === "ok") return styles.evOk;
  return "";
}

interface DeadlineItem {
  day: string;
  month: string;
  title: string;
  ref: string;
  countdown: string;
  urgent?: boolean;
}

const DEADLINES: DeadlineItem[] = [
  {
    day: "09",
    month: "mai",
    title: "Réponse aux clarifications BM",
    ref: "PROP-2026-019 · TDR plateforme paiement",
    countdown: "Aujourd'hui",
    urgent: true,
  },
  {
    day: "11",
    month: "mai",
    title: "Clôture des soumissions",
    ref: "PROP-2026-016 · Datacenter Tier-3",
    countdown: "J+2",
  },
  {
    day: "13",
    month: "mai",
    title: "Commission d'évaluation CE-2026-007",
    ref: "PROP-2026-014 · Identité numérique",
    countdown: "J+4",
  },
  {
    day: "15",
    month: "mai",
    title: "Validation comité de pilotage",
    ref: "PROP-2026-024 · Hub formation",
    countdown: "J+6",
  },
  {
    day: "22",
    month: "mai",
    title: "Briefing délégation ID4Africa",
    ref: "PROP-2026-011 · Atelier Abidjan",
    countdown: "J+13",
  },
];

export default function CalendrierPage() {
  const cells = buildGrid();
  const weekdays = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

  return (
    <Shell crumbs={[{ label: "Espace partenaire", href: "/partenaire" }, { label: "Calendrier" }]}>
      <PageHeader
        eyebrow="ANIE · AGENDA PARTENAIRE"
        title="Calendrier des échéances"
        subtitle="Jalons de vos propositions, réunions UGP, sessions COPIL et missions terrain."
        meta={
          <>
            <span>
              Aujourd&apos;hui : <strong>samedi 9 mai 2026</strong>
            </span>
            <span>·</span>
            <span>
              Cycle PTBA : <span className="ptn-mono">2026-Q2</span>
            </span>
          </>
        }
        actions={
          <button type="button" className={styles.btnPrimary}>
            <Add size={16} aria-hidden />
            Nouvel événement
          </button>
        }
      />

      <div className={styles.layout}>
        <section className={styles.calCard}>
          <div className={styles.calHead}>
            <h2 className={styles.calMonth}>Mai 2026</h2>
            <button type="button" className={styles.btnSecondary}>
              <Calendar size={14} aria-hidden />
              Aujourd&apos;hui
            </button>
            <div className={styles.calNav}>
              <button type="button" className={styles.btnIcon} aria-label="Mois précédent">
                <CaretLeft size={16} aria-hidden />
              </button>
              <button type="button" className={styles.btnIcon} aria-label="Mois suivant">
                <CaretRight size={16} aria-hidden />
              </button>
              <button type="button" className={styles.btnIcon} aria-label="Filtres calendrier">
                <Filter size={16} aria-hidden />
              </button>
            </div>
          </div>

          <div className={styles.gridHead}>
            {weekdays.map((w) => (
              <div key={w}>{w}</div>
            ))}
          </div>

          <div className={styles.grid}>
            {cells.map((c, i) => {
              const events = c.inMonth ? EVENTS[c.num] ?? [] : [];
              const visible = events.slice(0, 1);
              const more = events.length - visible.length;
              const cellCls = [
                styles.cell,
                !c.inMonth ? styles.cellOther : "",
                c.today ? styles.cellToday : "",
              ]
                .filter(Boolean)
                .join(" ");
              return (
                <div key={i} className={cellCls}>
                  <div className={styles.num}>{String(c.num).padStart(2, "0")}</div>
                  <div className={styles.evList}>
                    {visible.map((e, j) => (
                      <div key={j} className={`${styles.ev} ${evClass(e.tone)}`} title={e.title}>
                        {e.title}
                      </div>
                    ))}
                    {more > 0 && <div className={styles.evMore}>+{more} de plus</div>}
                  </div>
                </div>
              );
            })}
          </div>

          <div className={styles.legend}>
            <span className={styles.legendItem}>
              <span className={styles.legendDot} /> Échéance partenaire
            </span>
            <span className={styles.legendItem}>
              <span className={`${styles.legendDot} ${styles.legendWarn}`} /> Jalon UGP
            </span>
            <span className={styles.legendItem}>
              <span className={`${styles.legendDot} ${styles.legendErr}`} /> Urgent / clarifications
            </span>
            <span className={styles.legendItem}>
              <span className={`${styles.legendDot} ${styles.legendOk}`} /> Mission / livrable
            </span>
          </div>
        </section>

        <aside className={styles.aside}>
          <section className={styles.asideCard}>
            <header className={styles.asideHead}>
              <h3 className={styles.asideTitle}>Prochaines échéances</h3>
              <span className={styles.asideBadge}>{DEADLINES.length}</span>
            </header>
            <div className={styles.asideBody}>
              {DEADLINES.map((d, i) => (
                <div key={i} className={`${styles.deadline} ${d.urgent ? styles.dlUrgent : ""}`}>
                  <div className={styles.day}>
                    <div className={styles.dayD}>{d.day}</div>
                    <div className={styles.dayM}>{d.month}</div>
                  </div>
                  <div className={styles.dlMeta}>
                    <strong>{d.title}</strong>
                    <div className={styles.dlRef}>{d.ref}</div>
                  </div>
                  <span className={styles.countdown}>{d.countdown}</span>
                </div>
              ))}
            </div>
          </section>

          <section className={styles.asideCard}>
            <header className={styles.asideHead}>
              <h3 className={styles.asideTitle}>Cycle gouvernance</h3>
            </header>
            <div className={styles.asideBody}>
              <div className={styles.deadline}>
                <div className={styles.day}>
                  <div className={styles.dayD}>14</div>
                  <div className={styles.dayM}>mai</div>
                </div>
                <div className={styles.dlMeta}>
                  <strong>COPIL semestriel</strong>
                  <div className={styles.dlRef}>Présidence MPTN · 6/8 confirmés</div>
                </div>
                <span className={styles.countdown}>J+5</span>
              </div>
              <div className={styles.deadline}>
                <div className={styles.day}>
                  <div className={styles.dayD}>28</div>
                  <div className={styles.dayM}>mai</div>
                </div>
                <div className={styles.dlMeta}>
                  <strong>Réunion trimestrielle bailleurs</strong>
                  <div className={styles.dlRef}>BM + AFD · revue portefeuille</div>
                </div>
                <span className={styles.countdown}>J+19</span>
              </div>
              <div className={styles.deadline}>
                <div className={styles.day}>
                  <div className={styles.dayD}>15</div>
                  <div className={styles.dayM}>juin</div>
                </div>
                <div className={styles.dlMeta}>
                  <strong>CTP trimestriel</strong>
                  <div className={styles.dlRef}>Comité Technique de Pilotage</div>
                </div>
                <span className={styles.countdown}>J+37</span>
              </div>
            </div>
          </section>
        </aside>
      </div>
    </Shell>
  );
}
