"use client";

/**
 * Bandeau applicatif.
 *
 * ---------------------------------------------------------------------------
 * CE QUI CHANGE PAR RAPPORT À LA VERSION PRÉCÉDENTE
 *
 * 1. IL SUIT LE THÈME. `Header.module.scss` écrivait une trentaine de valeurs
 *    en dur — #161616, #f4f4f4, #393939, #262626… Le sélecteur clair/sombre
 *    n'avait donc aucune prise sur le bandeau, qui restait noir en thème
 *    clair. Tout passe désormais par les tokens Carbon.
 *
 * 2. IL RESPIRE. 48 px suffisent à Carbon pour un bandeau de navigation, pas
 *    pour porter une signature institutionnelle : le logo y était réduit à
 *    18 px de haut et passait inaperçu. 56 px, et la marque à 28 px.
 *
 * 3. LES MENUS EXISTENT. Notifications, aide et compte ouvrent de vrais
 *    panneaux, fermés à l'Échap et au clic extérieur, avec le focus rendu à
 *    leur déclencheur. Un bouton qui ne fait rien est pire qu'un bouton
 *    absent : il use la confiance à chaque clic sans effet.
 * ---------------------------------------------------------------------------
 */

import Link from "next/link";
import { useCallback, useState } from "react";
import {
  Asleep,
  Help,
  Light,
  Logout,
  Notification,
  OpenPanelLeft,
  OpenPanelFilledLeft,
  OpenPanelRight,
  Renew,
  Search,
  UserAvatar,
} from "@carbon/icons-react";
import { useProfile } from "@/components/profile/ProfileContext";
import { useAuth } from "@/components/auth/AuthContext";
import { PROFILES, type ProfileKey } from "@/lib/profiles";
import { LanguagePicker } from "@/components/chrome/LanguagePicker";
import { useCommandPalette } from "@/components/chrome/CommandPalette";
import { BrandLockup } from "@/components/brand/BrandLockup";
import { cn } from "@/lib/cn";
import { HeaderMenu } from "./HeaderMenu";
import { NotificationsPanel } from "./NotificationsPanel";
import { HelpPanel } from "./HelpPanel";

interface Crumb {
  label: string;
  href?: string;
}

interface HeaderProps {
  crumbs?: Crumb[];
  /** Rendu uniquement si l'écran fournit un panneau contextuel. */
  onToggleSidePanel?: () => void;
  sidePanelOpen?: boolean;
  onToggleNav?: () => void;
  navCollapsed?: boolean;
}

export function Header({
  crumbs = [],
  onToggleSidePanel,
  sidePanelOpen,
  onToggleNav,
  navCollapsed,
}: HeaderProps) {
  const { profile, config, theme, setTheme } = useProfile();
  const { user, assignments, logout, switchAssignment } = useAuth();
  const { open: openPalette } = useCommandPalette();
  const [switching, setSwitching] = useState(false);
  const isDark = theme === "g100";

  const handleSwitchAssignment = useCallback(
    async (assignmentId: string) => {
      setSwitching(true);
      try {
        await switchAssignment(assignmentId);
      } finally {
        setSwitching(false);
      }
    },
    [switchAssignment],
  );

  /**
   * Destination de la signature.
   *
   * Elle pointe sur l'accueil du profil actif, et non sur « / » : la racine
   * n'est qu'un aiguillage, la traverser imposait un aller-retour visible.
   *
   * Elle n'est pas non plus figée sur /cockpit : c'est l'accueil de l'UGP.
   * Un partenaire ou un auditeur y serait envoyé sur un écran qui ne le
   * concerne pas, et que sa session lui refuserait.
   */
  const homePath = PROFILES[(user ? profileFromApi(user.profile) : profile) as ProfileKey].homePath;

  return (
    <header
      role="banner"
      className="bg-layer border-subtle relative z-30 flex h-14 items-center gap-1 border-b pr-2"
    >
      {/* Déployée, la navigation et le bloc de marque partagent la même
          largeur : le filet du bandeau prolonge le bord de la colonne, et les
          deux ne forment qu'une verticale.
          
          Repliée, cette largeur n'aurait plus rien à prolonger — le filet
          tomberait à 264 px quand la colonne s'arrête à 56, soit deux
          verticales voisines et concurrentes. Le bloc reprend alors sa
          largeur naturelle et renonce à son filet. */}
      <Link
        href={homePath}
        aria-label="UGPTN — accueil"
        className={cn(
          "focus-visible:outline-accent border-subtle flex h-full shrink-0 items-center justify-center px-4",
          !navCollapsed && "border-r min-[1025px]:w-[var(--ptn-shell-sidenav-w)]",
        )}
      >
        <BrandLockup tone={isDark ? "sombre" : "clair"} height={36} />
      </Link>

      {/* Placé contre la colonne qu'il commande : la commande est là où se
          trouve ce qu'elle affecte, pas reléguée à l'autre bout du bandeau. */}
      {onToggleNav && (
        <div className="ml-2 hidden min-[1025px]:block">
          <IconButton
            label={navCollapsed ? "Déployer la navigation" : "Replier la navigation"}
            onClick={onToggleNav}
            pressed={navCollapsed}
          >
            {navCollapsed ? <OpenPanelLeft size={20} aria-hidden /> : <OpenPanelFilledLeft size={20} aria-hidden />}
          </IconButton>
        </div>
      )}

      {crumbs.length > 0 && (
        <nav
          aria-label="Fil d'Ariane"
          className="hidden min-w-0 items-center gap-1.5 pl-2 lg:flex"
        >
          {crumbs.map((c, i) => {
            const isLast = i === crumbs.length - 1;
            return (
              <span key={`${c.label}-${i}`} className="flex items-center gap-1.5">
                {!isLast && c.href ? (
                  <Link
                    href={c.href}
                    className="text-caption text-secondary hover:text-accent truncate underline-offset-2 hover:underline"
                  >
                    {c.label}
                  </Link>
                ) : (
                  <span
                    className={cn(
                      "text-caption truncate",
                      isLast ? "text-primary font-medium" : "text-secondary",
                    )}
                    aria-current={isLast ? "page" : undefined}
                  >
                    {c.label}
                  </span>
                )}
                {!isLast && (
                  <span aria-hidden className="text-helper">
                    /
                  </span>
                )}
              </span>
            );
          })}
        </nav>
      )}

      <div className="flex-1" />

      {/* ---------- Recherche ---------- */}
      <button
        type="button"
        onClick={openPalette}
        aria-label="Ouvrir la recherche globale"
        aria-keyshortcuts="Meta+K Control+K"
        className="border-subtle bg-field hover:bg-field-hover focus-visible:outline-accent mr-1 hidden h-9 max-w-[22rem] min-w-0 flex-1 items-center gap-2 border px-3 focus-visible:outline-2 md:flex"
      >
        <Search size={16} aria-hidden className="text-secondary shrink-0" />
        <span className="text-body text-placeholder truncate">
          Rechercher une référence, un intitulé…
        </span>
        <kbd className="border-subtle text-caption text-secondary mono ml-auto shrink-0 border px-1.5 py-0.5">
          ⌘K
        </kbd>
      </button>

      {/* ---------- Panneau contextuel ---------- */}
      {onToggleSidePanel && (
        <IconButton
          label={sidePanelOpen ? "Masquer le panneau contextuel" : "Afficher le panneau contextuel"}
          onClick={onToggleSidePanel}
          pressed={sidePanelOpen}
        >
          <OpenPanelRight size={20} aria-hidden />
        </IconButton>
      )}

      {/* ---------- Thème ---------- */}
      <IconButton
        label={isDark ? "Activer le thème clair" : "Activer le thème sombre"}
        onClick={() => setTheme(isDark ? "g10" : "g100")}
        pressed={isDark}
      >
        {isDark ? <Light size={20} aria-hidden /> : <Asleep size={20} aria-hidden />}
      </IconButton>

      {/* ---------- Aide ---------- */}
      <HeaderMenu
        label="Aide et ressources"
        icon={<Help size={20} aria-hidden />}
        width="20rem"
      >
        {(close) => <HelpPanel onNavigate={close} />}
      </HeaderMenu>

      {/* ---------- Notifications ---------- */}
      <HeaderMenu
        label="Notifications"
        icon={<Notification size={20} aria-hidden />}
        badge
        width="24rem"
      >
        {(close) => <NotificationsPanel onNavigate={close} />}
      </HeaderMenu>

      <span aria-hidden className="border-subtle mx-1 h-6 border-l" />

      <LanguagePicker variant="compact" tone={isDark ? "dark" : "light"} />

      {/* ---------- Compte ---------- */}
      <HeaderMenu
        label={user ? `Compte de ${user.firstName} ${user.lastName}` : "Compte"}
        icon={<UserAvatar size={20} aria-hidden />}
        width="20rem"
        align="end"
        trailing={
          user ? (
            <span className="hidden max-w-[10rem] flex-col items-start leading-tight xl:flex">
              <span className="text-caption text-primary truncate font-medium">
                {user.firstName} {user.lastName}
              </span>
              <span className="text-caption text-secondary truncate">{user.subroleLabel}</span>
            </span>
          ) : undefined
        }
      >
        {(close) => (
          <div className="flex flex-col">
            {user ? (
              <>
                <div className="border-subtle flex flex-col gap-0.5 border-b px-4 py-3">
                  <span className="text-heading-01 text-primary">
                    {user.firstName} {user.lastName}
                  </span>
                  <span className="text-caption text-secondary mono truncate">{user.email}</span>
                </div>

                <div className="border-subtle flex flex-col gap-2 border-b px-4 py-3">
                  <span className="text-caption text-helper tracking-wide uppercase">
                    Habilitation active
                  </span>
                  <div className="flex items-start gap-2.5">
                    <span
                      aria-hidden
                      className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
                      style={{ background: config.accent.base }}
                    />
                    <span className="flex min-w-0 flex-col">
                      <span className="text-body text-primary font-medium">
                        {user.subroleLabel}
                      </span>
                      <span className="text-caption text-secondary truncate">
                        {user.organisationName}
                      </span>
                    </span>
                  </div>
                </div>

                {/* Multi-affectation : un cadre UGP peut aussi siéger au CTP.
                    Basculer réémet un jeton portant l'autre habilitation. */}
                {assignments.length > 1 && (
                  <div className="border-subtle flex flex-col gap-1 border-b px-2 py-2">
                    <span className="text-caption text-helper px-2 py-1 tracking-wide uppercase">
                      Autres habilitations
                    </span>
                    {assignments
                      .filter((a) => a.id !== user.assignmentId)
                      .map((a) => (
                        <button
                          key={a.id}
                          type="button"
                          disabled={switching}
                          onClick={() => void handleSwitchAssignment(a.id).then(close)}
                          className="hover:bg-layer-hover focus-visible:outline-accent flex items-start gap-2.5 px-2 py-2 text-left disabled:opacity-50 focus-visible:outline-2"
                        >
                          <Renew size={16} aria-hidden className="text-secondary mt-0.5 shrink-0" />
                          <span className="flex min-w-0 flex-col">
                            <span className="text-body text-primary">{a.subroleLabel}</span>
                            <span className="text-caption text-secondary truncate">
                              {a.organisationName}
                            </span>
                          </span>
                        </button>
                      ))}
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => void logout()}
                  className="text-body text-danger-text hover:bg-danger-surface focus-visible:outline-accent flex items-center gap-2.5 px-4 py-3 text-left focus-visible:outline-2"
                >
                  <Logout size={16} aria-hidden />
                  Se déconnecter
                </button>
              </>
            ) : (
              <div className="flex flex-col gap-3 p-4">
                <p className="text-body text-secondary">Aucune session ouverte.</p>
                <Link
                  href="/login"
                  onClick={close}
                  className="text-body text-accent inline-flex items-center gap-2 underline-offset-4 hover:underline"
                >
                  <Logout size={16} aria-hidden />
                  Se connecter
                </Link>
              </div>
            )}
          </div>
        )}
      </HeaderMenu>
    </header>
  );
}

/* ------------------------------------------------------------------ */

/** Les profils de l'API sont en majuscules, ceux du design system en minuscules. */
function profileFromApi(profile: string): ProfileKey {
  return profile.toLowerCase() as ProfileKey;
}

function IconButton({
  label,
  onClick,
  pressed,
  children,
}: {
  label: string;
  onClick: () => void;
  pressed?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      aria-pressed={pressed}
      className={cn(
        // 40 px de cible : au-dessus du minimum de 24 px du WCAG 2.2, et
        // confortable pour une main peu assurée sur une souris.
        "text-secondary hover:bg-layer-hover hover:text-primary focus-visible:outline-accent flex h-10 w-10 shrink-0 items-center justify-center focus-visible:outline-2",
        pressed && "bg-accent-surface text-accent",
      )}
    >
      {children}
    </button>
  );
}

