import { Shell } from "@/components/shell/Shell";
import { DashboardSidePanel } from "./DashboardSidePanel";
import { DashboardWithUser } from "@/components/profile/DashboardWithUser";
import { AnomalyCard } from "@/components/ai/AnomalyCard";
import { INITIATIVES } from "@/lib/mock-initiatives";
import {
  Document,
  TaskApproved,
  Money,
  Time,
  ChartLineSmooth,
} from "@carbon/icons-react";

export const metadata = { title: "Tableau de bord · Ministère du Numérique · PTN-RDC" };

const KPIS = [
  {
    label: "Initiatives actives",
    icon: <Document size={14} aria-hidden />,
    value: "12",
    extra: (
      <div style={{ fontSize: 12, color: "var(--ptn-status-success)", whiteSpace: "nowrap" }}>
        <ChartLineSmooth
          size={12}
          aria-hidden
          style={{ verticalAlign: "middle", marginRight: 4 }}
        />
        +2 vs avr. 2026
      </div>
    ),
  },
  {
    label: "En attente d'ANO",
    icon: <TaskApproved size={14} aria-hidden />,
    value: "3",
    extra: (
      <div
        style={{
          fontSize: 12,
          color: "var(--ptn-status-warning-text)",
          whiteSpace: "nowrap",
        }}
      >
        Délai moyen{" "}
        <span className="ptn-mono" style={{ color: "var(--cds-text-primary)" }}>
          14,2 j
        </span>{" "}
        · cible 12 j
      </div>
    ),
  },
  {
    label: "Budget mobilisé",
    icon: <Money size={14} aria-hidden />,
    value: (
      <>
        42,8 M{" "}
        <span style={{ fontSize: 13, color: "var(--cds-text-helper)", fontWeight: 400 }}>
          / 69,0 M USD
        </span>
      </>
    ),
    extra: (
      <>
        <div style={{ height: 4, background: "var(--cds-border-subtle)", marginTop: 8, overflow: "hidden" }}>
          <i style={{ display: "block", height: "100%", width: "62%", background: "var(--ptn-accent)" }} />
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
          <span>62 %</span>
          <span>Restant 26,2 M</span>
        </div>
      </>
    ),
  },
  {
    label: "Délai moyen TDR → ANO",
    icon: <Time size={14} aria-hidden />,
    value: (
      <>
        38{" "}
        <span style={{ fontSize: 13, color: "var(--cds-text-helper)", fontWeight: 400 }}>
          jours
        </span>
      </>
    ),
    extra: (
      <div style={{ fontSize: 12, color: "var(--ptn-status-success)", whiteSpace: "nowrap" }}>
        <ChartLineSmooth
          size={12}
          aria-hidden
          style={{ verticalAlign: "middle", marginRight: 4 }}
        />
        −6 j vs S1 2026
      </div>
    ),
  },
];

export default function MdaDashboardPage() {
  return (
    <Shell
      crumbs={[{ label: "Accueil", href: "/dashboard" }, { label: "Tableau de bord" }]}
      sidePanel={<DashboardSidePanel />}
    >
      <DashboardWithUser
        profile="mda"
        initiatives={INITIATIVES}
        kpis={KPIS}
        config={{
          cycleLabel: "PTBA 2026-Q2",
          syncLabel: "10 mai 2026 · 09:42 UTC+1",
          primaryAction: { label: "Proposer une initiative", href: "/tdr" },
          tableTitle: "Initiatives en cours",
        }}
      />
      <div style={{ marginTop: 16 }}>
        <AnomalyCard />
      </div>
    </Shell>
  );
}
