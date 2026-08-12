"use client";

/**
 * Header global Carbon (48px, fond noir).
 * - Brand PTN-RDC à gauche
 * - Breadcrumb au centre
 * - Recherche + Notifications + Aide + Langue + Profil à droite
 */

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  Notification,
  Help,
  Search,
  UserAvatar,
  ChevronDown,
  Asleep,
  Light,
  Logout,
  Renew,
} from "@carbon/icons-react";
import { useProfile } from "@/components/profile/ProfileContext";
import { useAuth } from "@/components/auth/AuthContext";
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
  const { user, assignments, logout, switchAssignment } = useAuth();
  const { open: openPalette } = useCommandPalette();
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [switching, setSwitching] = useState(false);
  const accountRef = useRef<HTMLDivElement>(null);
  const isDark = theme === "g100";

  // Fermeture au clic extérieur
  useEffect(() => {
    if (!accountMenuOpen) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!accountRef.current?.contains(event.target as Node)) setAccountMenuOpen(false);
    };
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setAccountMenuOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onEscape);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onEscape);
    };
  }, [accountMenuOpen]);

  const handleSwitchAssignment = async (assignmentId: string) => {
    setSwitching(true);
    try {
      await switchAssignment(assignmentId);
      setAccountMenuOpen(false);
    } finally {
      setSwitching(false);
    }
  };

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

      {/* Sélecteur de profil — mode démonstration uniquement. Dès qu'une
          session réelle est ouverte, le profil découle de l'habilitation
          et ne se choisit plus dans un menu. */}
      {!user && (
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
      )}

      <div className={styles.accountBlock} ref={accountRef}>
        <button
          type="button"
          className={styles.iconBtn}
          onClick={() => setAccountMenuOpen((v) => !v)}
          aria-haspopup="menu"
          aria-expanded={accountMenuOpen}
          aria-label={user ? `Compte de ${user.firstName} ${user.lastName}` : "Compte utilisateur"}
        >
          <UserAvatar size={20} aria-hidden />
        </button>

        {accountMenuOpen && (
          <div className={styles.accountMenu} role="menu">
            {user ? (
              <>
                <div className={styles.accountIdentity}>
                  <strong>
                    {user.firstName} {user.lastName}
                  </strong>
                  <span className="ptn-mono">{user.email}</span>
                </div>

                <div className={styles.accountSection}>
                  <span className={styles.accountLabel}>Habilitation active</span>
                  <div className={styles.accountCurrent}>
                    <span
                      className={styles.profileDot}
                      style={{ background: config.accent.base }}
                      aria-hidden
                    />
                    <span>
                      <strong>{user.subroleLabel}</strong>
                      <small>{user.organisationName}</small>
                    </span>
                  </div>
                </div>

                {/* Multi-affectation : un cadre UGP peut aussi siéger au CTP.
                    Basculer réémet un jeton portant l'autre habilitation. */}
                {assignments.length > 1 && (
                  <div className={styles.accountSection}>
                    <span className={styles.accountLabel}>Autres habilitations</span>
                    {assignments
                      .filter((a) => a.id !== user.assignmentId)
                      .map((a) => (
                        <button
                          key={a.id}
                          type="button"
                          role="menuitem"
                          disabled={switching}
                          className={styles.accountSwitch}
                          onClick={() => void handleSwitchAssignment(a.id)}
                        >
                          <Renew size={14} aria-hidden />
                          <span>
                            <strong>{a.subroleLabel}</strong>
                            <small>{a.organisationName}</small>
                          </span>
                        </button>
                      ))}
                  </div>
                )}

                <button
                  type="button"
                  role="menuitem"
                  className={styles.accountLogout}
                  onClick={() => void logout()}
                >
                  <Logout size={16} aria-hidden />
                  Se déconnecter
                </button>
              </>
            ) : (
              <>
                <div className={styles.accountIdentity}>
                  <strong>Mode démonstration</strong>
                  <span>Aucune session ouverte. Les écrans affichent des données d’exemple.</span>
                </div>
                <Link href="/login" className={styles.accountLogout} role="menuitem">
                  <Logout size={16} aria-hidden />
                  Se connecter
                </Link>
              </>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
