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
import { Field, Input, Textarea, Select, Note, CheckRow, Segmented } from "@/components/wizard/WizardFields";
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
  CheckmarkFilled,
  Locked,
  WarningAltFilled,
} from "@carbon/icons-react";
import { EtapeType } from "./etapes/EtapeType";
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
  CATALOG_IDS,
  ES_LEVELS,
  ES_RISK_CATALOG,
  PROFIL_KEYS,
  freeRisks,
} from "./referentiel-ecran";
import { AgentPanel } from "./AgentPanel";
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
          s.ptbaActivityId
            ? null
            : "Rattachez une activité PTBA : sans ligne au plan, il n’y a pas d’enveloppe.",
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

      // ===== 18 · Revue et soumission =====
      {
        num: "18",
        label: "Revue & transmission",
        sub: "Contrôle de complétude et engagements",
        validate: (s) => {
          if (!s.consentMep || !s.consentRgpd) return "Confirmez les deux engagements.";
          if (s.blockers.length > 0) return "Des éléments obligatoires manquent.";
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
      title={resume ? `Reprise de ${resume.reference}` : "Nouveau TDR"}
      subtitle={`Vous rédigez au titre de ${user.organisationName} · ${user.subroleLabel}`}
      steps={steps}
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
      finishLabel="Transmettre à l’UGP"
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
export function TdrCreationClient() {
  return (
    <AssistantProvider>
      <Parcours />
    </AssistantProvider>
  );
}
