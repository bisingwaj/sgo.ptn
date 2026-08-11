import { Shell } from "@/components/shell/Shell";
import { type DashboardKpi } from "@/app/dashboard/DashboardClient";
import { DashboardSidePanel } from "@/app/dashboard/DashboardSidePanel";
import { DashboardWithUser } from "@/components/profile/DashboardWithUser";
import { AnomalyCard } from "@/components/ai/AnomalyCard";
import { INITIATIVES } from "@/lib/mock-initiatives";
import {
  WatsonHealthMagnify,
  Locked,
  Document,
  ChartLineSmooth,
} from "@carbon/icons-react";

export const metadata = { title: "Plan d'audit · PTN-RDC" };

const KPIS: DashboardKpi[] = [
  {
    label: "Missions d'audit 2026",
    icon: <WatsonHealthMagnify size={14} aria-hidden />,
    value: (
      <>
        4 <span style={{ fontSize: 13, color: "var(--cds-text-helper)", fontWeight: 400 }}>planifiées</span>
      </>
    ),
    extra: (
      <div style={{ fontSize: 12, color: "var(--cds-text-helper)" }}>
        2 externes · 1 TPM · 1 interne
      </div>
    ),
  },
  {
    label: "Constatations ouvertes",
    icon: <Document size={14} aria-hidden />,
    value: "14",
    extra: (
      <div style={{ fontSize: 12, color: "var(--ptn-status-warning-text)" }}>
        <ChartLineSmooth size={12} aria-hidden style={{ verticalAlign: "middle", marginRight: 4 }} />
        4 priorité haute · 8 modérées · 2 faibles
      </div>
    ),
  },
  {
    label: "Échantillonnage",
    icon: <WatsonHealthMagnify size={14} aria-hidden />,
    value: (
      <>
        38 <span style={{ fontSize: 13, color: "var(--cds-text-helper)", fontWeight: 400 }}>/ 78 marchés</span>
      </>
    ),
    extra: (
      <>
        <div style={{ height: 4, background: "var(--cds-border-subtle)", marginTop: 8, overflow: "hidden" }}>
          <i style={{ display: "block", height: "100%", width: "49%", background: "var(--ptn-accent)" }} />
        </div>
        <div
          style={{
            fontSize: 11,
            color: "var(--cds-text-helper)",
            fontFamily: "var(--font-ibm-plex-mono)",
            marginTop: 4,
          }}
        >
          49 % du portefeuille couvert
        </div>
      </>
    ),
  },
  {
    label: "Audit trail",
    icon: <Locked size={14} aria-hidden />,
    value: (
      <>
        100 % <span style={{ fontSize: 13, color: "var(--cds-text-helper)", fontWeight: 400 }}>signé</span>
      </>
    ),
    extra: (
      <div style={{ fontSize: 11, color: "var(--ptn-status-success)", fontFamily: "var(--font-ibm-plex-mono)" }}>
        HMAC · ISO/IEC 42001 conforme
      </div>
    ),
  },
];

export default function AuditeurPage() {
  return (
    <Shell
      crumbs={[{ label: "Accueil", href: "/auditeur" }, { label: "Plan d'audit annuel" }]}
      sidePanel={<DashboardSidePanel />}
    >
      <DashboardWithUser
        profile="auditeur"
        initiatives={INITIATIVES}
        kpis={KPIS}
        config={{
          cycleLabel: "AUD-EXT-2026-T1",
          syncLabel: "10 mai 2026 · accès lecture seule",
          primaryAction: { label: "Échantillonner", href: "/auditeur/echantillonnage" },
          tableTitle: "Marchés sous revue & constatations",
        }}
      />
      <div style={{ marginTop: 16 }}>
        <AnomalyCard scope="Scope · audit externe 2026" />
      </div>
    </Shell>
  );
}
