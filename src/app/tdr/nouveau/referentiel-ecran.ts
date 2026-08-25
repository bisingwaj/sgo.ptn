/**
 * Référentiel d'écran du parcours TDR.
 *
 * Constantes de présentation — signes distinctifs des types, conventions
 * d'échéance, catalogues de profils et de risques E&S. Elles ne viennent
 * pas de la base et n'y retournent pas : ce sont des repères d'interface,
 * extraits ici pour que le parcours lui-même reste lisible.
 *
 * Ce qui a une source au référentiel — méthodes, seuils, exigence de PGES,
 * bibliothèques — n'a rien à faire ici et se lit depuis l'API.
 */

import {
  Analytics,
  Bullhorn,
  Construction,
  Delivery,
  Education,
  Events,
  Money,
  Partnership,
  Plane,
  Rule,
  Tools,
} from "@carbon/icons-react";

/** Signature d'une icône Carbon, telle que les composants les consomment. */
export type IconeCarbon = typeof Construction;

export const ES_LEVELS = [
  { value: "FAIBLE", label: "Faible — clauses contractuelles seules" },
  { value: "MODERE", label: "Modéré — NIES + PGES allégé" },
  { value: "SUBSTANTIEL", label: "Substantiel — EIES allégée + PGES" },
  { value: "ELEVE", label: "Élevé — EIES complète + PGES" },
];

/**
 * Signes distinctifs des onze types.
 *
 * L'ancien sélecteur `/tdr` — supprimé, il faisait double emploi avec cette
 * étape — portait une icône et des repères métier par type. Il les avait
 * dans du code, sans source ; on reprend ceux qui décrivent une pièce
 * réellement attendue, et on écarte « ISA » et « Manuel SBP », que l'audit
 * a établis comme non attestés au corpus.
 *
 * Le reste des pastilles n'est plus écrit à la main : nombre d'étapes,
 * exigence de PGES, méthode par défaut et origines ouvertes viennent du
 * référentiel, où ils sont déjà tenus à jour.
 */
export const TYPE_SIGNES: Record<string, { icon: IconeCarbon; hint?: string }> = {
  "TDR-TX": { icon: Construction, hint: "Métré et bordereau de prix" },
  "TDR-FN": { icon: Delivery, hint: "Spécifications et service après-vente" },
  "TDR-CS": { icon: Partnership, hint: "Profils-clés et CV nominatifs" },
  "TDR-SN": { icon: Tools, hint: "Niveaux de service et indicateurs qualité" },
  "TDR-AT": { icon: Events, hint: "Programme et per diem" },
  "TDR-FO": { icon: Education, hint: "Curriculum et évaluation des acquis" },
  "TDR-MI": { icon: Plane, hint: "Délégation et indemnités de séjour" },
  "TDR-ET": { icon: Analytics, hint: "Question évaluative et méthode" },
  "TDR-CO": { icon: Bullhorn, hint: "Messages, publics et canaux" },
  "TDR-SB": { icon: Money, hint: "Jalons et critères de décaissement" },
  "TDR-AU": { icon: Rule, hint: "Périmètre et échantillonnage" },
};

/**
 * Convention d'échéance des livrables.
 *
 * Les deux anciens parcours n'en disaient pas la même chose : le wizard
 * MDA annonçait « S+N · M+N », celui du partenaire et le document produit
 * écrivaient « J+N ». Un même dossier pouvait donc porter deux
 * conventions selon l'écran qui l'avait rempli. La grammaire est ici
 * unique et couvre les trois unités — c'est l'union de ce qui existait,
 * énoncée une fois.
 */
export const DEADLINE_CONVENTION = {
  helper:
    "Échéances en délai relatif au démarrage du contrat : J+15, S+4, M+6. Jamais de date ferme — le marché n’est pas encore attribué.",
  placeholder: "M+6",
};

/**
 * Profils-clés — catalogue du parcours partenaire, repris tel quel.
 *
 * Le champ existait déjà en base (`keyProfiles`) sans qu'aucun écran ne
 * l'expose. La règle des trois minimum était vérifiée dans le navigateur ;
 * elle est désormais tenue par le contrôle de complétude, côté serveur.
 */
export const PROFIL_KEYS = [
  { id: "chef", label: "Chef de mission", description: "Dix ans d’expérience au minimum" },
  { id: "expert-tech", label: "Expert technique sénior", description: "Domaine principal de la mission" },
  { id: "expert-junior", label: "Expert technique junior", description: "Appui à la mission" },
  { id: "expert-es", label: "Expert E&S", description: "Sauvegardes environnementales et sociales" },
  { id: "expert-genre", label: "Expert genre et inclusion", description: "Activités sensibles" },
];

/**
 * Risques E&S du CGES, avec leur niveau. Le parcours partenaire les
 * présentait ainsi ; la fusion les avait réduits à un champ libre, où ils
 * ne se recensent ni ne se comparent d'un dossier à l'autre.
 */
export const ES_RISK_CATALOG: {
  id: string;
  title: string;
  level: { label: string; tone: "green" | "yellow" | "red" };
}[] = [
  { id: "deplacement", title: "Déplacement involontaire ou acquisition foncière", level: { label: "Élevé", tone: "red" } },
  { id: "biodiversite", title: "Biodiversité et aires protégées", level: { label: "Modéré", tone: "yellow" } },
  { id: "patrimoine", title: "Patrimoine culturel", level: { label: "Faible", tone: "green" } },
  { id: "travail", title: "Conditions de travail, EAS et HS", level: { label: "Modéré", tone: "yellow" } },
  { id: "sante", title: "Santé et sécurité communautaire", level: { label: "Faible", tone: "green" } },
];

export const CATALOG_IDS = new Set(ES_RISK_CATALOG.map((r) => r.id));

/** Les entrées qui ne correspondent à aucun identifiant du catalogue. */
export function freeRisks(list: string[]): string[] {
  return list.filter((x) => !CATALOG_IDS.has(x));
}

/** Reprises telles quelles du wizard partenaire, seul à les porter. */
export const DELIVERABLE_FORMATS = [
  { value: "docx-pdf", label: "DOCX éditable + PDF signé — standard UGP" },
  { value: "pdf", label: "PDF signé uniquement — lecture seule" },
  { value: "structured", label: "Données structurées + PDF" },
  { value: "mixed", label: "Mixte, selon le livrable" },
];

export const REPORTING_RHYTHMS = [
  { value: "weekly", label: "Hebdomadaire — missions courtes" },
  { value: "biweekly", label: "Bimensuel" },
  { value: "monthly", label: "Mensuel — au-delà de six mois" },
  { value: "milestone", label: "À chaque jalon, sans périodicité fixe" },
];


/**
 * Amorces de saisie — objectifs et livrables.
 *
 * POURQUOI DES AMORCES ET NON DES EXEMPLES. Devant une page blanche, le
 * défaut le plus fréquent n'est pas la faute de style : c'est l'énoncé qui
 * oublie son critère, donc l'objectif qu'on ne pourra pas constater. Une
 * amorce porte la FORME attendue — un verbe d'action, une grandeur, un
 * horizon — et laisse l'auteur poser le fond.
 *
 * Les crochets sont voulus et visibles : ils disent ce qui reste à
 * remplir. Aucune amorce ne contient de valeur plausible — ni montant, ni
 * date, ni institution nommée. Un gabarit qui livrerait « 1 000
 * institutions connectées » se retrouverait tel quel dans un dossier
 * transmis, et la règle du dépôt proscrit d'inventer ce qui ressemble à
 * une donnée réelle.
 *
 * Elles ne sont PAS de l'assistance : aucun modèle n'intervient, rien
 * n'est marqué comme assisté. C'est une substitution de texte.
 */
export const GABARITS_OBJECTIF: Array<{ label: string; valeurs: Record<string, string> }> = [
  {
    label: "Doter d’une capacité",
    valeurs: {
      title: "Doter [l’institution] de [capacité] à l’issue du marché",
      criteria: "[Capacité] en service et recettée, constatée au [horizon]",
    },
  },
  {
    label: "Étendre une couverture",
    valeurs: {
      title: "Étendre [le service] à [périmètre] sur la durée du marché",
      criteria: "[Nombre] de [unité] couverts, mesuré au [horizon]",
    },
  },
  {
    label: "Former et transférer",
    valeurs: {
      title: "Former [public visé] à [compétence] et transférer les acquis",
      criteria: "[Nombre] de personnes formées et évaluées, au [horizon]",
    },
  },
  {
    label: "Mettre en conformité",
    valeurs: {
      title: "Mettre [l’objet] en conformité avec [norme ou référentiel]",
      criteria: "Conformité constatée par [instance de contrôle], au [horizon]",
    },
  },
];

export const GABARITS_LIVRABLE: Array<{ label: string; valeurs: Record<string, string> }> = [
  {
    label: "Rapport de démarrage",
    valeurs: {
      title: "Rapport de démarrage",
      format: "Document validé par l’UGP",
      deadline: "M+[n]",
    },
  },
  {
    label: "Ouvrage réceptionné",
    valeurs: {
      title: "[Ouvrage] réceptionné",
      format: "Procès-verbal de réception",
      deadline: "M+[n]",
    },
  },
  {
    label: "Rapport final",
    valeurs: {
      title: "Rapport final de mission",
      format: "Document validé par l’UGP",
      deadline: "M+[n]",
    },
  },
  {
    label: "Dossier de récolement",
    valeurs: {
      title: "Dossier des ouvrages exécutés",
      format: "Plans et notes de récolement",
      deadline: "M+[n]",
    },
  },
];
