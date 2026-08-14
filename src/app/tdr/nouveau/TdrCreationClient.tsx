"use client";

/**
 * Rédaction d'un TDR — parcours unique.
 *
 * Remplace les deux wizards qui coexistaient : celui du MDA, structuré
 * mais incomplet, et celui du partenaire, complet mais en texte libre.
 * Aucun des deux n'enregistrait quoi que ce soit. Ce parcours couvre
 * l'union des deux et écrit en base au fil de l'eau.
 *
 * La différence entre origines n'est plus un écran séparé mais une
 * variation de champs : l'origine découle de la session, et les types
 * ouverts en découlent.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Wizard, type WizardStep } from "@/components/wizard/Wizard";
import { Field, Input, Textarea, Select, Note, SelectableTile, CheckRow, Segmented } from "@/components/wizard/WizardFields";
import { useAuth } from "@/components/auth/AuthContext";
import {
  tdrApi,
  tdrReferentielApi,
  ptbaApi,
  referentielApi,
  ApiError,
  type ClauseApi,
  type IndicatorApi,
  type LibraryEntry,
  type PtbaActivityApi,
  type ComponentApi,
  type OrganisationApi,
  type ProvinceApi,
  type RiskApi,
  type TdrApi,
  type TdrTypeApi,
} from "@/lib/api";
import {
  Add,
  AiGenerate,
  Analytics,
  Bullhorn,
  CheckmarkFilled,
  Construction,
  Delivery,
  Education,
  Events,
  Idea,
  Locked,
  Money,
  Partnership,
  Plane,
  Rule,
  Tools,
  TrashCan,
  WarningAltFilled,
} from "@carbon/icons-react";
import styles from "./tdr-creation.module.scss";

interface State {
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
  provinceCode: string;
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

  consentMep: boolean;
  consentRgpd: boolean;

  blockers: string[];
}

const INITIAL: State = {
  tdrId: null, reference: null, tdrTypeCode: "", ptbaActivityId: "", componentFilter: "", beneficiaryOrganisationId: "", title: "", titleTouched: false,
  context: "", justification: "", beneficiaries: "",
  objectives: [], deliverables: [], expectedResults: "", deliverableFormat: "", reportingRhythm: "",
  approach: "", methodology: "", constraints: "",
  startDate: "", durationMonths: "", provinceCode: "", expertise: "", effortDays: "", keyProfiles: [],
  budgetTotalUsd: "", budgetIdaUsd: "", budgetAfdUsd: "", budgetGovUsd: "",
  clauses: [], indicators: [], risks: [],
  esCategory: "", esRisks: [],
  consentMep: false, consentRgpd: false,
  blockers: [],
};

const ES_LEVELS = [
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
const TYPE_SIGNES: Record<string, { icon: typeof Construction; hint?: string }> = {
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
const DEADLINE_CONVENTION = {
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
const PROFIL_KEYS = [
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
const ES_RISK_CATALOG: {
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

const CATALOG_IDS = new Set(ES_RISK_CATALOG.map((r) => r.id));

/** Les entrées qui ne correspondent à aucun identifiant du catalogue. */
function freeRisks(list: string[]): string[] {
  return list.filter((x) => !CATALOG_IDS.has(x));
}

/** Reprises telles quelles du wizard partenaire, seul à les porter. */
const DELIVERABLE_FORMATS = [
  { value: "docx-pdf", label: "DOCX éditable + PDF signé — standard UGP" },
  { value: "pdf", label: "PDF signé uniquement — lecture seule" },
  { value: "structured", label: "Données structurées + PDF" },
  { value: "mixed", label: "Mixte, selon le livrable" },
];

const REPORTING_RHYTHMS = [
  { value: "weekly", label: "Hebdomadaire — missions courtes" },
  { value: "biweekly", label: "Bimensuel" },
  { value: "monthly", label: "Mensuel — au-delà de six mois" },
  { value: "milestone", label: "À chaque jalon, sans périodicité fixe" },
];

/**
 * Substitue les marqueurs du gabarit de contexte par l'activité rattachée.
 * Le gabarit est stocké en base avec `{{ptbaCode}}` et `{{ptbaTitle}}`,
 * pour que le référentiel reste indépendant d'un dossier particulier.
 */
function fillTemplate(template: string, activity?: PtbaActivityApi): string {
  return template
    .replace(/\{\{ptbaCode\}\}/g, activity?.code ?? "—")
    .replace(/\{\{ptbaTitle\}\}/g, activity?.title ?? "—");
}

/**
 * Rédaction assistée par gabarit.
 *
 * L'ancien parcours présentait cette même substitution sous un badge
 * « ✦ IA ». Aucun modèle n'était appelé : le bouton recopiait le gabarit du
 * type dans le champ. Le nommer pour ce qu'il est évite de présenter un
 * texte à valeur contractuelle comme une production d'intelligence
 * artificielle — et laisse la place nette si une vraie assistance
 * rédactionnelle est branchée un jour.
 */
function TemplateAssist({
  template,
  current,
  onApply,
}: {
  template: string;
  current: string;
  onApply: (text: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const identical = current.trim() === template.trim();

  return (
    <aside className={styles.assist}>
      <div className={styles.assistHead}>
        <Idea size={16} aria-hidden />
        <strong>Trame proposée pour ce type d’activité</strong>
        <button type="button" className={styles.assistToggle} onClick={() => setOpen((v) => !v)}>
          {open ? "Masquer" : "Voir la trame"}
        </button>
      </div>

      <p className={styles.assistHint}>
        Rédigée d’après le référentiel de passation et les sources du MEP, avec la référence de
        l’activité PTBA substituée. À reprendre et à adapter — elle n’a pas vocation à être
        transmise telle quelle.
      </p>

      {open && <p className={styles.assistPreview}>{template}</p>}

      <div className={styles.assistActions}>
        <button
          type="button"
          className={styles.assistBtn}
          onClick={() => onApply(template)}
          disabled={identical}
        >
          {identical
            ? "Trame déjà en place"
            : current.trim()
              ? "Remplacer par la trame"
              : "Insérer la trame"}
        </button>
        {current.trim() && !identical && (
          <button
            type="button"
            className={styles.assistBtnGhost}
            onClick={() => onApply(`${current.trim()}\n\n${template}`)}
          >
            Ajouter à la suite
          </button>
        )}
      </div>
    </aside>
  );
}

/**
 * Assistance rédactionnelle.
 *
 * Trois principes tenus à l'écran :
 *  — la proposition est affichée à part, jamais versée d'office dans le
 *    champ ; c'est l'auteur qui la reprend ;
 *  — le modèle et les éléments du dossier transmis sont nommés, pour que
 *    l'auteur sache sur quoi la proposition repose ;
 *  — l'indisponibilité du service n'entrave rien : le champ reste
 *    saisissable à la main.
 */
function AiAssist({
  label,
  description,
  onGenerate,
  renderProposal,
  onAccept,
  disabled,
  disabledReason,
  // Les libelles par defaut parlent de redaction : c'est le cas des champs
  // libres. Une liste d'objectifs ne se « redige » pas et ne se « reprend »
  // pas — elle s'ajoute a l'existante. Un bouton qui decrit mal son effet
  // est un bouton sur lequel on n'ose pas cliquer.
  idleLabel = "Proposer une rédaction",
  againLabel = "Proposer autre chose",
  busyLabel = "Rédaction en cours…",
  acceptLabel = "Reprendre dans le formulaire",
}: {
  label: string;
  description: string;
  onGenerate: () => Promise<{ groundedOn: string[] }>;
  renderProposal: () => React.ReactNode;
  onAccept: () => void;
  disabled?: boolean;
  disabledReason?: string;
  idleLabel?: string;
  againLabel?: string;
  busyLabel?: string;
  acceptLabel?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [meta, setMeta] = useState<{ groundedOn: string[] } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    setBusy(true);
    setError(null);
    try {
      setMeta(await onGenerate());
    } catch (e) {
      setError(
        e instanceof ApiError && e.status === 503
          ? "Assistance non configurée sur ce serveur. Le champ reste à remplir à la main."
          : e instanceof Error
            ? e.message
            : "La génération a échoué.",
      );
      setMeta(null);
    } finally {
      setBusy(false);
    }
  };

  return (
    <aside className={styles.assist}>
      <div className={styles.assistHead}>
        <AiGenerate size={16} aria-hidden />
        <strong>{label}</strong>
      </div>
      <p className={styles.assistHint}>{description}</p>

      {error && <p className={styles.assistError}>{error}</p>}

      {meta && (
        <>
          <div className={styles.assistProposal}>{renderProposal()}</div>
          {/* Le modèle employé est consigné au journal d'audit, pas
              affiché : ce qui intéresse le rédacteur, c'est sur quoi la
              proposition repose et qu'elle reste à relire. */}
          <p className={styles.assistProvenance}>
            Établie à partir de : {meta.groundedOn.join(" · ")}. Aucune donnée personnelle n’a été
            transmise. Texte à relire et à adapter avant transmission.
          </p>
        </>
      )}

      <div className={styles.assistActions}>
        <button
          type="button"
          className={styles.assistBtn}
          onClick={() => void run()}
          disabled={busy || disabled}
          title={disabled ? disabledReason : undefined}
        >
          {busy ? busyLabel : meta ? againLabel : idleLabel}
        </button>
        {meta && (
          <button
            type="button"
            className={styles.assistBtnGhost}
            onClick={() => {
              onAccept();
              setMeta(null);
            }}
          >
            {acceptLabel}
          </button>
        )}
      </div>

      {disabled && disabledReason && <p className={styles.assistHint}>{disabledReason}</p>}
    </aside>
  );
}

function isClause(e: LibraryEntry): e is ClauseApi { return "text" in e; }
function isIndicator(e: LibraryEntry): e is IndicatorApi { return "measure" in e; }
function isRisk(e: LibraryEntry): e is RiskApi { return "mitigation" in e; }

export function TdrCreationClient() {
  const router = useRouter();
  const params = useSearchParams();
  const { user, loading: authLoading, can } = useAuth();

  const [types, setTypes] = useState<TdrTypeApi[]>([]);
  const [activities, setActivities] = useState<PtbaActivityApi[]>([]);
  const [provinces, setProvinces] = useState<ProvinceApi[]>([]);
  const [organisations, setOrganisations] = useState<OrganisationApi[]>([]);
  const [components, setComponents] = useState<ComponentApi[]>([]);
  const [library, setLibrary] = useState<{ clauses: ClauseApi[]; indicators: IndicatorApi[]; risks: RiskApi[] }>({
    clauses: [], indicators: [], risks: [],
  });
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState<TdrApi | null>(null);

  useEffect(() => {
    if (authLoading || !user) return;
    Promise.all([
      tdrReferentielApi.types(),
      ptbaApi.activities(new Date().getFullYear()),
      referentielApi.provinces(),
      referentielApi.organisations(),
      referentielApi.composantes(),
    ])
      .then(([t, p, pr, orgs, comps]) => {
        setTypes(t.filter((x) => x.isActive));
        setActivities(p.activities);
        setProvinces(pr);
        setOrganisations(orgs);
        // C5 est la réserve non dotée : aucune activité ne s'y rattache,
        // la proposer au filtre n'ouvrirait qu'une liste vide.
        setComponents(comps.filter((c) => Number(c.totalUsdM) > 0));
      })
      .catch((e: unknown) =>
        setLoadError(e instanceof Error ? e.message : "Référentiel indisponible."),
      );
  }, [authLoading, user]);

  /** Bibliothèques du type retenu, plus les éléments transversaux. */
  const loadLibrary = useCallback(async (typeCode: string) => {
    const [c, i, r, ti, tr] = await Promise.all([
      tdrReferentielApi.library("clauses", { type: typeCode, status: "PUBLIE" }),
      tdrReferentielApi.library("indicateurs", { type: typeCode, status: "PUBLIE" }),
      tdrReferentielApi.library("risques", { type: typeCode, status: "PUBLIE" }),
      tdrReferentielApi.library("indicateurs", { type: "transversal", status: "PUBLIE" }),
      tdrReferentielApi.library("risques", { type: "transversal", status: "PUBLIE" }),
    ]);
    setLibrary({
      clauses: c.filter(isClause),
      indicators: [...i, ...ti].filter(isIndicator),
      risks: [...r, ...tr].filter(isRisk),
    });
  }, []);

  const selectedType = useMemo(
    () => types.find((t) => t.code === INITIAL.tdrTypeCode) ?? null,
    [types],
  );

  /** Enregistrement au fil de l'eau : chaque étape écrit ce qu'elle porte. */
  const persist = useCallback(async (s: State, patch: Record<string, unknown>) => {
    if (!s.tdrId) return;
    await tdrApi.update(s.tdrId, patch);
  }, []);

  const steps = useMemo<WizardStep<State>[]>(() => {
    const typeOf = (s: State) => types.find((t) => t.code === s.tdrTypeCode);

    return [
      // ===== 01 · Type et rattachement =====
      {
        num: "01",
        label: "Type & rattachement",
        sub: "Nature de l’activité et ligne du plan annuel",
        validate: (s) => {
          if (!s.tdrTypeCode) return "Sélectionnez un type d’activité.";
          if (s.title.trim().length < 5) return "Renseignez un intitulé.";
          if (!s.ptbaActivityId)
            return "Rattachez une activité PTBA : sans ligne au plan, il n’y a pas d’enveloppe.";
          return null;
        },
        // Ouvre le brouillon en base : la suite du parcours écrit dessus.
        commit: async (s) => {
          if (s.tdrId) {
            await persist(s, {
              title: s.title,
              ptbaActivityId: s.ptbaActivityId,
              beneficiaryOrganisationId: s.beneficiaryOrganisationId || null,
            });
            return;
          }
          const draft = await tdrApi.createDraft({
            tdrTypeCode: s.tdrTypeCode,
            title: s.title.trim(),
            ptbaActivityId: s.ptbaActivityId,
          });
          s.tdrId = draft.id;
          s.reference = draft.reference;
          if (draft.context) {
            const activity = activities.find((a) => a.id === s.ptbaActivityId);
            s.context = fillTemplate(draft.context, activity);
          }
          if (s.beneficiaryOrganisationId) {
            await tdrApi.update(draft.id, {
              beneficiaryOrganisationId: s.beneficiaryOrganisationId,
            });
          }
          await loadLibrary(s.tdrTypeCode);
        },
        render: (s, set) => (
          <TypeStep
            state={s}
            set={set}
            types={types}
            activities={activities}
            organisations={organisations}
            components={components}
          />
        ),
      },

      // ===== 02 · Cadrage =====
      {
        num: "02",
        label: "Cadrage",
        sub: "Contexte, justification, bénéficiaires",
        validate: (s) => (s.context.trim().length < 30 ? "Le contexte doit être rédigé." : null),
        commit: (s) =>
          persist(s, {
            context: s.context,
            justification: s.justification,
            beneficiaries: s.beneficiaries,
          }),
        render: (s, set) => {
          const type = typeOf(s);
          const activity = activities.find((a) => a.id === s.ptbaActivityId);
          return (
            <div className={styles.stack}>
              {type?.contextTemplate && (
                <TemplateAssist
                  template={fillTemplate(type.contextTemplate, activity)}
                  current={s.context}
                  onApply={(text) => set({ ...s, context: text })}
                />
              )}

              <ContextAssist state={s} set={set} />
              <Field label="Contexte" required>
                <Textarea rows={7} value={s.context} onChange={(e) => set({ ...s, context: e.target.value })} />
              </Field>
              <Field label="Justification" helper="Pourquoi cette activité, maintenant.">
                <Textarea rows={4} value={s.justification} onChange={(e) => set({ ...s, justification: e.target.value })} />
              </Field>

              <JustificationAssist state={s} set={set} />
              <Field
                label="Bénéficiaires visés"
                helper="Les populations servies, non l’institution maître d’ouvrage. Quantifier si possible : effectifs, part de femmes, couverture géographique — ces éléments alimentent le cadre de résultats."
              >
                <Textarea
                  rows={3}
                  value={s.beneficiaries}
                  onChange={(e) => set({ ...s, beneficiaries: e.target.value })}
                  placeholder={`Bénéficiaires directs : 800 agents publics
Bénéficiaires indirects : 95 millions de citoyens, dont 48 % de femmes`}
                />
              </Field>
            </div>
          );
        },
      },

      // ===== 03 · Objectifs et livrables =====
      {
        num: "03",
        label: "Objectifs & livrables",
        sub: "Ce qui est attendu, et comment on le constate",
        validate: (s) => {
          if (s.objectives.length === 0) return "Définissez au moins un objectif.";
          if (s.deliverables.length === 0) return "Définissez au moins un livrable.";
          return null;
        },
        commit: (s) =>
          persist(s, {
            objectives: s.objectives,
            deliverables: s.deliverables,
            expectedResults: s.expectedResults || null,
            deliverableFormat: s.deliverableFormat || null,
            reportingRhythm: s.reportingRhythm || null,
          }),
        render: (s, set) => <OutcomesStep state={s} set={set} />,
      },

      // ===== 04 · Méthodologie =====
      {
        num: "04",
        label: "Méthodologie",
        sub: "Approche attendue et contraintes",
        commit: (s) =>
          persist(s, { approach: s.approach, methodology: s.methodology, constraints: s.constraints }),
        render: (s, set) => (
          <div className={styles.stack}>
            <Field label="Approche générale">
              <Textarea rows={4} value={s.approach} onChange={(e) => set({ ...s, approach: e.target.value })} />
            </Field>
            <Field label="Méthodologie attendue" helper="Ce que le prestataire devra démontrer dans son offre technique.">
              <Textarea rows={5} value={s.methodology} onChange={(e) => set({ ...s, methodology: e.target.value })} />
            </Field>
            <Field label="Contraintes">
              <Textarea rows={3} value={s.constraints} onChange={(e) => set({ ...s, constraints: e.target.value })} />
            </Field>
          </div>
        ),
      },

      // ===== 05 · Calendrier et expertise =====
      {
        num: "05",
        label: "Calendrier & expertise",
        sub: "Durée, couverture et profils requis",
        commit: (s) =>
          persist(s, {
            startDate: s.startDate || null,
            durationMonths: s.durationMonths ? Number(s.durationMonths) : null,
            effortDays: s.effortDays ? Number(s.effortDays) : null,
            provinceCode: s.provinceCode || null,
            expertise: s.expertise,
            keyProfiles: s.keyProfiles,
          }),
        render: (s, set) => (
          <div className={styles.stack}>
            <div className={styles.row2}>
              <Field label="Date de démarrage souhaitée">
                <Input type="date" value={s.startDate} onChange={(e) => set({ ...s, startDate: e.target.value })} />
              </Field>
              <Field label="Durée (mois)" helper="Borne les échéances des livrables.">
                <Input type="number" min={1} value={s.durationMonths} onChange={(e) => set({ ...s, durationMonths: e.target.value })} />
              </Field>
              <Field
                label="Volume d’effort (jours-homme)"
                helper="Unité de facturation d’un marché de prestation. La durée calendaire ne s’y substitue pas : 240 jours-homme peuvent s’étaler sur neuf mois."
              >
                <Input type="number" min={1} value={s.effortDays} onChange={(e) => set({ ...s, effortDays: e.target.value })} />
              </Field>
            </div>
            <Field label="Province" helper="Laisser vide pour une couverture nationale.">
              <Select
                value={s.provinceCode}
                onChange={(e) => set({ ...s, provinceCode: e.target.value })}
                placeholder="Couverture nationale"
                options={provinces.map((p) => ({
                  value: p.code,
                  label: p.isPriorityCpf ? `${p.label} · prioritaire CPF` : p.label,
                }))}
              />
            </Field>
            <Field label="Expertise requise" helper="Qualifications et expérience attendues de l’institution ou de l’équipe.">
              <Textarea rows={5} value={s.expertise} onChange={(e) => set({ ...s, expertise: e.target.value })} />
            </Field>

            {/* Trois profils au minimum — règle de conformité, tenue par le
                contrôle de complétude côté serveur. Les critères de notation
                des offres portent sur ces profils : sans eux, il n'y a rien
                à évaluer. */}
            <div>
              <h3 className={styles.sectionTitle}>
                Profils-clés exigés <span className={styles.required}>*</span>
              </h3>
              <p className={styles.hint}>
                Trois au minimum. {s.keyProfiles.length} désigné
                {s.keyProfiles.length > 1 ? "s" : ""} à ce jour.
              </p>
              <div className={styles.checkStack}>
                {PROFIL_KEYS.map((p) => (
                  <CheckRow
                    key={p.id}
                    checked={s.keyProfiles.includes(p.id)}
                    onChange={(next) =>
                      set({
                        ...s,
                        keyProfiles: next
                          ? [...s.keyProfiles, p.id]
                          : s.keyProfiles.filter((k) => k !== p.id),
                      })
                    }
                    title={p.label}
                    description={p.description}
                  />
                ))}
              </div>
            </div>
          </div>
        ),
      },

      // ===== 06 · Budget =====
      {
        num: "06",
        label: "Budget",
        sub: "Enveloppe et ventilation par source de financement",
        validate: (s) => {
          const total = Number(s.budgetTotalUsd);
          if (!total || total <= 0) return "Renseignez le budget.";
          const activity = activities.find((a) => a.id === s.ptbaActivityId);
          if (activity && total > Number(activity.envelopeUsd)) {
            return `Le budget dépasse l’enveloppe de l’activité ${activity.code} (${(Number(activity.envelopeUsd) / 1e6).toFixed(2)} M USD).`;
          }
          const parts = Number(s.budgetIdaUsd || 0) + Number(s.budgetAfdUsd || 0) + Number(s.budgetGovUsd || 0);
          if (parts > 0 && Math.abs(parts - total) > 1) {
            return "La ventilation par source ne correspond pas au total.";
          }
          return null;
        },
        commit: (s) =>
          persist(s, {
            budgetTotalUsd: Number(s.budgetTotalUsd),
            budgetIdaUsd: s.budgetIdaUsd ? Number(s.budgetIdaUsd) : null,
            budgetAfdUsd: s.budgetAfdUsd ? Number(s.budgetAfdUsd) : null,
            budgetGovUsd: s.budgetGovUsd ? Number(s.budgetGovUsd) : null,
          }),
        render: (s, set) => (
          <BudgetStep
            state={s}
            set={set}
            activity={activities.find((a) => a.id === s.ptbaActivityId)}
            type={typeOf(s)}
          />
        ),
      },

      // ===== 07 · Cadre et risques =====
      //
      // Le parcours MDA d'origine tenait les trois bibliothèques sur une
      // seule étape, répartie en onglets — « Clauses, indicateurs et risques
      // pré-cadrés ». La refonte en avait fait deux étapes ; c'était une
      // marche de plus pour un même geste, répété trois fois.
      {
        num: "07",
        label: "Cadre & risques",
        sub: "Clauses, indicateurs et risques pré-cadrés pour ce type",
        commit: (s) =>
          persist(s, {
            clauses: s.clauses.map((c) => ({
              sourceFamilyKey: c.familyKey,
              sourceVersion: c.version,
              category: c.category,
              label: c.label,
              text: c.text,
            })),
            indicators: s.indicators.map((i) => ({
              sourceFamilyKey: i.familyKey, label: i.label, measure: i.measure, target: i.target,
            })),
            risks: s.risks.map((r) => ({
              sourceFamilyKey: r.familyKey, label: r.label, description: r.description,
              mitigation: r.mitigation, level: r.level,
            })),
          }),
        render: (s, set) => <FrameworkStep state={s} set={set} library={library} />,
      },

      // ===== 09 · Sauvegardes E&S =====
      {
        num: "08",
        label: "Sauvegardes E&S",
        sub: "Classification du risque environnemental et social",
        validate: (s) => {
          const t = typeOf(s);
          if (t?.requiresPges && !s.esCategory) {
            return `Le type « ${t.name} » exige un PGES : la catégorie doit être déterminée.`;
          }
          return null;
        },
        commit: (s) => persist(s, { esCategory: s.esCategory || null, esRisks: s.esRisks }),
        render: (s, set) => {
          const t = typeOf(s);
          return (
            <div className={styles.stack}>
              {t?.requiresPges && (
                <Note tone="warning" title="PGES requis pour ce type">
                  Un Plan de Gestion Environnementale et Sociale devra être élaboré et validé avant
                  démarrage. La catégorie déterminée ici conditionne l’instrument exigé.
                </Note>
              )}
              <Field label="Catégorie de risque E&S" required={t?.requiresPges}>
                <Select
                  value={s.esCategory}
                  onChange={(e) => set({ ...s, esCategory: e.target.value })}
                  placeholder="À déterminer par le screening"
                  options={ES_LEVELS}
                />
              </Field>
              {/* Le CGES fournit le catalogue : le cocher permet de recenser
                  et de comparer d’un dossier à l’autre, ce qu’un champ libre
                  interdit. La saisie libre subsiste pour ce que le catalogue
                  ne couvre pas — les deux alimentent la même liste, un
                  identifiant connu valant risque du catalogue. */}
              <div>
                <h3 className={styles.sectionTitle}>Risques E&S identifiés</h3>
                <p className={styles.hint}>
                  Catalogue du Cadre de Gestion Environnementale et Sociale du projet.
                </p>
                <div className={styles.checkStack}>
                  {ES_RISK_CATALOG.map((r) => (
                    <CheckRow
                      key={r.id}
                      checked={s.esRisks.includes(r.id)}
                      onChange={(next) =>
                        set({
                          ...s,
                          esRisks: next
                            ? [...s.esRisks, r.id]
                            : s.esRisks.filter((x) => x !== r.id),
                        })
                      }
                      title={r.title}
                      level={r.level}
                    />
                  ))}
                </div>
              </div>

              <Field
                label="Autres risques propres à ce dossier"
                helper="Un par ligne. Ce que le catalogue du CGES ne couvre pas."
              >
                <Textarea
                  rows={3}
                  value={freeRisks(s.esRisks).join("\n")}
                  onChange={(e) =>
                    set({
                      ...s,
                      esRisks: [
                        ...s.esRisks.filter((x) => CATALOG_IDS.has(x)),
                        ...e.target.value.split("\n").map((l) => l.trim()).filter(Boolean),
                      ],
                    })
                  }
                />
              </Field>
            </div>
          );
        },
      },

      // ===== 10 · Revue et soumission =====
      {
        num: "09",
        label: "Revue & transmission",
        sub: "Contrôle de complétude et engagements",
        validate: (s) => {
          if (!s.consentMep || !s.consentRgpd) return "Confirmez les deux engagements.";
          if (s.blockers.length > 0) return "Des éléments obligatoires manquent.";
          return null;
        },
        render: (s, set) => <ReviewStep state={s} set={set} persist={persist} />,
      },
    ];
  }, [types, activities, provinces, library, persist, loadLibrary]);

  if (authLoading) return <div className={styles.gate}>Chargement…</div>;

  if (!user || !can("tdr:author")) {
    return (
      <div className={styles.gate}>
        <Locked size={32} aria-hidden />
        <h1>Rédaction non ouverte à votre profil</h1>
        <p>
          Les bailleurs et les auditeurs consultent les termes de référence et, pour les premiers,
          émettent des avis de non-objection — ils n’en rédigent jamais (présentation UGPTN § 15.4).
        </p>
        {!user && <Link href="/login" className={styles.gateLink}>Aller à la connexion</Link>}
      </div>
    );
  }

  if (loadError) {
    return (
      <div className={styles.gate}>
        <WarningAltFilled size={32} aria-hidden />
        <h1>Référentiel indisponible</h1>
        <p>{loadError}</p>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className={styles.success}>
        <CheckmarkFilled size={32} aria-hidden />
        <span className={styles.eyebrow}>TRANSMIS À L’UGP</span>
        <h1>{submitted.reference}</h1>
        <p>{submitted.title}</p>
        <dl className={styles.successMeta}>
          <div><dt>Méthode de passation</dt><dd>{submitted.procurementMethodCode ?? "—"}</dd></div>
          <div>
            <dt>Type de revue</dt>
            <dd>{submitted.reviewType === "PRIOR" ? "Préalable" : submitted.reviewType === "POST" ? "Postérieure" : "—"}</dd>
          </div>
        </dl>
        <p className={styles.successNote}>
          La méthode et le type de revue ont été figés depuis les seuils en vigueur aujourd’hui. Un
          instantané du document a été conservé.
        </p>
        <Link href="/dashboard" className={styles.gateLink}>Retour au tableau de bord</Link>
      </div>
    );
  }

  const preselected = params.get("type") ?? "";

  return (
    <Wizard<State>
      eyebrow="RÉDACTION · TERMES DE RÉFÉRENCE"
      title="Nouveau TDR"
      subtitle={`Vous rédigez au titre de ${user.organisationName} · ${user.subroleLabel}`}
      steps={steps}
      initialState={{ ...INITIAL, tdrTypeCode: preselected }}
      cancelHref="/dashboard"
      finishLabel="Transmettre à l’UGP"
      onFinish={async (s) => {
        if (!s.tdrId) throw new Error("Brouillon non enregistré.");
        try {
          setSubmitted(await tdrApi.submit(s.tdrId));
        } catch (e) {
          if (e instanceof ApiError) throw new Error(e.message);
          throw e;
        }
      }}
    />
  );
}

// ============================================================

function TypeStep({
  state, set, types, activities, organisations, components,
}: {
  state: State;
  set: (s: State) => void;
  types: TdrTypeApi[];
  activities: PtbaActivityApi[];
  organisations: OrganisationApi[];
  components: ComponentApi[];
}) {
  const families = [...new Set(types.map((t) => t.family))].sort();

  /**
   * Intitulé composé depuis la convention du type et le libellé de
   * l'activité. Le référentiel porte le gabarit, l'écran ne fait que le
   * substituer : la convention de dénomination reste une donnée, modifiable
   * sans redéploiement, comme le gabarit de contexte dont elle reprend les
   * marqueurs.
   */
  const composed = useMemo(() => {
    const type = types.find((t) => t.code === state.tdrTypeCode);
    const activity = activities.find((a) => a.id === state.ptbaActivityId);
    if (!type?.titleTemplate || !activity) return "";
    return fillTemplate(type.titleTemplate, activity);
  }, [types, activities, state.tdrTypeCode, state.ptbaActivityId]);

  /**
   * Recompose tant que l'auteur n'a pas écrit lui-même. Changer de type
   * après coup doit corriger l'intitulé, sinon un TDR de travaux resterait
   * annoncé comme une étude — mais jamais au prix d'une saisie effacée.
   */
  function withComposedTitle(next: State): State {
    if (next.titleTouched) return next;
    const type = types.find((t) => t.code === next.tdrTypeCode);
    const activity = activities.find((a) => a.id === next.ptbaActivityId);
    if (!type?.titleTemplate || !activity) return next;
    return { ...next, title: fillTemplate(type.titleTemplate, activity) };
  }

  const stillGeneric = composed !== "" && state.title.trim() === composed;

  /**
   * Activités visibles. Le parcours MDA d'origine faisait de la composante
   * une étape à part, puis n'affichait que ses activités ; ici elle n'est
   * qu'un filtre, la composante d'un TDR étant celle de son activité.
   * Sans lui, les 78 lignes d'un PTBA réel tiendraient dans une seule
   * liste déroulante.
   */
  const visibles = state.componentFilter
    ? activities.filter((a) => a.componentCode === state.componentFilter)
    : activities;

  const parComposante = useMemo(() => {
    const n: Record<string, number> = {};
    for (const a of activities) n[a.componentCode] = (n[a.componentCode] ?? 0) + 1;
    return n;
  }, [activities]);

  return (
    <div className={styles.stack}>
      {state.reference && (
        <Note tone="info" title={`Brouillon ${state.reference}`}>
          Vos saisies sont enregistrées à chaque étape.
        </Note>
      )}

      {/* Rendu hors `Field` : celui-ci enveloppe ses enfants dans un
          conteneur en ligne, muni d'un fond de champ et d'un soulignement,
          conçu pour un seul input — une grille de tuiles s'y écrase. Un
          `<button>` dans son `<label>` poserait en outre un second
          déclencheur au clic. */}
      <fieldset className={styles.typeFieldset}>
        <legend className={styles.typeLegend}>
          Type d’activité <span className={styles.required}>*</span>
        </legend>
        <p className={styles.typeHint}>
          {state.tdrId
            ? "Le type est figé : il détermine les bibliothèques et le parcours de ce brouillon."
            : "Seuls les types ouverts à votre profil sont proposés."}
        </p>

        {types.length === 0 ? (
          <p className={styles.hint}>Aucun type disponible.</p>
        ) : (
          families.map((f) => (
            <div key={f} className={styles.familyBlock}>
              <span className={styles.familyLabel}>
                {types.find((t) => t.family === f)?.familyLabel}
              </span>
              <div className={styles.tileGrid}>
                {types
                  .filter((t) => t.family === f)
                  .map((t) => (
                    <SelectableTile
                      key={t.code}
                      selected={state.tdrTypeCode === t.code}
                      onClick={() => set(withComposedTitle({ ...state, tdrTypeCode: t.code }))}
                      disabled={Boolean(state.tdrId)}
                      tag={t.code}
                      title={t.name}
                      icon={TYPE_SIGNES[t.code]?.icon}
                      description={TYPE_SIGNES[t.code]?.hint}
                      metrics={
                        <span className={styles.tileTags}>
                          <span className={styles.tag}>{t.stepCount} étapes</span>
                          {t.defaultMethod && (
                            <span className={styles.tag}>{t.defaultMethod.code}</span>
                          )}
                          {t.requiresPges && (
                            <span className={`${styles.tag} ${styles.tagPges}`}>PGES</span>
                          )}
                          {t.allowedOrigins.length > 1 && (
                            <span className={`${styles.tag} ${styles.tagOpen}`}>
                              Ouvert hors UGP
                            </span>
                          )}
                        </span>
                      }
                    />
                  ))}
              </div>
            </div>
          ))
        )}
      </fieldset>

      <div className={styles.row2}>
        <Field
          label="Composante d’affectation"
          helper="Réduit la liste des activités. La composante retenue reste celle de l’activité choisie."
        >
          <Select
            value={state.componentFilter}
            onChange={(e) =>
              // Changer de composante invalide l'activite si elle n'en releve
              // plus : sans cela le dossier garderait une ligne devenue
              // invisible a l'ecran.
              set(
                withComposedTitle({
                  ...state,
                  componentFilter: e.target.value,
                  ptbaActivityId: activities.some(
                    (a) => a.id === state.ptbaActivityId && a.componentCode === e.target.value,
                  )
                    ? state.ptbaActivityId
                    : "",
                }),
              )
            }
            placeholder="Toutes les composantes"
            options={components.map((c) => ({
              value: c.code,
              label: `${c.code} · ${c.shortLabel} — ${parComposante[c.code] ?? 0} activité${(parComposante[c.code] ?? 0) > 1 ? "s" : ""}`,
            }))}
          />
        </Field>

        <Field
          label="Activité PTBA de rattachement"
          required
          helper={
            activities.length === 0
              ? "Aucune activité au plan de l’exercice en cours. Elle doit y être inscrite d’abord."
              : visibles.length === 0
                ? "Aucune activité sur cette composante."
                : "L’enveloppe de cette activité plafonne le budget du TDR."
          }
        >
          <Select
            value={state.ptbaActivityId}
            onChange={(e) => set(withComposedTitle({ ...state, ptbaActivityId: e.target.value }))}
            placeholder="Sélectionner une activité"
            options={visibles.map((a) => ({
              value: a.id,
              label: `${a.code} · ${a.title} — ${(Number(a.envelopeUsd) / 1e6).toFixed(2)} M USD`,
            }))}
          />
        </Field>
      </div>

      {/* L'intitulé suit l'activité, et non l'inverse : il se compose de ce
          qui précède. Le placer avant reviendrait à demander de nommer un
          marché dont ni la nature ni l'objet ne sont encore choisis. */}
      <Field
        label="Intitulé du marché"
        required
        helper={
          composed
            ? "Composé depuis le type et l’activité. Remplacez le libellé de l’activité par l’objet précis du marché."
            : "Choisissez le type et l’activité : un intitulé conforme à la convention vous sera proposé."
        }
      >
        <Input
          value={state.title}
          onChange={(e) =>
            // Vider le champ rend la main à la composition : l'auteur qui
            // efface veut repartir de la proposition, pas d'un champ mort.
            set({
              ...state,
              title: e.target.value,
              titleTouched: e.target.value.trim().length > 0,
            })
          }
          placeholder="Travaux — aménagement du centre des opérations de sécurité"
        />
      </Field>

      {stillGeneric && (
        <Note tone="warning" title="Cet intitulé reprend le libellé de l’activité">
          Une activité du PTBA porte souvent plusieurs marchés — travaux, puis
          fournitures, puis supervision. S’ils partagent tous le même intitulé,
          ni le plan de passation ni les avis de la Banque ne les distinguent.
          Nommez ce que ce marché achète.
        </Note>
      )}

      {/* Maîtrise d'ouvrage bénéficiaire — distincte de l'organisation qui
          rédige, et distincte des bénéficiaires visés, qui sont des
          populations. Sans elle, l'assistance rédactionnelle devine. */}
      <Field
        label="Maîtrise d’ouvrage bénéficiaire"
        helper="L’entité pour laquelle l’activité est conduite, si elle diffère de la vôtre. À ne pas confondre avec les bénéficiaires visés, qui sont les populations servies."
      >
        <Select
          value={state.beneficiaryOrganisationId}
          onChange={(e) => set({ ...state, beneficiaryOrganisationId: e.target.value })}
          placeholder="Aucune — l’activité est conduite pour votre propre compte"
          options={organisations.map((o) => ({
            value: o.id,
            label: `${o.code} — ${o.fullName}`,
          }))}
        />
      </Field>
    </div>
  );
}

/** Rédaction du contexte, ancrée sur l'activité PTBA du dossier. */
function ContextAssist({ state, set }: { state: State; set: (s: State) => void }) {
  const [proposal, setProposal] = useState<string>("");

  return (
    <AiAssist
      label="Rédaction assistée du contexte"
      description="Le modèle reçoit l’activité PTBA, la composante, le type et la couverture géographique de ce dossier — aucune donnée personnelle. Il ne produit ni montant ni référence réglementaire qui ne lui aurait été fournie."
      disabled={!state.tdrId}
      disabledReason={!state.tdrId ? "Disponible une fois le brouillon ouvert." : undefined}
      onGenerate={async () => {
        const r = await tdrApi.assistContext(state.tdrId!);
        setProposal(r.proposal);
        return { groundedOn: r.groundedOn };
      }}
      renderProposal={() => <p className={styles.assistText}>{proposal}</p>}
      onAccept={() => set({ ...state, context: proposal })}
    />
  );
}

/**
 * Justification — rédaction, ou reprise d'un texte existant.
 * Le régime est déterminé par le serveur selon l'état du champ.
 */
function JustificationAssist({ state, set }: { state: State; set: (s: State) => void }) {
  const [proposal, setProposal] = useState<string>("");
  const [mode, setMode] = useState<"redaction" | "reprise">("redaction");
  const hasText = state.justification.trim().length >= 40;

  return (
    <AiAssist
      label={hasText ? "Reprise de votre justification" : "Rédaction assistée de la justification"}
      description={
        hasText
          ? "Le modèle reprend la forme de votre texte — structure, clarté, registre — sans y introduire de fait, de chiffre ni de référence que vous n’auriez pas écrits."
          : "Pourquoi cette activité, et pourquoi maintenant. S’appuie sur le contexte déjà rédigé et sur le rattachement à la composante."
      }
      disabled={!state.tdrId}
      disabledReason={!state.tdrId ? "Disponible une fois le brouillon ouvert." : undefined}
      onGenerate={async () => {
        const r = await tdrApi.assistJustification(state.tdrId!);
        setProposal(r.proposal);
        setMode(r.mode);
        return { groundedOn: r.groundedOn };
      }}
      renderProposal={() => (
        <>
          {mode === "reprise" && (
            <p className={styles.assistMode}>Reprise de votre texte, sans ajout de fait.</p>
          )}
          <p className={styles.assistText}>{proposal}</p>
        </>
      )}
      onAccept={() => set({ ...state, justification: proposal })}
    />
  );
}

/** Objectifs assortis de leur critère de constatation. */
function ObjectivesAssist({ state, set }: { state: State; set: (s: State) => void }) {
  const [proposal, setProposal] = useState<{ title: string; criteria: string }[]>([]);

  return (
    <AiAssist
      label="Proposition d’objectifs"
      description="S’appuie sur le contexte déjà rédigé. Chaque objectif est assorti d’un critère vérifiable ; les valeurs cibles qui dépendent d’une donnée absente du dossier sont laissées entre crochets plutôt qu’inventées."
      disabled={!state.tdrId || state.context.trim().length < 30}
      disabledReason={
        !state.tdrId
          ? "Disponible une fois le brouillon ouvert."
          : state.context.trim().length < 30
            ? "Rédigez d’abord le contexte : les objectifs en découlent."
            : undefined
      }
      onGenerate={async () => {
        const r = await tdrApi.assistObjectives(state.tdrId!);
        setProposal(r.proposal);
        return { groundedOn: r.groundedOn };
      }}
      renderProposal={() => (
        <ul className={styles.assistList}>
          {proposal.map((o) => (
            <li key={o.title}>
              <strong>{o.title}</strong>
              <span>{o.criteria}</span>
            </li>
          ))}
        </ul>
      )}
      onAccept={() =>
        set({ ...state, objectives: [...state.objectives, ...proposal] })
      }
      idleLabel="Proposer des objectifs"
      againLabel="Proposer d’autres objectifs"
      busyLabel="Analyse du contexte…"
      acceptLabel={
        state.objectives.length > 0
          ? "Ajouter à la liste"
          : "Reprendre ces objectifs"
      }
    />
  );
}

/**
 * Les livrables découlent des objectifs, pas du contexte : le bouton reste
 * fermé tant qu'aucun objectif n'est posé. Proposer les pièces à remettre
 * sans savoir ce qu'elles doivent établir reviendrait à inventer le marché.
 */
function DeliverablesAssist({ state, set }: { state: State; set: (s: State) => void }) {
  const [proposal, setProposal] = useState<
    { title: string; format: string; deadline: string }[]
  >([]);

  const noObjective = state.objectives.filter((o) => o.title.trim()).length === 0;

  return (
    <AiAssist
      label="Proposition de livrables"
      description="Découle des objectifs déjà arrêtés. Les échéances sont des délais relatifs au démarrage du contrat ; tant que la durée du marché n’est pas saisie, elles restent à fixer — une date engage contractuellement."
      disabled={!state.tdrId || noObjective}
      disabledReason={
        !state.tdrId
          ? "Disponible une fois le brouillon ouvert."
          : noObjective
            ? "Posez d’abord un objectif : un livrable est la pièce qui atteste son atteinte."
            : undefined
      }
      onGenerate={async () => {
        // Les objectifs ne partent en base qu'au changement d'étape. Or les
        // livrables sont le seul champ assisté qui dépend d'une saisie de la
        // MÊME étape : sans cet enregistrement préalable, le service lit un
        // document sans objectif et refuse de proposer quoi que ce soit.
        // L'enregistrer ici vaut aussi pour les retouches faites à la main
        // depuis la dernière sauvegarde.
        await tdrApi.update(state.tdrId!, {
          objectives: state.objectives
            .filter((o) => o.title.trim())
            .map((o) => ({ title: o.title.trim(), criteria: o.criteria.trim() })),
        });
        const r = await tdrApi.assistDeliverables(state.tdrId!);
        setProposal(r.proposal);
        return { groundedOn: r.groundedOn };
      }}
      renderProposal={() => (
        <ul className={styles.assistList}>
          {proposal.map((d) => (
            <li key={d.title}>
              <strong>{d.title}</strong>
              <span>
                {[d.format, d.deadline].filter(Boolean).join(" · ")}
              </span>
            </li>
          ))}
        </ul>
      )}
      onAccept={() => set({ ...state, deliverables: [...state.deliverables, ...proposal] })}
      idleLabel="Proposer des livrables"
      againLabel="Proposer d’autres livrables"
      busyLabel="Lecture des objectifs…"
      acceptLabel={
        state.deliverables.length > 0 ? "Ajouter à la liste" : "Reprendre ces livrables"
      }
    />
  );
}

function OutcomesStep({ state, set }: { state: State; set: (s: State) => void }) {
  return (
    <div className={styles.stack}>
      <ObjectivesAssist state={state} set={set} />
      <p className={styles.hint}>
        Spécifique · Mesurable · Atteignable · Réaliste · Temporel. Chaque objectif s’accompagne
        d’un critère qui permettra d’en constater l’atteinte.
      </p>
      <ListEditor
        title="Objectifs SMART"
        prefix="O"
        items={state.objectives}
        onAdd={() => set({ ...state, objectives: [...state.objectives, { title: "", criteria: "" }] })}
        onRemove={(i) => set({ ...state, objectives: state.objectives.filter((_, x) => x !== i) })}
        render={(o, i) => (
          <>
            <Input
              value={o.title}
              onChange={(e) => {
                const next = [...state.objectives];
                next[i] = { ...o, title: e.target.value };
                set({ ...state, objectives: next });
              }}
              placeholder="Énoncé de l’objectif — verbe d’action à l’infinitif"
            />
            <Input
              value={o.criteria}
              onChange={(e) => {
                const next = [...state.objectives];
                next[i] = { ...o, criteria: e.target.value };
                set({ ...state, objectives: next });
              }}
              placeholder="Critère de succès mesurable — grandeur et horizon"
            />
          </>
        )}
      />

      {/* Les resultats attendus disent ce qu'on constatera, et quand. Un
          objectif dit l'intention ; ce n'est pas la meme chose, et le
          cadre de resultats du projet se nourrit de ceux-ci. Le parcours
          partenaire les separait ; la fusion avait retenu la version du
          MDA, qui les confondait. */}
      <Field
        label="Résultats attendus"
        helper="Ce qui sera constaté, avec son horizon — à 6 mois, un an, en fin de mission. Un par ligne. Ces éléments alimentent le cadre de résultats du projet."
      >
        <Textarea
          rows={4}
          value={state.expectedResults}
          onChange={(e) => set({ ...state, expectedResults: e.target.value })}
          placeholder={`R1 · Architecture cible documentée et validée par le COPIL (M+2)
R2 · Dossier d'appel d'offres publié sans demande de clarification (M+4)
R3 · 95 % des agents formés certifiés (M+6)`}
        />
      </Field>

      <DeliverablesAssist state={state} set={set} />
      <ListEditor
        title="Livrables"
        prefix="L"
        items={state.deliverables}
        onAdd={() =>
          set({ ...state, deliverables: [...state.deliverables, { title: "", format: "", deadline: "" }] })
        }
        onRemove={(i) => set({ ...state, deliverables: state.deliverables.filter((_, x) => x !== i) })}
        render={(d, i) => (
          <>
            <Input
              value={d.title}
              onChange={(e) => {
                const next = [...state.deliverables];
                next[i] = { ...d, title: e.target.value };
                set({ ...state, deliverables: next });
              }}
              placeholder="Livrable"
            />
            <Input
              value={d.format}
              onChange={(e) => {
                const next = [...state.deliverables];
                next[i] = { ...d, format: e.target.value };
                set({ ...state, deliverables: next });
              }}
              placeholder="Format"
            />
            <Input
              value={d.deadline}
              onChange={(e) => {
                const next = [...state.deliverables];
                next[i] = { ...d, deadline: e.target.value };
                set({ ...state, deliverables: next });
              }}
              placeholder={DEADLINE_CONVENTION.placeholder}
            />
          </>
        )}
      />
      <p className={styles.hint}>{DEADLINE_CONVENTION.helper}</p>

      {/* Modalités valant pour tout le marché, et non livrable par livrable.
          Le wizard partenaire les portait ; celui du MDA les avait omises,
          et la fusion avait retenu la version la plus pauvre. */}
      <div className={styles.row2}>
        <Field
          label="Format de remise"
          helper="Forme sous laquelle les pièces sont remises et validées."
        >
          <Select
            value={state.deliverableFormat}
            onChange={(e) => set({ ...state, deliverableFormat: e.target.value })}
            placeholder="Sélectionner le format"
            options={DELIVERABLE_FORMATS}
          />
        </Field>
        <Field
          label="Rythme de reporting"
          helper="Fréquence des points d’avancement avec l’UGP."
        >
          <Select
            value={state.reportingRhythm}
            onChange={(e) => set({ ...state, reportingRhythm: e.target.value })}
            placeholder="Sélectionner le rythme"
            options={REPORTING_RHYTHMS}
          />
        </Field>
      </div>
    </div>
  );
}

/**
 * Les trois bibliothèques, sur une seule étape.
 *
 * Reprend la disposition du parcours MDA : trois onglets, un geste unique
 * — cocher ce qui s'applique. Le texte retenu est copié dans le TDR, jamais
 * référencé : une évolution ultérieure de la bibliothèque ne doit pas
 * réécrire un document déjà transmis.
 */
function FrameworkStep({
  state, set, library,
}: {
  state: State;
  set: (s: State) => void;
  library: { clauses: ClauseApi[]; indicators: IndicatorApi[]; risks: RiskApi[] };
}) {
  const [onglet, setOnglet] = useState<"clauses" | "indicateurs" | "risques">("clauses");

  return (
    <div className={styles.stack}>
      <Segmented
        ariaLabel="Catégorie du cadre"
        value={onglet}
        onChange={(v) => setOnglet(v as typeof onglet)}
        options={[
          { value: "clauses", label: `Clauses (${state.clauses.length})` },
          { value: "indicateurs", label: `Indicateurs (${state.indicators.length})` },
          { value: "risques", label: `Risques (${state.risks.length})` },
        ]}
      />

      {onglet === "clauses" && (
        <PickerStep
          title="Clauses de la bibliothèque"
          hint="Le texte retenu est copié dans votre TDR : une évolution ultérieure de la bibliothèque ne le modifiera pas."
          available={library.clauses}
          selected={state.clauses}
          onToggle={(c) =>
            set({
              ...state,
              clauses: state.clauses.some((x) => x.id === c.id)
                ? state.clauses.filter((x) => x.id !== c.id)
                : [...state.clauses, c],
            })
          }
          renderBody={(c) => c.text}
          renderTag={(c) => c.category}
        />
      )}

      {onglet === "indicateurs" && (
        <PickerStep
          title="Indicateurs"
          hint="Ils alimentent le cadre de résultats du projet."
          available={library.indicators}
          selected={state.indicators}
          onToggle={(i) =>
            set({
              ...state,
              indicators: state.indicators.some((x) => x.id === i.id)
                ? state.indicators.filter((x) => x.id !== i.id)
                : [...state.indicators, i],
            })
          }
          renderBody={(i) => `${i.measure} — cible ${i.target}`}
        />
      )}

      {onglet === "risques" && (
        <PickerStep
          title="Risques et atténuation"
          available={library.risks}
          selected={state.risks}
          onToggle={(r) =>
            set({
              ...state,
              risks: state.risks.some((x) => x.id === r.id)
                ? state.risks.filter((x) => x.id !== r.id)
                : [...state.risks, r],
            })
          }
          renderBody={(r) => `${r.description} — atténuation : ${r.mitigation}`}
          renderTag={(r) => r.level.toLowerCase()}
        />
      )}
    </div>
  );
}

function ListEditor<T>({
  title, items, onAdd, onRemove, render, prefix,
}: {
  title: string;
  items: T[];
  onAdd: () => void;
  onRemove: (i: number) => void;
  render: (item: T, i: number) => React.ReactNode;
  /**
   * Lettre de reperage — « O » pour les objectifs, « L » pour les
   * livrables. Les deux anciens parcours numerotaient ainsi, et le
   * document produit s'y referait : une clause qui conditionne un
   * decaissement a un livrable intermediaire suppose qu'on puisse le
   * designer. La position existait deja en base, rien ne l'affichait.
   */
  prefix?: string;
}) {
  return (
    <div>
      <div className={styles.listHead}>
        <h3 className={styles.sectionTitle}>{title}</h3>
        <button type="button" className={styles.btnGhost} onClick={onAdd}>
          <Add size={14} aria-hidden /> Ajouter
        </button>
      </div>
      {items.length === 0 ? (
        <p className={styles.hint}>Aucun élément pour l’instant.</p>
      ) : (
        <ul className={styles.editorList}>
          {items.map((item, i) => (
            <li key={i}>
              {prefix && (
                <span className={styles.editorRank} aria-hidden>
                  {prefix}
                  {i + 1}
                </span>
              )}
              <div className={styles.editorFields}>{render(item, i)}</div>
              <button type="button" className={styles.remove} onClick={() => onRemove(i)} aria-label="Retirer">
                <TrashCan size={14} aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function BudgetStep({
  state, set, activity, type,
}: {
  state: State;
  set: (s: State) => void;
  activity?: PtbaActivityApi;
  type?: TdrTypeApi;
}) {
  const [method, setMethod] = useState<{ code: string; review: string } | null>(null);
  const total = Number(state.budgetTotalUsd);

  // La catégorie vient du référentiel, comme côté serveur. Elle était figée
  // ici sur SERVICES_CONSULTANTS : un TDR de travaux à 20 M USD annonçait
  // SFQC quand la transmission figeait AOI, et les types opérationnels — qui
  // ne relèvent d'aucune méthode — s'en voyaient attribuer une.
  const category = type?.procurementCategory ?? null;

  useEffect(() => {
    if (!total || total <= 0 || !category) {
      setMethod(null);
      return;
    }
    tdrReferentielApi
      .resolveMethod(category, total)
      .then((r) => setMethod(r ? { code: r.method.code, review: r.reviewType } : null))
      .catch(() => setMethod(null));
  }, [total, category]);

  return (
    <div className={styles.stack}>
      {activity && (
        <Note tone="info" title={`Enveloppe de l’activité ${activity.code}`}>
          {(Number(activity.envelopeUsd) / 1e6).toFixed(2)} M USD. Le budget du TDR ne peut
          l’excéder.
        </Note>
      )}

      <Field label="Budget total (USD)" required>
        <Input
          type="number"
          min={0}
          value={state.budgetTotalUsd}
          onChange={(e) => set({ ...state, budgetTotalUsd: e.target.value })}
        />
      </Field>

      {method && (
        <div className={styles.derived}>
          Méthode déduite : <strong>{method.code}</strong> · revue{" "}
          <strong>{method.review === "PRIOR" ? "préalable" : "postérieure"}</strong>
          <span className={styles.hint}>
            Indicative. La méthode retenue est arrêtée à la transmission, depuis les seuils
            alors en vigueur et le montant alors saisi.
          </span>
        </div>
      )}

      <h3 className={styles.sectionTitle}>Ventilation par source</h3>
      <p className={styles.hint}>
        Facultative, mais si elle est renseignée le total doit correspondre. IDA et AFD ne se
        consolident jamais sans distinction.
      </p>
      <div className={styles.row3}>
        <Field label="Part IDA (USD)">
          <Input type="number" min={0} value={state.budgetIdaUsd} onChange={(e) => set({ ...state, budgetIdaUsd: e.target.value })} />
        </Field>
        <Field label="Part AFD (USD)">
          <Input type="number" min={0} value={state.budgetAfdUsd} onChange={(e) => set({ ...state, budgetAfdUsd: e.target.value })} />
        </Field>
        <Field label="Part Gouvernement (USD)">
          <Input type="number" min={0} value={state.budgetGovUsd} onChange={(e) => set({ ...state, budgetGovUsd: e.target.value })} />
        </Field>
      </div>
    </div>
  );
}

function PickerStep<T extends LibraryEntry>({
  title, hint, available, selected, onToggle, renderBody, renderTag,
}: {
  title: string;
  hint?: string;
  available: T[];
  selected: T[];
  onToggle: (item: T) => void;
  renderBody: (item: T) => string;
  renderTag?: (item: T) => string;
}) {
  return (
    <div>
      <h3 className={styles.sectionTitle}>{title}</h3>
      {hint && <p className={styles.hint}>{hint}</p>}
      {available.length === 0 ? (
        <p className={styles.hint}>Aucun élément disponible pour ce type.</p>
      ) : (
        <ul className={styles.picker}>
          {available.map((item) => {
            const on = selected.some((x) => x.id === item.id);
            return (
              <li key={item.id}>
                <button
                  type="button"
                  className={`${styles.pickerItem} ${on ? styles.pickerItemOn : ""}`}
                  onClick={() => onToggle(item)}
                  aria-pressed={on}
                >
                  <span className={styles.pickerCheck}>
                    {on && <CheckmarkFilled size={14} aria-hidden />}
                  </span>
                  <span className={styles.pickerBody}>
                    <span className={styles.pickerLabel}>
                      {item.label}
                      {renderTag && <span className={styles.pickerTag}>{renderTag(item)}</span>}
                      <span className={`${styles.pickerVersion} ptn-mono`}>v{item.version}</span>
                    </span>
                    <span className={styles.pickerText}>{renderBody(item)}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function ReviewStep({
  state, set, persist,
}: {
  state: State;
  set: (s: State) => void;
  persist: (s: State, patch: Record<string, unknown>) => Promise<void>;
}) {
  const [warnings, setWarnings] = useState<string[]>([]);

  // Le contrôle est fait par le serveur : les règles ne sont pas dupliquées
  // ici, où elles dériveraient.
  useEffect(() => {
    if (!state.tdrId) return;
    tdrApi
      .completeness(state.tdrId)
      .then((r) => {
        setWarnings(r.warnings);
        if (JSON.stringify(r.blockers) !== JSON.stringify(state.blockers)) {
          set({ ...state, blockers: r.blockers });
        }
      })
      .catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.tdrId, state.consentMep, state.consentRgpd]);

  // On transmet l'intention, pas l'horodatage : c'est le serveur qui date
  // l'attestation. Une date issue du navigateur se règle depuis l'horloge
  // du poste, et un engagement de conformité ne s'antidate pas.
  const toggleConsent = async (field: "consentMep" | "consentRgpd", value: boolean) => {
    set({ ...state, [field]: value });
    await persist(state, { [field]: value });
  };

  return (
    <div className={styles.stack}>
      {state.blockers.length === 0 ? (
        <Note tone="info" title="Dossier complet">
          Tous les éléments obligatoires sont renseignés.
        </Note>
      ) : (
        state.blockers.map((b) => (
          <Note key={b} tone="danger" title="Élément manquant">
            {b}
          </Note>
        ))
      )}

      {warnings.map((w) => (
        <Note key={w} tone="warning" title="À vérifier">
          {w}
        </Note>
      ))}

      <h3 className={styles.sectionTitle}>Engagements</h3>
      <label className={styles.consent}>
        <input
          type="checkbox"
          checked={state.consentMep}
          onChange={(e) => void toggleConsent("consentMep", e.target.checked)}
        />
        Je certifie que ce TDR est conforme au Manuel d’Exécution du Projet et aux règles de
        passation applicables.
      </label>
      <label className={styles.consent}>
        <input
          type="checkbox"
          checked={state.consentRgpd}
          onChange={(e) => void toggleConsent("consentRgpd", e.target.checked)}
        />
        Je m’engage sur la protection des données personnelles traitées dans le cadre de cette
        activité.
      </label>

      <Note tone="info" title="Ce qui se passe à la transmission">
        La méthode de passation et le type de revue sont figés depuis les seuils en vigueur
        aujourd’hui, et un instantané complet du document est conservé — c’est lui qui permettra de
        reconstituer ce qui a été transmis.
      </Note>
    </div>
  );
}
