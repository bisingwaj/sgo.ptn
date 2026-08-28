/**
 * PTN-RDC · Registre d'état des fonctionnalités.
 *
 * ---------------------------------------------------------------------------
 * POURQUOI CE FICHIER EXISTE
 *
 * La plateforme montre aujourd'hui des écrans entiers bâtis sur des données
 * d'exemple : « 78 marchés », « délai moyen 14,2 j », des ANO « délivrés » qui
 * ne l'ont jamais été. Sur un produit qui porte des habilitations fiduciaires,
 * un chiffre inventé qu'on ne peut pas distinguer d'un chiffre réel est pire
 * qu'une case vide — quelqu'un finira par le lire, le citer, en décider.
 *
 * CLAUDE.md le pose en règle : « Ne jamais inventer de données qui ressemblent
 * à des données réelles » et « Rien qui suggère une conséquence qu'il n'a
 * pas ». Ce registre est l'application de ces deux règles à l'échelle de
 * l'application : tant qu'un module n'est pas branché sur le serveur, son
 * écran est voilé et dit ce qu'il est.
 *
 * ---------------------------------------------------------------------------
 * LEVER LE VOILE — la seule manœuvre à connaître
 *
 * Une fois le module réellement branché, changer UNE valeur ici :
 *
 *     statut: "en-developpement"   →   statut: "active"
 *
 * L'écran se découvre au rechargement suivant. Aucun composant à modifier,
 * aucune page à toucher, rien à retirer ailleurs : `ShellFrame` interroge ce
 * registre à chaque rendu. C'était la condition posée — que le voile se lève
 * sans chantier.
 *
 * ---------------------------------------------------------------------------
 * CE QUI DÉTERMINE LE STATUT
 *
 * Un module est `active` quand ses écrans lisent le VRAI serveur. Au 28 août
 * 2026, le backend NestJS expose : `auth`, `admin/comptes`, `documents`,
 * `marketplace`, `ptba`, `referentiel`, `referentiel-tdr`, `tdr`, `ai`,
 * `assistant`. Tout le reste tient sur des fixtures locales.
 *
 * Ne pas inscrire ici un module « presque prêt ». Le registre décrit ce qui
 * EST, jamais ce qui va être — sinon il devient à son tour une promesse
 * qu'on ne tient pas.
 * ---------------------------------------------------------------------------
 */

export type StatutFonctionnalite = "active" | "en-developpement";

export interface Fonctionnalite {
  /** Préfixe de route. La comparaison respecte les segments : `/mgp` ne
   *  capture pas `/mgp-admin`. */
  readonly chemin: string;
  /** Nom du module, tel qu'il paraît sur le voile. */
  readonly libelle: string;
  readonly statut: StatutFonctionnalite;
  /**
   * Une phrase sur ce que le module fera. Elle doit décrire une capacité
   * inscrite au MEP, jamais une date : une échéance affichée est une promesse,
   * et personne ici n'est en position de la tenir.
   */
  readonly detail?: string;
}

/**
 * L'ordre n'a pas d'importance : la recherche retient le préfixe le plus long,
 * pour qu'un sous-module puisse différer de son parent.
 */
export const FONCTIONNALITES: readonly Fonctionnalite[] = [
  // ------------------------------------------------------------------
  // Branchés sur le serveur — déclarés pour mémoire, et parce qu'un
  // sous-chemin actif doit pouvoir l'emporter sur un parent voilé.
  // ------------------------------------------------------------------
  { chemin: "/ptba", libelle: "Plan de travail et budget annuel", statut: "active" },
  { chemin: "/tdr", libelle: "Termes de référence", statut: "active" },
  { chemin: "/admin", libelle: "Administration", statut: "active" },
  { chemin: "/soumissionnaire", libelle: "Espace soumissionnaire", statut: "active" },
  { chemin: "/design-system", libelle: "Référence de conception", statut: "active" },
  { chemin: "/demo", libelle: "Démonstration", statut: "active" },
  { chemin: "/activation", libelle: "Prise de fonction", statut: "active" },

  // ------------------------------------------------------------------
  // Passation des marchés
  // ------------------------------------------------------------------
  {
    chemin: "/ppm",
    libelle: "Plan de passation des marchés",
    statut: "en-developpement",
    detail:
      "Le PPM et son suivi d'exécution, alignés sur les seuils et méthodes du PPSD.",
  },
  {
    chemin: "/ano",
    libelle: "Avis de non-objection",
    statut: "en-developpement",
    detail:
      "Le circuit de demande et de délivrance des ANO, revue préalable comprise. La décision reste au bailleur.",
  },
  {
    chemin: "/commissions",
    libelle: "Commissions d'évaluation",
    statut: "en-developpement",
    detail:
      "Constitution des commissions, dépouillement et procès-verbaux d'évaluation.",
  },
  {
    chemin: "/contrats",
    libelle: "Contrats",
    statut: "en-developpement",
    detail: "Signature, avenants et suivi d'exécution des marchés attribués.",
  },

  // ------------------------------------------------------------------
  // Sauvegardes, plaintes, résultats
  // ------------------------------------------------------------------
  {
    chemin: "/es",
    libelle: "Sauvegardes environnementales et sociales",
    statut: "en-developpement",
    detail:
      "Criblage des sous-projets et suivi des instruments CGES, CPR, PMPP, PGMO.",
  },
  {
    chemin: "/mgp",
    libelle: "Mécanisme de gestion des plaintes",
    statut: "en-developpement",
    detail: "Dépôt, accusé de réception et traçabilité du traitement des plaintes.",
  },
  {
    chemin: "/mgp-admin",
    libelle: "Administration du MGP",
    statut: "en-developpement",
    detail: "Instruction, qualification et clôture des plaintes reçues.",
  },
  {
    chemin: "/mgp-eas-hs",
    libelle: "Canal EAS/HS",
    statut: "en-developpement",
    detail:
      "Canal cloisonné de signalement des violences sexuelles. Sa confidentialité impose un traitement séparé du MGP courant.",
  },
  {
    chemin: "/cadre-resultats",
    libelle: "Cadre de résultats",
    statut: "en-developpement",
    detail: "Indicateurs PDO et intermédiaires, valeurs de référence et cibles.",
  },

  // ------------------------------------------------------------------
  // Finances et contrôle
  // ------------------------------------------------------------------
  {
    chemin: "/fiduciaire",
    libelle: "Gestion fiduciaire",
    statut: "en-developpement",
    detail:
      "Compte désigné, demandes de retrait et exécution budgétaire sur le cofinancement IDA et AFD.",
  },
  {
    chemin: "/audit-interne",
    libelle: "Audit interne",
    statut: "en-developpement",
    detail: "Programme de missions, constats et suivi des recommandations.",
  },
  {
    chemin: "/auditeur",
    libelle: "Espace auditeur",
    statut: "en-developpement",
    detail:
      "Consultation en lecture seule et échantillonnage des pièces d'une mission.",
  },

  // ------------------------------------------------------------------
  // Espaces par profil
  // ------------------------------------------------------------------
  {
    chemin: "/cockpit",
    libelle: "Cockpit UGP",
    statut: "en-developpement",
    detail:
      "Vue d'ensemble du portefeuille : marchés, ANO en attente et échéances de l'unité.",
  },
  {
    chemin: "/dashboard",
    libelle: "Tableau de bord",
    statut: "en-developpement",
    detail: "Suivi des initiatives portées par l'entité bénéficiaire.",
  },
  {
    chemin: "/partenaire",
    libelle: "Espace partenaire",
    statut: "en-developpement",
    detail:
      "Propositions, rapports périodiques et échanges avec l'unité de gestion.",
  },
  {
    chemin: "/bailleur",
    libelle: "Espace bailleur",
    statut: "en-developpement",
    detail:
      "Portefeuille financé et dossiers soumis à non-objection.",
  },
  {
    chemin: "/sbp",
    libelle: "Espace bénéficiaire SBP",
    statut: "en-developpement",
    detail: "Saisie et transmission des données du sous-projet.",
  },
  {
    chemin: "/sbp-admin",
    libelle: "Administration SBP",
    statut: "en-developpement",
    detail: "Validation des données transmises par les bénéficiaires.",
  },
  {
    chemin: "/gouvernance",
    libelle: "Gouvernance COPIL / CTP",
    statut: "en-developpement",
    detail:
      "Agenda des instances, dossiers de séance et relevés de décisions.",
  },
];

/**
 * Le module dont relève un chemin.
 *
 * Comparaison par SEGMENT : `/mgp` ne capture pas `/mgp-admin`, qui est un
 * module distinct avec ses propres habilitations. Un `startsWith` nu les
 * confondrait, et le voile de l'un lèverait celui de l'autre.
 *
 * Le préfixe le plus long l'emporte, afin qu'un sous-module actif puisse se
 * découvrir alors que son parent reste voilé.
 */
export function fonctionnaliteDe(chemin: string): Fonctionnalite | undefined {
  let retenue: Fonctionnalite | undefined;

  for (const f of FONCTIONNALITES) {
    const correspond = chemin === f.chemin || chemin.startsWith(`${f.chemin}/`);
    if (!correspond) continue;
    if (!retenue || f.chemin.length > retenue.chemin.length) retenue = f;
  }

  return retenue;
}

/**
 * Un chemin inconnu est réputé ACTIF.
 *
 * Le défaut penche volontairement de ce côté : un écran nouvellement écrit ne
 * doit pas se voiler tout seul parce que personne n'a pensé au registre. Le
 * voile est une déclaration, jamais une conséquence de l'oubli.
 */
export function estEnDeveloppement(chemin: string): boolean {
  return fonctionnaliteDe(chemin)?.statut === "en-developpement";
}
