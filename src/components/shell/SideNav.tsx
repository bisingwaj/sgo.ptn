"use client";

/**
 * SideNav profil-aware.
 * Navigation différenciée selon le profil actif (multi-profile-orchestrator).
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useProfile } from "@/components/profile/ProfileContext";
import { useOrganisation } from "@/components/profile/OrganisationContext";
import { useTranslations } from "next-intl";
import { SelecteurLangue } from "@/components/translation/SelecteurLangue";
import { useUser } from "@/components/profile/UserContext";
import { useAuth } from "@/components/auth/AuthContext";
import type { ProfileKey } from "@/lib/profiles";
import {
  Activity,
  Asleep,
  Catalog,
  ChartLineSmooth,
  Dashboard,
  Document,
  Earth,
  Events,
  Folders,
  IbmCloud,
  Idea,
  Light,
  Locked,
  Money,
  Network_3,
  Notebook,
  Notification,
  TaskApproved,
  Time,
  UserMultiple,
  Voicemail,
  WatsonHealthMagnify,
} from "@carbon/icons-react";
import { Tooltip } from "@/components/ui/Tooltip";
import { useMediaQuery } from "@/lib/use-media-query";
import styles from "./SideNav.module.scss";
import type { ReactNode } from "react";

interface NavItem {
  label: string;
  href: string;
  /**
   * Permission qui ouvre ce module.
   *
   * Absente, l'entrée est ouverte à tous ceux qui voient déjà ce profil.
   * Présente et non détenue, l'entrée se VERROUILLE : elle reste visible,
   * mais ne se clique plus, et l'infobulle dit pourquoi.
   *
   * Visible et verrouillée, plutôt que masquée. Une entrée qui disparaît
   * laisse croire que le module n'existe pas, et l'agent qui en a besoin ne
   * sait même pas quoi demander. Verrouillée, il lit le nom du module et le
   * rôle qui le détient : il peut aller le demander.
   */
  permission?: string;
  icon: ReactNode;
  count?: string;
  /**
   * Forme développée du sigle.
   *
   * Le produit en est saturé — PTBA, PPM, TDR, ANO, PEES, EAS/HS, SBP — et un
   * agent qui prend ses fonctions n'en connaît aucun. Les intitulés restent
   * courts, la colonne n'a pas la largeur d'une définition ; l'infobulle la
   * porte, au survol comme au focus.
   *
   * Les développés viennent du MEP et du référentiel de la Banque mondiale.
   * Aucun n'est reformulé : un sigle mal développé est pire qu'un sigle nu,
   * il donne une certitude fausse.
   */
  hint?: string;
}

interface NavGroup {
  title?: string;
  items: NavItem[];
}

/**
 * Sigles développés.
 *
 * Déclarés une fois : le même sigle apparaît dans plusieurs profils, et deux
 * développés divergents du même sigle seraient pires qu'aucun. Ils sont repris
 * du MEP et du référentiel de la Banque mondiale, sans reformulation.
 *
 * En attendant le glossaire annoncé dans le menu d'aide, c'est ici que la
 * plateforme dit ce que ses intitulés veulent dire.
 */
const UGP = "Unité de Gestion du Projet";
const PTBA = "Plan de Travail et Budget Annuel";
const PPM = "Plan de Passation des Marchés";
const TDR = "Termes de Référence";
const ANO = "Avis de Non-Objection — accord préalable du bailleur";
const MGP = "Mécanisme de Gestion des Plaintes";
const EAS_HS = "Exploitation et Abus Sexuels / Harcèlement Sexuel — canal cloisonné";
const PEES = "Environnemental et Social · Plan d'Engagement Environnemental et Social";
const SBP = "Subventions Basées sur la Performance";
const KYC = "Know Your Customer — vérification d'identité de l'entreprise";

function navFor(profile: ProfileKey, t: (cle: string) => string): NavGroup[] {
  switch (profile) {
    case "ugp":
      return [
        {
          items: [
            { label: t("module.cockpit"), href: "/cockpit", permission: "referentiel:read", icon: <Dashboard size={16} />, hint: UGP },
          ],
        },
        {
          title: t("groupe.cyclePassation"),
          items: [
            { label: t("module.ptba"), href: "/ptba", permission: "ptba:read", icon: <ChartLineSmooth size={16} />, hint: PTBA },
            { label: t("module.ppm"), href: "/ppm", permission: "ppm:read", icon: <Notebook size={16} />, count: "78", hint: PPM },
            { label: t("module.tdr"), href: "/tdr", permission: "tdr:read", icon: <Document size={16} />, hint: TDR },
            { label: t("module.ano"), href: "/ano", permission: "ano:read", icon: <TaskApproved size={16} />, count: "9", hint: ANO },
            { label: t("module.commissions"), href: "/commissions", permission: "commission:read", icon: <Events size={16} /> },
            { label: t("module.contrats"), href: "/contrats", permission: "contrat:read", icon: <Folders size={16} /> },
          ],
        },
        {
          title: t("groupe.sauvegardesMgp"),
          items: [
            { label: t("module.es"), href: "/es", permission: "es:read", icon: <Earth size={16} />, hint: PEES },
            { label: "MGP", href: "/mgp-admin", permission: "mgp:read", icon: <Voicemail size={16} />, count: "14", hint: MGP },
            { label: t("module.easHs"), href: "/mgp-eas-hs", permission: "easHs:read", icon: <Locked size={16} />, hint: EAS_HS },
          ],
        },
        {
          title: t("groupe.pilotage"),
          items: [
            { label: t("module.cadreResultats"), href: "/cadre-resultats", permission: "indicateur:read", icon: <Activity size={16} /> },
            { label: t("module.sbp"), href: "/sbp-admin", permission: "sbp:read", icon: <Idea size={16} />, hint: SBP },
            { label: t("module.auditInterne"), href: "/audit-interne", permission: "audit:trail_read", icon: <WatsonHealthMagnify size={16} /> },
            { label: t("module.fiduciaire"), href: "/fiduciaire", permission: "fiduciaire:read", icon: <Money size={16} /> },
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
            { label: "MGP", href: "/mgp", icon: <Voicemail size={16} />, hint: MGP },
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
            { label: "Modèles TDR", href: "/partenaire/modeles", icon: <Catalog size={16} />, count: "24", hint: TDR },
          ],
        },
        {
          title: t("groupe.collaboration"),
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
            { label: "MGP", href: "/partenaire/mgp", icon: <Voicemail size={16} />, hint: MGP },
          ],
        },
      ];
    case "bailleur":
      return [
        {
          items: [
            { label: "Dashboard", href: "/bailleur", icon: <Dashboard size={16} /> },
            { label: t("module.ano"), href: "/bailleur/ano", icon: <TaskApproved size={16} />, count: "9", hint: ANO },
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
            { label: t("module.marketplace"), href: "/soumissionnaire", icon: <Catalog size={16} />, count: "14" },
            { label: t("module.mesSoumissions"), href: "/soumissionnaire/soumissions", icon: <Document size={16} />, count: "6" },
            { label: "Mes contrats", href: "/soumissionnaire/contrats", icon: <Folders size={16} />, count: "3" },
            { label: "Paiements", href: "/soumissionnaire/paiements", icon: <Money size={16} /> },
            { label: "KYC entreprise", href: "/soumissionnaire/kyc", icon: <TaskApproved size={16} />, hint: KYC },
          ],
        },
      ];
    case "sbp":
      return [
        {
          items: [
            { label: "Mon programme", href: "/sbp", icon: <Dashboard size={16} />, hint: SBP },
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

interface SideNavProps {
  /** Repliée en colonne d'icônes. */
  collapsed?: boolean;
}

export function SideNav({ collapsed = false }: SideNavProps) {
  const pathname = usePathname() ?? "";
  const { profile, config, theme, setTheme } = useProfile();
  const { org } = useOrganisation();
  const { user } = useUser();
  const { can } = useAuth();
  const t = useTranslations("coque");

  /**
   * Repli EFFECTIF, et non repli commandé.
   *
   * La colonne se replie aussi d'elle-même sous 1024 px, par une règle CSS
   * (voir le mixin `collapsed`). S'en tenir à la propriété `collapsed`
   * revenait à croire la colonne déployée alors qu'elle ne montrait que des
   * icônes : les infobulles et les noms accessibles manquaient précisément
   * sur les écrans étroits, là où ils sont indispensables.
   */
  const narrow = useMediaQuery("(max-width: 1024px)");
  const rail = collapsed || narrow;

  const isDark = theme === "g100";
  const themeAction = isDark ? "Activer le thème clair" : "Activer le thème sombre";
  const themeLabel = isDark ? "Thème clair" : "Thème sombre";

  // L'entrée Administration n'apparaît que pour les habilitations qui la
  // portent — le sous-rôle UGP « IT » (présentation UGPTN § 6.1, poste n°18). En mode
  // démonstration, aucune session n'est ouverte : elle reste masquée.
  const groups = [...navFor(profile, t)];

  // Chaque entrée n'apparaît qu'avec la permission correspondante. Les
  // comptes relèvent du sous-rôle IT ; le référentiel de passation relève
  // du RPM et des spécialistes — ce ne sont pas les mêmes personnes, et le
  // groupe reste invisible pour qui ne détient ni l'un ni l'autre.
  const adminItems: NavItem[] = [];
  if (can("admin:users")) {
    adminItems.push({ label: t("module.comptes"), href: "/admin/comptes", icon: <UserMultiple size={16} /> });
  }
  if (can("referentiel:passation") || can("referentiel:clauses")) {
    adminItems.push({
      label: t("module.referentiel"),
      href: "/admin/referentiel",
      icon: <Catalog size={16} />,
    });
  }
  if (adminItems.length > 0) {
    groups.push({ title: t("groupe.administration"), items: adminItems });
  }

  /**
   * Bloc de contexte : sous quelle casquette et pour quelle organisation.
   *
   * Il affichait deux fois la même chose — `config.short` valait « UGP » et
   * `config.label.split(…)` retombait sur « UGP ». Trois lignes empilées dont
   * deux identiques ne renseignent sur rien.
   *
   * Les trois portent désormais une information distincte : le rôle tenu,
   * l'organisation d'appartenance, puis le rattachement au projet. Le nom de
   * l'organisation vient de la session quand elle est ouverte.
   */
  const entity =
    profile === "partenaire"
      ? {
          role: config.short,
          name: org.fullName,
          meta: `${org.ref} · 2025-2029`,
        }
      : {
          role: config.label,
          name: user.entityShort || config.short,
          meta: profile === "ugp" ? "MPTN · P180495" : "PTN-RDC · 2025-2029",
        };

  return (
    <aside
      className={`${styles.sn} ${collapsed ? styles.snCollapsed : ""}`}
      aria-label="Navigation principale"
    >
      <div className={styles.entity}>
        <div className={styles.entityLabel}>
          {/* Pastille de profil : elle porte l'identité de couleur sans
              recourir à un aplat, désormais réservé à l'entrée active. */}
          <span className={styles.entityDot} aria-hidden />
          {entity.role}
        </div>
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
                // Le module est-il ouvert à cette personne ?
                //
                // Sans session — écrans de démonstration — rien n'est
                // verrouillé : il n'y a personne à qui refuser quoi que ce
                // soit, et tout griser ferait croire à une panne.
                const verrouille =
                  Boolean(user) && Boolean(item.permission) && !can(item.permission as string);

                return (
                  <li key={item.href + item.label}>
                    {/* L'intitulé disparaît une fois la colonne repliée.
                        L'infobulle le rend au survol et au focus,
                        `aria-label` au lecteur d'écran. Sans eux, la colonne
                        repliée n'est qu'une suite de pictogrammes à deviner.
                        Le compteur, masqué lui aussi, revient dans la bulle :
                        c'est le même nombre, pas une donnée reconstituée. */}
                    <Tooltip
                      label={item.label}
                      hint={
                        verrouille
                          ? t("verrouille.infobulle")
                          : item.hint
                      }
                      // Repliée, l'infobulle rend l'intitulé — elle est donc
                      // toujours utile. Déployée, l'intitulé est déjà là et
                      // seul le développé du sigle justifie encore la bulle.
                      // Verrouillée, la bulle est la SEULE explication : elle
                      // ne se désactive donc jamais dans ce cas.
                      disabled={!verrouille && !rail && !item.hint}
                      trailing={
                        item.count && (
                          <span className={`${styles.tipCount} ptn-mono`}>{item.count}</span>
                        )
                      }
                    >
                      {verrouille ? (
                        /* Un <span>, non un <Link> désactivé : un lien reste
                           navigable au clavier et ouvrirait un écran qui
                           refuserait aussitôt. `aria-disabled` le dit au
                           lecteur d'écran, `tabIndex` le retire du parcours,
                           mais il garde le focus par la bulle. */
                        <span
                          className={`${styles.item} ${styles.itemVerrouille}`}
                          aria-disabled="true"
                          role="link"
                          tabIndex={0}
                          aria-label={t("verrouille.aria", { module: item.label })}
                        >
                          <span className={styles.itemIcon} aria-hidden>
                            {item.icon}
                          </span>
                          <span className={styles.itemLabel}>{item.label}</span>
                          <Locked size={12} className={styles.itemCadenas} aria-hidden />
                        </span>
                      ) : (
                        <Link
                          href={item.href}
                          aria-label={rail ? item.label : undefined}
                          className={`${styles.item} ${active ? styles.itemActive : ""}`}
                        >
                          <span className={styles.itemIcon} aria-hidden>
                            {item.icon}
                          </span>
                          <span className={styles.itemLabel}>{item.label}</span>
                          {item.count && (
                            <span className={`${styles.itemCount} ptn-mono`}>{item.count}</span>
                          )}
                        </Link>
                      )}
                    </Tooltip>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Le sélecteur de thème a quitté le bandeau, devenu trop chargé pour
          qu'on y distingue encore quoi que ce soit. Il rejoint le pied de la
          colonne : c'est un réglage de confort, pas une action sur le
          dossier en cours, et sa place est avec la version. */}
      <footer className={styles.foot}>
        <Tooltip label={themeAction} disabled={!rail}>
          <button
            type="button"
            onClick={() => setTheme(isDark ? "g10" : "g100")}
            // Déployée, l'intitulé visible suffit et se laisse dicter à la
            // voix. Repliée, il faut nommer l'action en toutes lettres.
            aria-label={rail ? themeAction : undefined}
            className={styles.themeBtn}
          >
            <span className={styles.itemIcon} aria-hidden>
              {isDark ? <Light size={16} /> : <Asleep size={16} />}
            </span>
            <span className={styles.itemLabel}>{themeLabel}</span>
          </button>
        </Tooltip>
        {/* La langue rejoint le thème, et pour la même raison : c'est un
            réglage de confort, pas une action sur le dossier en cours.
            Repliée, la colonne n'a que 56 px — le sélecteur s'y réduit à
            son pictogramme. */}
        <SelecteurLangue compact={rail} />
        <span className={`ptn-mono ${styles.ver}`}>v 3.0.0</span>
      </footer>
    </aside>
  );
}
