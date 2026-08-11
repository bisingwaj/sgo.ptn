import { Shell } from "@/components/shell/Shell";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Tag } from "@/components/ui/Tag";
import { CheckmarkFilled, WarningAltFilled, Add, Document, Send } from "@carbon/icons-react";
import styles from "./saisie.module.scss";

export const metadata = { title: "Saisie de données SBP · PTN-RDC" };

const INDICATORS = [
  { code: "I-1", label: "Bénéficiaires accompagnés", target: 80, current: 48, unit: "personnes", status: "ok" },
  { code: "I-2", label: "Sessions de formation", target: 24, current: 18, unit: "sessions", status: "ok" },
  { code: "I-3", label: "Femmes formées", target: 30, current: 22, unit: "%", status: "ok" },
  { code: "I-4", label: "Plan d'action mentor signé", target: 80, current: 35, unit: "personnes", status: "warn" },
  { code: "I-5", label: "Note moyenne d'évaluation", target: 75, current: 82, unit: "/100", status: "ok" },
];

export default function SaisiePage() {
  return (
    <Shell crumbs={[{ label: "Mon programme", href: "/sbp" }, { label: "Saisie de données" }]}>
      <PageHeader
        eyebrow="HUB LUBUMBASHI · TRANCHE J3"
        title="Saisir les données du jalon J3"
        subtitle="Vos preuves de performance pour la prochaine vérification EG-SBP."
        meta={
          <>
            <span>
              Échéance : <strong style={{ color: "var(--ptn-status-warning)" }}>22 mai 2026 (J−14)</strong>
            </span>
            <span>·</span>
            <span>EG-SBP : <strong>KPMG-DRC</strong></span>
          </>
        }
        actions={
          <>
            <button type="button" className={styles.btnSecondary}>
              <Document size={16} aria-hidden /> Guide PDF
            </button>
            <button type="button" className={styles.btnPrimary}>
              <Send size={16} aria-hidden /> Soumettre à EG-SBP
            </button>
          </>
        }
      />

      <Card title="Indicateurs jalon J3" badge={`${INDICATORS.length} à compléter`} noPadding>
        <table className={styles.table}>
          <thead>
            <tr>
              <th></th>
              <th>Code</th>
              <th>Indicateur</th>
              <th>Cible J3</th>
              <th>Valeur saisie</th>
              <th>Preuves</th>
              <th>Statut</th>
            </tr>
          </thead>
          <tbody>
            {INDICATORS.map((i) => (
              <tr key={i.code}>
                <td>
                  {i.status === "ok" ? (
                    <CheckmarkFilled size={16} aria-hidden style={{ color: "var(--ptn-status-success)" }} />
                  ) : (
                    <WarningAltFilled size={16} aria-hidden style={{ color: "var(--ptn-status-warning)" }} />
                  )}
                </td>
                <td className="ptn-mono">{i.code}</td>
                <td>{i.label}</td>
                <td className="ptn-mono">
                  {i.target} {i.unit}
                </td>
                <td>
                  <input
                    type="number"
                    defaultValue={i.current}
                    className={styles.input}
                  />{" "}
                  <span className="ptn-mono" style={{ fontSize: 11, color: "var(--cds-text-helper)" }}>
                    {i.unit}
                  </span>
                </td>
                <td>
                  <button type="button" className={styles.uploadBtn}>
                    <Add size={12} aria-hidden /> 3 fichiers
                  </button>
                </td>
                <td>
                  <Tag tone={i.status === "ok" ? "green" : "yellow"} size="sm">
                    {i.status === "ok" ? "Complet" : "À compléter"}
                  </Tag>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </Shell>
  );
}
