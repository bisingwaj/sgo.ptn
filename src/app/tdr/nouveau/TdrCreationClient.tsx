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
import { Field, Input, Textarea, Select, Note, SelectableTile } from "@/components/wizard/WizardFields";
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
  type ProvinceApi,
  type RiskApi,
  type TdrApi,
  type TdrTypeApi,
} from "@/lib/api";
import { Add, CheckmarkFilled, Locked, TrashCan, WarningAltFilled } from "@carbon/icons-react";
import styles from "./tdr-creation.module.scss";

interface State {
  tdrId: string | null;
  reference: string | null;
  tdrTypeCode: string;
  ptbaActivityId: string;
  title: string;

  context: string;
  justification: string;
  beneficiaries: string;

  objectives: { title: string; criteria: string }[];
  deliverables: { title: string; format: string; deadline: string }[];

  approach: string;
  methodology: string;
  constraints: string;

  startDate: string;
  durationMonths: string;
  provinceCode: string;
  expertise: string;

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
  tdrId: null, reference: null, tdrTypeCode: "", ptbaActivityId: "", title: "",
  context: "", justification: "", beneficiaries: "",
  objectives: [], deliverables: [],
  approach: "", methodology: "", constraints: "",
  startDate: "", durationMonths: "", provinceCode: "", expertise: "",
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
    ])
      .then(([t, p, pr]) => {
        setTypes(t.filter((x) => x.isActive));
        setActivities(p.activities);
        setProvinces(pr);
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
            await persist(s, { title: s.title, ptbaActivityId: s.ptbaActivityId });
            return;
          }
          const draft = await tdrApi.createDraft({
            tdrTypeCode: s.tdrTypeCode,
            title: s.title.trim(),
            ptbaActivityId: s.ptbaActivityId,
          });
          s.tdrId = draft.id;
          s.reference = draft.reference;
          if (draft.context) s.context = draft.context;
          await loadLibrary(s.tdrTypeCode);
        },
        render: (s, set) => (
          <TypeStep state={s} set={set} types={types} activities={activities} />
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
        render: (s, set) => (
          <div className={styles.stack}>
            <Field label="Contexte" required helper="Pré-rempli depuis le type ; à adapter.">
              <Textarea rows={7} value={s.context} onChange={(e) => set({ ...s, context: e.target.value })} />
            </Field>
            <Field label="Justification" helper="Pourquoi cette activité, maintenant.">
              <Textarea rows={4} value={s.justification} onChange={(e) => set({ ...s, justification: e.target.value })} />
            </Field>
            <Field label="Bénéficiaires">
              <Textarea rows={3} value={s.beneficiaries} onChange={(e) => set({ ...s, beneficiaries: e.target.value })} />
            </Field>
          </div>
        ),
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
          persist(s, { objectives: s.objectives, deliverables: s.deliverables }),
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
            provinceCode: s.provinceCode || null,
            expertise: s.expertise,
          }),
        render: (s, set) => (
          <div className={styles.stack}>
            <div className={styles.row2}>
              <Field label="Date de démarrage souhaitée">
                <Input type="date" value={s.startDate} onChange={(e) => set({ ...s, startDate: e.target.value })} />
              </Field>
              <Field label="Durée (mois)">
                <Input type="number" min={1} value={s.durationMonths} onChange={(e) => set({ ...s, durationMonths: e.target.value })} />
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
            <Field label="Expertise requise" helper="Profils-clés, qualifications, expérience attendue.">
              <Textarea rows={5} value={s.expertise} onChange={(e) => set({ ...s, expertise: e.target.value })} />
            </Field>
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
          <BudgetStep state={s} set={set} activity={activities.find((a) => a.id === s.ptbaActivityId)} />
        ),
      },

      // ===== 07 · Clauses =====
      {
        num: "07",
        label: "Clauses",
        sub: "Dispositions contractuelles retenues",
        commit: (s) =>
          persist(s, {
            clauses: s.clauses.map((c) => ({
              sourceFamilyKey: c.familyKey,
              sourceVersion: c.version,
              category: c.category,
              label: c.label,
              text: c.text,
            })),
          }),
        render: (s, set) => (
          <PickerStep
            title="Clauses de la bibliothèque"
            hint="Le texte retenu est copié dans votre TDR : une évolution ultérieure de la bibliothèque ne le modifiera pas."
            available={library.clauses}
            selected={s.clauses}
            onToggle={(c) =>
              set({
                ...s,
                clauses: s.clauses.some((x) => x.id === c.id)
                  ? s.clauses.filter((x) => x.id !== c.id)
                  : [...s.clauses, c],
              })
            }
            renderBody={(c) => c.text}
            renderTag={(c) => c.category}
          />
        ),
      },

      // ===== 08 · Indicateurs et risques =====
      {
        num: "08",
        label: "Indicateurs & risques",
        sub: "Mesure de la performance et aléas anticipés",
        commit: (s) =>
          persist(s, {
            indicators: s.indicators.map((i) => ({
              sourceFamilyKey: i.familyKey, label: i.label, measure: i.measure, target: i.target,
            })),
            risks: s.risks.map((r) => ({
              sourceFamilyKey: r.familyKey, label: r.label, description: r.description,
              mitigation: r.mitigation, level: r.level,
            })),
          }),
        render: (s, set) => (
          <div className={styles.stack}>
            <PickerStep
              title="Indicateurs"
              available={library.indicators}
              selected={s.indicators}
              onToggle={(i) =>
                set({
                  ...s,
                  indicators: s.indicators.some((x) => x.id === i.id)
                    ? s.indicators.filter((x) => x.id !== i.id)
                    : [...s.indicators, i],
                })
              }
              renderBody={(i) => `${i.measure} — cible ${i.target}`}
            />
            <PickerStep
              title="Risques"
              available={library.risks}
              selected={s.risks}
              onToggle={(r) =>
                set({
                  ...s,
                  risks: s.risks.some((x) => x.id === r.id)
                    ? s.risks.filter((x) => x.id !== r.id)
                    : [...s.risks, r],
                })
              }
              renderBody={(r) => `${r.description} — atténuation : ${r.mitigation}`}
              renderTag={(r) => r.level.toLowerCase()}
            />
          </div>
        ),
      },

      // ===== 09 · Sauvegardes E&S =====
      {
        num: "09",
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
              <Field label="Risques E&S identifiés" helper="Un par ligne.">
                <Textarea
                  rows={5}
                  value={s.esRisks.join("\n")}
                  onChange={(e) => set({ ...s, esRisks: e.target.value.split("\n").filter(Boolean) })}
                />
              </Field>
            </div>
          );
        },
      },

      // ===== 10 · Revue et soumission =====
      {
        num: "10",
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
          émettent des avis de non-objection — ils n’en rédigent jamais (MEP § 15.4).
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
        <Link href="/tdr" className={styles.gateLink}>Retour au sélecteur</Link>
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
      cancelHref="/tdr"
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
  state, set, types, activities,
}: {
  state: State;
  set: (s: State) => void;
  types: TdrTypeApi[];
  activities: PtbaActivityApi[];
}) {
  const families = [...new Set(types.map((t) => t.family))].sort();

  return (
    <div className={styles.stack}>
      {state.reference && (
        <Note tone="info" title={`Brouillon ${state.reference}`}>
          Vos saisies sont enregistrées à chaque étape.
        </Note>
      )}

      <Field label="Type d’activité" required helper="Seuls les types ouverts à votre profil sont proposés.">
        {families.map((f) => (
          <div key={f} className={styles.familyBlock}>
            <span className={styles.familyLabel}>{types.find((t) => t.family === f)?.familyLabel}</span>
            <div className={styles.tileGrid}>
              {types.filter((t) => t.family === f).map((t) => (
                <SelectableTile
                  key={t.code}
                  selected={state.tdrTypeCode === t.code}
                  onClick={() => set({ ...state, tdrTypeCode: t.code })}
                  disabled={Boolean(state.tdrId)}
                  tag={t.code}
                  title={t.name}
                  description={
                    t.defaultMethod ? `Méthode par défaut ${t.defaultMethod.code}` : undefined
                  }
                  metrics={t.requiresPges ? <span>PGES requis</span> : undefined}
                />
              ))}
            </div>
          </div>
        ))}
      </Field>

      <Field label="Intitulé" required>
        <Input
          value={state.title}
          onChange={(e) => set({ ...state, title: e.target.value })}
          placeholder="AMOA plateforme nationale d’identité numérique"
        />
      </Field>

      <Field
        label="Activité PTBA de rattachement"
        required
        helper={
          activities.length === 0
            ? "Aucune activité au plan de l’exercice en cours. Elle doit y être inscrite d’abord."
            : "L’enveloppe de cette activité plafonne le budget du TDR."
        }
      >
        <Select
          value={state.ptbaActivityId}
          onChange={(e) => set({ ...state, ptbaActivityId: e.target.value })}
          placeholder="Sélectionner une activité"
          options={activities.map((a) => ({
            value: a.id,
            label: `${a.code} · ${a.title} — ${(Number(a.envelopeUsd) / 1e6).toFixed(2)} M USD`,
          }))}
        />
      </Field>
    </div>
  );
}

function OutcomesStep({ state, set }: { state: State; set: (s: State) => void }) {
  return (
    <div className={styles.stack}>
      <ListEditor
        title="Objectifs"
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
              placeholder="Objectif"
            />
            <Input
              value={o.criteria}
              onChange={(e) => {
                const next = [...state.objectives];
                next[i] = { ...o, criteria: e.target.value };
                set({ ...state, objectives: next });
              }}
              placeholder="Critère de constatation"
            />
          </>
        )}
      />

      <ListEditor
        title="Livrables"
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
              placeholder="Échéance"
            />
          </>
        )}
      />
    </div>
  );
}

function ListEditor<T>({
  title, items, onAdd, onRemove, render,
}: {
  title: string;
  items: T[];
  onAdd: () => void;
  onRemove: (i: number) => void;
  render: (item: T, i: number) => React.ReactNode;
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
  state, set, activity,
}: {
  state: State;
  set: (s: State) => void;
  activity?: PtbaActivityApi;
}) {
  const [method, setMethod] = useState<{ code: string; review: string } | null>(null);
  const total = Number(state.budgetTotalUsd);

  useEffect(() => {
    if (!total || total <= 0) {
      setMethod(null);
      return;
    }
    // La méthode se déduit du montant côté serveur : dupliquer les seuils
    // ici les ferait dériver.
    tdrReferentielApi
      .resolveMethod("SERVICES_CONSULTANTS", total)
      .then((r) => setMethod(r ? { code: r.method.code, review: r.reviewType } : null))
      .catch(() => setMethod(null));
  }, [total]);

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
            Figée définitivement au moment de la transmission, depuis les seuils alors en vigueur.
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

  const toggleConsent = async (field: "consentMep" | "consentRgpd", value: boolean) => {
    set({ ...state, [field]: value });
    await persist(state, {
      [field === "consentMep" ? "consentMepAt" : "consentRgpdAt"]: value ? new Date().toISOString() : null,
    });
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
