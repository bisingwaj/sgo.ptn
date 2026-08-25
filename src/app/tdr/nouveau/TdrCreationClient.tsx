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
import { Modal } from "@carbon/react";
import { Wizard, useNavigationParcours, type WizardStep } from "@/components/wizard/Wizard";
import { CheckRow, Note, Segmented, Select } from "@/components/wizard/WizardFields";
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
  type PlanDocumentApi,
  type PtbaActivityApi,
  type ComponentApi,
  type OrganisationApi,
  type ProvinceApi,
  type RiskApi,
  type TdrApi,
  type TdrEnvelopeApi,
  type TdrTypeApi,
} from "@/lib/api";
import { enregistrerFichier } from "@/lib/telechargement";
import {
  CheckmarkFilled,
  // « Document » est aussi un type global du navigateur : sans alias, il
  // l'emporte et TypeScript refuse la balise.
  Document as IconeDocument,
  Locked,
  TrashCan,
  WarningAltFilled,
} from "@carbon/icons-react";
import { EtapeType } from "./etapes/EtapeType";
import { EtapeBudget } from "./etapes/EtapeBudget";
import { EtapeCalendrier } from "./etapes/EtapeCalendrier";
import { EtapeExpertise } from "./etapes/EtapeExpertise";
import { EtapeObjectifs } from "./etapes/EtapeObjectifs";
import { EtapeLivrables } from "./etapes/EtapeLivrables";
import { EtapeTexte } from "./etapes/EtapeTexte";
import { CHAMPS_TEXTE, LIBELLES_ETAPE } from "./etapes/champs-texte";
import { EtapeRattachement } from "./etapes/EtapeRattachement";
import { EtapeIdentification } from "./etapes/EtapeIdentification";
import {
  INITIAL,
  aujourdhui,
  fillTemplate,
  isClause,
  isIndicator,
  isRisk,
  type State,
} from "./etat";
import {
  ES_LEVELS,
  ES_RISK_CATALOG,
  PROFIL_KEYS,
  freeRisks,
} from "./referentiel-ecran";
import { formatUsd } from "@/lib/format";
import { AgentPanel } from "./AgentPanel";
import { AjoutLibre } from "@/components/wizard/AjoutLibre";
import { AssistantProvider, useAssistant, type Ecriture } from "./assistant-contexte";
import styles from "./tdr-creation.module.scss";

/**
 * Reconstitue l'état du parcours depuis un dossier enregistré.
 *
 * La reprise d'un brouillon n'existait pas : le parcours repartait toujours
 * de zéro, et un dossier interrompu était perdu de vue. Les champs simples
 * se recopient ; les trois bibliothèques demandent un raccord.
 *
 * Une clause enregistrée est une COPIE du texte, pas une référence — c'est
 * voulu, une évolution de la bibliothèque ne doit pas réécrire un document.
 * Pour rendre la sélection au sélecteur, on la rapproche de son entrée
 * d'origine par `sourceFamilyKey`. Quand la famille a été archivée depuis,
 * le rapprochement échoue : on fabrique alors une entrée de substitution à
 * partir du texte conservé, faute de quoi l'enregistrement suivant — qui
 * remplace la collection en bloc — effacerait la clause en silence.
 */
function hydrate(
  tdr: TdrApi,
  bib: { clauses: ClauseApi[]; indicators: IndicatorApi[]; risks: RiskApi[] },
): State {
  const socle = <T extends { familyKey: string }>(familyKey: string | null | undefined, i: number) =>
    ({
      id: `conserve:${familyKey ?? i}`,
      familyKey: familyKey ?? `conserve-${i}`,
      version: 0,
      tdrTypeCode: tdr.tdrTypeCode,
      status: "PUBLIE" as const,
      effectiveFrom: null,
      supersededAt: null,
      createdAt: "",
    }) as unknown as T;

  const clauses: ClauseApi[] = tdr.clauses.map((c, i) => {
    const source = bib.clauses.find((x) => x.familyKey === c.sourceFamilyKey);
    return source ?? { ...socle<ClauseApi>(c.sourceFamilyKey, i), label: c.label, text: c.text, category: c.category };
  });
  const indicators: IndicatorApi[] = tdr.indicators.map((n, i) => {
    const source = bib.indicators.find((x) => x.familyKey === n.sourceFamilyKey);
    return source ?? { ...socle<IndicatorApi>(n.sourceFamilyKey, i), label: n.label, measure: n.measure, target: n.target };
  });
  const risks: RiskApi[] = tdr.risks.map((r, i) => {
    const source = bib.risks.find((x) => x.familyKey === r.sourceFamilyKey);
    return source ?? {
      ...socle<RiskApi>(r.sourceFamilyKey, i),
      label: r.label, description: r.description, mitigation: r.mitigation, level: r.level,
    };
  });

  return {
    ...INITIAL,
    tdrId: tdr.id,
    reference: tdr.reference,
    tdrTypeCode: tdr.tdrTypeCode,
    ptbaActivityId: tdr.ptbaActivityId ?? "",
    // À la reprise, un dossier sans ligne au plan EST un dossier hors plan :
    // le drapeau se déduit, il n'a pas à être enregistré. Sans cela, la
    // reprise rouvrirait l'étape 02 en refus, sur un choix déjà fait.
    sansRattachement: !tdr.ptbaActivityId,
    componentFilter: tdr.ptbaActivity?.componentCode ?? "",
    beneficiaryOrganisationId: tdr.beneficiaryOrganisationId ?? "",
    title: tdr.title,
    // Un intitulé déjà enregistré est celui de l'auteur : la composition
    // automatique ne doit pas le reprendre en main.
    titleTouched: true,

    context: tdr.context ?? "",
    justification: tdr.justification ?? "",
    beneficiaries: tdr.beneficiaries ?? "",

    objectives: tdr.objectives.map((o) => ({ title: o.title, criteria: o.criteria })),
    deliverables: tdr.deliverables.map((d) => ({
      title: d.title, format: d.format ?? "", deadline: d.deadline ?? "",
    })),
    expectedResults: tdr.expectedResults ?? "",
    deliverableFormat: tdr.deliverableFormat ?? "",
    reportingRhythm: tdr.reportingRhythm ?? "",

    approach: tdr.approach ?? "",
    methodology: tdr.methodology ?? "",
    constraints: tdr.constraints ?? "",

    startDate: tdr.startDate ? tdr.startDate.slice(0, 10) : "",
    durationMonths: tdr.durationMonths ? String(tdr.durationMonths) : "",
    provinceCodes: tdr.provinces.map((c) => c.provinceCode),
    expertise: tdr.expertise ?? "",
    effortDays: tdr.effortDays ? String(tdr.effortDays) : "",
    keyProfiles: tdr.keyProfiles ?? [],

    budgetTotalUsd: tdr.budgetTotalUsd ?? "",
    budgetIdaUsd: tdr.budgetIdaUsd ?? "",
    budgetAfdUsd: tdr.budgetAfdUsd ?? "",
    budgetGovUsd: tdr.budgetGovUsd ?? "",

    clauses, indicators, risks,

    esCategory: tdr.esCategory ?? "",
    esRisks: tdr.esRisks ?? [],
    aiAssistedFields: tdr.aiAssistedFields ?? [],
  };
}




function Parcours() {
  const router = useRouter();
  const params = useSearchParams();
  const { user, loading: authLoading, can } = useAuth();
  // L'ouverture du panneau appartient à l'assistant, plus au parcours : elle
  // se commande depuis la barre d'outils du champ où l'on écrit.
  const { ouvert: assistantOuvert } = useAssistant();

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

  // Reprise d'un brouillon : `?id=` désigne le dossier à rouvrir. Tant que
  // l'hydratation n'a pas abouti, le parcours n'est pas monté — le Wizard
  // fige son état initial au montage, et l'ouvrir vide puis le remplir
  // ferait clignoter un formulaire neuf par-dessus un dossier existant.
  const draftId = params.get("id");
  const [resume, setResume] = useState<State | null>(null);
  const [resuming, setResuming] = useState(Boolean(draftId));
  const [resumeError, setResumeError] = useState<string | null>(null);

  // L'assistant est replié par défaut : il s'ouvre quand on l'appelle, et
  // suit ensuite d'étape en étape.
  const [etatCourant, setEtatCourant] = useState<State | null>(null);
  const [etapeCourante, setEtapeCourante] = useState('');

  /**
   * Situation de l'enveloppe de la ligne du plan.
   *
   * Tenue ici plutôt que dans l'étape de budget : le contrôle de passage à
   * l'étape suivante en a besoin autant que l'écran. Deux lectures — une
   * pour montrer, une pour refuser — auraient fini par se contredire, et
   * l'auteur aurait vu un disponible que le bouton ne reconnaissait pas.
   */
  const [enveloppe, setEnveloppe] = useState<{
    tdrId: string;
    activityId: string;
    data: TdrEnvelopeApi | null;
  } | null>(null);
  /**
   * Ce que l'assistant vient d'écrire, poussé dans le formulaire.
   *
   * On relit la base plutôt que de recopier ce que l'agent annonce : le
   * service normalise, tronque et refuse, et c'est sa version qui fait foi.
   * Recopier l'annonce ferait diverger l'écran et le dossier.
   */
  const [patch, setPatch] = useState<{ nonce: number; fn: (s: State) => State } | undefined>();

  const alignerSurLaBase = useCallback(async (tdrId: string) => {
    const t = await tdrApi.get(tdrId);
    setPatch({
      nonce: Date.now(),
      fn: (s) => ({
        ...s,
        context: t.context ?? "",
        justification: t.justification ?? "",
        beneficiaries: t.beneficiaries ?? "",
        expectedResults: t.expectedResults ?? "",
        approach: t.approach ?? "",
        methodology: t.methodology ?? "",
        constraints: t.constraints ?? "",
        expertise: t.expertise ?? "",
        objectives: t.objectives.map((o) => ({ title: o.title, criteria: o.criteria })),
        deliverables: t.deliverables.map((d) => ({
          title: d.title, format: d.format ?? "", deadline: d.deadline ?? "",
        })),
        aiAssistedFields: t.aiAssistedFields ?? [],
      }),
    });
  }, []);

  useEffect(() => {
    if (authLoading || !user) return;
    Promise.all([
      tdrReferentielApi.types(),
      exerciceOuvert().then((annee) => ptbaApi.activities(annee)),
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
    const bib = {
      clauses: c.filter(isClause),
      indicators: [...i, ...ti].filter(isIndicator),
      risks: [...r, ...tr].filter(isRisk),
    };
    setLibrary(bib);
    // Rendue autant que posée : la reprise d'un brouillon a besoin de la
    // bibliothèque avant d'hydrater, pour rapprocher les copies conservées
    // de leur entrée d'origine.
    return bib;
  }, []);

  useEffect(() => {
    if (!draftId || authLoading || !user) return;
    let annule = false;
    (async () => {
      try {
        const tdr = await tdrApi.get(draftId);
        if (!['BROUILLON', 'RETOURNE'].includes(tdr.status)) {
          throw new Error(
            `${tdr.reference} n’est plus en rédaction : un dossier transmis se consulte, il faut qu’il soit retourné pour être repris.`,
          );
        }
        const bib = await loadLibrary(tdr.tdrTypeCode);
        if (annule) return;
        setResume(hydrate(tdr, bib));
      } catch (e) {
        if (!annule) setResumeError(e instanceof Error ? e.message : "Reprise impossible.");
      } finally {
        if (!annule) setResuming(false);
      }
    })();
    return () => {
      annule = true;
    };
  }, [draftId, authLoading, user, loadLibrary]);

  const selectedType = useMemo(
    () => types.find((t) => t.code === INITIAL.tdrTypeCode) ?? null,
    [types],
  );

  /**
   * Lecture de la situation de l'enveloppe.
   *
   * Refaite quand le dossier ou la ligne rattachée change — pas au fil de la
   * frappe : le cumul porte sur les AUTRES dossiers, que la saisie en cours
   * ne déplace pas.
   *
   * La lecture est estampillée du couple qui l'a produite plutôt que doublée
   * d'un drapeau « en cours ». Rien à remettre à zéro, donc rien à écrire
   * dans l'effet, et surtout aucune fenêtre où le disponible d'une ligne
   * s'afficherait sous une autre.
   */
  const tdrIdCourant = etatCourant?.tdrId ?? null;

  /**
   * Se défaire du brouillon en cours.
   *
   * « Annuler et quitter » n'annule rien : le dossier reste au registre.
   * C'est le bon comportement pour qui reviendra le finir, et le mauvais
   * pour qui vient d'en ouvrir un par erreur — d'où les brouillons qui
   * s'accumulent sans que personne n'ait voulu les garder. La sortie
   * définitive se prend donc au même endroit que la sortie provisoire.
   *
   * Sans identifiant, rien n'a encore été écrit : il n'y a rien à
   * supprimer, et le bouton ne s'affiche pas.
   */
  const [abandonDemande, setAbandonDemande] = useState(false);
  const [abandonEnCours, setAbandonEnCours] = useState(false);
  const [abandonRefus, setAbandonRefus] = useState<string | null>(null);

  const abandonner = async () => {
    if (!tdrIdCourant) return;
    setAbandonEnCours(true);
    setAbandonRefus(null);
    try {
      await tdrApi.remove(tdrIdCourant);
      router.push("/tdr");
    } catch (e) {
      setAbandonRefus(e instanceof Error ? e.message : "Suppression impossible.");
      setAbandonEnCours(false);
    }
  };
  const activiteCourante = etatCourant?.ptbaActivityId ?? "";

  useEffect(() => {
    if (!tdrIdCourant || !activiteCourante) return;
    let annule = false;
    const marque = { tdrId: tdrIdCourant, activityId: activiteCourante };
    tdrApi
      .envelope(tdrIdCourant)
      .then((data) => {
        if (!annule) setEnveloppe({ ...marque, data });
      })
      .catch(() => {
        // L'échec ne bloque pas la saisie : le contrôle final reste tenu par
        // le serveur à la transmission. L'écran le dit, il ne l'invente pas.
        if (!annule) setEnveloppe({ ...marque, data: null });
      });
    return () => {
      annule = true;
    };
  }, [tdrIdCourant, activiteCourante]);

  const enveloppeAJour =
    enveloppe && enveloppe.tdrId === tdrIdCourant && enveloppe.activityId === activiteCourante
      ? enveloppe.data
      : null;
  const enveloppeEnCours =
    Boolean(tdrIdCourant && activiteCourante) &&
    (!enveloppe ||
      enveloppe.tdrId !== tdrIdCourant ||
      enveloppe.activityId !== activiteCourante);

  /** Enregistrement au fil de l'eau : chaque étape écrit ce qu'elle porte. */
  const persist = useCallback(async (s: State, patch: Record<string, unknown>) => {
    if (!s.tdrId) return;
    await tdrApi.update(s.tdrId, patch);
  }, []);

  const steps = useMemo<WizardStep<State>[]>(() => {
    const typeOf = (s: State) => types.find((t) => t.code === s.tdrTypeCode);

    return [
      // ===== 01 · Type d'activité =====
      //
      // Choisir la nature du marché et le rattacher au plan sont deux gestes
      // distincts : l'un regarde onze tuiles, l'autre remplit quatre champs.
      // Les tenir sur un même écran obligeait à faire défiler entre les deux.
      {
        num: "01",
        label: "Type d’activité",
        sub: "La nature du marché commande le parcours et les bibliothèques",
        validate: (s) => (s.tdrTypeCode ? null : "Sélectionnez un type d’activité."),
        render: (s, set) => <EtapeType state={s} set={set} types={types} activities={activities} />,
      },

      // ===== 02 · Rattachement au plan =====
      //
      // Un seul choix ici. La composante n'est plus demandée : elle se déduit
      // de l'activité, et la réclamer à part ouvrait la possibilité d'une
      // divergence entre les deux.
      {
        num: "02",
        label: "Rattachement",
        sub: "La ligne du plan annuel dont ce marché relève",
        validate: (s) =>
          s.ptbaActivityId || s.sansRattachement
            ? null
            : "Rattachez une activité PTBA, ou cochez que ce dossier n’en relève pas.",
        render: (s, set) => (
          <EtapeRattachement
            state={s}
            set={set}
            types={types}
            activities={activities}
            components={components}
          />
        ),
      },

      // ===== 03 · Identification =====
      //
      // C'est ici que le brouillon naît, et non à l'étape précédente : sa
      // création exige le type, l'activité ET l'intitulé, or l'intitulé se
      // compose de ce qui précède et ne peut donc pas être demandé plus tôt.
      {
        num: "03",
        label: "Identification",
        sub: "L’intitulé du marché et la maîtrise d’ouvrage bénéficiaire",
        validate: (s) => (s.title.trim().length < 5 ? "Renseignez un intitulé." : null),
        commit: async (s) => {
          if (s.tdrId) {
            await persist(s, {
              title: s.title,
              // NULL, ET NON CHAÎNE VIDE. L'écran garde `""` pour dire
              // « rien de retenu » — c'est ce qu'un champ de formulaire
              // porte — mais le serveur attend un UUID ou rien. La chaîne
              // vide échouait à la validation : un dossier déclaré hors
              // plan ne passait pas l'étape suivante.
              ptbaActivityId: s.ptbaActivityId || null,
              beneficiaryOrganisationId: s.beneficiaryOrganisationId || null,
            });
            return;
          }
          const draft = await tdrApi.createDraft({
            tdrTypeCode: s.tdrTypeCode,
            title: s.title.trim(),
            ...(s.ptbaActivityId ? { ptbaActivityId: s.ptbaActivityId } : {}),
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
          <EtapeIdentification
            state={s}
            set={set}
            types={types}
            activities={activities}
            organisations={organisations}
          />
        ),
      },

      // ===== 04 à 07 · Les sections rédigées du cadrage =====
      //
      // Un champ, un écran. Les trois tenaient sur une même page, empilés
      // avec deux panneaux d'assistance intercalés : on y répondait à trois
      // questions distinctes en faisant défiler entre elles, et les textes
      // finissaient par se répéter faute de voir ce qu'on avait déjà écrit
      // ailleurs. Chacun porte maintenant sa question, ses repères et son
      // assistance.
      ...(["context", "justification", "beneficiaries", "expectedResults"] as const).map(
        (cle, i) => ({
          num: `0${4 + i}`,
          label: LIBELLES_ETAPE[cle].label,
          sub: LIBELLES_ETAPE[cle].sub,
          validate: (s: State) =>
            cle === "context" && s.context.trim().length < 30
              ? "Le contexte doit être rédigé."
              : null,
          commit: (s: State) =>
            persist(s, {
              [cle]: s[cle] || null,
              // Marque de contribution : le serveur en fait l'union, elle ne
              // se retire jamais.
              aiAssisted: s.aiAssistedFields,
            }),
          render: (s: State, set: (v: State) => void) => (
            <EtapeTexte
              champ={CHAMPS_TEXTE[cle]}
              state={s}
              set={set}
              gabarit={
                cle === "context" && typeOf(s)?.contextTemplate
                  ? fillTemplate(
                      typeOf(s)!.contextTemplate!,
                      activities.find((a) => a.id === s.ptbaActivityId),
                    )
                  : undefined
              }
            />
          ),
        }),
      ),

      // ===== 03 · Objectifs et livrables =====
      // ===== 08 · Objectifs SMART =====
      //
      // Séparés des livrables : un objectif dit une intention, un livrable
      // dit une pièce à remettre. Les poser ensemble faisait écrire l'un en
      // pensant à l'autre. Les résultats attendus, eux, avaient déjà leur
      // écran depuis la refonte du cadrage — ils étaient restés ici en
      // double, et l'auteur les rencontrait deux fois sans savoir laquelle
      // des deux comptait.
      {
        num: "08",
        label: "Objectifs SMART",
        sub: "Ce que le marché doit permettre d’atteindre",
        validate: (s) => (s.objectives.length === 0 ? "Définissez au moins un objectif." : null),
        commit: (s) => persist(s, { objectives: s.objectives, aiAssisted: s.aiAssistedFields }),
        render: (s, set) => <EtapeObjectifs state={s} set={set} />,
      },

      // ===== 09 · Livrables =====
      {
        num: "09",
        label: "Livrables",
        sub: "Ce que le prestataire remet, et sous quelle forme",
        validate: (s) => (s.deliverables.length === 0 ? "Définissez au moins un livrable." : null),
        commit: (s) =>
          persist(s, {
            deliverables: s.deliverables,
            deliverableFormat: s.deliverableFormat || null,
            reportingRhythm: s.reportingRhythm || null,
            aiAssisted: s.aiAssistedFields,
          }),
        render: (s, set) => <EtapeLivrables state={s} set={set} />,
      },

      // ===== 10 à 12 · L'exécution attendue =====
      //
      // Trois questions qui n'en font pas une : par quelle voie, par quelles
      // étapes, sous quelles limites. Empilées, la première se vidait dans
      // la deuxième, et la troisième restait vide.
      ...(["approach", "methodology", "constraints"] as const).map((cle, i) => ({
        num: `${10 + i}`,
        label: LIBELLES_ETAPE[cle].label,
        sub: LIBELLES_ETAPE[cle].sub,
        commit: (s: State) => persist(s, { [cle]: s[cle] || null, aiAssisted: s.aiAssistedFields }),
        render: (s: State, set: (v: State) => void) => (
          <EtapeTexte champ={CHAMPS_TEXTE[cle]} state={s} set={set} />
        ),
      })),

      // ===== 13 · Calendrier et couverture =====
      //
      // Deux étapes là où il n'y en avait qu'une. « Calendrier & expertise »
      // demandait d'un même souffle quand, où et par qui : sept saisies de
      // trois natures, dont une rédaction longue prise entre deux compteurs.
      // Rien ne s'y écrivait par assistance, alors que le champ d'expertise
      // avait sa consigne au serveur depuis le début.
      {
        num: "13",
        label: "Calendrier & couverture",
        sub: "Période d’exécution et provinces couvertes",
        commit: (s) =>
          persist(s, {
            startDate: s.startDate || null,
            durationMonths: s.durationMonths ? Number(s.durationMonths) : null,
            effortDays: s.effortDays ? Number(s.effortDays) : null,
            provinceCodes: s.provinceCodes,
          }),
        render: (s, set) => <EtapeCalendrier state={s} set={set} provinces={provinces} />,
      },

      // ===== 14 · Expertise =====
      //
      // Le huitième champ rédigé du dossier, et le dernier à recevoir son
      // écran. Les profils-clés l'accompagnent : ils désignent les postes
      // que la notation des offres évaluera, quand le texte dit ce que
      // chacun doit démontrer.
      {
        num: "14",
        label: LIBELLES_ETAPE.expertise.label,
        sub: LIBELLES_ETAPE.expertise.sub,
        commit: (s) =>
          persist(s, {
            expertise: s.expertise,
            keyProfiles: s.keyProfiles,
            aiAssisted: s.aiAssistedFields,
          }),
        render: (s, set) => <EtapeExpertise state={s} set={set} />,
      },

      // ===== 15 · Budget =====
      {
        num: "15",
        label: "Budget",
        sub: "Enveloppe et ventilation par source de financement",
        validate: (s) => {
          const total = Number(s.budgetTotalUsd);
          if (!total || total <= 0) return "Renseignez le budget.";
          // Le plafond opposable n'est pas l'enveloppe, c'est ce qu'il en
          // reste : d'autres dossiers l'entament déjà. Refuser sur
          // l'enveloppe seule laissait passer un montant que la
          // transmission rejetait cinq étapes plus loin.
          if (enveloppeAJour && total > enveloppeAJour.remainingUsd) {
            return `Il ne reste que ${formatUsd(enveloppeAJour.remainingUsd)} sur l’activité ${enveloppeAJour.activityCode} — ce dossier en demande ${formatUsd(total)}.`;
          }
          const activity = activities.find((a) => a.id === s.ptbaActivityId);
          if (!enveloppeAJour && activity && total > Number(activity.envelopeUsd)) {
            return `Le budget dépasse l’enveloppe de l’activité ${activity.code} (${formatUsd(Number(activity.envelopeUsd))}).`;
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
          <EtapeBudget
            state={s}
            set={set}
            activity={activities.find((a) => a.id === s.ptbaActivityId)}
            type={typeOf(s)}
            enveloppe={enveloppeAJour}
            enveloppeEnCours={enveloppeEnCours}
          />
        ),
      },

      // ===== 16 · Cadre et risques =====
      //
      // Le parcours MDA d'origine tenait les trois bibliothèques sur une
      // seule étape, répartie en onglets — « Clauses, indicateurs et risques
      // pré-cadrés ». La refonte en avait fait deux étapes ; c'était une
      // marche de plus pour un même geste, répété trois fois.
      {
        num: "16",
        label: "Cadre & risques",
        sub: "Clauses, indicateurs et risques pré-cadrés pour ce type",
        commit: (s) =>
          persist(s, {
            // `familyKey` vide = entrée écrite à la main : elle part sans
            // origine, et se reconstruira comme telle à la reprise.
            clauses: s.clauses.map((c) => ({
              sourceFamilyKey: c.familyKey || null,
              sourceVersion: c.version,
              category: c.category,
              label: c.label,
              text: c.text,
            })),
            indicators: s.indicators.map((i) => ({
              sourceFamilyKey: i.familyKey || null, label: i.label, measure: i.measure, target: i.target,
            })),
            risks: s.risks.map((r) => ({
              sourceFamilyKey: r.familyKey || null, label: r.label, description: r.description,
              mitigation: r.mitigation, level: r.level,
            })),
          }),
        render: (s, set) => <FrameworkStep state={s} set={set} library={library} />,
      },

      // ===== 17 · Sauvegardes E&S =====
      {
        num: "17",
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
              <Select
                label="Catégorie de risque E&S"
                required={t?.requiresPges}
                value={s.esCategory}
                onChange={(v) => set({ ...s, esCategory: v })}
                placeholder="À déterminer par le screening"
                options={ES_LEVELS}
              />
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

              {/* L'intitulé disait « Autres risques propres à ce dossier »,
                  sans dire de quels risques. Or le parcours en porte deux
                  familles : les risques du MARCHÉ, pré-cadrés par type à
                  l'étape 16, et les risques ENVIRONNEMENTAUX ET SOCIAUX, ici.
                  Un retard de livraison se déclarait donc à l'étape 17, où il
                  finissait au chapitre des sauvegardes du document produit. */}
              {/* UNE LISTE, ET NON PLUS UNE ZONE DE TEXTE.
                  « Un par ligne » laissait passer les lignes vides, les
                  doublons et les demi-saisies — le compteur les comptait.
                  Chaque risque libre est désormais une entrée, cochée comme
                  celles du catalogue et retirable d'un clic. */}
              <div>
                <h3 className={styles.sectionTitle}>
                  Autres risques environnementaux ou sociaux propres à ce dossier
                </h3>
                <p className={styles.hint}>
                  Seulement ce que le catalogue du CGES ne couvre pas. Les risques d’exécution
                  du marché — délais, dépendances, capacité du titulaire — relèvent de l’étape
                  « Cadre &amp; risques ».
                </p>
                {freeRisks(s.esRisks).length > 0 && (
                  <div className={styles.checkStack}>
                    {freeRisks(s.esRisks).map((r) => (
                      <CheckRow
                        key={r}
                        checked
                        onChange={() =>
                          set({ ...s, esRisks: s.esRisks.filter((x) => x !== r) })
                        }
                        title={r}
                        description="Risque propre à ce dossier"
                      />
                    ))}
                  </div>
                )}
                <div className="mt-3">
                  <AjoutLibre
                    quoi="un risque E&S"
                    placeholder="Ex. Perturbation d’un site cultuel riverain"
                    aide="Ce que le catalogue du CGES ne couvre pas."
                    refuser={(t) =>
                      s.esRisks.some((x) => x.toLowerCase() === t.toLowerCase())
                        ? "Ce risque figure déjà."
                        : ES_RISK_CATALOG.some((r) => r.title.toLowerCase() === t.toLowerCase())
                          ? "Ce risque est au catalogue du CGES : cochez-le ci-dessus."
                          : null
                    }
                    onAjouter={(t) => set({ ...s, esRisks: [...s.esRisks, t] })}
                  />
                </div>
              </div>
            </div>
          );
        },
      },

      // ===== 18 · Revue et soumission =====
      {
        num: "18",
        label: "Revue & transmission",
        sub: "Contrôle de complétude et engagements",
        // Ce qui manque se voit à l'écran : les manques sont listés au-dessus,
        // les deux engagements sont juste là. Laisser le bouton actif faisait
        // découvrir au clic ce qui était déjà affiché — et pour un geste
        // irréversible, un dossier transmis cessant d'être modifiable, c'est
        // l'inverse de ce qu'il faut.
        bloquePar: (s) => {
          if (s.blockers.length > 0) {
            return `${s.blockers.length} élément${s.blockers.length > 1 ? "s" : ""} obligatoire${s.blockers.length > 1 ? "s" : ""} manque${s.blockers.length > 1 ? "nt" : ""} — voir ci-dessus.`;
          }
          const restants = [!s.consentMep, !s.consentRgpd].filter(Boolean).length;
          if (restants > 0) {
            return `Confirmez ${restants === 2 ? "les deux engagements" : "le dernier engagement"} pour transmettre.`;
          }
          return null;
        },
        render: (s, set) => (
          <ReviewStep
            state={s}
            set={set}
            persist={persist}
            types={types}
            activities={activities}
            provinces={provinces}
          />
        ),
      },
    ];
    // `enveloppeAJour` doit figurer ici : sans elle, l'étape de budget garde
    // la situation du premier rendu — c'est-à-dire aucune — et le contrôle de
    // passage se ferait sur un disponible qui n'arrive jamais.
    //
    // `components` et `organisations` y entrent au passage. Ils tenaient par
    // accident : ils arrivent dans le même `Promise.all` que `types`, dont le
    // changement recalculait le mémo. Une lecture séparée les aurait figés.
  }, [
    types,
    activities,
    provinces,
    components,
    organisations,
    library,
    enveloppeAJour,
    enveloppeEnCours,
    persist,
    loadLibrary,
  ]);

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

  if (resuming) return <div className={styles.gate}>Ouverture du brouillon…</div>;

  if (resumeError) {
    return (
      <div className={styles.gate}>
        <WarningAltFilled size={32} aria-hidden />
        <h1>Brouillon non repris</h1>
        <p>{resumeError}</p>
        <Link href="/tdr" className={styles.gateLink}>Retour au registre</Link>
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
        <span className={styles.eyebrow}>DOSSIER TRANSMIS À L’INSTRUCTION</span>
        <h1>{submitted.reference}</h1>
        <p>{submitted.title}</p>
        {/* Ce que la transmission a CHANGÉ, dit en clair : c'est ce que
            l'auteur vient d'engager, et il n'y a plus de retour sans un
            renvoi de l'UGP. Le mot « transmis » seul laissait croire à un
            simple envoi de fichier. */}
        <p className={styles.successNote}>
          Le dossier quitte votre brouillon et rejoint la file d’instruction de l’UGP. Il n’est
          plus modifiable tant qu’il ne vous est pas retourné.
        </p>
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
        {/* Les deux suites d'un dépôt, et rien d'autre : relire ce qu'on
            vient de transmettre, ou revenir au registre pour la suite.
            Le tableau de bord n'est ni l'un ni l'autre — on y arrivait sans
            son dossier, et sans savoir où le retrouver. */}
        <div className={styles.successActions}>
          <Link href={`/tdr/${submitted.id}`} className="demoBtnPrimary">
            Voir le dossier {submitted.reference}
          </Link>
          <Link href="/tdr" className="demoBtnSecondary">
            Retour au registre des TDR
          </Link>
        </div>
      </div>
    );
  }

  const preselected = params.get("type") ?? "";


  return (
    <>
    <Wizard<State>
      eyebrow="RÉDACTION · TERMES DE RÉFÉRENCE"
      title={resume ? `Reprise de ${resume.reference}` : "Nouveau TDR"}
      subtitle={`Vous rédigez au titre de ${user.organisationName} · ${user.subroleLabel}`}
      steps={steps}
      reprendre={Boolean(resume)}
      initialState={
        resume ?? {
          ...INITIAL,
          tdrTypeCode: preselected,
          // Le filtre part de la composante de l'utilisateur quand son
          // habilitation en designe une — RC1, RC2, RC3. Les autres profils
          // n'en portent pas, et voient alors tout le plan.
          componentFilter: user.componentCode ?? "",
          // Ancre du calendrier. Un sélecteur de date vide oblige à ouvrir
          // l'almanach pour la seule chose qu'on sait déjà : où l'on est.
          //
          // Nouveau dossier seulement. À la reprise d'un brouillon, un champ
          // resté vide l'est resté délibérément — le remplir à l'ouverture
          // inscrirait la date de la reprise dans un dossier que personne
          // n'a daté, et le prochain enregistrement la figerait.
          startDate: aujourdhui(),
        }
      }
      cancelHref="/tdr"
      cancelExtra={
        tdrIdCourant ? (
          <button
            type="button"
            className={styles.lienAbandon}
            onClick={() => setAbandonDemande(true)}
          >
            <TrashCan size={14} aria-hidden />
            Supprimer ce brouillon
          </button>
        ) : null
      }
      finishLabel="Transmettre le dossier à l’instruction"
      asideOpen={assistantOuvert}
      aside={
        <AgentPanel
          tdrId={etatCourant?.tdrId ?? null}
          etapeCourante={etapeCourante}
          onEcriture={() => {
            const id = etatCourant?.tdrId;
            if (id) void alignerSurLaBase(id);
          }}
          onAnnuler={async (e) => {
            const id = etatCourant?.tdrId;
            if (!id) return;
            // La valeur précédente revient telle quelle. La marque, elle,
            // reste : l'assistant a bien contribué à ce champ, et un
            // relecteur doit continuer de le savoir.
            await tdrApi.update(id, { [e.champ]: e.avant });
            await alignerSurLaBase(id);
          }}
        />
      }
      patch={patch}
      onDraftChange={(s, etape) => {
        setEtatCourant(s);
        setEtapeCourante(steps[etape]?.label ?? "");
      }}
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

    {/* ---------- Abandon du brouillon ---------- */}
    <Modal
      open={abandonDemande}
      danger
      modalHeading="Supprimer définitivement ce brouillon ?"
      modalLabel={etatCourant?.reference}
      primaryButtonText={abandonEnCours ? "Suppression…" : "Supprimer le brouillon"}
      secondaryButtonText="Continuer la rédaction"
      primaryButtonDisabled={abandonEnCours}
      onRequestClose={() => {
        setAbandonDemande(false);
        setAbandonRefus(null);
      }}
      onRequestSubmit={() => void abandonner()}
    >
      <p className="text-body text-secondary mb-4">
        Tout ce que porte ce dossier — objectifs, livrables, clauses, pièces versées —
        est perdu. Il n’y a pas de corbeille.
      </p>
      <p className="text-body text-secondary">
        La référence <span className="ptn-mono">{etatCourant?.reference}</span> reste
        consommée : une séquence ne se rembobine pas. La suppression est inscrite au
        journal d’audit.
      </p>
      {abandonRefus && (
        <p className="text-body mt-4" style={{ color: "var(--cds-text-error)" }} role="alert">
          {abandonRefus}
        </p>
      )}
    </Modal>
    </>
  );
}

// ============================================================

/**
 * Les trois bibliothèques, sur une seule étape.
 *
 * Reprend la disposition du parcours MDA : trois onglets, un geste unique
 * — cocher ce qui s'applique. Le texte retenu est copié dans le TDR, jamais
 * référencé : une évolution ultérieure de la bibliothèque ne doit pas
 * réécrire un document déjà transmis.
 */
/**
 * Squelette d'une entrée écrite à la main.
 *
 * `familyKey` VIDE, à dessein : c'est ce qui la distingue d'une entrée de
 * bibliothèque au moment d'enregistrer, où elle part avec une origine
 * nulle. À la reprise du brouillon, l'hydratation reconnaît cette absence
 * et reconstruit une entrée de substitution à partir du texte conservé —
 * le chemin existait déjà pour les familles archivées depuis.
 *
 * `version: 0` suit la même convention : une entrée qui ne vient de nulle
 * part n'a pas de version publiée.
 */
function socleLibre(intitule: string, tdrTypeCode: string) {
  return {
    // Horodaté : deux entrées libres du même intitulé restent distinctes,
    // et l'identifiant ne sert qu'à la sélection côté écran.
    id: `libre:${intitule.toLowerCase()}`,
    familyKey: "",
    version: 0,
    tdrTypeCode,
    status: "PUBLIE" as const,
    effectiveFrom: null,
    supersededAt: null,
    // Vide, comme le socle de reprise : une entrée qui ne vient pas de la
    // bibliothèque n'y a pas de date de publication, et en inventer une la
    // ferait passer pour une entrée du référentiel.
    createdAt: "",
    label: intitule,
  };
}

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
          quoiLibre="une clause"
          onAjouterLibre={(intitule) =>
            set({
              ...state,
              clauses: [
                ...state.clauses,
                { ...socleLibre(intitule, state.tdrTypeCode), category: "REG", text: intitule },
              ],
            })
          }
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
          quoiLibre="un indicateur"
          onAjouterLibre={(intitule) =>
            set({
              ...state,
              indicators: [
                ...state.indicators,
                // Mesure et cible restent à préciser : les inventer ici
                // fabriquerait une donnée que personne n'a arrêtée.
                { ...socleLibre(intitule, state.tdrTypeCode), measure: "À préciser", target: "À préciser" },
              ],
            })
          }
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
          quoiLibre="un risque"
          onAjouterLibre={(intitule) =>
            set({
              ...state,
              risks: [
                ...state.risks,
                {
                  ...socleLibre(intitule, state.tdrTypeCode),
                  description: intitule,
                  // Niveau MODERE par défaut, et non ÉLEVÉ ni FAIBLE : un
                  // niveau tranché d'office serait une appréciation que
                  // personne n'a portée. Il se corrige à l'étape suivante.
                  mitigation: "À préciser",
                  level: "MODERE" as const,
                },
              ],
            })
          }
        />
      )}
    </div>
  );
}

function PickerStep<T extends LibraryEntry>({
  title, hint, available, selected, onToggle, renderBody, renderTag, quoiLibre, onAjouterLibre,
}: {
  title: string;
  hint?: string;
  available: T[];
  selected: T[];
  onToggle: (item: T) => void;
  renderBody: (item: T) => string;
  renderTag?: (item: T) => string;
  /** Ce que l'on ajoute, au singulier — « une clause », « un risque ». */
  quoiLibre?: string;
  /** L'appelant fabrique l'entrée : lui seul connaît la forme de sa liste. */
  onAjouterLibre?: (intitule: string) => void;
}) {
  /**
   * Les entrées retenues qui ne viennent PAS de la bibliothèque.
   *
   * Elles n'apparaissent pas dans `available` — la bibliothèque ne les
   * connaît pas — et se perdraient donc à l'affichage alors qu'elles sont
   * bien au dossier. Rendues à la suite, avec la même case et le même
   * geste de retrait.
   */
  const libres = selected.filter((x) => !available.some((a) => a.id === x.id));

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
                    {on && <CheckmarkFilled size={20} aria-hidden />}
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

      {libres.length > 0 && (
        <ul className={styles.picker}>
          {libres.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                className={`${styles.pickerItem} ${styles.pickerItemOn}`}
                onClick={() => onToggle(item)}
                aria-pressed
              >
                <span className={styles.pickerCheck}>
                  <CheckmarkFilled size={20} aria-hidden />
                </span>
                <span className={styles.pickerBody}>
                  <span className={styles.pickerLabel}>
                    {item.label}
                    <span className={styles.pickerTag}>propre à ce dossier</span>
                  </span>
                  <span className={styles.pickerText}>{renderBody(item)}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {onAjouterLibre && quoiLibre && (
        <div className="mt-3">
          <AjoutLibre
            quoi={quoiLibre}
            aide="Ce que la bibliothèque du type ne couvre pas."
            refuser={(t) =>
              selected.some((x) => x.label.toLowerCase() === t.toLowerCase())
                ? "Cet intitulé figure déjà parmi les entrées retenues."
                : null
            }
            onAjouter={onAjouterLibre}
          />
        </div>
      )}
    </div>
  );
}

/**
 * Récapitulatif du dossier.
 *
 * Chaque bloc renvoie à l'étape qui le porte : relire sans pouvoir corriger
 * n'aurait qu'un demi-intérêt. Les champs vides sont montrés comme vides,
 * et non masqués — c'est justement ce qu'il faut voir avant de transmettre.
 */
function Recap({
  state, types, activities, provinces,
}: {
  state: State;
  types: TdrTypeApi[];
  activities: PtbaActivityApi[];
  provinces: ProvinceApi[];
}) {
  const type = types.find((t) => t.code === state.tdrTypeCode);
  const activity = activities.find((a) => a.id === state.ptbaActivityId);
  const couverture = state.provinceCodes
    .map((c) => provinces.find((p) => p.code === c)?.label ?? c)
    .join(', ');
  const usd = (v: string) => (v ? `${(Number(v) / 1e6).toFixed(2)} M USD` : "—");
  const vide = (v: string) => (v.trim() ? v : null);
  // Le récapitulatif se relit, et souvent s'imprime : une date y est rendue
  // en toutes lettres, pas dans la forme de transport du champ.
  const dateFr = (iso: string) => {
    if (!iso) return "—";
    const d = new Date(`${iso}T00:00:00`);
    return Number.isNaN(d.getTime())
      ? iso
      : d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
  };

  return (
    <div className={styles.recap}>
      <RecapBloc titre="Type & rattachement" etape="01–03">
        <RecapLigne cle="Type" val={type ? `${type.code} · ${type.name}` : "—"} />
        <RecapLigne cle="Intitulé du marché" val={state.title || "—"} />
        <RecapLigne
          cle="Activité PTBA"
          val={activity ? `${activity.code} · ${activity.title}` : "—"}
        />
        <RecapLigne
          cle="Enveloppe de l’activité"
          val={activity ? usd(activity.envelopeUsd) : "—"}
        />
      </RecapBloc>

      <RecapBloc titre="Cadrage" etape="04–06">
        <RecapTexte cle="Contexte" val={vide(state.context)} />
        <RecapTexte cle="Justification" val={vide(state.justification)} />
        <RecapTexte cle="Bénéficiaires visés" val={vide(state.beneficiaries)} />
      </RecapBloc>

      <RecapBloc titre="Objectifs & livrables" etape="07–09">
        <RecapListe
          cle="Objectifs SMART"
          items={state.objectives.filter((o) => o.title.trim()).map(
            (o, i) => `O${i + 1} · ${o.title}${o.criteria ? ` — ${o.criteria}` : ""}`,
          )}
        />
        <RecapTexte cle="Résultats attendus" val={vide(state.expectedResults)} />
        <RecapListe
          cle="Livrables"
          items={state.deliverables.filter((d) => d.title.trim()).map(
            (d, i) =>
              `L${i + 1} · ${d.title}${d.format ? ` — ${d.format}` : ""}${d.deadline ? ` · ${d.deadline}` : ""}`,
          )}
        />
      </RecapBloc>

      <RecapBloc titre="Méthodologie" etape="10–12">
        <RecapTexte cle="Approche" val={vide(state.approach)} />
        <RecapTexte cle="Méthodes et outils" val={vide(state.methodology)} />
        <RecapTexte cle="Contraintes" val={vide(state.constraints)} />
      </RecapBloc>

      <RecapBloc titre="Calendrier & couverture" etape="13">
        <RecapLigne cle="Démarrage souhaité" val={dateFr(state.startDate)} />
        <RecapLigne
          cle="Durée"
          val={state.durationMonths ? `${state.durationMonths} mois` : "—"}
        />
        <RecapLigne
          cle="Volume d’effort"
          val={state.effortDays ? `${state.effortDays} jours-homme` : "—"}
        />
        <RecapLigne cle="Couverture" val={couverture || "Nationale"} />
      </RecapBloc>

      {/* L'expertise rédigée ne figurait nulle part au récapitulatif : le
          relecteur validait un dossier sans avoir sous les yeux le texte
          qui fonde les critères de notation des offres. */}
      <RecapBloc titre="Expertise" etape="14">
        <RecapTexte cle="Expertise requise" val={vide(state.expertise)} />
        <RecapListe
          cle="Profils-clés"
          items={state.keyProfiles.map(
            (id) => PROFIL_KEYS.find((p) => p.id === id)?.label ?? id,
          )}
        />
      </RecapBloc>

      <RecapBloc titre="Budget" etape="15">
        <RecapLigne cle="Budget total" val={usd(state.budgetTotalUsd)} />
        <RecapLigne cle="Part IDA" val={usd(state.budgetIdaUsd)} />
        <RecapLigne cle="Part AFD" val={usd(state.budgetAfdUsd)} />
        <RecapLigne cle="Part Gouvernement" val={usd(state.budgetGovUsd)} />
      </RecapBloc>

      <RecapBloc titre="Cadre & risques" etape="16">
        <RecapListe cle="Clauses retenues" items={state.clauses.map((c) => c.label)} />
        <RecapListe cle="Indicateurs" items={state.indicators.map((i) => i.label)} />
        <RecapListe cle="Risques" items={state.risks.map((r) => r.label)} />
      </RecapBloc>

      <RecapBloc titre="Sauvegardes E&S" etape="17">
        <RecapLigne
          cle="Catégorie de risque"
          val={ES_LEVELS.find((l) => l.value === state.esCategory)?.label ?? "—"}
        />
        <RecapListe
          cle="Risques identifiés"
          items={state.esRisks.map(
            (id) => ES_RISK_CATALOG.find((r) => r.id === id)?.title ?? id,
          )}
        />
      </RecapBloc>
    </div>
  );
}

function RecapBloc({
  titre, etape, children,
}: {
  titre: string;
  etape: string;
  children: React.ReactNode;
}) {
  return (
    <section className={styles.recapBloc}>
      <header className={styles.recapHead}>
        <span className={`${styles.recapEtape} ptn-mono`}>{etape}</span>
        <h4>{titre}</h4>
      </header>
      <dl className={styles.recapListe}>{children}</dl>
    </section>
  );
}

function RecapLigne({ cle, val }: { cle: string; val: string }) {
  return (
    <div className={styles.recapRow}>
      <dt>{cle}</dt>
      <dd>{val}</dd>
    </div>
  );
}

function RecapTexte({ cle, val }: { cle: string; val: string | null }) {
  return (
    <div className={styles.recapRow}>
      <dt>{cle}</dt>
      <dd className={val ? styles.recapProse : styles.recapAbsent}>
        {val ?? "Non renseigné"}
      </dd>
    </div>
  );
}

function RecapListe({ cle, items }: { cle: string; items: string[] }) {
  return (
    <div className={styles.recapRow}>
      <dt>{cle}</dt>
      <dd>
        {items.length === 0 ? (
          <span className={styles.recapAbsent}>Aucun</span>
        ) : (
          <ul className={styles.recapItems}>
            {items.map((t, i) => (
              <li key={`${t}-${i}`}>{t}</li>
            ))}
          </ul>
        )}
      </dd>
    </div>
  );
}

/**
 * Le document final, avant transmission.
 *
 * Ce n'est pas le récapitulatif : celui-ci montre les champs saisis, celui-là
 * montre la pièce composée — sections numérotées, page de garde, logo. C'est
 * elle qui part à l'UGP, et c'est sur elle que l'auteur signe ses deux
 * attestations.
 *
 * Il montre donc le TEXTE, et pas seulement le plan. Une liste de titres de
 * sections ferait signer une attestation de conformité sur un sommaire : ce
 * que l'auteur atteste doit être sous ses yeux au moment où il le fait.
 *
 * Rien n'y est rédigé par une machine. Chaque valeur vient du dossier, mot
 * pour mot — une réécriture à la composition porterait sur un texte qu'il
 * n'aurait pas relu.
 */
function DocumentFinal({ tdrId }: { tdrId: string | null }) {
  const [plan, setPlan] = useState<PlanDocumentApi | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [occupe, setOccupe] = useState<"pdf" | "docx" | null>(null);
  const [deplie, setDeplie] = useState(false);

  useEffect(() => {
    if (!tdrId) return;
    tdrApi
      .planDocument(tdrId)
      .then(setPlan)
      .catch((e) => setErreur(e instanceof Error ? e.message : "Aperçu indisponible."));
  }, [tdrId]);

  const recuperer = async (format: "pdf" | "docx") => {
    if (!tdrId || !plan) return;
    setOccupe(format);
    setErreur(null);
    try {
      enregistrerFichier(await tdrApi.fichierDocument(tdrId, format), `${plan.reference}.${format}`);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Téléchargement impossible.");
    } finally {
      setOccupe(null);
    }
  };

  if (!tdrId) return <p className={styles.hint}>Le brouillon n’est pas encore ouvert.</p>;
  if (erreur && !plan)
    return (
      <Note tone="danger" title="Document indisponible">
        {erreur}
      </Note>
    );
  if (!plan) return <p className={styles.hint}>Composition du document…</p>;

  const manquantes = plan.sections.filter((section) =>
    section.blocs.every((bloc) => bloc.genre === "absent"),
  ).length;

  return (
    <div className={styles.document}>
      <div className={styles.documentTete}>
        <div>
          <span className={`${styles.documentRef} ptn-mono`}>{plan.reference}</span>
          <p className={styles.documentTitre}>{plan.titre}</p>
          <p className={styles.hint}>
            {plan.sections.length} sections · composé le {plan.dateComposition}
            {manquantes > 0 &&
              ` · ${manquantes} section${manquantes > 1 ? "s" : ""} sans contenu`}
          </p>
        </div>
        {/* GÉNÉRER LE DOCUMENT est une action à part entière, distincte de
            la transmission — et elle ne change RIEN au dossier. « PDF » et
            « DOCX » seuls ne disaient pas qu'on obtenait le TDR composé :
            on les prenait pour un réglage d'affichage, et l'on croyait le
            document accessible seulement après avoir transmis. */}
        <div className={styles.documentActions}>
          <button
            type="button"
            className={styles.btnSecondary}
            onClick={() => void recuperer("pdf")}
            disabled={occupe !== null}
          >
            <IconeDocument size={14} aria-hidden />
            {occupe === "pdf" ? "Composition…" : "Générer le TDR (PDF)"}
          </button>
          <button
            type="button"
            className={styles.btnGhost}
            onClick={() => void recuperer("docx")}
            disabled={occupe !== null}
          >
            <IconeDocument size={14} aria-hidden />
            {occupe === "docx" ? "Composition…" : "Version modifiable (DOCX)"}
          </button>
        </div>
      </div>

      {erreur && (
        <Note tone="danger" title="Téléchargement impossible">
          {erreur}
        </Note>
      )}

      {/* Replié par défaut : l'étape porte déjà le récapitulatif, et deux
          lectures complètes l'une sous l'autre décourageraient la seule qui
          compte. Mais elle est là, et à un clic. */}
      <button
        type="button"
        className={styles.documentBascule}
        onClick={() => setDeplie((d) => !d)}
        aria-expanded={deplie}
      >
        {deplie ? "Masquer le texte du document" : "Lire le document tel qu’il sera transmis"}
      </button>

      <ol className={styles.documentPlan}>
        {plan.sections.map((s) => {
          const vide = s.blocs.every((b) => b.genre === "absent");
          return (
            <li key={s.numero} className={vide ? styles.documentVide : undefined}>
              <p className={styles.documentSection}>
                <span className="ptn-mono">{s.numero}</span>
                <span>{s.titre}</span>
                {vide && <em>non renseignée</em>}
              </p>

              {deplie &&
                s.blocs.map((b, i) => {
                  // Nomme une partie dans la section : sans lui, l'approche,
                  // la méthodologie et les contraintes se lisaient d'affilée
                  // sans que rien ne les sépare.
                  if (b.genre === "sousTitre")
                    return (
                      <p key={i} className={styles.documentSousTitre}>
                        {b.texte}
                      </p>
                    );
                  if (b.genre === "absent")
                    return (
                      <p key={i} className={styles.documentAbsent}>
                        {b.mention}
                      </p>
                    );
                  if (b.genre === "paragraphe")
                    return (
                      <p key={i} className={styles.documentProse}>
                        {b.texte}
                      </p>
                    );
                  if (b.genre === "liste")
                    return (
                      <ul key={i} className={styles.documentListe}>
                        {b.entrees.map((e, j) => (
                          <li key={j}>{e}</li>
                        ))}
                      </ul>
                    );
                  return (
                    <dl key={i} className={styles.documentDefinitions}>
                      {b.lignes.map((l, j) => (
                        <div key={j}>
                          <dt>{l.cle}</dt>
                          <dd>{l.valeur}</dd>
                        </div>
                      ))}
                    </dl>
                  );
                })}
            </li>
          );
        })}
      </ol>

    </div>
  );
}

/**
 * Où se corrige chaque manque.
 *
 * POURQUOI UNE TABLE, ET NON UN CHAMP DE PLUS DANS LA RÉPONSE. Le contrôle
 * de complétude rend des phrases ; `submit` s'appuie sur la même forme pour
 * refuser une transmission incomplète. En changer la structure pour le
 * confort d'un écran toucherait un contrat que deux appels partagent.
 *
 * Le rapprochement se fait donc ici, sur un fragment stable de chaque
 * message. Un libellé qui changerait côté serveur ferait DISPARAÎTRE le
 * lien, jamais casser l'écran : le manque reste écrit, il perd seulement
 * son raccourci. C'est le compromis assumé.
 */
const ORIENTATIONS: Array<{ motif: RegExp; num: string; etape: string }> = [
  { motif: /activité PTBA|ligne du PTBA/i, num: "02", etape: "Rattachement" },
  { motif: /contexte/i, num: "04", etape: "Contexte" },
  { motif: /bénéficiaire/i, num: "06", etape: "Bénéficiaires" },
  { motif: /objectif/i, num: "08", etape: "Objectifs SMART" },
  { motif: /livrable/i, num: "09", etape: "Livrables" },
  { motif: /méthodologie/i, num: "11", etape: "Méthodologie" },
  { motif: /budget|enveloppe/i, num: "15", etape: "Budget" },
  { motif: /catégorie E&S|screening|PGES/i, num: "17", etape: "Sauvegardes E&S" },
];

/** Le manque, et l'étape où il se comble — ou rien, si l'on ne sait pas. */
function orienter(message: string) {
  return ORIENTATIONS.find((o) => o.motif.test(message)) ?? null;
}

/**
 * Un manque, avec la porte qui le corrige.
 *
 * Le message disait ce qui manquait sans dire où le réparer : sur dix-huit
 * étapes, « le contexte n'est pas rédigé » laisse chercher. Le bouton porte
 * le RANG et le NOM de l'étape — les deux, car le rail affiche les deux, et
 * l'on retrouve mieux ce qu'on a déjà vu.
 */
function Manque({ message, ton }: { message: string; ton: "danger" | "warning" }) {
  const { allerAEtape } = useNavigationParcours();
  const cible = orienter(message);

  return (
    <Note tone={ton} title={ton === "danger" ? "Élément manquant" : "À vérifier"}>
      {message}
      {cible && (
        <>
          {" "}
          <button
            type="button"
            className={styles.lienNote}
            onClick={() => allerAEtape(cible.num)}
          >
            Corriger à l’étape {cible.num} · {cible.etape}
          </button>
        </>
      )}
    </Note>
  );
}

function ReviewStep({
  state, set, persist, types, activities, provinces,
}: {
  state: State;
  set: (s: State) => void;
  persist: (s: State, patch: Record<string, unknown>) => Promise<void>;
  types: TdrTypeApi[];
  activities: PtbaActivityApi[];
  provinces: ProvinceApi[];
}) {
  const [warnings, setWarnings] = useState<string[]>([]);

  /**
   * Relit le contrôle de complétude et range le verdict dans l'état.
   *
   * L'ÉTAT SUR LEQUEL ÉCRIRE EST PASSÉ EN ARGUMENT, jamais capturé.
   *
   * Cette fonction était mémorisée sur `state.tdrId`, avec la règle des
   * dépendances désactivée : elle retenait donc l'état du rendu où elle
   * avait été créée — celui d'AVANT toute case cochée. Cocher un
   * engagement enregistrait bien la case au serveur, puis cet appel
   * réécrivait par-dessus l'instantané périmé : `consentMep` et
   * `consentRgpd` revenaient à faux dans la foulée.
   *
   * À l'écran, la case se cochait et se décochait aussitôt. LES DEUX
   * ENGAGEMENTS ÉTAIENT DONC IMPOSSIBLES À DONNER, et la transmission
   * définitivement bloquée sur « les engagements ne sont pas confirmés ».
   *
   * Le contrôle lui-même reste au serveur : les règles ne sont pas
   * dupliquées ici, où elles dériveraient.
   */
  const relireCompletude = async (base: State) => {
    if (!base.tdrId) return;
    try {
      const r = await tdrApi.completeness(base.tdrId);
      setWarnings(r.warnings);
      if (JSON.stringify(r.blockers) !== JSON.stringify(base.blockers)) {
        set({ ...base, blockers: r.blockers });
      }
    } catch {
      // Un contrôle indisponible ne doit pas effacer le dernier connu.
    }
  };

  // À l'ouverture de l'étape seulement. Le contrôle qui suit une case cochée
  // est déclenché par `toggleConsent`, APRÈS l'enregistrement — voir ci-dessous.
  //
  // L'appel est enveloppé dans une closure asynchrone : rendre la fonction
  // directement à l'effet ferait poser un état dans son corps, ce qui
  // déclenche un rendu en cascade et que le dépôt interdit.
  useEffect(() => {
    void (async () => {
      await relireCompletude(state);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.tdrId]);

  /**
   * Coche un engagement.
   *
   * L'ORDRE EST LE POINT. Le contrôle de complétude se déclenchait sur le
   * changement d'état, donc AVANT que l'enregistrement n'ait abouti : il
   * interrogeait un serveur qui n'avait pas encore la case, rendait le
   * blocage « les engagements ne sont pas confirmés », et plus rien ne le
   * relisait ensuite. La case restait cochée à l'écran, le message restait
   * affiché, et la transmission demeurait impossible.
   *
   * On enregistre d'abord, on relit ensuite. La case bascule tout de suite
   * pour que le geste réponde, mais le verdict attend l'écriture.
   *
   * On transmet l'intention, pas l'horodatage : c'est le serveur qui date
   * l'attestation. Une date issue du navigateur se règle depuis l'horloge
   * du poste, et un engagement de conformité ne s'antidate pas.
   */
  const toggleConsent = async (field: "consentMep" | "consentRgpd", value: boolean) => {
    // L'état suivant est calculé une fois et suivi partout : l'affichage,
    // l'enregistrement et la relecture doivent parler du même dossier.
    // `state` ne change pas dans cette closure — s'y référer après `set`
    // fait écrire un état périmé.
    const suivant = { ...state, [field]: value };
    set(suivant);
    await persist(suivant, { [field]: value });
    await relireCompletude(suivant);
  };

  return (
    <div className={styles.stack}>
      {state.blockers.length === 0 ? (
        <Note tone="info" title="Dossier complet">
          Tous les éléments obligatoires sont renseignés.
        </Note>
      ) : (
        state.blockers.map((b) => <Manque key={b} message={b} ton="danger" />)
      )}

      {warnings.map((w) => (
        <Manque key={w} message={w} ton="warning" />
      ))}

      {/* Relecture avant transmission. Un TDR transmis passe en SOUMIS_UGP
          et cesse d'être modifiable ; c'est ici, et nulle part ailleurs, que
          l'auteur peut encore reprendre le dossier entier. L'étape n'en
          montrait rien. */}
      <h3 className={styles.sectionTitle}>Le dossier avant transmission</h3>
      <p className={styles.hint}>
        Dernière relecture. Une fois transmis, le document n’est plus modifiable : il faut
        qu’il vous soit retourné.
      </p>
      <Recap state={state} types={types} activities={activities} provinces={provinces} />

      {/* Le document qui partira réellement. Le récapitulatif ci-dessus montre
          les champs ; celui-ci montre la pièce composée, page de garde et
          numérotation comprises — et c'est sur elle que portent les deux
          attestations ci-dessous. */}
      <h3 className={styles.sectionTitle}>Le document transmis</h3>
      <DocumentFinal tdrId={state.tdrId} />

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

/**
 * Le fournisseur enveloppe le parcours entier.
 *
 * Le fil de l'assistant doit survivre au changement d'étape : une
 * proposition faite au contexte se relit depuis l'écran des livrables.
 */
/**
 * L'exercice budgétaire à proposer : le plus récent qui n'est pas clos.
 *
 * L'horloge du poste servait de référence. Elle a le défaut de changer
 * seule : au 1er janvier, elle désigne un exercice que le COPIL n'a pas
 * encore ouvert, le serveur répond « Aucun exercice PTBA 2027 », et le
 * chargement du parcours ÉCHOUE EN ENTIER — pas seulement le rattachement
 * au plan. La rédaction de TDR s'arrêtait donc d'elle-même à une date
 * connue d'avance, sur un message qui n'en disait pas la cause.
 *
 * L'exercice ouvert est une donnée du serveur, pas une déduction de date.
 */
async function exerciceOuvert(): Promise<number> {
  const exercices = await ptbaApi.years();
  const ouvert = [...exercices]
    .sort((a, b) => b.year - a.year)
    .find((e) => e.status !== "CLOS");
  // Aucun exercice du tout : on retombe sur l'année civile, dont le refus
  // sera intercepté comme n'importe quelle indisponibilité.
  return (ouvert ?? exercices[0])?.year ?? new Date().getFullYear();
}

export function TdrCreationClient() {
  return (
    <AssistantProvider>
      <Parcours />
    </AssistantProvider>
  );
}
