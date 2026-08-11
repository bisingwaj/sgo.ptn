import { Shell } from "@/components/shell/Shell";
import { PageHeader } from "@/components/ui/PageHeader";
import {
  WatsonHealthMagnify,
  Locked,
  WarningAltFilled,
  CheckmarkFilled,
  Add,
  Download,
  Document,
} from "@carbon/icons-react";
import { AnomalyCard } from "@/components/ai/AnomalyCard";
import { DemoButton } from "@/components/ui/DemoButton";
import styles from "@/styles/ugp-shared.module.scss";

export const metadata = { title: "Audit interne · UGP · PTN-RDC" };

interface Mission {
  ref: string;
  title: string;
  scope: string;
  status: "planned" | "in-progress" | "report" | "closed";
  findings: { high: number; med: number; low: number };
  startDate: string;
  endDate: string;
  leadAuditor: string;
}

const MISSIONS: Mission[] = [
  { ref: "AUD-INT-2026-04", title: "Revue passation des marchés Q1 2026", scope: "78 marchés · échantillon 38", status: "in-progress", findings: { high: 1, med: 4, low: 7 }, startDate: "05 mai 2026", endDate: "30 mai 2026", leadAuditor: "T. Seya" },
  { ref: "AUD-INT-2026-03", title: "Conformité E&S · sauvegardes Banque mondiale", status: "report", scope: "32 activités E&S", findings: { high: 0, med: 2, low: 5 }, startDate: "12 avr. 2026", endDate: "08 mai 2026", leadAuditor: "P. Mbongo" },
  { ref: "AUD-INT-2026-02", title: "Contrôle fiduciaire compte désigné", status: "closed", scope: "Décaissements 2026-Q1", findings: { high: 0, med: 1, low: 3 }, startDate: "01 mars 2026", endDate: "30 mars 2026", leadAuditor: "M. Ngolo" },
  { ref: "AUD-INT-2026-01", title: "Évaluation système d'information UGP", status: "closed", scope: "Sécurité + intégrité données", findings: { high: 2, med: 5, low: 9 }, startDate: "15 janv. 2026", endDate: "28 févr. 2026", leadAuditor: "T. Seya" },
  { ref: "AUD-INT-2026-05", title: "Audit SBP · vérification 1er trimestre", status: "planned", scope: "42 bénéficiaires · échantillon 14", findings: { high: 0, med: 0, low: 0 }, startDate: "01 juin 2026", endDate: "28 juin 2026", leadAuditor: "T. Seya" },
];

function StatusTag({ status }: { status: Mission["status"] }) {
  const map = {
    planned: { cls: styles.tagInfo, label: "Planifiée" },
    "in-progress": { cls: styles.tagWarn, label: "En cours" },
    report: { cls: styles.tagInfo, label: "Rapport en cours" },
    closed: { cls: styles.tagOk, label: "Clôturée" },
  };
  const { cls, label } = map[status];
  return <span className={`${styles.tag} ${cls}`}>{label}</span>;
}

export default function AuditInternePage() {
  return (
    <Shell crumbs={[{ label: "Cockpit UGP", href: "/cockpit" }, { label: "Audit interne" }]}>
      <PageHeader
        eyebrow="UGP · AUDIT INTERNE"
        title="Missions d'audit interne 2026"
        subtitle="Auditeur interne UGP · 5 missions planifiées 2026 · revue continue passation, E&S, fiduciaire, IT."
        meta={
          <>
            <span>
              <strong>5 missions 2026</strong> · 2 clôturées · 2 en cours · 1 planifiée
            </span>
            <span>·</span>
            <span>
              Auditeur en chef : <strong>T. Seya</strong>
            </span>
          </>
        }
        actions={
          <>
            <DemoButton
              label="Rapport annuel"
              icon={<Download size={14} aria-hidden />}
              toastTitle="Rapport audit interne 2026"
              toastMessage="Compilation des 5 missions · constatations · plan de remédiation."
            />
            <DemoButton
              label="Planifier une mission"
              icon={<Add size={16} aria-hidden />}
              variant="primary"
              toastTitle="Nouvelle mission d'audit"
              toastMessage="Définition du périmètre, calendrier, équipe, méthodologie IIA-IPPF."
            />
          </>
        }
      />

      <div className={styles.kpis}>
        <div className={styles.kpi}>
          <div className={styles.kpiK}>
            <WatsonHealthMagnify size={14} aria-hidden /> Missions 2026
          </div>
          <div className={styles.kpiV}>5</div>
          <div className={styles.kpiU}>passation · E&S · fiduc. · IT · SBP</div>
        </div>
        <div className={styles.kpi}>
          <div className={styles.kpiK}>
            <WarningAltFilled size={14} aria-hidden /> Constatations ouvertes
          </div>
          <div className={styles.kpiV} style={{ color: "var(--ptn-status-warning-text)" }}>
            14
          </div>
          <div className={styles.kpiU}>3 haute · 7 modérées · 4 faibles</div>
        </div>
        <div className={styles.kpi}>
          <div className={styles.kpiK}>
            <CheckmarkFilled size={14} aria-hidden /> Constatations résolues
          </div>
          <div className={styles.kpiV} style={{ color: "var(--ptn-status-success)" }}>
            18
          </div>
          <div className={styles.kpiU}>délai moyen 45 j</div>
        </div>
        <div className={styles.kpi}>
          <div className={styles.kpiK}>
            <Locked size={14} aria-hidden /> Audit trail
          </div>
          <div className={styles.kpiV} style={{ color: "var(--ptn-status-success)" }}>
            100 %
          </div>
          <div className={styles.kpiU}>signé HMAC · conforme ISO/IEC 42001</div>
        </div>
      </div>

      <div className={styles.layout}>
        <div className={styles.tableCard}>
          <div className={styles.toolbar}>
            <h3>
              Missions d&apos;audit <span className={styles.num}>({MISSIONS.length})</span>
            </h3>
            <div className={styles.spacer} />
            <DemoButton
              label="Vue calendrier"
              toastTitle="Calendrier d'audit 2026"
              toastMessage="Vue planning des 5 missions · J−7 / J / J+30."
            />
          </div>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <colgroup>
                <col style={{ width: "14%" }} />
                <col style={{ width: "32%" }} />
                <col style={{ width: "14%" }} />
                <col style={{ width: "13%" }} />
                <col style={{ width: "13%" }} />
                <col style={{ width: "14%" }} />
              </colgroup>
              <thead>
                <tr>
                  <th>Réf</th>
                  <th>Mission</th>
                  <th>Statut</th>
                  <th>Constatations</th>
                  <th>Auditeur en chef</th>
                  <th>Période</th>
                </tr>
              </thead>
              <tbody>
                {MISSIONS.map((m) => (
                  <tr key={m.ref}>
                    <td>
                      <span className={styles.ref}>{m.ref}</span>
                    </td>
                    <td>
                      <div className={styles.title}>{m.title}</div>
                      <div className={styles.titleSub}>{m.scope}</div>
                    </td>
                    <td>
                      <StatusTag status={m.status} />
                    </td>
                    <td>
                      <span
                        style={{
                          fontSize: 11,
                          fontFamily: "var(--font-ibm-plex-mono)",
                          display: "inline-flex",
                          gap: 6,
                        }}
                      >
                        <span style={{ color: "var(--ptn-status-danger)" }}>
                          {m.findings.high}H
                        </span>
                        <span style={{ color: "var(--ptn-status-warning-text)" }}>
                          {m.findings.med}M
                        </span>
                        <span style={{ color: "var(--cds-text-helper)" }}>
                          {m.findings.low}F
                        </span>
                      </span>
                    </td>
                    <td>{m.leadAuditor}</td>
                    <td className={styles.date}>
                      {m.startDate} → {m.endDate}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <aside className={styles.rail}>
          <AnomalyCard limit={3} scope="Scope · audit interne UGP" />

          <section className={styles.railCard}>
            <h4 className={styles.railH}>
              <Document size={12} aria-hidden /> Référentiel d&apos;audit
            </h4>
            <div className={styles.railBody}>
              <div className={styles.railRow}>
                <div className={styles.railK}>Cadre</div>
                <div className={styles.railV}>IIA · normes IPPF</div>
              </div>
              <div className={styles.railRow}>
                <div className={styles.railK}>Plan</div>
                <div className={`${styles.railV} ${styles.railVMono}`}>AUD-PLAN-2026</div>
              </div>
              <div className={styles.railRow}>
                <div className={styles.railK}>Charte</div>
                <div className={`${styles.railV} ${styles.railVMono}`}>v 2025.01</div>
              </div>
            </div>
          </section>
        </aside>
      </div>
    </Shell>
  );
}
