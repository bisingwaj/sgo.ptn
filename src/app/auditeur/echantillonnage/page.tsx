import { Shell } from "@/components/shell/Shell";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Tag } from "@/components/ui/Tag";
import { KpiStrip, KpiTile } from "@/components/ui/KpiTile";
import { ChartLineSmooth, Filter, Download, Locked } from "@carbon/icons-react";
import styles from "./echantillonnage.module.scss";

interface SampleRow {
  ref: string;
  title: string;
  componentCode: "C1" | "C2" | "C3" | "C4";
  componentTone: "blue" | "purple" | "teal" | "green";
  amountUsd: number;
  amount: string;
  risk: "Faible" | "Modéré" | "Substantiel" | "Élevé";
  riskTone: "green" | "yellow" | "red";
  selected: boolean;
  reason: string;
}

const ROWS: SampleRow[] = [
  { ref: "PTN-2026-021", title: "Backbone fibre Goma-Bukavu", componentCode: "C1", componentTone: "blue", amountUsd: 12_400_000, amount: "12,4 M USD", risk: "Substantiel", riskTone: "red", selected: true, reason: "Marché > 10 M USD · risque E&S Substantiel" },
  { ref: "PTN-2026-009", title: "SOC national cybersécurité", componentCode: "C2", componentTone: "purple", amountUsd: 14_200_000, amount: "14,2 M USD", risk: "Modéré", riskTone: "yellow", selected: true, reason: "Marché > 10 M USD" },
  { ref: "PTN-2026-019", title: "Plateforme identité numérique", componentCode: "C2", componentTone: "purple", amountUsd: 8_700_000, amount: "8,7 M USD", risk: "Substantiel", riskTone: "red", selected: true, reason: "Risque E&S Substantiel" },
  { ref: "PTN-2026-018", title: "Marché direct géotech", componentCode: "C1", componentTone: "blue", amountUsd: 400_000, amount: "0,4 M USD", risk: "Élevé", riskTone: "red", selected: true, reason: "Marché direct (gré à gré) · revue obligatoire" },
  { ref: "PTN-2026-014", title: "Étude PGES Centre données", componentCode: "C2", componentTone: "purple", amountUsd: 3_200_000, amount: "3,2 M USD", risk: "Substantiel", riskTone: "red", selected: true, reason: "Risque E&S Substantiel" },
  { ref: "PTN-2026-027", title: "Hubs technologiques", componentCode: "C3", componentTone: "teal", amountUsd: 5_600_000, amount: "5,6 M USD", risk: "Modéré", riskTone: "yellow", selected: false, reason: "Échantillonnage stratifié · non sélectionné" },
  { ref: "PTN-2026-031", title: "Formation EESU", componentCode: "C3", componentTone: "teal", amountUsd: 1_900_000, amount: "1,9 M USD", risk: "Faible", riskTone: "green", selected: false, reason: "Hors échantillon" },
];

export const metadata = { title: "Échantillonnage stratifié · Auditeur · PTN-RDC" };

export default function EchantillonnagePage() {
  const selected = ROWS.filter((r) => r.selected);
  const totalSelected = selected.reduce((s, r) => s + r.amountUsd, 0);

  return (
    <Shell crumbs={[{ label: "Plan d'audit", href: "/auditeur" }, { label: "Échantillonnage" }]}>
      <PageHeader
        eyebrow="CABINET KPMG · LECTURE SEULE"
        title="Échantillonnage stratifié · Audit T1 2026"
        subtitle="Sélection par strate (composante × montant × risque) selon ISA 530."
        meta={
          <>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <Locked size={14} aria-hidden style={{ color: "var(--cds-text-helper)" }} />
              Export signé HMAC + horodatage TSA
            </span>
          </>
        }
        actions={
          <button type="button" className={styles.btnPrimary}>
            <Download size={16} aria-hidden /> Exporter (CSV signé)
          </button>
        }
      />

      <KpiStrip cols={4}>
        <KpiTile icon={<ChartLineSmooth size={14} />} label="Échantillon sélectionné" value={`${selected.length} / ${ROWS.length}`} unit="dossiers" />
        <KpiTile label="Couverture financière" value={`${(totalSelected / 1_000_000).toFixed(1)}`} unit="M USD" trend={{ direction: "neutral", label: "65 % portefeuille" }} />
        <KpiTile icon={<Filter size={14} />} label="Strates appliquées" value="3" unit="comp × mont × risque" />
        <KpiTile label="Méthode" value="ISA 530" />
      </KpiStrip>

      <Card title="Dossiers échantillonnés" badge={`${selected.length} sélectionnés`} noPadding>
        <table className={styles.table}>
          <thead>
            <tr>
              <th></th>
              <th>Réf</th>
              <th>Intitulé</th>
              <th>Composante</th>
              <th>Montant</th>
              <th>Risque E&S</th>
              <th>Justification sélection</th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map((r) => (
              <tr key={r.ref} className={r.selected ? styles.rowSelected : styles.rowUnselected}>
                <td>
                  {r.selected ? (
                    <span className={styles.checkmark}>✓</span>
                  ) : (
                    <span className={styles.dash}>—</span>
                  )}
                </td>
                <td className="ptn-mono">{r.ref}</td>
                <td>{r.title}</td>
                <td>
                  <Tag tone={r.componentTone} size="sm">{r.componentCode}</Tag>
                </td>
                <td className="ptn-mono">{r.amount}</td>
                <td>
                  <Tag tone={r.riskTone} size="sm">{r.risk}</Tag>
                </td>
                <td className={styles.reason}>{r.reason}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </Shell>
  );
}
