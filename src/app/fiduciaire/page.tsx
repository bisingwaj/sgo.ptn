import { Shell } from "@/components/shell/Shell";
import { PageHeader } from "@/components/ui/PageHeader";
import {
  Money,
  TaskApproved,
  Time,
  Add,
  Download,
  ChartLineSmooth,
  WatsonHealthMagnify,
  Locked,
} from "@carbon/icons-react";
import { DemoButton } from "@/components/ui/DemoButton";
import styles from "@/styles/ugp-shared.module.scss";

export const metadata = { title: "Gestion fiduciaire · UGP · PTN-RDC" };

interface Disbursement {
  ref: string;
  contract: string;
  contractor: string;
  amount: string;
  amountUsd: number;
  donor: "BM" | "AFD";
  status: "draft" | "review" | "approved" | "paid";
  requestDate: string;
  expectedDate: string;
  iprWithheld: string;
}

const DISBURSEMENTS: Disbursement[] = [
  { ref: "WA-2026-024", contract: "CTR-2026-014", contractor: "Cabinet AURA Conseil", amount: "1 087 500 USD", amountUsd: 1087500, donor: "BM", status: "review", requestDate: "05 mai 2026", expectedDate: "12 mai 2026", iprWithheld: "108 750 USD" },
  { ref: "WA-2026-023", contract: "CTR-2026-011", contractor: "STCM-Holding SARL", amount: "2 850 000 USD", amountUsd: 2850000, donor: "BM", status: "approved", requestDate: "01 mai 2026", expectedDate: "08 mai 2026", iprWithheld: "285 000 USD" },
  { ref: "WA-2026-022", contract: "CTR-2025-094", contractor: "Konnect SARL", amount: "420 000 USD", amountUsd: 420000, donor: "BM", status: "paid", requestDate: "20 avr. 2026", expectedDate: "30 avr. 2026", iprWithheld: "42 000 USD" },
  { ref: "WA-2026-021", contract: "CTR-2025-082", contractor: "Université de Kinshasa", amount: "115 000 USD", amountUsd: 115000, donor: "AFD", status: "paid", requestDate: "15 avr. 2026", expectedDate: "25 avr. 2026", iprWithheld: "—" },
  { ref: "WA-2026-020", contract: "CTR-2025-067", contractor: "Bureau CEDEAO SARL", amount: "84 000 USD", amountUsd: 84000, donor: "AFD", status: "review", requestDate: "03 mai 2026", expectedDate: "13 mai 2026", iprWithheld: "8 400 USD" },
];

function StatusTag({ status }: { status: Disbursement["status"] }) {
  const map = {
    draft: { cls: "", label: "Brouillon" },
    review: { cls: styles.tagWarn, label: "Revue UGP" },
    approved: { cls: styles.tagInfo, label: "Approuvée" },
    paid: { cls: styles.tagOk, label: "Décaissée" },
  };
  const { cls, label } = map[status];
  return <span className={`${styles.tag} ${cls}`}>{label}</span>;
}

export default function FiduciairePage() {
  return (
    <Shell crumbs={[{ label: "Cockpit UGP", href: "/cockpit" }, { label: "Fiduciaire" }]}>
      <PageHeader
        eyebrow="UGP · GESTION FIDUCIAIRE"
        title="Compte désigné & décaissements"
        subtitle="Demandes de retrait WA · décaissements IDA + AFD · retenue IPR 10 % · audit trail HMAC."
        meta={
          <>
            <span>
              Compte désigné BM : <span className="ptn-mono">CD-IDA-2026</span>
            </span>
            <span>·</span>
            <span>
              Solde : <strong className="ptn-mono">12,8 M USD</strong>
            </span>
          </>
        }
        actions={
          <>
            <DemoButton
              label="Rapport TOMWEB"
              icon={<Download size={14} aria-hidden />}
              toastTitle="Rapport TOMWEB"
              toastMessage="Synchronisation avec le système TOMWEB du Ministère des Finances · IFMIS RDC."
            />
            <DemoButton
              label="Nouvelle WA"
              icon={<Add size={16} aria-hidden />}
              variant="primary"
              toastTitle="Nouvelle demande de retrait"
              toastMessage="Wizard WA : contrat lié · montant · IPR 10 % · pièces justificatives · soumission BM ou AFD."
            />
          </>
        }
      />

      <div className={styles.kpis}>
        <div className={styles.kpi}>
          <div className={styles.kpiK}>
            <Money size={14} aria-hidden /> Décaissé 2026
          </div>
          <div className={styles.kpiV}>62,4 M</div>
          <div className={`${styles.kpiBar} ${styles.kpiBarOk}`}>
            <i style={{ width: "12%" }} />
          </div>
          <div className={styles.kpiU}>
            <span style={{ color: "var(--ptn-status-warning-text)" }}>12 %</span> · cible 30 % fin 2026
          </div>
        </div>
        <div className={styles.kpi}>
          <div className={styles.kpiK}>
            <TaskApproved size={14} aria-hidden /> WA en cours
          </div>
          <div className={styles.kpiV}>8</div>
          <div className={styles.kpiU}>5 BM · 3 AFD</div>
        </div>
        <div className={styles.kpi}>
          <div className={styles.kpiK}>
            <Time size={14} aria-hidden /> Délai moyen WA
          </div>
          <div className={styles.kpiV}>9,2 j</div>
          <div className={styles.kpiU} style={{ color: "var(--ptn-status-success)" }}>
            −2,8 j vs T-1
          </div>
        </div>
        <div className={styles.kpi}>
          <div className={styles.kpiK}>
            <ChartLineSmooth size={14} aria-hidden /> IPR retenu
          </div>
          <div className={styles.kpiV}>6,24 M</div>
          <div className={styles.kpiU}>USD reversé DGI · 10 % standard</div>
        </div>
      </div>

      <div className={styles.layout}>
        <div className={styles.tableCard}>
          <div className={styles.toolbar}>
            <h3>
              Demandes de retrait (WA) <span className={styles.num}>({DISBURSEMENTS.length})</span>
            </h3>
            <div className={styles.spacer} />
            <div className={styles.search}>
              <WatsonHealthMagnify size={14} aria-hidden />
              <input type="search" placeholder="Rechercher une WA…" />
            </div>
          </div>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <colgroup>
                <col style={{ width: "11%" }} />
                <col style={{ width: "11%" }} />
                <col style={{ width: "22%" }} />
                <col style={{ width: "13%" }} />
                <col style={{ width: "7%" }} />
                <col style={{ width: "12%" }} />
                <col style={{ width: "12%" }} />
                <col style={{ width: "12%" }} />
              </colgroup>
              <thead>
                <tr>
                  <th>WA</th>
                  <th>Contrat</th>
                  <th>Titulaire</th>
                  <th style={{ textAlign: "right" }}>Montant</th>
                  <th>Bailleur</th>
                  <th>Statut</th>
                  <th style={{ textAlign: "right" }}>IPR retenu</th>
                  <th>Échéance</th>
                </tr>
              </thead>
              <tbody>
                {DISBURSEMENTS.map((d) => (
                  <tr key={d.ref}>
                    <td>
                      <span className={styles.ref}>{d.ref}</span>
                    </td>
                    <td>
                      <span className={styles.ref}>{d.contract}</span>
                    </td>
                    <td>
                      <div className={styles.title}>{d.contractor}</div>
                    </td>
                    <td className={styles.amount}>{d.amount}</td>
                    <td>
                      <span
                        className={`${styles.tag} ${d.donor === "BM" ? styles.tagInfo : styles.tagAi}`}
                      >
                        {d.donor}
                      </span>
                    </td>
                    <td>
                      <StatusTag status={d.status} />
                    </td>
                    <td className={styles.amount}>{d.iprWithheld}</td>
                    <td className={styles.date}>{d.expectedDate}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <aside className={styles.rail}>
          <section className={styles.railCard}>
            <h4 className={styles.railH}>
              <Money size={12} aria-hidden /> Compte désigné
            </h4>
            <div className={styles.railBody}>
              <div className={styles.railRow}>
                <div className={styles.railK}>Réf</div>
                <div className={`${styles.railV} ${styles.railVMono}`}>CD-IDA-2026</div>
              </div>
              <div className={styles.railRow}>
                <div className={styles.railK}>Solde</div>
                <div className={`${styles.railV} ${styles.railVMono}`}>
                  <strong>12,8 M USD</strong>
                </div>
              </div>
              <div className={styles.railRow}>
                <div className={styles.railK}>Replenishment</div>
                <div className={`${styles.railV} ${styles.railVMono}`}>15 mai 2026</div>
              </div>
              <div className={styles.railRow}>
                <div className={styles.railK}>Plafond</div>
                <div className={`${styles.railV} ${styles.railVMono}`}>20 M USD</div>
              </div>
            </div>
          </section>

          <section className={styles.railCard}>
            <h4 className={styles.railH}>
              <ChartLineSmooth size={12} aria-hidden /> Décaissement par composante
            </h4>
            <div className={styles.railBody}>
              {[
                { code: "C1", amount: "12,4 M", pct: 32 },
                { code: "C2", amount: "38,2 M", pct: 49 },
                { code: "C3", amount: "8,6 M", pct: 22 },
                { code: "C4", amount: "3,2 M", pct: 18 },
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
                    <span className="ptn-mono">{c.code}</span>
                    <span
                      className="ptn-mono"
                      style={{ fontSize: 11, color: "var(--cds-text-helper)" }}
                    >
                      {c.amount} · {c.pct} %
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
                        width: `${c.pct}%`,
                        background: "var(--ptn-accent)",
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className={styles.railCard}>
            <h4 className={styles.railH}>
              <Locked size={12} aria-hidden /> Conformité fiduciaire
            </h4>
            <div className={styles.railBody}>
              <div className={styles.railRow}>
                <div className={styles.railK}>IPR DGI 2026</div>
                <div className={styles.railV} style={{ color: "var(--ptn-status-success)" }}>
                  100 % reversé
                </div>
              </div>
              <div className={styles.railRow}>
                <div className={styles.railK}>RFI Q1</div>
                <div className={styles.railV} style={{ color: "var(--ptn-status-success)" }}>
                  Soumis · 28 avr.
                </div>
              </div>
              <div className={styles.railRow}>
                <div className={styles.railK}>RFI Q2</div>
                <div className={`${styles.railV} ${styles.railVMono}`}>
                  Préparé · soumission 15 juil.
                </div>
              </div>
              <div className={styles.railRow}>
                <div className={styles.railK}>TOMWEB sync</div>
                <div className={styles.railV} style={{ color: "var(--ptn-status-success)" }}>
                  Temps réel
                </div>
              </div>
            </div>
          </section>
        </aside>
      </div>
    </Shell>
  );
}
