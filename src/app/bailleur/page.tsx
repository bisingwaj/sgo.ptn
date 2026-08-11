import { Shell } from "@/components/shell/Shell";
import { type DashboardKpi } from "@/app/dashboard/DashboardClient";
import { DashboardSidePanel } from "@/app/dashboard/DashboardSidePanel";
import { DashboardWithUser } from "@/components/profile/DashboardWithUser";
import { INITIATIVES } from "@/lib/mock-initiatives";
import {
  TaskApproved,
  Money,
  Time,
  ChartLineSmooth,
  Catalog,
} from "@carbon/icons-react";

export const metadata = { title: "Dashboard Bailleur · PTN-RDC" };

const KPIS: DashboardKpi[] = [
  {
    label: "ANO en attente",
    icon: <TaskApproved size={14} aria-hidden />,
    value: "9",
    extra: (
      <div style={{ fontSize: 12, color: "var(--ptn-status-warning-text)", whiteSpace: "nowrap" }}>
        <ChartLineSmooth size={12} aria-hidden style={{ verticalAlign: "middle", marginRight: 4 }} />
        Délai moyen <span className="ptn-mono" style={{ color: "var(--cds-text-primary)" }}>14,2 j</span> · cible 12 j
      </div>
    ),
  },
  {
    label: "Décaissements 2026",
    icon: <Money size={14} aria-hidden />,
    value: (
      <>
        62,4 M <span style={{ fontSize: 13, color: "var(--cds-text-helper)", fontWeight: 400 }}>/ 510 M USD</span>
      </>
    ),
    extra: (
      <>
        <div style={{ height: 4, background: "var(--cds-border-subtle)", marginTop: 8, overflow: "hidden" }}>
          <i style={{ display: "block", height: "100%", width: "12%", background: "var(--ptn-accent)" }} />
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
          <span>12 %</span>
          <span>cible 30 % fin 2026</span>
        </div>
      </>
    ),
  },
  {
    label: "Portefeuille actif",
    icon: <Catalog size={14} aria-hidden />,
    value: "78",
    extra: (
      <div style={{ fontSize: 12, color: "var(--ptn-status-success)", whiteSpace: "nowrap" }}>
        <ChartLineSmooth size={12} aria-hidden style={{ verticalAlign: "middle", marginRight: 4 }} />
        +8 marchés ce trimestre
      </div>
    ),
  },
  {
    label: "ISR · Performance projet",
    icon: <Time size={14} aria-hidden />,
    value: (
      <>
        MS{" "}
        <span style={{ fontSize: 13, color: "var(--cds-text-helper)", fontWeight: 400 }}>
          Modérément Satisfaisant
        </span>
      </>
    ),
    extra: (
      <div style={{ fontSize: 11, color: "var(--cds-text-helper)", fontFamily: "var(--font-ibm-plex-mono)" }}>
        Mission supervision · 14-18 juil. 2025
      </div>
    ),
  },
];

export default function BailleurPage() {
  return (
    <Shell
      crumbs={[{ label: "Home", href: "/bailleur" }, { label: "Tableau de bord bailleur" }]}
      sidePanel={<DashboardSidePanel />}
    >
      <DashboardWithUser
        profile="bailleur"
        initiatives={INITIATIVES}
        kpis={KPIS}
        config={{
          cycleLabel: "Supervision 2026-S1",
          syncLabel: "10 mai 2026 · 09:42 UTC+1",
          primaryAction: { label: "Inbox ANO", href: "/bailleur/ano" },
          tableTitle: "Portefeuille suivi",
        }}
        welcomePrefix="Welcome"
      />
    </Shell>
  );
}
