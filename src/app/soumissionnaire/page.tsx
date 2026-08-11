import { Shell } from "@/components/shell/Shell";
import { type DashboardKpi } from "@/app/dashboard/DashboardClient";
import { DashboardSidePanel } from "@/app/dashboard/DashboardSidePanel";
import { DashboardWithUser } from "@/components/profile/DashboardWithUser";
import { INITIATIVES } from "@/lib/mock-initiatives";
import {
  Catalog,
  Document,
  Money,
  TaskApproved,
  ChartLineSmooth,
} from "@carbon/icons-react";

export const metadata = { title: "Espace soumissionnaire · PTN-RDC" };

const KPIS: DashboardKpi[] = [
  {
    label: "Opportunités ouvertes",
    icon: <Catalog size={14} aria-hidden />,
    value: "14",
    extra: (
      <div style={{ fontSize: 12, color: "var(--ptn-status-success)", whiteSpace: "nowrap" }}>
        <ChartLineSmooth size={12} aria-hidden style={{ verticalAlign: "middle", marginRight: 4 }} />
        +3 cette semaine
      </div>
    ),
  },
  {
    label: "Mes soumissions actives",
    icon: <Document size={14} aria-hidden />,
    value: "6",
    extra: (
      <div style={{ fontSize: 12, color: "var(--cds-text-helper)", whiteSpace: "nowrap" }}>
        Échéance la + proche{" "}
        <span className="ptn-mono" style={{ color: "var(--cds-text-primary)" }}>11 mai</span>
      </div>
    ),
  },
  {
    label: "Contrats actifs",
    icon: <TaskApproved size={14} aria-hidden />,
    value: (
      <>
        3 <span style={{ fontSize: 13, color: "var(--cds-text-helper)", fontWeight: 400 }}>en cours</span>
      </>
    ),
    extra: (
      <div style={{ fontSize: 11, color: "var(--cds-text-helper)", fontFamily: "var(--font-ibm-plex-mono)" }}>
        Total · 6,4 M USD
      </div>
    ),
  },
  {
    label: "Paiements 2026",
    icon: <Money size={14} aria-hidden />,
    value: (
      <>
        1,8 M <span style={{ fontSize: 13, color: "var(--cds-text-helper)", fontWeight: 400 }}>USD encaissés</span>
      </>
    ),
    extra: (
      <>
        <div style={{ height: 4, background: "var(--cds-border-subtle)", marginTop: 8, overflow: "hidden" }}>
          <i style={{ display: "block", height: "100%", width: "78%", background: "var(--ptn-status-success)" }} />
        </div>
        <div
          style={{
            fontSize: 11,
            color: "var(--cds-text-helper)",
            fontFamily: "var(--font-ibm-plex-mono)",
            display: "flex",
            justifyContent: "space-between",
            marginTop: 4,
          }}
        >
          <span>78 %</span>
          <span>cycle PTBA</span>
        </div>
      </>
    ),
  },
];

export default function SoumissionnairePage() {
  return (
    <Shell
      crumbs={[{ label: "Accueil", href: "/soumissionnaire" }, { label: "Marketplace" }]}
      sidePanel={<DashboardSidePanel />}
    >
      <DashboardWithUser
        profile="soumissionnaire"
        initiatives={INITIATIVES}
        kpis={KPIS}
        config={{
          cycleLabel: "Appels d'offres 2026-Q2",
          syncLabel: "10 mai 2026 · 09:42 UTC+1",
          primaryAction: { label: "Voir les opportunités", href: "/soumissionnaire/marketplace" },
          tableTitle: "Marchés disponibles & contrats en cours",
        }}
      />
    </Shell>
  );
}
