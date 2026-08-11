import Link from "next/link";
import { Shell } from "@/components/shell/Shell";
import { PageHeader } from "@/components/ui/PageHeader";
import {
  Document,
  AiGenerate,
  Activity,
  Time,
  CheckmarkFilled,
  ChartLineSmooth,
  Add,
  Download,
  ArrowRight,
  Events,
} from "@carbon/icons-react";
import styles from "./reporting.module.scss";

export const metadata = { title: "Reporting · Espace partenaire · PTN-RDC" };

interface Report {
  ref: string;
  title: string;
  type: string;
  period: string;
  status: { label: string; tone: "ok" | "warn" | "info" };
  progress: number;
  due: string;
  ai?: boolean;
}

const REPORTS: Report[] = [
  {
    ref: "RPT-2026-S1",
    title: "Rapport semestriel S1 2026",
    type: "Rapport périodique",
    period: "01 jan. — 30 juin 2026",
    status: { label: "En rédaction", tone: "warn" },
    progress: 64,
    due: "15 juillet 2026",
    ai: true,
  },
  {
    ref: "RPT-2025-S2",
    title: "Rapport semestriel S2 2025",
    type: "Rapport périodique",
    period: "01 juil. — 31 déc. 2025",
    status: { label: "Validé UGP", tone: "ok" },
    progress: 100,
    due: "Soumis 18 janv. 2026",
  },
  {
    ref: "LIV-2026-002",
    title: "L1 · Note de cadrage stratégique AMOA",
    type: "Livrable proposition",
    period: "PROP-2026-019",
    status: { label: "En revue UGP", tone: "info" },
    progress: 80,
    due: "12 mai 2026",
    ai: true,
  },
  {
    ref: "LIV-2026-008",
    title: "Bilan d'activité ID4Africa Abidjan",
    type: "Rapport de mission",
    period: "PROP-2026-011",
    status: { label: "Validé UGP", tone: "ok" },
    progress: 100,
    due: "Soumis 02 mai 2026",
  },
  {
    ref: "RPT-2025-AN",
    title: "Rapport annuel 2025 — synthèse partenaire",
    type: "Rapport annuel",
    period: "Année 2025",
    status: { label: "Validé UGP", tone: "ok" },
    progress: 100,
    due: "Soumis 28 févr. 2026",
  },
];

const TABS = [
  { id: "all", label: "Tous", count: 12 },
  { id: "ongoing", label: "En cours", count: 2 },
  { id: "validated", label: "Validés", count: 8 },
  { id: "templates", label: "Modèles" },
];

const INDICATORS = [
  { name: "Personnes connectées (cumulatif)", current: "127k", target: "300k", pct: 42 },
  { name: "Femmes touchées par les services", current: "58k", target: "150k", pct: 38 },
  { name: "Province couvertes", current: "11", target: "26", pct: 42 },
  { name: "Agents formés", current: "340", target: "1 200", pct: 28 },
];

export default function ReportingPage() {
  return (
    <Shell crumbs={[{ label: "Espace partenaire", href: "/partenaire" }, { label: "Reporting" }]}>
      <PageHeader
        eyebrow="ANIE · SUIVI-ÉVALUATION"
        title="Reporting & livrables"
        subtitle="Rapports semestriels, livrables des propositions, indicateurs du cadre de résultats — assistance IA au remplissage."
        meta={
          <>
            <span>
              <strong>2 rapports en cours</strong> · 8 validés cumulés
            </span>
            <span>·</span>
            <span>
              Prochain dépôt : <span className="ptn-mono">15 juillet 2026</span>
            </span>
          </>
        }
        actions={
          <>
            <button type="button" className={styles.btnSecondary}>
              <Download size={16} aria-hidden /> Export trimestriel
            </button>
            <Link href="/partenaire/reporting/nouveau" className={styles.btnPrimary}>
              <Add size={16} aria-hidden /> Nouveau rapport
            </Link>
          </>
        }
      />

      <div className={styles.kpis}>
        <div className={styles.kpi}>
          <div className={styles.kpiK}>
            <Document size={14} aria-hidden /> Total rapports 2026
          </div>
          <div className={styles.kpiV}>5</div>
          <div className={styles.kpiU}>3 trimestriels · 2 livrables</div>
          <div className={styles.kpiBar}>
            <i style={{ width: "63%" }} />
          </div>
        </div>
        <div className={styles.kpi}>
          <div className={styles.kpiK}>
            <CheckmarkFilled size={14} aria-hidden /> Taux de validation
          </div>
          <div className={styles.kpiV} style={{ color: "var(--ptn-status-success)" }}>
            89 %
          </div>
          <div className={styles.kpiU}>cible 90 %</div>
          <div className={`${styles.kpiBar} ${styles.kpiBarOk}`}>
            <i style={{ width: "89%" }} />
          </div>
        </div>
        <div className={styles.kpi}>
          <div className={styles.kpiK}>
            <Time size={14} aria-hidden /> Délai moyen revue UGP
          </div>
          <div className={styles.kpiV}>4,2 j</div>
          <div className={styles.kpiU}>−1,8 j vs S2 2025</div>
        </div>
        <div className={styles.kpi}>
          <div className={styles.kpiK}>
            <ChartLineSmooth size={14} aria-hidden /> Indicateurs renseignés
          </div>
          <div className={styles.kpiV}>12 / 18</div>
          <div className={styles.kpiU}>cadre résultats</div>
          <div className={styles.kpiBar}>
            <i style={{ width: "67%" }} />
          </div>
        </div>
      </div>

      <div className={styles.aiBanner}>
        <div className={styles.aiIco}>
          <AiGenerate size={16} aria-hidden />
        </div>
        <div>
          <div className={styles.aiTitle}>
            Brouillon Rapport S1 2026 disponible <span className={styles.aiBadge}>✦ IA</span>
          </div>
          <div className={styles.aiText}>
            L&apos;assistant IA a pré-rempli 64 % des sections du rapport semestriel à partir de
            vos propositions actives, livrables soumis et indicateurs renseignés. 4 sections
            nécessitent une saisie manuelle (analyse qualitative, leçons apprises, perspectives
            S2, annexes signées).
          </div>
          <a href="#brouillon" className={styles.aiBtn}>
            <ArrowRight size={12} aria-hidden /> Réviser le brouillon
          </a>
        </div>
      </div>

      <div className={styles.layout}>
        <div>
          <div className={styles.tabs}>
            {TABS.map((t, i) => (
              <button
                key={t.id}
                type="button"
                className={`${styles.tab} ${i === 0 ? styles.tabActive : ""}`}
              >
                {t.label}
                {t.count !== undefined && <span className={styles.tabCount}>{t.count}</span>}
              </button>
            ))}
          </div>

          <div className={styles.panel}>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <colgroup>
                  <col style={{ width: "30%" }} />
                  <col style={{ width: "16%" }} />
                  <col style={{ width: "17%" }} />
                  <col style={{ width: "12%" }} />
                  <col style={{ width: "13%" }} />
                  <col style={{ width: "8%" }} />
                  <col style={{ width: "4%" }} />
                </colgroup>
                <thead>
                  <tr>
                    <th>Rapport</th>
                    <th>Type</th>
                    <th>Période</th>
                    <th>Statut</th>
                    <th>Avancement</th>
                    <th>Échéance</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {REPORTS.map((r) => {
                    const tagCls =
                      r.status.tone === "ok"
                        ? styles.tagOk
                        : r.status.tone === "warn"
                          ? styles.tagWarn
                          : styles.tagInfo;
                    return (
                      <tr key={r.ref}>
                        <td>
                          <div className={styles.title}>
                            {r.title}
                            {r.ai && (
                              <span
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: 4,
                                  background: "var(--ptn-status-ai-surface)",
                                  color: "var(--ptn-status-ai)",
                                  fontSize: 10,
                                  padding: "1px 6px",
                                  marginLeft: 8,
                                  fontFamily: "var(--font-ibm-plex-sans)",
                                }}
                              >
                                ✦ IA
                              </span>
                            )}
                          </div>
                          <div className={styles.titleSub}>
                            <span className={styles.ref}>{r.ref}</span>
                          </div>
                        </td>
                        <td>{r.type}</td>
                        <td>{r.period}</td>
                        <td>
                          <span className={`${styles.tag} ${tagCls}`}>{r.status.label}</span>
                        </td>
                        <td>
                          <div className={styles.progressCell}>
                            <div
                              className={`${styles.progressBar} ${r.progress === 100 ? styles.progressBarOk : ""}`}
                            >
                              <i style={{ width: `${r.progress}%` }} />
                            </div>
                            <span className={styles.progressPct}>{r.progress} %</span>
                          </div>
                        </td>
                        <td className={styles.date}>{r.due}</td>
                        <td>
                          <Link
                            href={`/partenaire/reporting/${r.ref}`}
                            className={styles.btnIcon}
                            aria-label="Ouvrir"
                          >
                            <ArrowRight size={14} aria-hidden />
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <aside className={styles.rail}>
          <section className={styles.railCard}>
            <h4 className={styles.railH}>Échéances reporting</h4>
            <div className={styles.railBody}>
              <div className={styles.upcoming}>
                <div className={styles.upcomingDay}>
                  <div className={styles.upcomingD}>12</div>
                  <div className={styles.upcomingM}>mai</div>
                </div>
                <div className={styles.upcomingMeta}>
                  <strong>L1 cadrage AMOA</strong>
                  <div className={styles.upcomingRef}>PROP-2026-019</div>
                </div>
                <span className={styles.countdown}>J+3</span>
              </div>
              <div className={styles.upcoming}>
                <div className={styles.upcomingDay}>
                  <div className={styles.upcomingD}>30</div>
                  <div className={styles.upcomingM}>juin</div>
                </div>
                <div className={styles.upcomingMeta}>
                  <strong>Clôture S1 2026</strong>
                  <div className={styles.upcomingRef}>Données indicateurs</div>
                </div>
                <span className={styles.countdown}>J+52</span>
              </div>
              <div className={styles.upcoming}>
                <div className={styles.upcomingDay}>
                  <div className={styles.upcomingD}>15</div>
                  <div className={styles.upcomingM}>juil</div>
                </div>
                <div className={styles.upcomingMeta}>
                  <strong>Rapport semestriel</strong>
                  <div className={styles.upcomingRef}>Soumission UGP</div>
                </div>
                <span className={styles.countdown}>J+67</span>
              </div>
            </div>
          </section>

          <section className={styles.railCard}>
            <h4 className={styles.railH}>
              <Activity size={12} aria-hidden style={{ verticalAlign: "middle", marginRight: 4 }} />
              Cadre de résultats
            </h4>
            <div className={styles.indicators}>
              {INDICATORS.map((ind, i) => (
                <div key={i} className={styles.indicator}>
                  <div className={styles.indicatorH}>
                    <span>{ind.name}</span>
                    <span className="ptn-mono" style={{ color: "var(--cds-text-helper)" }}>
                      {ind.pct} %
                    </span>
                  </div>
                  <div className={styles.progressBar}>
                    <i style={{ width: `${ind.pct}%` }} />
                  </div>
                  <div className={styles.indicatorTarget}>
                    {ind.current} / {ind.target} (cible 2029)
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className={styles.railCard}>
            <h4 className={styles.railH}>Modèles disponibles</h4>
            <div className={styles.railBody}>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                  fontSize: 12,
                  color: "var(--cds-text-secondary)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Document size={14} aria-hidden style={{ color: "var(--cds-text-helper)" }} />
                  Modèle rapport semestriel · v 2026.05
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Document size={14} aria-hidden style={{ color: "var(--cds-text-helper)" }} />
                  Modèle bilan livrable · v 1.3
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Document size={14} aria-hidden style={{ color: "var(--cds-text-helper)" }} />
                  Trame indicateurs cadre résultats
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Events size={14} aria-hidden style={{ color: "var(--cds-text-helper)" }} />
                  Calendrier annuel reporting 2026
                </div>
              </div>
            </div>
          </section>
        </aside>
      </div>
    </Shell>
  );
}
