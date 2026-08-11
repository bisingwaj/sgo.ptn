import { Shell } from "@/components/shell/Shell";
import { PageHeader } from "@/components/ui/PageHeader";
import {
  Earth,
  TaskApproved,
  WarningAltFilled,
  Document,
  Locked,
  Add,
  Download,
  WatsonHealthMagnify,
} from "@carbon/icons-react";
import { DemoButton } from "@/components/ui/DemoButton";
import styles from "@/styles/ugp-shared.module.scss";

export const metadata = { title: "Sauvegardes E&S · UGP · PTN-RDC" };

interface Activity {
  ref: string;
  title: string;
  category: "Faible" | "Modéré" | "Substantiel" | "Élevé";
  pgesStatus: "draft" | "review" | "approved";
  ano: "pending" | "obtained" | "not-required";
  consultations: { done: number; planned: number };
}

const ACTIVITIES: Activity[] = [
  { ref: "PTN-2026-016", title: "Datacenter Tier-3 Kinshasa", category: "Substantiel", pgesStatus: "review", ano: "pending", consultations: { done: 2, planned: 4 } },
  { ref: "PTN-2026-019", title: "Plateforme identité numérique", category: "Substantiel", pgesStatus: "draft", ano: "not-required", consultations: { done: 1, planned: 3 } },
  { ref: "PTN-2026-024", title: "Hub formation Goma", category: "Modéré", pgesStatus: "approved", ano: "obtained", consultations: { done: 3, planned: 3 } },
  { ref: "PTN-2025-094", title: "Backbone fibre Goma-Bukavu", category: "Substantiel", pgesStatus: "approved", ano: "obtained", consultations: { done: 6, planned: 6 } },
  { ref: "PTN-2026-007", title: "Modernisation registre personnes", category: "Faible", pgesStatus: "draft", ano: "not-required", consultations: { done: 0, planned: 1 } },
  { ref: "PTN-2026-018", title: "SOC national cybersécurité", category: "Faible", pgesStatus: "approved", ano: "not-required", consultations: { done: 1, planned: 1 } },
];

function CategoryTag({ cat }: { cat: Activity["category"] }) {
  const map = {
    Faible: styles.tagOk,
    Modéré: styles.tagInfo,
    Substantiel: styles.tagWarn,
    Élevé: styles.tagErr,
  };
  return <span className={`${styles.tag} ${map[cat]}`}>{cat}</span>;
}

function PgesTag({ status }: { status: Activity["pgesStatus"] }) {
  const map = {
    draft: { cls: "", label: "Brouillon" },
    review: { cls: styles.tagWarn, label: "En revue" },
    approved: { cls: styles.tagOk, label: "Approuvé" },
  };
  const { cls, label } = map[status];
  return <span className={`${styles.tag} ${cls}`}>{label}</span>;
}

export default function EsPage() {
  return (
    <Shell crumbs={[{ label: "Cockpit UGP", href: "/cockpit" }, { label: "Sauvegardes E&S" }]}>
      <PageHeader
        eyebrow="UGP · SAUVEGARDES ENVIRONNEMENTALES & SOCIALES"
        title="E&S · CGES · PEES · PMPP · PGMO"
        subtitle="Cadre Banque mondiale NES 1-10 · catégorisation par activité · plans de gestion + consultations publiques."
        meta={
          <>
            <span>
              <strong>32 activités sous E&S actif</strong> · 4 catégorisées Substantielles
            </span>
            <span>·</span>
            <span>
              CGES : <span className="ptn-mono">v2.3 · mai 2024</span>
            </span>
          </>
        }
        actions={
          <>
            <DemoButton
              label="Bilan trimestriel"
              icon={<Download size={14} aria-hidden />}
              toastTitle="Bilan E&S Q2 2026"
              toastMessage="Rapport conforme NES 1-10 · destiné à la Banque mondiale (Mission supervision)."
            />
            <DemoButton
              label="Nouvelle catégorisation"
              icon={<Add size={16} aria-hidden />}
              variant="primary"
              toastTitle="Catégorisation E&S d'une activité"
              toastMessage="Évaluation Faible / Modéré / Substantiel / Élevé selon le CGES PTN-RDC."
            />
          </>
        }
      />

      <div className={styles.kpis}>
        <div className={styles.kpi}>
          <div className={styles.kpiK}>
            <Earth size={14} aria-hidden /> Activités E&S actives
          </div>
          <div className={styles.kpiV}>32</div>
          <div className={styles.kpiU}>4 Substantielles · 8 Modérées · 20 Faibles</div>
        </div>
        <div className={styles.kpi}>
          <div className={styles.kpiK}>
            <Document size={14} aria-hidden /> PEES approuvés
          </div>
          <div className={styles.kpiV} style={{ color: "var(--ptn-status-success)" }}>
            18
          </div>
          <div className={`${styles.kpiBar} ${styles.kpiBarOk}`}>
            <i style={{ width: "56%" }} />
          </div>
          <div className={styles.kpiU}>56 % du portefeuille E&S</div>
        </div>
        <div className={styles.kpi}>
          <div className={styles.kpiK}>
            <WarningAltFilled size={14} aria-hidden /> En revue UGP
          </div>
          <div className={styles.kpiV} style={{ color: "var(--ptn-status-warning-text)" }}>
            6
          </div>
          <div className={styles.kpiU}>délai moyen 14 j</div>
        </div>
        <div className={styles.kpi}>
          <div className={styles.kpiK}>
            <TaskApproved size={14} aria-hidden /> Consultations publiques
          </div>
          <div className={styles.kpiV}>14</div>
          <div className={styles.kpiU}>menées 2026 · 8 à venir</div>
        </div>
      </div>

      <div className={styles.layout}>
        <div className={styles.tableCard}>
          <div className={styles.toolbar}>
            <h3>
              Activités sous sauvegardes <span className={styles.num}>({ACTIVITIES.length} affichées / 32)</span>
            </h3>
            <div className={styles.spacer} />
            <div className={styles.search}>
              <WatsonHealthMagnify size={14} aria-hidden />
              <input type="search" placeholder="Rechercher une activité…" />
            </div>
          </div>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <colgroup>
                <col style={{ width: "12%" }} />
                <col style={{ width: "32%" }} />
                <col style={{ width: "14%" }} />
                <col style={{ width: "14%" }} />
                <col style={{ width: "14%" }} />
                <col style={{ width: "14%" }} />
              </colgroup>
              <thead>
                <tr>
                  <th>Réf</th>
                  <th>Activité</th>
                  <th>Catégorie E&S</th>
                  <th>PGES / PEES</th>
                  <th>ANO bailleur</th>
                  <th>Consultations</th>
                </tr>
              </thead>
              <tbody>
                {ACTIVITIES.map((a) => {
                  const consultPct = (a.consultations.done / a.consultations.planned) * 100;
                  return (
                    <tr key={a.ref}>
                      <td>
                        <span className={styles.ref}>{a.ref}</span>
                      </td>
                      <td>
                        <div className={styles.title}>{a.title}</div>
                      </td>
                      <td>
                        <CategoryTag cat={a.category} />
                      </td>
                      <td>
                        <PgesTag status={a.pgesStatus} />
                      </td>
                      <td>
                        {a.ano === "obtained" ? (
                          <span className={`${styles.tag} ${styles.tagOk}`}>Obtenu</span>
                        ) : a.ano === "pending" ? (
                          <span className={`${styles.tag} ${styles.tagWarn}`}>En attente</span>
                        ) : (
                          <span className={`${styles.tag}`}>Non requis</span>
                        )}
                      </td>
                      <td>
                        <div className={styles.miniProg}>
                          <div
                            className={`${styles.miniBar} ${consultPct === 100 ? styles.miniBarOk : ""}`}
                          >
                            <i style={{ width: `${consultPct}%` }} />
                          </div>
                          <span className={styles.miniPct}>
                            {a.consultations.done}/{a.consultations.planned}
                          </span>
                        </div>
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
              <Earth size={12} aria-hidden /> Catégorisation
            </h4>
            <div className={styles.railBody}>
              <div className={styles.railRow}>
                <div className={styles.railK}>Faible</div>
                <div className={styles.railV}>20 activités</div>
              </div>
              <div className={styles.railRow}>
                <div className={styles.railK}>Modéré</div>
                <div className={styles.railV}>8 activités</div>
              </div>
              <div className={styles.railRow}>
                <div className={styles.railK}>Substantiel</div>
                <div className={styles.railV}>4 activités</div>
              </div>
              <div className={styles.railRow}>
                <div className={styles.railK}>Élevé</div>
                <div className={styles.railV}>0 activité</div>
              </div>
            </div>
          </section>

          <section className={styles.railCard}>
            <h4 className={styles.railH}>
              <Document size={12} aria-hidden /> Documents cadre
            </h4>
            <div className={styles.railBody}>
              <div className={styles.railRow}>
                <div className={styles.railK}>CGES</div>
                <div className={`${styles.railV} ${styles.railVMono}`}>v2.3 · mai 2024</div>
              </div>
              <div className={styles.railRow}>
                <div className={styles.railK}>PMPP</div>
                <div className={`${styles.railV} ${styles.railVMono}`}>v1.2 · juin 2024</div>
              </div>
              <div className={styles.railRow}>
                <div className={styles.railK}>PGMO</div>
                <div className={`${styles.railV} ${styles.railVMono}`}>v1.0 · juil. 2024</div>
              </div>
              <div className={styles.railRow}>
                <div className={styles.railK}>NES BM</div>
                <div className={styles.railV}>1-10 appliquées</div>
              </div>
            </div>
          </section>

          <section className={styles.railCard}>
            <h4 className={styles.railH}>
              <Locked size={12} aria-hidden /> Conformité audit
            </h4>
            <div className={styles.railBody}>
              <div
                style={{
                  fontSize: 11,
                  color: "var(--cds-text-secondary)",
                  lineHeight: 1.55,
                  margin: 0,
                }}
              >
                Toutes les décisions E&S sont journalisées avec signature HMAC. Audit annuel
                Banque mondiale conforme NES 1-10.
              </div>
            </div>
          </section>
        </aside>
      </div>
    </Shell>
  );
}
