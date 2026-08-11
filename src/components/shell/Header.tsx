"use client";

/**
 * Header global Carbon (48px, fond noir).
 * - Brand PTN-RDC à gauche
 * - Breadcrumb au centre
 * - Recherche + Notifications + Aide + Langue + Profil à droite
 */

import Link from "next/link";
import { useState } from "react";
import {
  Notification,
  Help,
  Search,
  UserAvatar,
  ChevronDown,
  Asleep,
  Light,
} from "@carbon/icons-react";
import { useProfile } from "@/components/profile/ProfileContext";
import { PROFILES, PROFILE_KEYS } from "@/lib/profiles";
import { LanguagePicker } from "@/components/chrome/LanguagePicker";
import { useCommandPalette } from "@/components/chrome/CommandPalette";
import { useRouter } from "next/navigation";
import styles from "./Header.module.scss";

interface Crumb {
  label: string;
  href?: string;
}

interface HeaderProps {
  crumbs?: Crumb[];
}

export function Header({ crumbs = [] }: HeaderProps) {
  const router = useRouter();
  const { profile, setProfile, config, theme, setTheme } = useProfile();
  const { open: openPalette } = useCommandPalette();
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const isDark = theme === "g100";

  const handleProfileSwitch = (newProfile: typeof profile) => {
    setProfile(newProfile);
    setProfileMenuOpen(false);
    router.push(PROFILES[newProfile].homePath);
  };

  const toggleTheme = () => {
    setTheme(isDark ? "g10" : "g100");
  };

  return (
    <header className={styles.header} role="banner">
      <Link href="/" className={styles.brand}>
        <span className={styles.brandLogo} aria-hidden>
          PT
        </span>
        <span className={styles.brandName}>PTN-RDC</span>
        <span className={styles.brandPipe} aria-hidden>
          /
        </span>
        <span className={styles.brandTag}>Gouvernance opérationnelle</span>
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
                  <span className={isLast ? styles.crumbCurrent : ""}>{c.label}</span>
                )}
                {!isLast && <span className={styles.crumbSep}>/</span>}
              </span>
            );
          })}
        </nav>
      )}

      <div className={styles.spacer} />

      <button
        type="button"
        onClick={openPalette}
        aria-label="Ouvrir la recherche globale (⌘K)"
        className={styles.searchWrap}
        style={{ cursor: "pointer", border: 0, font: "inherit", color: "inherit" }}
      >
        <Search size={16} aria-hidden />
        <span className={styles.search} style={{ textAlign: "left", color: "var(--cds-text-helper)" }}>
          Rechercher (réf, intitulé, dossier…)
        </span>
        <kbd className={styles.kbd}>⌘K</kbd>
      </button>

      <button
        type="button"
        className={styles.iconBtn}
        onClick={toggleTheme}
        aria-label={isDark ? "Activer le mode clair" : "Activer le mode sombre"}
        aria-pressed={isDark}
        title={isDark ? "Mode clair" : "Mode sombre"}
      >
        {isDark ? <Light size={20} aria-hidden /> : <Asleep size={20} aria-hidden />}
      </button>

      <button type="button" className={styles.iconBtn} aria-label="Aide">
        <Help size={20} aria-hidden />
      </button>

      <button type="button" className={styles.iconBtn} aria-label="Notifications">
        <Notification size={20} aria-hidden />
        <span className={styles.iconBadge} aria-hidden />
      </button>

      <span className={styles.divider} aria-hidden />

      <LanguagePicker variant="compact" tone="dark" />

      <div className={styles.profileBlock}>
        <button
          type="button"
          className={styles.profileBtn}
          onClick={() => setProfileMenuOpen((v) => !v)}
          aria-haspopup="menu"
          aria-expanded={profileMenuOpen}
        >
          <span
            className={styles.profileDot}
            style={{ background: config.accent.base }}
            aria-hidden
          />
          <span className={styles.profileMeta}>
            <span className={styles.profileLabel}>{config.short}</span>
            <span className={styles.profileMicro}>Démo · changer de profil</span>
          </span>
          <ChevronDown size={14} aria-hidden />
        </button>

        {profileMenuOpen && (
          <ul className={styles.profileMenu} role="menu">
            {PROFILE_KEYS.map((p) => {
              const def = PROFILES[p];
              return (
                <li key={p}>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => handleProfileSwitch(p)}
                    className={`${styles.profileMenuItem} ${p === profile ? styles.profileMenuItemActive : ""}`}
                  >
                    <span
                      className={styles.profileDot}
                      style={{ background: def.accent.base }}
                      aria-hidden
                    />
                    <span>
                      <strong>{def.short}</strong>
                      <small>{def.label}</small>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <button type="button" className={styles.iconBtn} aria-label="Profil utilisateur">
        <UserAvatar size={20} aria-hidden />
      </button>
    </header>
  );
}
