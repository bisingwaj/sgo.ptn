import { Shell } from "@/components/shell/Shell";
import { PageHeader } from "@/components/ui/PageHeader";
import {
  Events,
  TaskApproved,
  Add,
  UserMultiple,
  Time,
  WatsonHealthMagnify,
  Download,
} from "@carbon/icons-react";
import { DemoButton } from "@/components/ui/DemoButton";
import styles from "@/styles/ugp-shared.module.scss";

export const metadata = { title: "Commissions d'évaluation · UGP · PTN-RDC" };

interface Commission {
  ref: string;
  title: string;
  marketRef: string;
  amount: string;
  members: number;
  stage: "constitution" | "pre-qual" | "evaluation" | "pv" | "closed";
  president: string;
  nextSession: string;
  daysOpen: number;
}

const COMMISSIONS: Commission[] = [
  { ref: "CE-2026-007", title: "Plateforme identité numérique — AMOA", marketRef: "PTN-2026-019", amount: "8,7 M USD", members: 5, stage: "evaluation", president: "A. Bopundja", nextSession: "13 mai 2026", daysOpen: 11 },
  { ref: "CE-2026-005", title: "Datacenter Tier-3 Kinshasa", marketRef: "PTN-2026-016", amount: "28,5 M USD", members: 7, stage: "pre-qual", president: "K. Lufima", nextSession: "11 mai 2026", daysOpen: 6 },
  { ref: "CE-2026-003", title: "Backbone fibre Goma-Bukavu", marketRef: "PTN-2025-094", amount: "2,1 M USD", members: 5, stage: "pv", president: "J. Mukendi", nextSession: "—", daysOpen: 32 },
  { ref: "CE-2026-002", title: "SOC national cybersécurité", marketRef: "PTN-2026-021", amount: "5,4 M USD", members: 6, stage: "constitution", president: "M. Tshibanda", nextSession: "15 mai 2026", daysOpen: 2 },
  { ref: "CE-2026-001", title: "Hubs technologiques (5 villes)", marketRef: "PTN-2026-007", amount: "16,8 M USD", members: 8, stage: "closed", president: "A. Bopundja", nextSession: "—", daysOpen: 0 },
];

function StageTag({ stage }: { stage: Commission["stage"] }) {
  const map = {
    constitution: { cls: styles.tagInfo, label: "Constitution" },
    "pre-qual": { cls: styles.tagInfo, label: "Pré-qualification" },
    evaluation: { cls: styles.tagWarn, label: "Évaluation" },
    pv: { cls: styles.tagOk, label: "PV à signer" },
    closed: { cls: "", label: "Clôturée" },
  };
  const { cls, label } = map[stage];
  return <span className={`${styles.tag} ${cls}`}>{label}</span>;
}

export default function CommissionsPage() {
  return (
    <Shell crumbs={[{ label: "Cockpit UGP", href: "/cockpit" }, { label: "Commissions" }]}>
      <PageHeader
        eyebrow="UGP · COMMISSIONS D'ÉVALUATION"
        title="Commissions actives"
        subtitle="Évaluation technique des offres reçues. Composition multi-acteurs · présidence tournante."
        meta={
          <>
            <span>
              <strong>5 commissions actives</strong> · 31 membres mobilisés
            </span>
            <span>·</span>
            <span>
              Délai moyen évaluation : <span className="ptn-mono">14 j</span>
            </span>
          </>
        }
        actions={
          <>
            <DemoButton
              label="Exporter PV"
              icon={<Download size={14} aria-hidden />}
              toastTitle="Export PV commissions"
              toastMessage="PDF compilé des 12 PV signés 2026 — délai ~20 s."
            />
            <DemoButton
              label="Constituer une commission"
              icon={<Add size={16} aria-hidden />}
              variant="primary"
              toastTitle="Nouvelle commission d'évaluation"
              toastMessage="Workflow de constitution : sélection des membres, signature CDI, attribution du président."
            />
          </>
        }
      />

      <div className={styles.kpis}>
        <div className={styles.kpi}>
          <div className={styles.kpiK}>
            <Events size={14} aria-hidden /> Actives
          </div>
          <div className={styles.kpiV}>5</div>
          <div className={styles.kpiU}>+2 cette semaine</div>
        </div>
        <div className={styles.kpi}>
          <div className={styles.kpiK}>
            <UserMultiple size={14} aria-hidden /> Membres
          </div>
          <div className={styles.kpiV}>31</div>
          <div className={styles.kpiU}>mobilisés · 8 cabinets</div>
        </div>
        <div className={styles.kpi}>
          <div className={styles.kpiK}>
            <Time size={14} aria-hidden /> Délai moyen
          </div>
          <div className={styles.kpiV}>14 j</div>
          <div className={styles.kpiU} style={{ color: "var(--ptn-status-success)" }}>
            −3 j vs T-1
          </div>
        </div>
        <div className={styles.kpi}>
          <div className={styles.kpiK}>
            <TaskApproved size={14} aria-hidden /> PV signés 2026
          </div>
          <div className={styles.kpiV} style={{ color: "var(--ptn-status-success)" }}>
            12
          </div>
          <div className={styles.kpiU}>100 % conformes</div>
        </div>
      </div>

      <div className={styles.layout}>
        <div className={styles.tableCard}>
          <div className={styles.toolbar}>
            <h3>
              Commissions actives <span className={styles.num}>({COMMISSIONS.length})</span>
            </h3>
            <div className={styles.spacer} />
            <div className={styles.search}>
              <WatsonHealthMagnify size={14} aria-hidden />
              <input type="search" placeholder="Rechercher une commission…" />
            </div>
          </div>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <colgroup>
                <col style={{ width: "12%" }} />
                <col style={{ width: "28%" }} />
                <col style={{ width: "12%" }} />
                <col style={{ width: "12%" }} />
                <col style={{ width: "9%" }} />
                <col style={{ width: "15%" }} />
                <col style={{ width: "12%" }} />
              </colgroup>
              <thead>
                <tr>
                  <th>Réf</th>
                  <th>Marché évalué</th>
                  <th style={{ textAlign: "right" }}>Montant</th>
                  <th>Stade</th>
                  <th>Membres</th>
                  <th>Président</th>
                  <th>Prochaine session</th>
                </tr>
              </thead>
              <tbody>
                {COMMISSIONS.map((c) => (
                  <tr key={c.ref}>
                    <td>
                      <span className={styles.ref}>{c.ref}</span>
                    </td>
                    <td>
                      <div className={styles.title}>{c.title}</div>
                      <div className={styles.titleSub}>{c.marketRef}</div>
                    </td>
                    <td className={styles.amount}>{c.amount}</td>
                    <td>
                      <StageTag stage={c.stage} />
                    </td>
                    <td>{c.members}</td>
                    <td>{c.president}</td>
                    <td className={styles.date}>{c.nextSession}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <aside className={styles.rail}>
          <section className={styles.railCard}>
            <h4 className={styles.railH}>
              <Events size={12} aria-hidden /> Prochaines sessions
            </h4>
            <div className={styles.railBody}>
              <div className={styles.railRow}>
                <div className={styles.railK}>11 mai</div>
                <div className={styles.railV}>CE-2026-005 · Datacenter</div>
              </div>
              <div className={styles.railRow}>
                <div className={styles.railK}>13 mai</div>
                <div className={styles.railV}>CE-2026-007 · AMOA Identité</div>
              </div>
              <div className={styles.railRow}>
                <div className={styles.railK}>15 mai</div>
                <div className={styles.railV}>CE-2026-002 · SOC</div>
              </div>
            </div>
          </section>

          <section className={styles.railCard}>
            <h4 className={styles.railH}>
              <UserMultiple size={12} aria-hidden /> Pool d&apos;évaluateurs
            </h4>
            <div className={styles.railBody}>
              <div className={styles.railRow}>
                <div className={styles.railK}>Internes UGP</div>
                <div className={styles.railV}>12 actifs</div>
              </div>
              <div className={styles.railRow}>
                <div className={styles.railK}>Cabinets externes</div>
                <div className={styles.railV}>8 référencés</div>
              </div>
              <div className={styles.railRow}>
                <div className={styles.railK}>Bailleurs</div>
                <div className={styles.railV}>4 observateurs</div>
              </div>
              <div className={styles.railRow}>
                <div className={styles.railK}>CDI signées</div>
                <div className={`${styles.railV} ${styles.railVMono}`}>31 / 31</div>
              </div>
            </div>
          </section>
        </aside>
      </div>
    </Shell>
  );
}
