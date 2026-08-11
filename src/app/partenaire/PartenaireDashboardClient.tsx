"use client";

import { useEffect } from "react";
import { DashboardClient, type DashboardKpi } from "@/app/dashboard/DashboardClient";
import { useOrganisation } from "@/components/profile/OrganisationContext";
import { USERS } from "@/components/profile/UserContext";
import { useProfile } from "@/components/profile/ProfileContext";
import type { Initiative } from "@/lib/mock-initiatives";
import {
  Document,
  TaskApproved,
  Money,
  Time,
  ChartLineSmooth,
} from "@carbon/icons-react";

interface Props {
  initiatives: Initiative[];
}

export function PartenaireDashboardClient({ initiatives }: Props) {
  const { org } = useOrganisation();
  const user = USERS.partenaire;
  const { profile, setProfile } = useProfile();

  // Synchronise le profil actif (utile si l'utilisateur arrive par URL directe)
  useEffect(() => {
    if (profile !== "partenaire") setProfile("partenaire");
  }, [profile, setProfile]);

  const KPIS: DashboardKpi[] = [
    {
      label: "Mes propositions",
      icon: <Document size={14} aria-hidden />,
      value: "4",
      extra: (
        <div style={{ fontSize: 12, color: "var(--ptn-status-success)", whiteSpace: "nowrap" }}>
          <ChartLineSmooth
            size={12}
            aria-hidden
            style={{ verticalAlign: "middle", marginRight: 4 }}
          />
          +1 cette semaine
        </div>
      ),
    },
    {
      label: "En workflow UGP",
      icon: <TaskApproved size={14} aria-hidden />,
      value: "2",
      extra: (
        <div style={{ fontSize: 12, color: "var(--ptn-status-warning-text)", whiteSpace: "nowrap" }}>
          Arbitrage en cours · délai 7 j
        </div>
      ),
    },
    {
      label: "Engagement cumulé",
      icon: <Money size={14} aria-hidden />,
      value: (
        <>
          11,6 M{" "}
          <span style={{ fontSize: 13, color: "var(--cds-text-helper)", fontWeight: 400 }}>
            USD
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
            <span>4 propositions actives</span>
            <span>1 ANO obtenu</span>
          </div>
        </>
      ),
    },
    {
      label: "Délai moyen UGP",
      icon: <Time size={14} aria-hidden />,
      value: (
        <>
          9{" "}
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
          −2 j vs T-1 · ANO récent
        </div>
      ),
    },
  ];

  return (
    <DashboardClient
      initiatives={initiatives}
      config={{
        greeting: `Bonjour ${user.firstName} — ${org.fullName}`,
        cycleLabel: `${user.cycleLabel}`,
        syncLabel: "10 mai 2026 · 09:42 UTC+1",
        primaryAction: {
          label: "Proposer une activité",
          href: "/partenaire/propositions/nouveau",
        },
        tableTitle: "Mes propositions & marchés associés",
        kpis: KPIS,
      }}
    />
  );
}
