import { Shell } from "@/components/shell/Shell";
import { type DashboardKpi } from "@/app/dashboard/DashboardClient";
import { DashboardSidePanel } from "@/app/dashboard/DashboardSidePanel";
import { DashboardWithUser } from "@/components/profile/DashboardWithUser";
import { INITIATIVES } from "@/lib/mock-initiatives";
import {
  Idea,
  TaskApproved,
  Money,
  Activity,
  ChartLineSmooth,
} from "@carbon/icons-react";

export const metadata = { title: "Mon programme SBP · PTN-RDC" };

const KPIS: DashboardKpi[] = [
  {
    label: "Tranche en cours",
    icon: <Idea size={14} aria-hidden />,
    value: (
      <>
        2 <span style={{ fontSize: 13, color: "var(--cds-text-helper)", fontWeight: 400 }}>/ 4</span>
      </>
    ),
    extra: (
      <>
        <div style={{ height: 4, background: "var(--cds-border-subtle)", marginTop: 8, overflow: "hidden" }}>
          <i style={{ display: "block", height: "100%", width: "50%", background: "var(--ptn-accent)" }} />
        </div>
        <div
          style={{
            fontSize: 11,
            color: "var(--cds-text-helper)",
            fontFamily: "var(--font-ibm-plex-mono)",
            marginTop: 4,
          }}
        >
          50 % du programme exécuté
        </div>
      </>
    ),
  },
  {
    label: "Indicateurs validés",
    icon: <TaskApproved size={14} aria-hidden />,
    value: (
      <>
        7 <span style={{ fontSize: 13, color: "var(--cds-text-helper)", fontWeight: 400 }}>/ 9 cibles</span>
      </>
    ),
    extra: (
      <div style={{ fontSize: 12, color: "var(--ptn-status-success)", whiteSpace: "nowrap" }}>
        <ChartLineSmooth size={12} aria-hidden style={{ verticalAlign: "middle", marginRight: 4 }} />
        +2 ce trimestre
      </div>
    ),
  },
  {
    label: "Paiements reçus",
    icon: <Money size={14} aria-hidden />,
    value: (
      <>
        110 k <span style={{ fontSize: 13, color: "var(--cds-text-helper)", fontWeight: 400 }}>/ 200 k USD</span>
      </>
    ),
    extra: (
      <>
        <div style={{ height: 4, background: "var(--cds-border-subtle)", marginTop: 8, overflow: "hidden" }}>
          <i style={{ display: "block", height: "100%", width: "55%", background: "var(--ptn-status-success)" }} />
        </div>
        <div
          style={{
            fontSize: 11,
            color: "var(--cds-text-helper)",
            fontFamily: "var(--font-ibm-plex-mono)",
            marginTop: 4,
          }}
        >
          55 % de la subvention
        </div>
      </>
    ),
  },
  {
    label: "Bénéficiaires touchés",
    icon: <Activity size={14} aria-hidden />,
    value: (
      <>
        2 480 <span style={{ fontSize: 13, color: "var(--cds-text-helper)", fontWeight: 400 }}>personnes</span>
      </>
    ),
    extra: (
      <div style={{ fontSize: 11, color: "var(--cds-text-helper)", fontFamily: "var(--font-ibm-plex-mono)" }}>
        Cible 5 000 · 49 % femmes
      </div>
    ),
  },
];

export default function SbpPage() {
  return (
    <Shell
      crumbs={[{ label: "Accueil", href: "/sbp" }, { label: "Mon programme SBP" }]}
      sidePanel={<DashboardSidePanel />}
    >
      <DashboardWithUser
        profile="sbp"
        initiatives={INITIATIVES}
        kpis={KPIS}
        config={{
          cycleLabel: "Tranche 2 / 4 · SBP-2026-042",
          syncLabel: "10 mai 2026 · 09:42 UTC+1",
          primaryAction: { label: "Saisir des données", href: "/sbp/saisie" },
          tableTitle: "Indicateurs & jalons SBP",
        }}
      />
    </Shell>
  );
}
