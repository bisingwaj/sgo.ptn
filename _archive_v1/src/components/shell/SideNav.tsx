"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useProfile, type Profile } from "@/lib/profile-context";
import styles from "./SideNav.module.css";

interface NavItem {
  label: string;
  href: string;
  count?: string;
  icon?: React.ReactNode;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

const I = (path: string) => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.4"
  >
    <path d={path} />
  </svg>
);

const HOME_BY_PROFILE: Record<Profile, string> = {
  ugp: "/cockpit",
  partenaire: "/dashboard",
  bailleur: "/bailleur",
  sbp: "/soumissionnaire",
};

function navFor(profile: Profile): NavGroup[] {
  const home = HOME_BY_PROFILE[profile];

  const cycle: NavItem[] = [
    {
      label: "PPM",
      href: "/ppm",
      icon: I("M2 3h12v10H2zM2 7h12M6 3v10"),
    },
    {
      label: "TDR",
      href: "/tdr",
      count: "11",
      icon: I("M3 2h7l3 3v9H3z M10 2v3h3"),
    },
    {
      label: "Workflow ANO",
      href: "/tdr/workflow",
      icon: I("M2 8h12M9 4l5 4-5 4"),
    },
  ];

  const dashboards: NavItem[] = [
    {
      label: "Cockpit UGP",
      href: "/cockpit",
      icon: I("M3 13V6l5-3 5 3v7M6 13V9h4v4"),
    },
    {
      label: "Tableau de bord",
      href: "/dashboard",
      icon: I("M2 2h5v6H2zM9 2h5v3H9zM9 7h5v7H9zM2 10h5v4H2z"),
    },
    {
      label: "Dashboard Bailleur",
      href: "/bailleur",
      icon: I("M2 4h12v9H2zM2 7h12"),
    },
    {
      label: "Soumissionnaire",
      href: "/soumissionnaire",
      icon: I("M3 4h10v9H3zM6 7h4M6 10h4"),
    },
    {
      label: "Auditeur",
      href: "/auditeur",
      icon: I("M3 3h7l3 3v8H3zM10 3v3h3M5 10h6"),
    },
  ];

  const main: NavItem[] = [
    {
      label: "Accueil",
      href: home,
      icon: I("M2 7l6-5 6 5v7H2z"),
    },
    {
      label: "Index des écrans",
      href: "/home",
      icon: I("M2 4h12M2 8h12M2 12h12"),
    },
  ];

  const groups: NavGroup[] = [
    { title: "Principal", items: main },
    { title: "Cycle de passation", items: cycle },
    { title: "Tableaux de bord", items: dashboards },
  ];

  if (profile === "partenaire") {
    groups.push({
      title: "Espace partenaire",
      items: [
        {
          label: "Mes propositions",
          href: "/tdr/workflow",
          count: "4",
          icon: I("M3 4h10v9H3zM6 7h4"),
        },
      ],
    });
  }

  return groups;
}

interface EntityHeader {
  label: string;
  name: string;
  meta?: string;
}

const ENTITY_BY_PROFILE: Record<Profile, EntityHeader> = {
  ugp: {
    label: "UGP · Coordination",
    name: "Unité de Gestion · PTN-RDC",
    meta: "P180495 · MPTN",
  },
  partenaire: {
    label: "Partie prenante",
    name: "ANIE · Office National Identité",
    meta: "Réf. CONV-PTN-2026-019",
  },
  bailleur: {
    label: "Bailleur",
    name: "Banque mondiale · IDA",
    meta: "TTL · Région Afrique",
  },
  sbp: {
    label: "Bénéficiaire SBP",
    name: "Hub Lubumbashi · KIN-LAB",
    meta: "SBP-2026-042",
  },
};

export function SideNav() {
  const pathname = usePathname() ?? "";
  const { profile } = useProfile();
  const groups = navFor(profile);
  const entity = ENTITY_BY_PROFILE[profile];

  return (
    <aside className={styles.sn}>
      <div className={styles.ent}>
        <div className={styles.label}>{entity.label}</div>
        <div className={styles.name}>{entity.name}</div>
        {entity.meta && <div className={`${styles.meta} mono`}>{entity.meta}</div>}
      </div>

      <nav>
        {groups.map((g) => (
          <div key={g.title}>
            <div className={styles.group}>{g.title}</div>
            {g.items.map((it) => {
              const active =
                pathname === it.href ||
                (it.href !== "/" && pathname.startsWith(it.href + "/"));
              return (
                <Link
                  key={it.href + it.label}
                  href={it.href}
                  className={`${styles.item} ${active ? styles.active : ""}`}
                >
                  <span className={styles.ico}>{it.icon}</span>
                  <span>{it.label}</span>
                  {it.count && <span className={`${styles.count} mono`}>{it.count}</span>}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className={styles.foot}>
        <span className="mono">v 2.4.1</span>
        <span className={styles.dot} aria-hidden />
      </div>
    </aside>
  );
}
