"use client";

import Link from "next/link";
import { useProfile, PROFILES } from "@/lib/profile-context";
import styles from "./Header.module.css";

interface Crumb {
  label: string;
  href?: string;
}

interface HeaderProps {
  crumbs?: Crumb[];
  productLabel?: string;
}

const PROFILE_AVATARS: Record<keyof typeof PROFILES, string> = {
  ugp: "JB",
  partenaire: "MK",
  bailleur: "PS",
  sbp: "AT",
};

export function Header({
  crumbs = [],
  productLabel = "PTN-RDC · Gouvernance",
}: HeaderProps) {
  const { profile, setProfile, config } = useProfile();

  return (
    <header className={styles.gh}>
      <Link href="/home" className={styles.brand}>
        <span className={styles.logo} aria-hidden>
          PT
        </span>
        <span className={styles.pname}>{productLabel}</span>
      </Link>

      {crumbs.length > 0 && (
        <nav aria-label="Fil d'Ariane" className={styles.crumb}>
          {crumbs.map((c, i) => {
            const isLast = i === crumbs.length - 1;
            return (
              <span key={`${c.label}-${i}`} className={styles.crumbItem}>
                {!isLast && c.href ? (
                  <Link href={c.href}>{c.label}</Link>
                ) : (
                  <span className={isLast ? styles.current : undefined}>
                    {c.label}
                  </span>
                )}
                {!isLast && <span className={styles.sep}>·</span>}
              </span>
            );
          })}
        </nav>
      )}

      <div className={styles.spacer} />

      <input
        type="search"
        placeholder="Rechercher (réf, intitulé, persona…)"
        className={styles.search}
        aria-label="Recherche globale"
      />

      <button
        type="button"
        className={styles.icBtn}
        aria-label="Notifications"
        title="3 notifications"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4">
          <path d="M3 12h10M5 12V8a3 3 0 016 0v4M7 12v1a1 1 0 002 0v-1" />
        </svg>
        <span className={styles.badge} aria-hidden />
      </button>

      <button type="button" className={styles.icBtn} aria-label="Aide">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4">
          <circle cx="8" cy="8" r="6.5" />
          <path d="M6 6.5a2 2 0 014 0c0 1.5-2 1.5-2 3M8 11v.01" />
        </svg>
      </button>

      <label className={styles.profileSwitch} title="Profil actif (démo)">
        <span className="mono" style={{ fontSize: 10, color: "#8d8d8d" }}>
          PROFIL
        </span>
        <select
          value={profile}
          onChange={(e) => setProfile(e.target.value as typeof profile)}
        >
          {Object.values(PROFILES).map((p) => (
            <option key={p.key} value={p.key}>
              {p.short}
            </option>
          ))}
        </select>
      </label>

      <div className={styles.user}>
        <span
          className={styles.avatar}
          style={{ background: config.accent }}
          aria-hidden
        >
          {PROFILE_AVATARS[profile]}
        </span>
        <div className={styles.userMeta}>
          <span className={styles.name}>
            {profile === "ugp" && "Jean B."}
            {profile === "partenaire" && "Marie K."}
            {profile === "bailleur" && "Paul S."}
            {profile === "sbp" && "Aimée T."}
          </span>
          <span className={styles.role}>{config.short}</span>
        </div>
      </div>
    </header>
  );
}
