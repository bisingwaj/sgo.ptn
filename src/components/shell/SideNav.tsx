"use client";

/**
 * SideNav profil-aware.
 * Navigation différenciée selon le profil actif (multi-profile-orchestrator).
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useProfile } from "@/components/profile/ProfileContext";
import { useOrganisation } from "@/components/profile/OrganisationContext";
import { useUser } from "@/components/profile/UserContext";
import { useAuth } from "@/components/auth/AuthContext";
import type { ProfileKey } from "@/lib/profiles";
import {
  Activity,
  Asleep,
  Catalog,
  Calendar,
  ChartLineSmooth,
  Dashboard,
  Document,
  DocumentAdd,
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
  TaskView,
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
const EXERCICES =
  "Ouvrir un exercice budgétaire, le doter, puis arrêter le plan annuel";
const PPM = "Plan de Passation des Marchés";
const TDR = "Termes de Référence";
const INSTRUCTION =
  "Les dossiers transmis à l’UGP : prendre en revue, retourner à l’auteur, valider";
const ANO = "Avis de Non-Objection — accord préalable du bailleur";
const MGP = "Mécanisme de Gestion des Plaintes";
const EAS_HS = "Exploitation et Abus Sexuels / Harcèlement Sexuel — canal cloisonné";
const PEES = "Environnemental et Social · Plan d'Engagement Environnemental et Social";
const SBP = "Subventions Basées sur la Performance";
const KYC = "Know Your Customer — vérification d'identité de l'entreprise";

function navFor(profile: ProfileKey): NavGroup[] {
  switch (profile) {
    case "ugp":
      return [
        {
          items: [
            { label: "Cockpit UGP", href: "/cockpit", permission: "referentiel:read", icon: <Dashboard size={16} />, hint: UGP },
          ],
        },
        {
          /* Le plan annuel n'est PAS une étape du cycle de passation : il en
             est la précondition. Sans exercice ouvert et doté, ni TDR ni
             marché n'existent. Le ranger entre PPM et TDR le donnait pour un
             pair de ce qu'il conditionne. */
          title: "Programmation budgétaire",
          items: [
            { label: "PTBA", href: "/ptba", permission: "ptba:read", icon: <ChartLineSmooth size={16} />, hint: PTBA },
            { label: "Exercices", href: "/ptba/exercices", permission: "ptba:read", icon: <Calendar size={16} />, hint: EXERCICES },
          ],
        },
        {
          title: "Cycle de passation",
          items: [
            { label: "PPM", href: "/ppm", permission: "ppm:read", icon: <Notebook size={16} />, hint: PPM },
            { label: "TDR", href: "/tdr", permission: "tdr:read", icon: <Document size={16} />, hint: TDR },
            { label: "Instruction TDR", href: "/tdr/revue", permission: "tdr:review", icon: <TaskView size={16} />, hint: INSTRUCTION },
            { label: "Non-objections", href: "/ano", permission: "ano:read", icon: <TaskApproved size={16} />, hint: ANO },
            { label: "Commissions", href: "/commissions", permission: "commission:read", icon: <Events size={16} /> },
            { label: "Contrats", href: "/contrats", permission: "contrat:read", icon: <Folders size={16} /> },
          ],
        },
        {
          title: "Sauvegardes & MGP",
          items: [
            { label: "E&S / PEES", href: "/es", permission: "es:read", icon: <Earth size={16} />, hint: PEES },
            { label: "MGP", href: "/mgp-admin", permission: "mgp:read", icon: <Voicemail size={16} />, hint: MGP },
            { label: "EAS/HS confidentiel", href: "/mgp-eas-hs", permission: "easHs:read", icon: <Locked size={16} />, hint: EAS_HS },
          ],
        },
        {
          title: "Pilotage",
          items: [
            { label: "Cadre de résultats", href: "/cadre-resultats", permission: "indicateur:read", icon: <Activity size={16} /> },
            { label: "SBP", href: "/sbp-admin", permission: "sbp:read", icon: <Idea size={16} />, hint: SBP },
            { label: "Audit interne", href: "/audit-interne", permission: "audit:trail_read", icon: <WatsonHealthMagnify size={16} /> },
            { label: "Fiduciaire", href: "/fiduciaire", permission: "fiduciaire:read", icon: <Money size={16} /> },
          ],
        },
      ];
    case "mda":
      return [
        {
          items: [
            { label: "Tableau de bord", href: "/dashboard", icon: <Dashboard size={16} /> },
            { label: "Mes initiatives", href: "/dashboard/initiatives", icon: <Document size={16} /> },
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
            { label: "Mes propositions", href: "/partenaire/propositions", icon: <Document size={16} /> },
            { label: "Workflow", href: "/partenaire/workflow", icon: <Network_3 size={16} /> },
            { label: "Modèles TDR", href: "/partenaire/modeles", icon: <Catalog size={16} />, hint: TDR },
          ],
        },
        {
          title: "Collaboration",
          items: [
            { label: "Messages", href: "/partenaire/messages", icon: <Voicemail size={16} /> },
            { label: "Notifications", href: "/partenaire/notifications", icon: <Notification size={16} /> },
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
            // Vers l'écran réel, non la maquette de l'espace bailleur : la
            // décision de non-objection s'y rend, et c'est le même dossier
            // que l'UGPTN suit de son côté. Deux écrans auraient fait
            // diverger deux lectures du même objet.
            { label: "Non-objections", href: "/ano", permission: "ano:decide", icon: <TaskApproved size={16} />, hint: ANO },
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
            { label: "Marketplace", href: "/soumissionnaire", icon: <Catalog size={16} /> },
            { label: "Mes soumissions", href: "/soumissionnaire/soumissions", icon: <Document size={16} /> },
            { label: "Mes contrats", href: "/soumissionnaire/contrats", icon: <Folders size={16} /> },
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
  const groups = [...navFor(profile)];

  // Chaque entrée n'apparaît qu'avec la permission correspondante. Les
  // comptes relèvent du sous-rôle IT ; le référentiel de passation relève
  // du RPM et des spécialistes — ce ne sont pas les mêmes personnes, et le
  // groupe reste invisible pour qui ne détient ni l'un ni l'autre.
  const adminItems: NavItem[] = [];
  if (can("admin:users")) {
    adminItems.push({ label: "Comptes", href: "/admin/comptes", icon: <UserMultiple size={16} /> });
  }
  if (can("referentiel:passation") || can("referentiel:clauses")) {
    adminItems.push({
      label: "Référentiel",
      href: "/admin/referentiel",
      icon: <Catalog size={16} />,
    });
  }
  // Le corpus documentaire — ce que l'assistant consulte pour répondre sur
  // la procédure du projet. Ouvert à la lecture de tous ceux qui portent
  // `referentiel:read`, c'est-à-dire tout le monde : ce sont les manuels de
  // l'UGPTN, les cacher à ses propres agents n'aurait aucun sens.
  if (can("referentiel:read")) {
    adminItems.push({
      label: "Documents de référence",
      href: "/admin/documents",
      icon: <DocumentAdd size={16} />,
    });
  }
  if (adminItems.length > 0) {
    groups.push({ title: "Administration", items: adminItems });
  }

  /**
   * L'entrée courante : la plus PRÉCISE de celles que le chemin satisfait.
   *
   * Deux entrées peuvent décrire le même chemin quand l'une est rangée sous
   * l'autre — `/ptba` et `/ptba/exercices`. Marquer « courant » sur simple
   * préfixe les allumait toutes les deux, et une colonne qui montre deux
   * pages actives n'en montre aucune. Le href le plus long l'emporte : il
   * est le seul à décrire vraiment où l'on se trouve.
   */
  const hrefCourant = groups
    .flatMap((g) => g.items)
    .map((i) => i.href)
    .filter((h) => pathname === h || (h !== "/" && pathname.startsWith(h + "/")))
    .sort((a, b) => b.length - a.length)[0];

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
                // L'entrée LA PLUS PRÉCISE gagne, et elle seule.
                //
                // Un simple test de préfixe allumait les deux quand un href
                // en contenait un autre : sur `/ptba/exercices`, « PTBA »
                // (/ptba) et « Exercices » se disaient courants ensemble, et
                // la colonne montrait deux pages actives — donc aucune.
                const active = item.href === hrefCourant;
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
                          ? `Votre habilitation ne donne pas accès à ce module. Demandez-le à un administrateur si vos fonctions le justifient.`
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
                          aria-label={`${item.label} — habilitation requise`}
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
        <span className={`ptn-mono ${styles.ver}`}>v 3.0.0</span>
      </footer>
    </aside>
  );
}
