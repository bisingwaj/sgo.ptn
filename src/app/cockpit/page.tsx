import { Shell } from "@/components/shell/Shell";
import { type DashboardKpi } from "@/app/dashboard/DashboardClient";
import { DashboardSidePanel } from "@/app/dashboard/DashboardSidePanel";
import { DashboardWithUser } from "@/components/profile/DashboardWithUser";
import { AnomalyCard } from "@/components/ai/AnomalyCard";
import { INITIATIVES } from "@/lib/mock-initiatives";
import {
  TaskApproved,
  Money,
  ChartLineSmooth,
  Notebook,
  Activity,
} from "@carbon/icons-react";

export const metadata = { title: "Cockpit UGP · PTN-RDC" };

const KPIS: DashboardKpi[] = [
  {
    label: "Marchés en cours",
    icon: <Notebook size={14} aria-hidden />,
    value: "78",
    extra: (
      <div style={{ fontSize: 12, color: "var(--ptn-status-success)", whiteSpace: "nowrap" }}>
        <ChartLineSmooth size={12} aria-hidden style={{ verticalAlign: "middle", marginRight: 4 }} />
        +8 ce trimestre · PPM Q2
      </div>
    ),
  },
  {
    label: "Inbox ANO bailleur",
    icon: <TaskApproved size={14} aria-hidden />,
    value: "9",
    extra: (
      <div style={{ fontSize: 12, color: "var(--ptn-status-warning-text)", whiteSpace: "nowrap" }}>
        Délai moyen{" "}
        <span className="ptn-mono" style={{ color: "var(--cds-text-primary)" }}>
          14,2 j
        </span>{" "}
        · cible 12 j
      </div>
    ),
  },
  {
    label: "Engagement IDA + AFD",
    icon: <Money size={14} aria-hidden />,
    value: (
      <>
        78,3 M{" "}
        <span style={{ fontSize: 13, color: "var(--cds-text-helper)", fontWeight: 400 }}>
          / 510 M USD
        </span>
      </>
    ),
    extra: (
      <>
        <div style={{ height: 4, background: "var(--cds-border-subtle)", marginTop: 8, overflow: "hidden" }}>
          <i style={{ display: "block", height: "100%", width: "15%", background: "var(--ptn-accent)" }} />
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
          <span>15 % engagement</span>
          <span>cible 30 % fin 2026</span>
        </div>
      </>
    ),
  },
  {
    label: "Cadre de résultats",
    icon: <Activity size={14} aria-hidden />,
    value: (
      <>
        14{" "}
        <span style={{ fontSize: 13, color: "var(--cds-text-helper)", fontWeight: 400 }}>
          / 18 indicateurs en piste
        </span>
      </>
    ),
    extra: (
      <div style={{ fontSize: 12, color: "var(--ptn-status-success)", whiteSpace: "nowrap" }}>
        <ChartLineSmooth size={12} aria-hidden style={{ verticalAlign: "middle", marginRight: 4 }} />
        ISR MS · Modérément Satisfaisant
      </div>
    ),
  },
];

export default function CockpitPage() {
  return (
    <Shell
      crumbs={[{ label: "Accueil", href: "/cockpit" }, { label: "Cockpit UGP" }]}
      sidePanel={<DashboardSidePanel />}
    >
      <DashboardWithUser
        profile="ugp"
        initiatives={INITIATIVES}
        kpis={KPIS}
        config={{
          cycleLabel: "PTBA 2026-Q2 · P180495",
          syncLabel: "10 mai 2026 · 09:42 UTC+1",
          primaryAction: { label: "Inbox ANO bailleur", href: "/ano" },
          tableTitle: "Portefeuille marchés · vue Coordonnateur",
        }}
      />
      <div style={{ marginTop: 16 }}>
        <AnomalyCard scope="Scope · cockpit UGP · 78 marchés" />
      </div>
    </Shell>
  );
}
