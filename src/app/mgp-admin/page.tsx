import { Shell } from "@/components/shell/Shell";
import { PageHeader } from "@/components/ui/PageHeader";
import {
  Voicemail,
  WarningAltFilled,
  CheckmarkFilled,
  Time,
  Download,
  WatsonHealthMagnify,
  Locked,
} from "@carbon/icons-react";
import { DemoButton } from "@/components/ui/DemoButton";
import styles from "@/styles/ugp-shared.module.scss";

export const metadata = { title: "MGP Administration · UGP · PTN-RDC" };

interface Plainte {
  ref: string;
  title: string;
  category: string;
  province: string;
  referent: string;
  status: "received" | "in-progress" | "resolved" | "escalated";
  date: string;
  slaDays: number;
}

const PLAINTES: Plainte[] = [
  { ref: "MGP-2026-042", title: "Coupure d'accès internet Lubumbashi", category: "Qualité service", province: "Haut-Katanga", referent: "K. Tshiala", status: "in-progress", date: "06 mai 2026", slaDays: 7 },
  { ref: "MGP-2026-041", title: "Demande d'information cycle PTBA 2026", category: "Information", province: "Kinshasa", referent: "K. Tshiala", status: "received", date: "08 mai 2026", slaDays: 9 },
  { ref: "MGP-2026-040", title: "Réclamation paiement fournisseur Konnect", category: "Fiduciaire", province: "Sud-Kivu", referent: "P. Mbongo", status: "escalated", date: "01 mai 2026", slaDays: -2 },
  { ref: "MGP-2026-039", title: "Suggestion d'amélioration plateforme partenaire", category: "Amélioration", province: "Kinshasa", referent: "M. Ngolo", status: "received", date: "07 mai 2026", slaDays: 8 },
  { ref: "MGP-2026-038", title: "Demande d'information calendrier déploiement", category: "Information", province: "Kinshasa", referent: "K. Tshiala", status: "resolved", date: "29 avr. 2026", slaDays: 0 },
  { ref: "MGP-2026-037", title: "Plainte sur consultation publique TDR PROP-019", category: "Consultation", province: "Nord-Kivu", referent: "P. Mbongo", status: "in-progress", date: "24 avr. 2026", slaDays: 3 },
];

function StatusTag({ status }: { status: Plainte["status"] }) {
  const map = {
    received: { cls: styles.tagInfo, label: "Reçue" },
    "in-progress": { cls: styles.tagWarn, label: "En traitement" },
    resolved: { cls: styles.tagOk, label: "Résolue" },
    escalated: { cls: styles.tagErr, label: "Escaladée Coord" },
  };
  const { cls, label } = map[status];
  return <span className={`${styles.tag} ${cls}`}>{label}</span>;
}

export default function MgpAdminPage() {
  return (
    <Shell crumbs={[{ label: "Cockpit UGP", href: "/cockpit" }, { label: "MGP · Administration" }]}>
      <PageHeader
        eyebrow="UGP · MGP — VUE ADMINISTRATEUR"
        title="Plaintes & doléances en cours"
        subtitle="14 plaintes ouvertes · SLA 10 j ouvrables · cadre CGES PTN-RDC §6.3 + NES 10 Banque mondiale."
        meta={
          <>
            <span>
              <strong>14 plaintes ouvertes</strong> · 1 escaladée Coord UGP
            </span>
            <span>·</span>
            <span>
              Délai moyen 2026 : <span className="ptn-mono">6,8 j</span> (cible 10 j)
            </span>
          </>
        }
        actions={
          <>
            <DemoButton
              label="Bilan trimestriel"
              icon={<Download size={14} aria-hidden />}
              toastTitle="Bilan MGP Q2 2026"
              toastMessage="Synthèse plaintes · délais moyens · escalades. Conforme NES 10 BM + CGES."
            />
            <DemoButton
              label="Attribuer un référent"
              variant="primary"
              toastTitle="Attribution rapide"
              toastMessage="Sélectionnez un référent UGP pour les plaintes non encore prises en charge."
            />
          </>
        }
      />

      <div className={styles.kpis}>
        <div className={styles.kpi}>
          <div className={styles.kpiK}>
            <Voicemail size={14} aria-hidden /> Plaintes ouvertes
          </div>
          <div className={styles.kpiV}>14</div>
          <div className={styles.kpiU}>+3 cette semaine</div>
        </div>
        <div className={styles.kpi}>
          <div className={styles.kpiK}>
            <Time size={14} aria-hidden /> Délai moyen
          </div>
          <div className={styles.kpiV}>6,8 j</div>
          <div className={`${styles.kpiBar} ${styles.kpiBarOk}`}>
            <i style={{ width: "68%" }} />
          </div>
          <div className={styles.kpiU}>−32 % vs cible 10 j</div>
        </div>
        <div className={styles.kpi}>
          <div className={styles.kpiK}>
            <CheckmarkFilled size={14} aria-hidden /> Résolues 2026
          </div>
          <div className={styles.kpiV} style={{ color: "var(--ptn-status-success)" }}>
            42
          </div>
          <div className={styles.kpiU}>89 % satisfaction</div>
        </div>
        <div className={styles.kpi}>
          <div className={styles.kpiK}>
            <WarningAltFilled size={14} aria-hidden /> Escaladées
          </div>
          <div className={styles.kpiV} style={{ color: "var(--ptn-status-danger)" }}>
            1
          </div>
          <div className={styles.kpiU}>vers Coord UGP</div>
        </div>
      </div>

      <div className={styles.layout}>
        <div className={styles.tableCard}>
          <div className={styles.toolbar}>
            <h3>
              Plaintes en gestion <span className={styles.num}>({PLAINTES.length} affichées / 14)</span>
            </h3>
            <div className={styles.spacer} />
            <div className={styles.search}>
              <WatsonHealthMagnify size={14} aria-hidden />
              <input type="search" placeholder="Rechercher une plainte…" />
            </div>
            <DemoButton label="Filtres" toastTitle="Filtres MGP" toastMessage="Filtrer par catégorie, statut, référent, province, ancienneté SLA." />
          </div>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <colgroup>
                <col style={{ width: "12%" }} />
                <col style={{ width: "32%" }} />
                <col style={{ width: "13%" }} />
                <col style={{ width: "13%" }} />
                <col style={{ width: "11%" }} />
                <col style={{ width: "10%" }} />
                <col style={{ width: "9%" }} />
              </colgroup>
              <thead>
                <tr>
                  <th>Réf</th>
                  <th>Objet</th>
                  <th>Catégorie</th>
                  <th>Statut</th>
                  <th>Référent</th>
                  <th>Province</th>
                  <th>SLA</th>
                </tr>
              </thead>
              <tbody>
                {PLAINTES.map((p) => {
                  const overdue = p.slaDays < 0;
                  return (
                    <tr key={p.ref}>
                      <td>
                        <span className={styles.ref}>{p.ref}</span>
                      </td>
                      <td>
                        <div className={styles.title}>{p.title}</div>
                        <div className={styles.titleSub}>{p.date}</div>
                      </td>
                      <td>{p.category}</td>
                      <td>
                        <StatusTag status={p.status} />
                      </td>
                      <td>{p.referent}</td>
                      <td>{p.province}</td>
                      <td
                        style={{
                          fontFamily: "var(--font-ibm-plex-mono)",
                          fontSize: 11,
                          color: overdue
                            ? "var(--ptn-status-danger)"
                            : p.slaDays <= 2
                              ? "var(--ptn-status-warning-text)"
                              : "var(--ptn-status-success)",
                        }}
                      >
                        {overdue ? `+${Math.abs(p.slaDays)} j` : `J−${p.slaDays}`}
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
              <Voicemail size={12} aria-hidden /> Référents MGP
            </h4>
            <div className={styles.railBody}>
              <div className={styles.railRow}>
                <div className={styles.railK}>Secrétariat</div>
                <div className={styles.railV}>K. Tshiala · 6 plaintes</div>
              </div>
              <div className={styles.railRow}>
                <div className={styles.railK}>Référent E&S</div>
                <div className={styles.railV}>P. Mbongo · 3 plaintes</div>
              </div>
              <div className={styles.railRow}>
                <div className={styles.railK}>Référent fiduc.</div>
                <div className={styles.railV}>M. Ngolo · 2 plaintes</div>
              </div>
              <div className={styles.railRow}>
                <div className={styles.railK}>Coord (escalade)</div>
                <div className={styles.railV}>J. Mukendi · 1 cas</div>
              </div>
            </div>
          </section>

          <section className={styles.railCard}>
            <h4 className={styles.railH}>
              <Locked size={12} aria-hidden /> Canal EAS-HS confidentiel
            </h4>
            <div className={styles.railBody}>
              <p
                style={{
                  fontSize: 11,
                  color: "var(--cds-text-secondary)",
                  lineHeight: 1.5,
                  margin: 0,
                }}
              >
                Pour toute violence basée sur le genre, harcèlement ou abus sexuel, le canal
                EAS-HS est <strong>isolé du MGP standard</strong>. Accès restreint au pool
                de 3 personnes habilitées.
              </p>
              <a
                href="/mgp-eas-hs"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  fontSize: 12,
                  color: "var(--ptn-status-danger)",
                  textDecoration: "none",
                  marginTop: 8,
                }}
              >
                <Locked size={12} aria-hidden /> Accéder au canal confidentiel
              </a>
            </div>
          </section>

          <section className={styles.railCard}>
            <h4 className={styles.railH}>Cycle de traitement</h4>
            <div className={styles.railBody}>
              <div className={styles.railRow}>
                <div className={styles.railK}>Réception</div>
                <div className={styles.railV}>≤ 24 h</div>
              </div>
              <div className={styles.railRow}>
                <div className={styles.railK}>Qualification</div>
                <div className={styles.railV}>≤ 48 h</div>
              </div>
              <div className={styles.railRow}>
                <div className={styles.railK}>Instruction</div>
                <div className={styles.railV}>5 à 7 j</div>
              </div>
              <div className={styles.railRow}>
                <div className={styles.railK}>Réponse</div>
                <div className={styles.railV}>J+10 max</div>
              </div>
            </div>
          </section>
        </aside>
      </div>
    </Shell>
  );
}
