import { Shell } from "@/components/shell/Shell";
import { type DashboardKpi } from "@/app/dashboard/DashboardClient";
import { DashboardSidePanel } from "@/app/dashboard/DashboardSidePanel";
import { DashboardWithUser } from "@/components/profile/DashboardWithUser";
import { INITIATIVES } from "@/lib/mock-initiatives";
import {
  Events,
  TaskApproved,
  Notebook,
  Time,
  ChartLineSmooth,
} from "@carbon/icons-react";

export const metadata = { title: "Sessions COPIL/CTP · PTN-RDC" };

const KPIS: DashboardKpi[] = [
  {
    label: "Prochaine session COPIL",
    icon: <Events size={14} aria-hidden />,
    value: (
      <>
        14 <span style={{ fontSize: 13, color: "var(--cds-text-helper)", fontWeight: 400 }}>mai 2026</span>
      </>
    ),
    extra: (
      <div style={{ fontSize: 12, color: "var(--ptn-status-warning-text)", whiteSpace: "nowrap" }}>
        <Time size={12} aria-hidden style={{ verticalAlign: "middle", marginRight: 4 }} />
        J−4 · quorum 6 / 8 confirmés
      </div>
    ),
  },
  {
    label: "Décisions validées 2026",
    icon: <TaskApproved size={14} aria-hidden />,
    value: "18",
    extra: (
      <div style={{ fontSize: 12, color: "var(--ptn-status-success)", whiteSpace: "nowrap" }}>
        <ChartLineSmooth size={12} aria-hidden style={{ verticalAlign: "middle", marginRight: 4 }} />
        +5 vs S2 2025
      </div>
    ),
  },
  {
    label: "Ordre du jour 14 mai",
    icon: <Notebook size={14} aria-hidden />,
    value: (
      <>
        7 <span style={{ fontSize: 13, color: "var(--cds-text-helper)", fontWeight: 400 }}>points</span>
      </>
    ),
    extra: (
      <div style={{ fontSize: 12, color: "var(--cds-text-helper)" }}>
        4 décisions · 3 informations
      </div>
    ),
  },
  {
    label: "Taux de présence moyen",
    icon: <Events size={14} aria-hidden />,
    value: (
      <>
        88 % <span style={{ fontSize: 13, color: "var(--cds-text-helper)", fontWeight: 400 }}>quorum</span>
      </>
    ),
    extra: (
      <div style={{ fontSize: 11, color: "var(--cds-text-helper)", fontFamily: "var(--font-ibm-plex-mono)" }}>
        Cible 75 % · 6 / 8 séances 2026
      </div>
    ),
  },
];

export default function GouvernancePage() {
  return (
    <Shell
      crumbs={[{ label: "Accueil", href: "/gouvernance" }, { label: "Gouvernance · COPIL/CTP" }]}
      sidePanel={<DashboardSidePanel />}
    >
      <DashboardWithUser
        profile="gouvernance"
        initiatives={INITIATIVES}
        kpis={KPIS}
        config={{
          cycleLabel: "Session 1 / 2 · semestre 1 2026",
          syncLabel: "10 mai 2026 · 09:42 UTC+1",
          primaryAction: { label: "Préparer la session", href: "/gouvernance/agenda" },
          tableTitle: "Dossiers à arbitrer",
        }}
      />
    </Shell>
  );
}
