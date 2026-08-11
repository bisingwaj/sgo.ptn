import { Shell } from "@/components/shell/Shell";
import { PageHeader } from "@/components/ui/PageHeader";
import {
  Folders,
  Money,
  TaskApproved,
  Time,
  Add,
  Download,
  WatsonHealthMagnify,
  Locked,
} from "@carbon/icons-react";
import { DemoButton } from "@/components/ui/DemoButton";
import styles from "@/styles/ugp-shared.module.scss";

export const metadata = { title: "Contrats & avenants · UGP · PTN-RDC" };

interface Contract {
  ref: string;
  title: string;
  contractor: string;
  amount: string;
  signed: string;
  endDate: string;
  status: "active" | "ending" | "expired" | "amended";
  progress: number;
  payments: { done: number; planned: number };
}

const CONTRACTS: Contract[] = [
  { ref: "CTR-2026-014", title: "AMOA Plateforme identité numérique", contractor: "Cabinet AURA Conseil", amount: "8,7 M USD", signed: "08 mai 2026", endDate: "08 mai 2027", status: "active", progress: 12, payments: { done: 1, planned: 8 } },
  { ref: "CTR-2026-011", title: "Construction Datacenter Tier-3", contractor: "STCM-Holding SARL", amount: "28,5 M USD", signed: "21 avr. 2026", endDate: "21 oct. 2027", status: "active", progress: 8, payments: { done: 1, planned: 12 } },
  { ref: "CTR-2025-094", title: "Backbone fibre Goma-Bukavu", contractor: "Konnect SARL", amount: "2,1 M USD", signed: "15 déc. 2025", endDate: "15 juin 2027", status: "active", progress: 42, payments: { done: 4, planned: 10 } },
  { ref: "CTR-2025-082", title: "Formation EESU 200 enseignants", contractor: "Université de Kinshasa", amount: "920 k USD", signed: "10 oct. 2025", endDate: "10 oct. 2026", status: "ending", progress: 78, payments: { done: 6, planned: 8 } },
  { ref: "CTR-2025-067", title: "Étude PGES infrastructures télécom", contractor: "Bureau CEDEAO SARL", amount: "420 k USD", signed: "20 août 2025", endDate: "20 mai 2026", status: "ending", progress: 92, payments: { done: 5, planned: 6 } },
  { ref: "CTR-2025-038", title: "AMOA Stratégie identité numérique (phase 1)", contractor: "Cabinet AURA Conseil", amount: "1,8 M USD", signed: "15 mai 2025", endDate: "15 février 2026", status: "amended", progress: 100, payments: { done: 5, planned: 5 } },
];

function StatusTag({ status }: { status: Contract["status"] }) {
  const map = {
    active: { cls: styles.tagOk, label: "Actif" },
    ending: { cls: styles.tagWarn, label: "En fin de contrat" },
    expired: { cls: styles.tagErr, label: "Expiré" },
    amended: { cls: styles.tagInfo, label: "Avenant signé" },
  };
  const { cls, label } = map[status];
  return <span className={`${styles.tag} ${cls}`}>{label}</span>;
}

export default function ContratsPage() {
  return (
    <Shell crumbs={[{ label: "Cockpit UGP", href: "/cockpit" }, { label: "Contrats" }]}>
      <PageHeader
        eyebrow="UGP · CONTRATS & AVENANTS"
        title="Portefeuille contractuel"
        subtitle="Gestion des contrats signés post-attribution · suivi paiements · gestion avenants & extensions."
        meta={
          <>
            <span>
              <strong>42 contrats actifs</strong> · valeur cumulée 124 M USD
            </span>
            <span>·</span>
            <span>
              4 en fin de contrat (≤ 60 j)
            </span>
          </>
        }
        actions={
          <>
            <DemoButton
              label="Export portefeuille"
              icon={<Download size={14} aria-hidden />}
              toastTitle="Export portefeuille contractuel"
              toastMessage="42 contrats actifs · valeur cumulée 124,3 M USD · format XLSX."
            />
            <DemoButton
              label="Enregistrer un contrat"
              icon={<Add size={16} aria-hidden />}
              variant="primary"
              toastTitle="Nouveau contrat"
              toastMessage="Workflow d'enregistrement post-attribution : signature, paiements planifiés, suivi avenants."
            />
          </>
        }
      />

      <div className={styles.kpis}>
        <div className={styles.kpi}>
          <div className={styles.kpiK}>
            <Folders size={14} aria-hidden /> Contrats actifs
          </div>
          <div className={styles.kpiV}>42</div>
          <div className={styles.kpiU}>+3 ce mois</div>
        </div>
        <div className={styles.kpi}>
          <div className={styles.kpiK}>
            <Money size={14} aria-hidden /> Valeur engagée
          </div>
          <div className={styles.kpiV}>124,3 M</div>
          <div className={styles.kpiU}>USD · cumul 2026</div>
        </div>
        <div className={styles.kpi}>
          <div className={styles.kpiK}>
            <Time size={14} aria-hidden /> En fin de contrat
          </div>
          <div className={styles.kpiV} style={{ color: "var(--ptn-status-warning-text)" }}>
            4
          </div>
          <div className={styles.kpiU}>≤ 60 jours</div>
        </div>
        <div className={styles.kpi}>
          <div className={styles.kpiK}>
            <TaskApproved size={14} aria-hidden /> Avenants signés
          </div>
          <div className={styles.kpiV}>11</div>
          <div className={styles.kpiU}>2026 · délai moyen 12 j</div>
        </div>
      </div>

      <div className={styles.layout}>
        <div className={styles.tableCard}>
          <div className={styles.toolbar}>
            <h3>
              Contrats <span className={styles.num}>({CONTRACTS.length} affichés / 42)</span>
            </h3>
            <div className={styles.spacer} />
            <div className={styles.search}>
              <WatsonHealthMagnify size={14} aria-hidden />
              <input type="search" placeholder="Rechercher un contrat…" />
            </div>
            <DemoButton
              label="Filtres"
              toastTitle="Filtres avancés"
              toastMessage="Filtrer par titulaire, montant, statut, échéance, méthode de passation."
            />
          </div>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <colgroup>
                <col style={{ width: "12%" }} />
                <col style={{ width: "28%" }} />
                <col style={{ width: "16%" }} />
                <col style={{ width: "11%" }} />
                <col style={{ width: "11%" }} />
                <col style={{ width: "11%" }} />
                <col style={{ width: "11%" }} />
              </colgroup>
              <thead>
                <tr>
                  <th>Réf</th>
                  <th>Objet</th>
                  <th>Titulaire</th>
                  <th style={{ textAlign: "right" }}>Montant</th>
                  <th>Statut</th>
                  <th>Avancement</th>
                  <th>Fin</th>
                </tr>
              </thead>
              <tbody>
                {CONTRACTS.map((c) => (
                  <tr key={c.ref}>
                    <td>
                      <span className={styles.ref}>{c.ref}</span>
                    </td>
                    <td>
                      <div className={styles.title}>{c.title}</div>
                      <div className={styles.titleSub}>
                        Paiements {c.payments.done} / {c.payments.planned}
                      </div>
                    </td>
                    <td>{c.contractor}</td>
                    <td className={styles.amount}>{c.amount}</td>
                    <td>
                      <StatusTag status={c.status} />
                    </td>
                    <td>
                      <div className={styles.miniProg}>
                        <div
                          className={`${styles.miniBar} ${c.progress > 80 ? styles.miniBarOk : c.progress < 20 ? styles.miniBarWarn : ""}`}
                        >
                          <i style={{ width: `${c.progress}%` }} />
                        </div>
                        <span className={styles.miniPct}>{c.progress} %</span>
                      </div>
                    </td>
                    <td className={styles.date}>{c.endDate}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <aside className={styles.rail}>
          <section className={styles.railCard}>
            <h4 className={styles.railH}>
              <Time size={12} aria-hidden /> Échéances proches
            </h4>
            <div className={styles.railBody}>
              <div className={styles.railRow}>
                <div className={styles.railK}>20 mai</div>
                <div className={styles.railV}>CTR-2025-067 (Bureau CEDEAO)</div>
              </div>
              <div className={styles.railRow}>
                <div className={styles.railK}>15 juin</div>
                <div className={styles.railV}>CTR-2025-094 (Konnect)</div>
              </div>
              <div className={styles.railRow}>
                <div className={styles.railK}>10 oct.</div>
                <div className={styles.railV}>CTR-2025-082 (Univ. Kinshasa)</div>
              </div>
            </div>
          </section>

          <section className={styles.railCard}>
            <h4 className={styles.railH}>
              <Locked size={12} aria-hidden /> Conformité signatures
            </h4>
            <div className={styles.railBody}>
              <div className={styles.railRow}>
                <div className={styles.railK}>Signés HMAC</div>
                <div className={styles.railV} style={{ color: "var(--ptn-status-success)" }}>
                  42 / 42
                </div>
              </div>
              <div className={styles.railRow}>
                <div className={styles.railK}>STEP soumis</div>
                <div className={styles.railV}>40 / 42</div>
              </div>
              <div className={styles.railRow}>
                <div className={styles.railK}>Avenants ANO</div>
                <div className={styles.railV}>11 / 11</div>
              </div>
            </div>
          </section>

          <section className={styles.railCard}>
            <h4 className={styles.railH}>Catégories</h4>
            <div className={styles.railBody}>
              <div className={styles.railRow}>
                <div className={styles.railK}>Travaux</div>
                <div className={styles.railV}>12 contrats · 78 M</div>
              </div>
              <div className={styles.railRow}>
                <div className={styles.railK}>Biens IT</div>
                <div className={styles.railV}>11 contrats · 24 M</div>
              </div>
              <div className={styles.railRow}>
                <div className={styles.railK}>Services</div>
                <div className={styles.railV}>14 contrats · 18 M</div>
              </div>
              <div className={styles.railRow}>
                <div className={styles.railK}>Formation</div>
                <div className={styles.railV}>5 contrats · 4,3 M</div>
              </div>
            </div>
          </section>
        </aside>
      </div>
    </Shell>
  );
}
