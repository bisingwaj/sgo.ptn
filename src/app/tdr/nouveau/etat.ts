/**
 * État du parcours de rédaction d'un TDR.
 *
 * Extrait du composant : les étapes vivent désormais dans des fichiers
 * séparés et partagent toutes cette forme. La tenir à un seul endroit est
 * ce qui empêche qu'un champ ajouté d'un côté manque de l'autre.
 */

import type {
  ClauseApi,
  IndicatorApi,
  LibraryEntry,
  PtbaActivityApi,
  RiskApi,
  TdrTypeApi,
} from "@/lib/api";

export interface State {
  tdrId: string | null;
  reference: string | null;
  tdrTypeCode: string;
  ptbaActivityId: string;
  /**
   * Composante servant a reduire la liste des activites. Ce n'est pas une
   * donnee du dossier : la composante d'un TDR est celle de son activite
   * PTBA, deja connue en base. La saisir a part ouvrirait une contradiction
   * que rien n'empecherait.
   */
  componentFilter: string;
  beneficiaryOrganisationId: string;
  title: string;
  /**
   * L'auteur a-t-il ecrit l'intitule lui-meme ? Tant que non, changer de
   * type ou d'activite le recompose. Ce drapeau ne part pas en base : il ne
   * decrit pas le dossier, seulement l'etat de la saisie.
   */
  titleTouched: boolean;

  context: string;
  justification: string;
  beneficiaries: string;

  objectives: { title: string; criteria: string }[];
  deliverables: { title: string; format: string; deadline: string }[];
  expectedResults: string;
  deliverableFormat: string;
  reportingRhythm: string;

  approach: string;
  methodology: string;
  constraints: string;

  startDate: string;
  durationMonths: string;
  /** Couverture geographique : une ou plusieurs provinces, ou aucune */
  provinceCodes: string[];
  expertise: string;
  effortDays: string;
  keyProfiles: string[];

  budgetTotalUsd: string;
  budgetIdaUsd: string;
  budgetAfdUsd: string;
  budgetGovUsd: string;

  clauses: ClauseApi[];
  indicators: IndicatorApi[];
  risks: RiskApi[];

  esCategory: string;
  esRisks: string[];
  /** Champs auxquels l'assistant a contribue — marque persistante */
  /**
   * Le dossier ne relève d'aucune ligne du plan.
   *
   * L'exception, non la règle : la quasi-totalité des marchés se rattache
   * au PTBA, dont l'enveloppe les plafonne. Certains n'en relèvent pas —
   * un atelier financé hors plan, une mission ponctuelle — et le parcours
   * les refusait tous, sans issue.
   *
   * N'EST PAS PERSISTÉ TEL QUEL : c'est `ptbaActivityId` à `null` qui fait
   * foi côté serveur. Ce drapeau ne sert qu'à distinguer, à l'écran, le
   * choix assumé de l'étape simplement pas encore faite.
   */
  sansRattachement: boolean;
  aiAssistedFields: string[];

  consentMep: boolean;
  consentRgpd: boolean;

  blockers: string[];
}

export const INITIAL: State = {
  tdrId: null, reference: null, tdrTypeCode: "", ptbaActivityId: "", componentFilter: "", beneficiaryOrganisationId: "", title: "", titleTouched: false,
  context: "", justification: "", beneficiaries: "",
  objectives: [], deliverables: [], expectedResults: "", deliverableFormat: "", reportingRhythm: "",
  approach: "", methodology: "", constraints: "",
  startDate: "", durationMonths: "", provinceCodes: [], expertise: "", effortDays: "", keyProfiles: [],
  budgetTotalUsd: "", budgetIdaUsd: "", budgetAfdUsd: "", budgetGovUsd: "",
  clauses: [], indicators: [], risks: [],
  esCategory: "", esRisks: [], sansRattachement: false, aiAssistedFields: [],
  consentMep: false, consentRgpd: false,
  blockers: [],
};

/**
 * Date du jour, au format attendu par un `input[type=date]`.
 *
 * Composée depuis les champs LOCAUX, jamais par `toISOString()` : celui-ci
 * bascule en UTC, et à Kinshasa (UTC+1) un 2 mars à 00 h 30 y redevient un
 * 1er mars. L'écart ne se voit qu'une heure par jour, ce qui est la pire
 * façon de le découvrir.
 *
 * Appelée au montage du parcours, pas au chargement du module : une session
 * laissée ouverte la nuit proposerait sinon la veille.
 */
export function aujourdhui(): string {
  const d = new Date();
  const mois = String(d.getMonth() + 1).padStart(2, "0");
  const jour = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mois}-${jour}`;
}

/**
 * Composition de l'intitulé depuis la convention du type et le libellé de
 * l'activité. Hissée hors des composants : les deux premières étapes en ont
 * besoin — changer de type à l'étape 01 doit recomposer un intitulé déjà
 * formé à l'étape 02 — et deux copies auraient fini par diverger.
 *
 * Le référentiel porte le gabarit ; l'écran ne fait que le substituer.
 */
export function composeTitle(
  state: State,
  types: TdrTypeApi[],
  activities: PtbaActivityApi[],
): string {
  const type = types.find((t) => t.code === state.tdrTypeCode);
  const activity = activities.find((a) => a.id === state.ptbaActivityId);
  if (!type?.titleTemplate || !activity) return "";
  return fillTemplate(type.titleTemplate, activity);
}

/**
 * Recompose tant que l'auteur n'a pas écrit lui-même. Changer de type après
 * coup doit corriger l'intitulé, sinon un TDR de travaux resterait annoncé
 * comme une étude — mais jamais au prix d'une saisie effacée.
 */
export function withComposedTitle(
  next: State,
  types: TdrTypeApi[],
  activities: PtbaActivityApi[],
): State {
  if (next.titleTouched) return next;
  const compose = composeTitle(next, types, activities);
  return compose ? { ...next, title: compose } : next;
}


/**
 * Substitue les marqueurs du gabarit de contexte par l'activité rattachée.
 * Le gabarit est stocké en base avec `{{ptbaCode}}` et `{{ptbaTitle}}`,
 * pour que le référentiel reste indépendant d'un dossier particulier.
 */
export function fillTemplate(template: string, activity?: PtbaActivityApi): string {
  return template
    .replace(/\{\{ptbaCode\}\}/g, activity?.code ?? "—")
    .replace(/\{\{ptbaTitle\}\}/g, activity?.title ?? "—");
}

/** Discrimine les trois natures d'entrée de bibliothèque. */
export function isClause(e: LibraryEntry): e is ClauseApi { return "text" in e; }
export function isIndicator(e: LibraryEntry): e is IndicatorApi { return "measure" in e; }
export function isRisk(e: LibraryEntry): e is RiskApi { return "mitigation" in e; }
