import { Shell } from "@/components/shell/Shell";
import { PageHeader } from "@/components/ui/PageHeader";
import {
  ChartLineSmooth,
  Money,
  TaskApproved,
  Time,
  Download,
  Add,
  Notebook,
  Activity,
} from "@carbon/icons-react";
import { DemoButton } from "@/components/ui/DemoButton";
import styles from "@/styles/ugp-shared.module.scss";

export const metadata = { title: "PTBA · Cockpit UGP · PTN-RDC" };

interface PtbaActivity {
  code: string;
  title: string;
  component: "C1" | "C2" | "C3" | "C4";
  budget: number;
  engaged: number;
  disbursed: number;
  status: "active" | "delayed" | "completed";
  startQ: string;
  endQ: string;
}

const ACTIVITIES: PtbaActivity[] = [
  { code: "A1.1.1", title: "Backbone fibre optique 1 200 km", component: "C1", budget: 24_500_000, engaged: 18_200_000, disbursed: 6_400_000, status: "active", startQ: "2026-Q1", endQ: "2027-Q3" },
  { code: "A1.4.2", title: "Connectivité 145 territoires", component: "C1", budget: 32_000_000, engaged: 12_500_000, disbursed: 3_200_000, status: "active", startQ: "2026-Q2", endQ: "2028-Q4" },
  { code: "A2.3.1", title: "Plateforme identité numérique", component: "C2", budget: 18_700_000, engaged: 8_700_000, disbursed: 1_200_000, status: "active", startQ: "2026-Q2", endQ: "2027-Q4" },
  { code: "A2.5.1", title: "Datacenter Tier-3 Kinshasa", component: "C2", budget: 28_500_000, engaged: 14_200_000, disbursed: 4_800_000, status: "active", startQ: "2026-Q1", endQ: "2027-Q2" },
  { code: "A2.7.2", title: "SOC national cybersécurité", component: "C2", budget: 12_400_000, engaged: 11_800_000, disbursed: 8_900_000, status: "active", startQ: "2025-Q4", endQ: "2026-Q3" },
  { code: "A3.2.1", title: "Hubs technologiques (5 villes)", component: "C3", budget: 16_800_000, engaged: 4_200_000, disbursed: 800_000, status: "delayed", startQ: "2026-Q2", endQ: "2028-Q1" },
  { code: "A3.4.1", title: "Formation EESU 200 enseignants", component: "C3", budget: 4_200_000, engaged: 3_800_000, disbursed: 2_100_000, status: "active", startQ: "2026-Q1", endQ: "2026-Q4" },
  { code: "A4.1.4", title: "Atelier ID4Africa Abidjan", component: "C4", budget: 85_000, engaged: 85_000, disbursed: 65_000, status: "active", startQ: "2026-Q2", endQ: "2026-Q2" },
];

const formatM = (n: number) => `${(n / 1_000_000).toFixed(1)} M`;

export default function PtbaPage() {
  const total = ACTIVITIES.reduce((a, x) => a + x.budget, 0);
  const engaged = ACTIVITIES.reduce((a, x) => a + x.engaged, 0);
  const disbursed = ACTIVITIES.reduce((a, x) => a + x.disbursed, 0);

  return (
    <Shell crumbs={[{ label: "Cockpit UGP", href: "/cockpit" }, { label: "PTBA" }]}>
      <PageHeader
        eyebrow="UGP · PLAN DE TRAVAIL ET BUDGET ANNUEL"
        title="PTBA 2026 — exécution & suivi"
        subtitle="78 activités planifiées · 4 composantes · budget global 540 M USD (IDA 400 + AFD 110 + RDC 30)."
        meta={
          <>
            <span>
              Cycle : <strong>2026-Q2 actif</strong>
            </span>
            <span>·</span>
            <span>
              Révision PTBA prévue : <span className="ptn-mono">15 juin 2026</span>
            </span>
          </>
        }
        actions={
          <>
            <DemoButton
              label="Exporter"
              icon={<Download size={14} aria-hidden />}
              toastTitle="Export PTBA en préparation"
              toastMessage="Le fichier Excel sera téléchargeable une fois le rapport généré (~30 s)."
              toastTone="ai"
            />
            <DemoButton
              label="Ajouter une activité"
              icon={<Add size={16} aria-hidden />}
              variant="primary"
              toastTitle="Nouvelle activité PTBA"
              toastMessage="Wizard d'enregistrement d'une activité — connecté à la base d'orchestration en production."
            />
          </>
        }
      />

      <div className={styles.kpis}>
        <div className={styles.kpi}>
          <div className={styles.kpiK}>
            <Notebook size={14} aria-hidden /> Activités 2026
          </div>
          <div className={styles.kpiV}>78</div>
          <div className={styles.kpiU}>
            C1 · 18 / C2 · 32 / C3 · 22 / C4 · 6
          </div>
        </div>
        <div className={styles.kpi}>
          <div className={styles.kpiK}>
            <Money size={14} aria-hidden /> Budget total
          </div>
          <div className={styles.kpiV}>540 M</div>
          <div className={styles.kpiU}>USD · IDA 79% + AFD 21%</div>
        </div>
        <div className={styles.kpi}>
          <div className={styles.kpiK}>
            <TaskApproved size={14} aria-hidden /> Engagé
          </div>
          <div className={styles.kpiV} style={{ color: "var(--ptn-status-success)" }}>
            {formatM(engaged)}
          </div>
          <div className={`${styles.kpiBar} ${styles.kpiBarOk}`}>
            <i style={{ width: `${(engaged / total) * 100}%` }} />
          </div>
          <div className={styles.kpiU}>{((engaged / total) * 100).toFixed(0)} % du PTBA</div>
        </div>
        <div className={styles.kpi}>
          <div className={styles.kpiK}>
            <Time size={14} aria-hidden /> Décaissé
          </div>
          <div className={styles.kpiV}>{formatM(disbursed)}</div>
          <div className={styles.kpiBar}>
            <i style={{ width: `${(disbursed / total) * 100}%` }} />
          </div>
          <div className={`${styles.kpiU}`}>
            <span style={{ color: "var(--ptn-status-warning-text)" }}>
              {((disbursed / total) * 100).toFixed(1)} %
            </span>{" "}
            · cible 30 % fin 2026
          </div>
        </div>
      </div>

      <div className={styles.layout}>
        <div className={styles.tableCard}>
          <div className={styles.toolbar}>
            <h3>
              Activités PTBA <span className={styles.num}>({ACTIVITIES.length})</span>
            </h3>
            <div className={styles.spacer} />
            <DemoButton
              label="Vue Gantt"
              toastTitle="Vue Gantt 2026"
              toastMessage="Diagramme de Gantt interactif des 78 activités PTBA — vue temps réel."
            />
            <DemoButton
              label="Filtres"
              toastTitle="Filtres avancés"
              toastMessage="Filtrer par composante, méthode, bailleur, statut d'exécution."
            />
          </div>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <colgroup>
                <col style={{ width: "11%" }} />
                <col style={{ width: "30%" }} />
                <col style={{ width: "9%" }} />
                <col style={{ width: "12%" }} />
                <col style={{ width: "11%" }} />
                <col style={{ width: "16%" }} />
                <col style={{ width: "11%" }} />
              </colgroup>
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Activité</th>
                  <th>Composante</th>
                  <th style={{ textAlign: "right" }}>Budget</th>
                  <th style={{ textAlign: "right" }}>Décaissé</th>
                  <th>Exécution</th>
                  <th>Période</th>
                </tr>
              </thead>
              <tbody>
                {ACTIVITIES.map((a) => {
                  const compCls =
                    a.component === "C1"
                      ? styles.tagC1
                      : a.component === "C2"
                        ? styles.tagC2
                        : a.component === "C3"
                          ? styles.tagC3
                          : styles.tagC4;
                  const pct = (a.disbursed / a.budget) * 100;
                  return (
                    <tr key={a.code}>
                      <td>
                        <span className={styles.ref}>{a.code}</span>
                      </td>
                      <td>
                        <div className={styles.title}>{a.title}</div>
                      </td>
                      <td>
                        <span className={`${styles.tag} ${compCls}`}>{a.component}</span>
                      </td>
                      <td className={styles.amount}>{formatM(a.budget)}</td>
                      <td className={styles.amount}>{formatM(a.disbursed)}</td>
                      <td>
                        <div className={styles.miniProg}>
                          <div
                            className={`${styles.miniBar} ${pct > 50 ? styles.miniBarOk : pct < 10 ? styles.miniBarWarn : ""}`}
                          >
                            <i style={{ width: `${pct}%` }} />
                          </div>
                          <span className={styles.miniPct}>{pct.toFixed(0)} %</span>
                        </div>
                      </td>
                      <td className={styles.date}>
                        {a.startQ} → {a.endQ}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <aside className={styles.rail}>
          <section className={styles.railCard}>
            <h4 className={styles.railH}>
              <Activity size={12} aria-hidden /> Répartition composantes
            </h4>
            <div className={styles.railBody}>
              {[
                { code: "C1", label: "Accès & Inclusion", pct: 105, color: "#007d79" },
                { code: "C2", label: "Fondations numériques", pct: 385, color: "var(--ptn-accent)" },
                { code: "C3", label: "Compétences & Innovation", pct: 95, color: "#d02670" },
                { code: "C4", label: "Coordination & Gestion", pct: 30, color: "var(--ptn-status-ai)" },
              ].map((c) => (
                <div key={c.code} style={{ marginBottom: 10 }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: 12,
                      marginBottom: 4,
                    }}
                  >
                    <span>
                      <strong style={{ fontFamily: "var(--font-ibm-plex-mono)", marginRight: 6 }}>
                        {c.code}
                      </strong>
                      {c.label}
                    </span>
                    <span
                      className="ptn-mono"
                      style={{ fontSize: 11, color: "var(--cds-text-helper)" }}
                    >
                      {c.pct} M
                    </span>
                  </div>
                  <div
                    style={{
                      height: 4,
                      background: "var(--cds-border-subtle)",
                      overflow: "hidden",
                    }}
                  >
                    <i
                      style={{
                        display: "block",
                        height: "100%",
                        width: `${(c.pct / 540) * 100}%`,
                        background: c.color,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className={styles.railCard}>
            <h4 className={styles.railH}>
              <ChartLineSmooth size={12} aria-hidden /> Cycle PTBA
            </h4>
            <div className={styles.railBody}>
              <div className={styles.railRow}>
                <div className={styles.railK}>Cycle actif</div>
                <div className={styles.railV}>2026-Q2 · avr-juin</div>
              </div>
              <div className={styles.railRow}>
                <div className={styles.railK}>Révision</div>
                <div className={`${styles.railV} ${styles.railVMono}`}>15 juin 2026</div>
              </div>
              <div className={styles.railRow}>
                <div className={styles.railK}>COPIL validation</div>
                <div className={`${styles.railV} ${styles.railVMono}`}>14 mai 2026</div>
              </div>
              <div className={styles.railRow}>
                <div className={styles.railK}>Cible décaissement</div>
                <div className={styles.railV}>
                  <strong>30 %</strong> fin 2026
                </div>
              </div>
            </div>
          </section>
        </aside>
      </div>
    </Shell>
  );
}
