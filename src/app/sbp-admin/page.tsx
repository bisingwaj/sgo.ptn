import { Shell } from "@/components/shell/Shell";
import { PageHeader } from "@/components/ui/PageHeader";
import {
  Idea,
  Money,
  TaskApproved,
  Activity,
  Add,
  Download,
  WatsonHealthMagnify,
} from "@carbon/icons-react";
import { DemoButton } from "@/components/ui/DemoButton";
import styles from "@/styles/ugp-shared.module.scss";

export const metadata = { title: "Administration SBP · UGP · PTN-RDC" };

interface Beneficiaire {
  ref: string;
  name: string;
  type: "EESU" | "Hub" | "Startup" | "Centre";
  province: string;
  tranche: { current: number; total: number };
  indicators: { done: number; total: number };
  amount: string;
  status: "active" | "verified" | "pending" | "paused";
}

const BENEFICIAIRES: Beneficiaire[] = [
  { ref: "SBP-2026-042", name: "Hub Numérique Lubumbashi", type: "Hub", province: "Haut-Katanga", tranche: { current: 2, total: 4 }, indicators: { done: 7, total: 9 }, amount: "200 k USD", status: "active" },
  { ref: "SBP-2026-038", name: "EESU Goma · Formation", type: "EESU", province: "Nord-Kivu", tranche: { current: 1, total: 4 }, indicators: { done: 2, total: 6 }, amount: "150 k USD", status: "active" },
  { ref: "SBP-2026-031", name: "Startup CongoTech (incubation)", type: "Startup", province: "Kinshasa", tranche: { current: 3, total: 4 }, indicators: { done: 8, total: 9 }, amount: "120 k USD", status: "verified" },
  { ref: "SBP-2026-024", name: "Centre formation Bukavu", type: "Centre", province: "Sud-Kivu", tranche: { current: 2, total: 4 }, indicators: { done: 5, total: 8 }, amount: "180 k USD", status: "active" },
  { ref: "SBP-2026-017", name: "Hub Mbuji-Mayi", type: "Hub", province: "Kasaï-Oriental", tranche: { current: 1, total: 4 }, indicators: { done: 1, total: 7 }, amount: "200 k USD", status: "pending" },
  { ref: "SBP-2025-118", name: "EESU Kinshasa · Cohorte 2025", type: "EESU", province: "Kinshasa", tranche: { current: 4, total: 4 }, indicators: { done: 9, total: 9 }, amount: "150 k USD", status: "verified" },
];

function StatusTag({ status }: { status: Beneficiaire["status"] }) {
  const map = {
    active: { cls: styles.tagInfo, label: "Actif" },
    verified: { cls: styles.tagOk, label: "Vérifié" },
    pending: { cls: styles.tagWarn, label: "En attente vérif." },
    paused: { cls: styles.tagErr, label: "Suspendu" },
  };
  const { cls, label } = map[status];
  return <span className={`${styles.tag} ${cls}`}>{label}</span>;
}

export default function SbpAdminPage() {
  return (
    <Shell crumbs={[{ label: "Cockpit UGP", href: "/cockpit" }, { label: "SBP · Administration" }]}>
      <PageHeader
        eyebrow="UGP · SBP — SUBVENTION BASÉE SUR LA PERFORMANCE"
        title="Administration des bénéficiaires SBP"
        subtitle="42 bénéficiaires actifs · 9 indicateurs par tranche · vérifications trimestrielles par EG-SBP (cabinet KPMG-DRC)."
        meta={
          <>
            <span>
              <strong>42 bénéficiaires</strong> · 4 types (EESU, Hub, Startup, Centre)
            </span>
            <span>·</span>
            <span>
              Enveloppe : <span className="ptn-mono">7,2 M USD</span> · composante C3
            </span>
          </>
        }
        actions={
          <>
            <DemoButton
              label="Bilan SBP"
              icon={<Download size={14} aria-hidden />}
              toastTitle="Bilan SBP 2026"
              toastMessage="42 bénéficiaires · 218 / 378 indicateurs validés · 3,2 M USD décaissés."
            />
            <DemoButton
              label="Enregistrer un bénéficiaire"
              icon={<Add size={16} aria-hidden />}
              variant="primary"
              toastTitle="Nouveau bénéficiaire SBP"
              toastMessage="Workflow : éligibilité, signature convention, tranche 1, vérification EG-SBP."
            />
          </>
        }
      />

      <div className={styles.kpis}>
        <div className={styles.kpi}>
          <div className={styles.kpiK}>
            <Idea size={14} aria-hidden /> Bénéficiaires
          </div>
          <div className={styles.kpiV}>42</div>
          <div className={styles.kpiU}>EESU 14 · Hub 12 · Startup 9 · Centre 7</div>
        </div>
        <div className={styles.kpi}>
          <div className={styles.kpiK}>
            <Money size={14} aria-hidden /> Décaissé
          </div>
          <div className={styles.kpiV}>3,2 M</div>
          <div className={`${styles.kpiBar} ${styles.kpiBarOk}`}>
            <i style={{ width: "44%" }} />
          </div>
          <div className={styles.kpiU}>44 % · sur 7,2 M USD</div>
        </div>
        <div className={styles.kpi}>
          <div className={styles.kpiK}>
            <Activity size={14} aria-hidden /> Bénéficiaires touchés
          </div>
          <div className={styles.kpiV}>18 240</div>
          <div className={styles.kpiU}>49 % femmes · 12 provinces</div>
        </div>
        <div className={styles.kpi}>
          <div className={styles.kpiK}>
            <TaskApproved size={14} aria-hidden /> Indicateurs validés
          </div>
          <div className={styles.kpiV} style={{ color: "var(--ptn-status-success)" }}>
            218 / 378
          </div>
          <div className={styles.kpiU}>58 % · vérifications EG-SBP</div>
        </div>
      </div>

      <div className={styles.layout}>
        <div className={styles.tableCard}>
          <div className={styles.toolbar}>
            <h3>
              Bénéficiaires actifs <span className={styles.num}>({BENEFICIAIRES.length} affichés / 42)</span>
            </h3>
            <div className={styles.spacer} />
            <div className={styles.search}>
              <WatsonHealthMagnify size={14} aria-hidden />
              <input type="search" placeholder="Rechercher un bénéficiaire…" />
            </div>
            <DemoButton
              label="Filtres"
              toastTitle="Filtres SBP"
              toastMessage="Filtrer par type (EESU/Hub/Startup/Centre), province, tranche, statut."
            />
          </div>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <colgroup>
                <col style={{ width: "12%" }} />
                <col style={{ width: "28%" }} />
                <col style={{ width: "10%" }} />
                <col style={{ width: "13%" }} />
                <col style={{ width: "10%" }} />
                <col style={{ width: "14%" }} />
                <col style={{ width: "13%" }} />
              </colgroup>
              <thead>
                <tr>
                  <th>Réf</th>
                  <th>Bénéficiaire</th>
                  <th>Type</th>
                  <th>Province</th>
                  <th style={{ textAlign: "right" }}>Subv.</th>
                  <th>Indicateurs</th>
                  <th>Statut</th>
                </tr>
              </thead>
              <tbody>
                {BENEFICIAIRES.map((b) => {
                  const pct = (b.indicators.done / b.indicators.total) * 100;
                  return (
                    <tr key={b.ref}>
                      <td>
                        <span className={styles.ref}>{b.ref}</span>
                      </td>
                      <td>
                        <div className={styles.title}>{b.name}</div>
                        <div className={styles.titleSub}>
                          Tranche {b.tranche.current} / {b.tranche.total}
                        </div>
                      </td>
                      <td>{b.type}</td>
                      <td>{b.province}</td>
                      <td className={styles.amount}>{b.amount}</td>
                      <td>
                        <div className={styles.miniProg}>
                          <div
                            className={`${styles.miniBar} ${pct === 100 ? styles.miniBarOk : pct < 30 ? styles.miniBarWarn : ""}`}
                          >
                            <i style={{ width: `${pct}%` }} />
                          </div>
                          <span className={styles.miniPct}>
                            {b.indicators.done}/{b.indicators.total}
                          </span>
                        </div>
                      </td>
                      <td>
                        <StatusTag status={b.status} />
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
              <Activity size={12} aria-hidden /> Cadre SBP
            </h4>
            <div className={styles.railBody}>
              <div className={styles.railRow}>
                <div className={styles.railK}>Composante</div>
                <div className={styles.railV}>C3 · 3.1 + 3.2</div>
              </div>
              <div className={styles.railRow}>
                <div className={styles.railK}>EG-SBP</div>
                <div className={styles.railV}>Cabinet KPMG-DRC</div>
              </div>
              <div className={styles.railRow}>
                <div className={styles.railK}>Tranches</div>
                <div className={styles.railV}>4 par bénéficiaire</div>
              </div>
              <div className={styles.railRow}>
                <div className={styles.railK}>Indicateurs</div>
                <div className={styles.railV}>9 par tranche</div>
              </div>
            </div>
          </section>

          <section className={styles.railCard}>
            <h4 className={styles.railH}>Échéances vérifications</h4>
            <div className={styles.railBody}>
              <div className={styles.railRow}>
                <div className={styles.railK}>15 mai</div>
                <div className={styles.railV}>Hub Lubumbashi · tranche 2</div>
              </div>
              <div className={styles.railRow}>
                <div className={styles.railK}>22 mai</div>
                <div className={styles.railV}>EESU Goma · tranche 1</div>
              </div>
              <div className={styles.railRow}>
                <div className={styles.railK}>30 mai</div>
                <div className={styles.railV}>Centre Bukavu · tranche 2</div>
              </div>
            </div>
          </section>
        </aside>
      </div>
    </Shell>
  );
}
