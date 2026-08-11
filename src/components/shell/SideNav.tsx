"use client";

/**
 * SideNav profil-aware.
 * Navigation différenciée selon le profil actif (multi-profile-orchestrator).
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useProfile } from "@/components/profile/ProfileContext";
import { useOrganisation } from "@/components/profile/OrganisationContext";
import type { ProfileKey } from "@/lib/profiles";
import {
  Dashboard,
  Document,
  ChartLineSmooth,
  Notebook,
  Events,
  Money,
  Network_3,
  Earth,
  Catalog,
  Time,
  Activity,
  WatsonHealthMagnify,
  Folders,
  IbmCloud,
  Locked,
  Idea,
  Hospital,
  Education,
  TaskApproved,
  Voicemail,
  Notification,
} from "@carbon/icons-react";
import styles from "./SideNav.module.scss";
import type { ReactNode } from "react";

interface NavItem {
  label: string;
  href: string;
  icon: ReactNode;
  count?: string;
}

interface NavGroup {
  title?: string;
  items: NavItem[];
}

function navFor(profile: ProfileKey): NavGroup[] {
  switch (profile) {
    case "ugp":
      return [
        {
          items: [
            { label: "Cockpit UGP", href: "/cockpit", icon: <Dashboard size={16} /> },
          ],
        },
        {
          title: "Cycle de passation",
          items: [
            { label: "PTBA", href: "/ptba", icon: <ChartLineSmooth size={16} /> },
            { label: "PPM", href: "/ppm", icon: <Notebook size={16} />, count: "78" },
            { label: "TDR", href: "/tdr", icon: <Document size={16} />, count: "32" },
            { label: "Inbox ANO", href: "/ano", icon: <TaskApproved size={16} />, count: "9" },
            { label: "Commissions", href: "/commissions", icon: <Events size={16} /> },
            { label: "Contrats", href: "/contrats", icon: <Folders size={16} /> },
          ],
        },
        {
          title: "Sauvegardes & MGP",
          items: [
            { label: "E&S / PEES", href: "/es", icon: <Earth size={16} /> },
            { label: "MGP", href: "/mgp-admin", icon: <Voicemail size={16} />, count: "14" },
            { label: "EAS/HS confidentiel", href: "/mgp-eas-hs", icon: <Locked size={16} /> },
          ],
        },
        {
          title: "Pilotage",
          items: [
            { label: "Cadre de résultats", href: "/cadre-resultats", icon: <Activity size={16} /> },
            { label: "SBP", href: "/sbp-admin", icon: <Idea size={16} /> },
            { label: "Audit interne", href: "/audit-interne", icon: <WatsonHealthMagnify size={16} /> },
            { label: "Fiduciaire", href: "/fiduciaire", icon: <Money size={16} /> },
          ],
        },
      ];
    case "mda":
      return [
        {
          items: [
            { label: "Tableau de bord", href: "/dashboard", icon: <Dashboard size={16} /> },
            { label: "Mes initiatives", href: "/dashboard/initiatives", icon: <Document size={16} />, count: "12" },
            { label: "Documents", href: "/dashboard/documents", icon: <Folders size={16} /> },
            { label: "Échéances", href: "/dashboard/echeances", icon: <Time size={16} /> },
            { label: "MGP", href: "/mgp", icon: <Voicemail size={16} /> },
          ],
        },
      ];
    case "partenaire":
      return [
        {
          items: [
            { label: "Tableau de bord", href: "/partenaire", icon: <Dashboard size={16} /> },
          ],
        },
        {
          title: "Cycle TDR",
          items: [
            { label: "Mes propositions", href: "/partenaire/propositions", icon: <Document size={16} />, count: "4" },
            { label: "Workflow", href: "/partenaire/workflow", icon: <Network_3 size={16} /> },
            { label: "Modèles TDR", href: "/partenaire/modeles", icon: <Catalog size={16} />, count: "24" },
          ],
        },
        {
          title: "Collaboration",
          items: [
            { label: "Messages", href: "/partenaire/messages", icon: <Voicemail size={16} />, count: "1" },
            { label: "Notifications", href: "/partenaire/notifications", icon: <Notification size={16} />, count: "3" },
            { label: "Documents partagés", href: "/partenaire/documents", icon: <Folders size={16} /> },
            { label: "Calendrier", href: "/partenaire/calendrier", icon: <Time size={16} /> },
          ],
        },
        {
          title: "Suivi & gouvernance",
          items: [
            { label: "Reporting", href: "/partenaire/reporting", icon: <Activity size={16} /> },
            { label: "Organisation", href: "/partenaire/organisation", icon: <Idea size={16} /> },
            { label: "MGP", href: "/partenaire/mgp", icon: <Voicemail size={16} /> },
          ],
        },
      ];
    case "bailleur":
      return [
        {
          items: [
            { label: "Dashboard", href: "/bailleur", icon: <Dashboard size={16} /> },
            { label: "Inbox ANO", href: "/bailleur/ano", icon: <TaskApproved size={16} />, count: "9" },
            { label: "Portfolio", href: "/bailleur/portfolio", icon: <Catalog size={16} /> },
            { label: "Conditionnalités", href: "/bailleur/conditions", icon: <Document size={16} /> },
            { label: "Décaissements", href: "/bailleur/decaissements", icon: <Money size={16} /> },
            { label: "Risques", href: "/bailleur/risques", icon: <ChartLineSmooth size={16} /> },
          ],
        },
      ];
    case "soumissionnaire":
      return [
        {
          items: [
            { label: "Marketplace", href: "/soumissionnaire", icon: <Catalog size={16} />, count: "14" },
            { label: "Mes soumissions", href: "/soumissionnaire/soumissions", icon: <Document size={16} />, count: "6" },
            { label: "Mes contrats", href: "/soumissionnaire/contrats", icon: <Folders size={16} />, count: "3" },
            { label: "Paiements", href: "/soumissionnaire/paiements", icon: <Money size={16} /> },
            { label: "KYC entreprise", href: "/soumissionnaire/kyc", icon: <TaskApproved size={16} /> },
          ],
        },
      ];
    case "sbp":
      return [
        {
          items: [
            { label: "Mon programme", href: "/sbp", icon: <Dashboard size={16} /> },
            { label: "Saisie de données", href: "/sbp/saisie", icon: <Document size={16} /> },
            { label: "Vérifications", href: "/sbp/verifications", icon: <TaskApproved size={16} /> },
            { label: "Paiements", href: "/sbp/paiements", icon: <Money size={16} /> },
          ],
        },
      ];
    case "auditeur":
      return [
        {
          items: [
            { label: "Plan d'audit", href: "/auditeur", icon: <Dashboard size={16} /> },
            { label: "Échantillonnage", href: "/auditeur/echantillonnage", icon: <ChartLineSmooth size={16} /> },
            { label: "Constatations", href: "/auditeur/constatations", icon: <WatsonHealthMagnify size={16} /> },
            { label: "Pistes d'audit", href: "/auditeur/pistes", icon: <IbmCloud size={16} /> },
            { label: "Reporting", href: "/auditeur/reporting", icon: <Document size={16} /> },
          ],
        },
      ];
    case "gouvernance":
      return [
        {
          items: [
            { label: "Sessions", href: "/gouvernance", icon: <Events size={16} /> },
            { label: "Ordre du jour", href: "/gouvernance/agenda", icon: <Notebook size={16} /> },
            { label: "Décisions", href: "/gouvernance/decisions", icon: <TaskApproved size={16} /> },
            { label: "Archives", href: "/gouvernance/archives", icon: <Folders size={16} /> },
          ],
        },
      ];
  }
}

export function SideNav() {
  const pathname = usePathname() ?? "";
  const { profile, config } = useProfile();
  const { org } = useOrganisation();
  const groups = navFor(profile);

  // Pour le profil partenaire, le label/nom viennent du contexte organisation.
  // Sinon : config par défaut.
  const entity =
    profile === "partenaire"
      ? {
          label: config.short,
          name: org.fullName,
          meta: `${org.ref} · 2025-2029`,
        }
      : {
          label: config.short,
          name: config.label.split(/[(/]/)[0].trim(),
          meta: profile === "ugp" ? "MPTN · P180495" : "PTN-RDC · 2025-2029",
        };

  return (
    <aside className={styles.sn} aria-label="Navigation principale">
      <div className={styles.entity}>
        <div className={styles.entityLabel}>{entity.label}</div>
        <div className={styles.entityName}>{entity.name}</div>
        <div className={`${styles.entityMeta} ptn-mono`}>{entity.meta}</div>
      </div>

      <nav className={styles.nav}>
        {groups.map((g, gi) => (
          <div key={gi}>
            {g.title && <div className={styles.group}>{g.title}</div>}
            <ul>
              {g.items.map((item) => {
                const active =
                  pathname === item.href ||
                  (item.href !== "/" && pathname.startsWith(item.href + "/"));
                return (
                  <li key={item.href + item.label}>
                    <Link
                      href={item.href}
                      className={`${styles.item} ${active ? styles.itemActive : ""}`}
                    >
                      <span className={styles.itemIcon} aria-hidden>
                        {item.icon}
                      </span>
                      <span className={styles.itemLabel}>{item.label}</span>
                      {item.count && <span className={`${styles.itemCount} ptn-mono`}>{item.count}</span>}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <footer className={styles.foot}>
        <span className={`ptn-mono ${styles.ver}`}>v 3.0.0</span>
      </footer>
    </aside>
  );
}
