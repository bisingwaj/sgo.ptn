"use client";

/**
 * PTBA — Plan de Travail et Budget Annuel.
 *
 * La disposition est celle de l'écran d'origine : bandeau d'indicateurs,
 * tableau des activités, rail de répartition et de cycle. Seules deux
 * choses changent — les données viennent du service au lieu d'être écrites
 * en dur, et la saisie d'une activité est réelle.
 *
 * Trois colonnes de l'écran d'origine restent vides : décaissé, exécution
 * et période. Rien ne les porte dans le modèle, et les remplir demanderait
 * de les inventer. Elles gardent leur place, marquées d'un tiret, plutôt
 * que d'afficher un chiffre sans source.
 */

import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { Shell } from "@/components/shell/Shell";
import { PageHeader } from "@/components/ui/PageHeader";
import { useAuth } from "@/components/auth/AuthContext";
import {
  ptbaApi,
  referentielApi,
  ApiError,
  type ProvinceApi,
  type PtbaActivityApi,
  type PtbaAllocationRowApi,
  type PtbaYearApi,
} from "@/lib/api";
import {
  ChartLineSmooth,
  Money,
  TaskApproved,
  Time,
  Add,
  Close,
  Notebook,
  Activity,
  TrashCan,
  ChevronDown,
  ChevronRight,
  WarningAltFilled,
} from "@carbon/icons-react";
import styles from "@/styles/ugp-shared.module.scss";
import form_ from "./ptba-form.module.scss";

const formatM = (n: number) => `${(n / 1_000_000).toFixed(1)} M`;

const STATUT: Record<PtbaYearApi["status"], string> = {
  BROUILLON: "En préparation",
  VALIDE: "Validé — opposable",
  CLOS: "Clos",
};

/**
 * Une teinte par composante, prise aux jetons.
 *
 * L'écran d'origine les écrivait en dur, donnait à C2 l'accent du profil
 * connecté — donc une couleur qui changeait d'un utilisateur à l'autre —
 * et peignait C4 du violet réservé à l'IA. Voir tokens.scss.
 */
const TEINTE: Record<string, string> = {
  C1: "var(--ptn-composante-c1)",
  C2: "var(--ptn-composante-c2)",
  C3: "var(--ptn-composante-c3)",
  C4: "var(--ptn-composante-c4)",
  C5: "var(--ptn-composante-c5)",
};

const TAG_CLASS: Record<string, string> = {
  C1: styles.tagC1,
  C2: styles.tagC2,
  C3: styles.tagC3,
  C4: styles.tagC4,
  C5: styles.tagC5,
};

interface FormState {
  code: string;
  title: string;
  componentCode: string;
  subComponent: string;
  envelopeUsd: string;
  idaUsd: string;
  afdUsd: string;
  provinceCode: string;
  /**
   * Ce que l'activité porte en propre. Facultatif : une ligne peut
   * s'inscrire au plan avant que son contenu soit arrêté, et se compléter
   * ensuite. C'est pourquoi les sections sont repliées par défaut — une
   * inscription rapide reste rapide.
   */
  objectives: Array<{ title: string; criteria: string }>;
  deliverables: Array<{ title: string; format: string; deadline: string }>;
  indicators: Array<{ label: string; measure: string; target: string }>;
  risks: Array<{ label: string; description: string; mitigation: string; level: string }>;
  clauses: Array<{ label: string; text: string }>;
}

const FORM_VIDE: FormState = {
  code: "", title: "", componentCode: "", subComponent: "",
  envelopeUsd: "", idaUsd: "", afdUsd: "", provinceCode: "",
  objectives: [], deliverables: [], indicators: [], risks: [], clauses: [],
};

const NIVEAUX = [
  { value: "", label: "—" },
  { value: "FAIBLE", label: "Faible" },
  { value: "MODERE", label: "Modéré" },
  { value: "SUBSTANTIEL", label: "Substantiel" },
  { value: "ELEVE", label: "Élevé" },
];

/**
 * Ce qu'une activité porte en propre, en lecture.
 *
 * Une liste vide est dite vide, non masquée : c'est ce qu'il faut voir
 * pour savoir ce qui reste à renseigner avant qu'un TDR s'y rattache.
 */
function Contenu({ activite }: { activite: PtbaActivityApi }) {
  const blocs: Array<{ titre: string; lignes: string[] }> = [
    {
      titre: "Objectifs",
      lignes: (activite.objectives ?? []).map(
        (o, i) => `O${i + 1} · ${o.title}${o.criteria ? ` — ${o.criteria}` : ""}`,
      ),
    },
    {
      titre: "Livrables attendus",
      lignes: (activite.deliverables ?? []).map(
        (d, i) =>
          `L${i + 1} · ${d.title}${d.format ? ` — ${d.format}` : ""}${d.deadline ? ` · ${d.deadline}` : ""}`,
      ),
    },
    {
      titre: "Indicateurs clés",
      lignes: (activite.indicators ?? []).map(
        (n) => `${n.label}${n.target ? ` — cible ${n.target}` : ""}${n.measure ? ` (${n.measure})` : ""}`,
      ),
    },
    {
      titre: "Risques et atténuation",
      lignes: (activite.risks ?? []).map(
        (r) => `${r.label}${r.level ? ` [${r.level.toLowerCase()}]` : ""}${r.mitigation ? ` — ${r.mitigation}` : ""}`,
      ),
    },
    {
      titre: "Normes",
      lignes: (activite.clauses ?? []).map((c) => `${c.label}${c.text ? ` — ${c.text}` : ""}`),
    },
  ];

  const tout = blocs.every((b) => b.lignes.length === 0);

  return (
    <div className={form_.contenu}>
      {tout ? (
        <p className={form_.hint}>
          Cette activité ne porte encore ni objectif, ni livrable, ni indicateur. Un TDR qui s’y
          rattache n’aura rien à y puiser.
        </p>
      ) : (
        blocs.map((b) => (
          <div key={b.titre} className={form_.contenuBloc}>
            <h4>{b.titre}</h4>
            {b.lignes.length === 0 ? (
              <p className={form_.absent}>Aucun</p>
            ) : (
              <ul>
                {b.lignes.map((l, i) => (
                  <li key={i}>{l}</li>
                ))}
              </ul>
            )}
          </div>
        ))
      )}
    </div>
  );
}

/**
 * Section repliable. `details` natif plutôt qu'un état React : le
 * navigateur sait déjà ouvrir et fermer, l'accessibilité vient avec, et
 * l'état n'a pas à remonter dans le formulaire.
 */
function Section({
  titre, compte, children,
}: {
  titre: string;
  compte: number;
  children: React.ReactNode;
}) {
  return (
    <details className={form_.section}>
      <summary className={form_.sectionHead}>
        <span>{titre}</span>
        <span className={form_.sectionCompte}>
          {compte === 0 ? "aucun" : compte}
        </span>
      </summary>
      <div className={form_.sectionBody}>{children}</div>
    </details>
  );
}

interface Champ {
  cle: string;
  ph: string;
  large?: boolean;
  court?: boolean;
  options?: Array<{ value: string; label: string }>;
}

/**
 * Éditeur de liste. Une ligne à la fois, retirable, avec un repère O1/L1
 * quand l'ordre compte — c'est ainsi que le document produit y renverra.
 * Les lignes sans intitulé sont écartées par le service : le formulaire
 * n'a pas à empêcher une ligne vide en fin de saisie.
 */
function Lignes<T extends Record<string, string>>({
  items, vide, onChange, champs, prefix,
}: {
  items: T[];
  vide: T;
  onChange: (v: T[]) => void;
  champs: Champ[];
  prefix?: string;
}) {
  return (
    <div className={form_.lignes}>
      {items.map((item, i) => (
        <div key={i} className={form_.ligne}>
          {prefix && (
            <span className={`${form_.rang} ptn-mono`} aria-hidden>
              {prefix}
              {i + 1}
            </span>
          )}
          <div className={form_.ligneChamps}>
            {champs.map((c) =>
              c.options ? (
                <select
                  key={c.cle}
                  value={item[c.cle] ?? ""}
                  aria-label={c.ph}
                  className={c.court ? form_.court : undefined}
                  onChange={(e) => {
                    const n = [...items];
                    n[i] = { ...item, [c.cle]: e.target.value };
                    onChange(n);
                  }}
                >
                  {c.options.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  key={c.cle}
                  value={item[c.cle] ?? ""}
                  placeholder={c.ph}
                  aria-label={c.ph}
                  className={c.large ? form_.large : c.court ? form_.court : undefined}
                  onChange={(e) => {
                    const n = [...items];
                    n[i] = { ...item, [c.cle]: e.target.value };
                    onChange(n);
                  }}
                />
              ),
            )}
          </div>
          <button
            type="button"
            className={form_.rowAction}
            aria-label="Retirer cette ligne"
            onClick={() => onChange(items.filter((_, x) => x !== i))}
          >
            <TrashCan size={14} aria-hidden />
          </button>
        </div>
      ))}
      <button
        type="button"
        className={form_.ajouter}
        onClick={() => onChange([...items, { ...vide }])}
      >
        <Add size={14} aria-hidden /> Ajouter une ligne
      </button>
    </div>
  );
}

export function PtbaClient() {
  const { can, loading: authLoading } = useAuth();

  const [year, setYear] = useState<PtbaYearApi | null>(null);
  const [activities, setActivities] = useState<PtbaActivityApi[]>([]);
  const [allocations, setAllocations] = useState<PtbaAllocationRowApi[]>([]);
  const [provinces, setProvinces] = useState<ProvinceApi[]>([]);
  const [error, setError] = useState<string | null>(null);
  // Le plan n'est pas « vide » tant qu'il n'est pas arrivé. Sans cet état,
  // le tableau affichait « Aucune activité au plan » à chaque ouverture,
  // pendant les deux allers-retours — une affirmation nette et fausse.
  const [chargement, setChargement] = useState(true);

  // Ligne dépliée. Une seule à la fois : le contenu d'une activité se lit,
  // il ne se compare pas ligne à ligne.
  const [deplie, setDeplie] = useState<string | null>(null);
  const [openForm, setOpenForm] = useState(false);
  const [form, setForm] = useState<FormState>(FORM_VIDE);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const peutEcrire = can("ptba:write");
  const editable = year?.status === "BROUILLON";

  /**
   * Relit le plan après une écriture.
   *
   * Séparé du premier chargement à dessein : une relecture ne doit pas
   * repasser par l'état de chargement, sinon le tableau clignote après
   * chaque inscription. Elle ne se déclenche que depuis un geste, jamais
   * depuis un effet.
   */
  const relire = useCallback(async () => {
    const exercices = await ptbaApi.years();
    const cible = exercices[0]?.year;
    if (!cible) return;
    // Les allocations suivent le plan : retirer une activité libère du
    // solde, et le formulaire doit le refléter sans rechargement.
    const [plan, alloc] = await Promise.allSettled([
      ptbaApi.activities(cible),
      ptbaApi.allocations(cible),
    ]);
    if (plan.status === "rejected") throw plan.reason;
    setYear(plan.value.year);
    setActivities(plan.value.activities);
    // Une relecture d'allocations en échec ne doit pas faire croire que
    // l'écriture qui vient d'aboutir a échoué : le plan, lui, est à jour.
    if (alloc.status === "fulfilled") setAllocations(alloc.value.rows);
  }, []);

  useEffect(() => {
    if (authLoading) return;
    let annule = false;

    void (async () => {
      try {
        const [exercices, prov] = await Promise.all([
          ptbaApi.years(),
          referentielApi.provinces(),
        ]);
        if (annule) return;
        setProvinces(prov);

        const cible = exercices[0]?.year;
        if (!cible) return;

        // Le plan est le contenu de l'écran ; les allocations en sont le
        // complément. Les demander ensemble faisait disparaître le plan
        // entier dès que les allocations échouaient — l'écran affichait
        // alors « aucun exercice ouvert » alors qu'il y en avait un.
        const [plan, alloc] = await Promise.allSettled([
          ptbaApi.activities(cible),
          ptbaApi.allocations(cible),
        ]);
        if (annule) return;

        if (plan.status === "rejected") throw plan.reason;
        setYear(plan.value.year);
        setActivities(plan.value.activities);

        if (alloc.status === "fulfilled") {
          setAllocations(alloc.value.rows);
        } else {
          setError(
            "Les allocations de l’exercice n’ont pas pu être lues : les soldes par composante " +
              "ne sont pas affichés, et aucune activité ne peut être inscrite tant qu’ils manquent.",
          );
        }
      } catch (e) {
        if (!annule) setError(e instanceof Error ? e.message : "Chargement impossible.");
      } finally {
        if (!annule) setChargement(false);
      }
    })();

    return () => {
      annule = true;
    };
  }, [authLoading]);

  /**
   * Tout se rapporte désormais à l'ALLOCATION DE L'EXERCICE, non à la
   * dotation de projet du MEP.
   *
   * L'écran divisait un plan annuel par une enveloppe quinquennale et
   * appelait le résultat « % de la dotation ». Le service borne autre
   * chose : deux chiffres qui ne se répondaient pas, et un refus
   * incompréhensible quand la saisie dépassait le vrai plafond.
   *
   * Les cumuls viennent du service, ils ne sont pas recalculés ici — deux
   * sources pour un même chiffre finissent toujours par diverger.
   */
  const engage = useMemo(
    () => allocations.reduce((s, r) => s + r.plannedUsd, 0),
    [allocations],
  );
  const alloueTotal = useMemo(
    () => allocations.reduce((s, r) => s + (r.allocationUsd ?? 0), 0),
    [allocations],
  );
  /** Composantes dont l'allocation n'est pas encore arrêtée. */
  const nonAllouees = useMemo(
    () => allocations.filter((r) => r.allocationUsd === null),
    [allocations],
  );

  const soumettre = async () => {
    if (!year) return;
    setSaving(true);
    setFormError(null);
    try {
      await ptbaApi.createActivity(year.year, {
        code: form.code.trim(),
        title: form.title.trim(),
        componentCode: form.componentCode,
        subComponent: form.subComponent.trim() || undefined,
        envelopeUsd: Number(form.envelopeUsd),
        idaUsd: form.idaUsd ? Number(form.idaUsd) : undefined,
        afdUsd: form.afdUsd ? Number(form.afdUsd) : undefined,
        provinceCode: form.provinceCode || undefined,
        objectives: form.objectives,
        deliverables: form.deliverables,
        indicators: form.indicators,
        risks: form.risks,
        clauses: form.clauses,
      });
      setForm(FORM_VIDE);
      setOpenForm(false);
      await relire();
    } catch (e) {
      setFormError(e instanceof ApiError ? e.message : "Enregistrement impossible.");
    } finally {
      setSaving(false);
    }
  };

  const retirer = async (a: PtbaActivityApi) => {
    setError(null);
    try {
      await ptbaApi.deactivate(a.id);
      await relire();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Retrait impossible.");
    }
  };

  const complet =
    form.code.trim() !== "" &&
    form.title.trim().length >= 5 &&
    form.componentCode !== "" &&
    Number(form.envelopeUsd) > 0;

  return (
    <Shell crumbs={[{ label: "Cockpit UGP", href: "/cockpit" }, { label: "PTBA" }]}>
      <PageHeader
        eyebrow="UGP · PLAN DE TRAVAIL ET BUDGET ANNUEL"
        title={year ? `${year.label} — exécution & suivi` : "PTBA"}
        subtitle={
          year
            ? `${activities.length} activité${activities.length > 1 ? "s" : ""} inscrite${activities.length > 1 ? "s" : ""} · ${allocations.length} composantes · ${formatM(alloueTotal)} USD alloués à l’exercice.`
            : chargement
              ? "Chargement du plan…"
              : "Aucun exercice ouvert."
        }
        meta={
          year ? (
            <>
              <span>
                Statut : <strong>{STATUT[year.status]}</strong>
              </span>
              <span>·</span>
              <span>
                Engagé au plan : <span className="ptn-mono">{formatM(engage)} USD</span>
              </span>
            </>
          ) : undefined
        }
        actions={
          peutEcrire && editable ? (
            <button
              type="button"
              className="demoBtnSecondary"
              onClick={() => setOpenForm((v) => !v)}
            >
              {openForm ? <Close size={14} aria-hidden /> : <Add size={14} aria-hidden />}
              {openForm ? "Fermer" : "Ajouter une activité"}
            </button>
          ) : undefined
        }
      />

      {error && (
        <div className={form_.alert}>
          <WarningAltFilled size={16} aria-hidden /> {error}
        </div>
      )}

      {openForm && (
        <section className={form_.panel}>
          <h3 className={form_.panelTitle}>Nouvelle activité au plan</h3>
          <div className={form_.grid}>
            <label className={form_.field}>
              <span>Code <em>*</em></span>
              <input
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
                placeholder="A2.3.1"
                className="ptn-mono"
              />
            </label>
            <label className={`${form_.field} ${form_.span2}`}>
              <span>Intitulé de l’activité <em>*</em></span>
              <input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Plateforme nationale d’identité numérique"
              />
            </label>

            <label className={form_.field}>
              <span>Composante <em>*</em></span>
              <select
                value={form.componentCode}
                onChange={(e) => setForm({ ...form, componentCode: e.target.value })}
              >
                <option value="">— Sélectionner —</option>
                {/* Une composante sans allocation, ou allouée à zéro, ne peut
                    rien recevoir : le service refuse. La proposer au choix
                    ferait découvrir le refus après la saisie. */}
                {allocations
                  .filter((r) => (r.allocationUsd ?? 0) > 0)
                  .map((r) => (
                    <option key={r.componentCode} value={r.componentCode}>
                      {r.componentCode} · {r.shortLabel} — reste{" "}
                      {formatM((r.allocationUsd ?? 0) - r.plannedUsd)} USD sur{" "}
                      {formatM(r.allocationUsd ?? 0)} alloués
                    </option>
                  ))}
              </select>
              {nonAllouees.length > 0 && (
                <span className={form_.hint}>
                  Sans allocation à ce jour :{" "}
                  {nonAllouees.map((r) => r.componentCode).join(", ")}. Une composante
                  n’accepte d’activité qu’une fois son allocation arrêtée.
                </span>
              )}
            </label>
            <label className={form_.field}>
              <span>Sous-composante</span>
              <input
                value={form.subComponent}
                onChange={(e) => setForm({ ...form, subComponent: e.target.value })}
                placeholder="2.3"
                className="ptn-mono"
              />
            </label>
            <label className={form_.field}>
              <span>Province</span>
              <select
                value={form.provinceCode}
                onChange={(e) => setForm({ ...form, provinceCode: e.target.value })}
              >
                <option value="">Couverture nationale</option>
                {provinces.map((p) => (
                  <option key={p.code} value={p.code}>
                    {p.label}
                    {p.isPriorityCpf ? " · prioritaire CPF" : ""}
                  </option>
                ))}
              </select>
            </label>

            <label className={form_.field}>
              <span>Enveloppe USD <em>*</em></span>
              <input
                type="number"
                min={0}
                value={form.envelopeUsd}
                onChange={(e) => setForm({ ...form, envelopeUsd: e.target.value })}
                placeholder="8700000"
                className="ptn-mono"
              />
            </label>
            <label className={form_.field}>
              <span>Part IDA</span>
              <input
                type="number"
                min={0}
                value={form.idaUsd}
                onChange={(e) => setForm({ ...form, idaUsd: e.target.value })}
                className="ptn-mono"
              />
            </label>
            <label className={form_.field}>
              <span>Part AFD</span>
              <input
                type="number"
                min={0}
                value={form.afdUsd}
                onChange={(e) => setForm({ ...form, afdUsd: e.target.value })}
                className="ptn-mono"
              />
            </label>
          </div>

          <p className={form_.hint}>
            La ventilation est facultative ; renseignée, IDA et AFD doivent totaliser l’enveloppe.
            Le cumul des activités d’une composante ne peut excéder sa dotation.
          </p>

          {/* Ce que l'activité porte en propre. Replié : une ligne peut
              s'inscrire avant que son contenu soit arrêté. Les TDR y
              puiseront — une activité porte plusieurs marchés, et chacun ne
              reprend que ce qui le concerne. */}
          <div className={form_.sections}>
            <Section titre="Objectifs de l’activité" compte={form.objectives.length}>
              <p className={form_.hint}>
                Ce que l’activité doit atteindre, non ce qu’un marché exécute. Un TDR y
                rattachera les siens sans en hériter.
              </p>
              <Lignes
                items={form.objectives}
                vide={{ title: "", criteria: "" }}
                onChange={(v) => setForm({ ...form, objectives: v })}
                prefix="O"
                champs={[
                  { cle: "title", ph: "Doter le pays d’un centre de supervision opérationnel", large: true },
                  { cle: "criteria", ph: "Comment on le constatera" },
                ]}
              />
            </Section>

            <Section titre="Livrables attendus" compte={form.deliverables.length}>
              <Lignes
                items={form.deliverables}
                vide={{ title: "", format: "", deadline: "" }}
                onChange={(v) => setForm({ ...form, deliverables: v })}
                prefix="L"
                champs={[
                  { cle: "title", ph: "Local technique aménagé", large: true },
                  { cle: "format", ph: "Procès-verbal de réception" },
                  { cle: "deadline", ph: "M+8", court: true },
                ]}
              />
            </Section>

            <Section titre="Indicateurs clés" compte={form.indicators.length}>
              <p className={form_.hint}>
                Indicateurs de résultat propres à cette activité. Ils remontent au cadre de
                résultats de la composante.
              </p>
              <Lignes
                items={form.indicators}
                vide={{ label: "", measure: "", target: "" }}
                onChange={(v) => setForm({ ...form, indicators: v })}
                champs={[
                  { cle: "label", ph: "CSIRT opérationnel", large: true },
                  { cle: "measure", ph: "Unité ou méthode de mesure" },
                  { cle: "target", ph: "Cible", court: true },
                ]}
              />
            </Section>

            <Section titre="Risques et atténuation" compte={form.risks.length}>
              <p className={form_.hint}>
                Risques propres à cette activité. Ceux qui tiennent à la forme du marché —
                retard de chantier, défaillance d’attributaire — restent au référentiel du type.
              </p>
              <Lignes
                items={form.risks}
                vide={{ label: "", description: "", mitigation: "", level: "" }}
                onChange={(v) => setForm({ ...form, risks: v })}
                champs={[
                  { cle: "label", ph: "Retard de raccordement électrique", large: true },
                  { cle: "mitigation", ph: "Atténuation prévue", large: true },
                  { cle: "level", ph: "Niveau", options: NIVEAUX, court: true },
                ]}
              />
            </Section>

            <Section titre="Normes propres à l’activité" compte={form.clauses.length}>
              <p className={form_.hint}>
                ISO 27001, ICAO 9303… Les clauses contractuelles, elles, suivent la forme du
                marché et restent au référentiel du type de TDR.
              </p>
              <Lignes
                items={form.clauses}
                vide={{ label: "", text: "" }}
                onChange={(v) => setForm({ ...form, clauses: v })}
                champs={[
                  { cle: "label", ph: "ISO 27001" },
                  { cle: "text", ph: "Portée de la norme pour cette activité", large: true },
                ]}
              />
            </Section>
          </div>

          {formError && (
            <div className={form_.alert}>
              <WarningAltFilled size={16} aria-hidden /> {formError}
            </div>
          )}

          <div className={form_.actions}>
            <button type="button" className="demoBtnSecondary" onClick={() => setOpenForm(false)}>
              Annuler
            </button>
            <button
              type="button"
              className="demoBtnPrimary"
              onClick={() => void soumettre()}
              disabled={!complet || saving}
            >
              {saving ? "Enregistrement…" : "Inscrire au plan"}
            </button>
          </div>
        </section>
      )}

      <div className={styles.kpis}>
        <div className={styles.kpi}>
          <div className={styles.kpiK}>
            <Notebook size={14} aria-hidden /> Activités {year?.year ?? ""}
          </div>
          <div className={styles.kpiV}>{activities.length}</div>
          <div className={styles.kpiU}>
            {allocations
              .filter((r) => r.activityCount > 0)
              .map((r) => `${r.componentCode} · ${r.activityCount}`)
              .join(" / ") || "Aucune activité inscrite"}
          </div>
        </div>
        <div className={styles.kpi}>
          <div className={styles.kpiK}>
            <Money size={14} aria-hidden /> Alloué à l’exercice
          </div>
          <div className={styles.kpiV}>
            {allocations.length === 0 ? "—" : formatM(alloueTotal)}
          </div>
          <div className={styles.kpiU}>
            {/* Sans les lignes, on ne sait rien — surtout pas que tout est
                alloué. Le dire serait une affirmation sans source. */}
            {allocations.length === 0
              ? "Allocations indisponibles"
              : nonAllouees.length > 0
                ? `USD · ${nonAllouees.length} composante${nonAllouees.length > 1 ? "s" : ""} sans allocation`
                : "USD · toutes composantes allouées"}
          </div>
        </div>
        <div className={styles.kpi}>
          <div className={styles.kpiK}>
            <TaskApproved size={14} aria-hidden /> Engagé au plan
          </div>
          <div className={styles.kpiV} style={{ color: "var(--ptn-status-success)" }}>
            {formatM(engage)}
          </div>
          <div className={`${styles.kpiBar} ${styles.kpiBarOk}`}>
            <i style={{ width: `${alloueTotal ? (engage / alloueTotal) * 100 : 0}%` }} />
          </div>
          <div className={styles.kpiU}>
            {alloueTotal ? ((engage / alloueTotal) * 100).toFixed(1) : "0"} % de l’allocation
          </div>
        </div>
        <div className={styles.kpi}>
          <div className={styles.kpiK}>
            <Time size={14} aria-hidden /> Décaissé
          </div>
          <div className={styles.kpiV}>—</div>
          <div className={styles.kpiU}>Non suivi à ce stade</div>
        </div>
      </div>

      <div className={styles.layout}>
        <div className={styles.tableCard}>
          <div className={styles.toolbar}>
            <h3>
              Activités PTBA <span className={styles.num}>({activities.length})</span>
            </h3>
            <div className={styles.spacer} />
          </div>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <colgroup>
                <col style={{ width: "11%" }} />
                <col style={{ width: "30%" }} />
                <col style={{ width: "9%" }} />
                <col style={{ width: "12%" }} />
                <col style={{ width: "11%" }} />
                <col style={{ width: "16%" }} />
                <col style={{ width: "11%" }} />
              </colgroup>
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Activité</th>
                  <th>Composante</th>
                  <th style={{ textAlign: "right" }}>Enveloppe</th>
                  <th style={{ textAlign: "right" }}>Décaissé</th>
                  <th>Exécution</th>
                  <th>{peutEcrire && editable ? "" : "Période"}</th>
                </tr>
              </thead>
              <tbody>
                {chargement ? (
                  <tr>
                    <td colSpan={7} className={styles.date} style={{ padding: 24 }}>
                      Chargement du plan…
                    </td>
                  </tr>
                ) : !year ? (
                  <tr>
                    <td colSpan={7} className={styles.date} style={{ padding: 24 }}>
                      Aucun exercice PTBA ouvert. Un plan se saisit sur un exercice : il faut
                      d’abord en ouvrir un.
                    </td>
                  </tr>
                ) : activities.length === 0 ? (
                  <tr>
                    <td colSpan={7} className={styles.date} style={{ padding: 24 }}>
                      Aucune activité au plan. Tant qu’il est vide, aucun TDR ne peut être ouvert :
                      le rattachement à une ligne du plan est obligatoire.
                    </td>
                  </tr>
                ) : (
                  activities.map((a) => (
                    <Fragment key={a.id}>
                    <tr>
                      <td>
                        <button
                          type="button"
                          className={form_.deplier}
                          onClick={() => setDeplie(deplie === a.id ? null : a.id)}
                          aria-expanded={deplie === a.id}
                        >
                          {deplie === a.id ? (
                            <ChevronDown size={14} aria-hidden />
                          ) : (
                            <ChevronRight size={14} aria-hidden />
                          )}
                          <span className={styles.ref}>{a.code}</span>
                        </button>
                      </td>
                      <td>
                        <div className={styles.title}>{a.title}</div>
                      </td>
                      <td>
                        <span
                          // Une composante inconnue retombe sur le neutre, non
                          // sur la teinte de C4 — qu'elle empruntait jusqu'ici.
                          className={`${styles.tag} ${TAG_CLASS[a.componentCode] ?? styles.tagC5}`}
                        >
                          {a.componentCode}
                        </span>
                      </td>
                      <td className={styles.amount}>{formatM(Number(a.envelopeUsd))}</td>
                      <td className={styles.amount}>—</td>
                      <td className={styles.date}>—</td>
                      <td>
                        {peutEcrire && editable ? (
                          <button
                            type="button"
                            className={form_.rowAction}
                            onClick={() => void retirer(a)}
                            aria-label={`Retirer ${a.code} du plan`}
                            title="Retirer du plan"
                          >
                            <TrashCan size={14} aria-hidden />
                          </button>
                        ) : (
                          <span className={styles.date}>—</span>
                        )}
                      </td>
                    </tr>
                    {deplie === a.id && (
                      <tr>
                        <td colSpan={7} className={form_.detail}>
                          <Contenu activite={a} />
                        </td>
                      </tr>
                    )}
                    </Fragment>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <aside className={styles.rail}>
          <section className={styles.railCard}>
            <h4 className={styles.railH}>
              <Activity size={12} aria-hidden /> Répartition composantes
            </h4>
            <div className={styles.railBody}>
              {allocations.length === 0 && (
                <p style={{ fontSize: 12, color: "var(--cds-text-helper)" }}>
                  {chargement ? "Chargement…" : "Allocations indisponibles."}
                </p>
              )}
              {/* La barre dit le taux d'engagement DANS l'allocation, non la
                  part de la composante dans le total : c'est le chiffre sur
                  lequel on agit, et celui que le service oppose à la saisie. */}
              {allocations.map((r) => {
                const alloue = r.allocationUsd;
                const taux = alloue && alloue > 0 ? (r.plannedUsd / alloue) * 100 : 0;
                return (
                  <div key={r.componentCode} style={{ marginBottom: 10 }}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 8,
                        fontSize: 12,
                        marginBottom: 4,
                      }}
                    >
                      <span>
                        <strong style={{ fontFamily: "var(--font-ibm-plex-mono)", marginRight: 6 }}>
                          {r.componentCode}
                        </strong>
                        {r.shortLabel}
                      </span>
                      <span
                        className="ptn-mono"
                        style={{ fontSize: 12, color: "var(--cds-text-helper)", whiteSpace: "nowrap" }}
                      >
                        {alloue === null ? "non allouée" : `${formatM(r.plannedUsd)} / ${formatM(alloue)}`}
                      </span>
                    </div>
                    <div style={{ height: 4, background: "var(--cds-border-subtle)", overflow: "hidden" }}>
                      <i
                        style={{
                          display: "block",
                          height: "100%",
                          width: `${Math.min(taux, 100)}%`,
                          background: TEINTE[r.componentCode],
                        }}
                      />
                    </div>
                    {/* Le corpus impose de signaler la réconciliation MEP/PAD
                        partout où la dotation s'affiche. */}
                    {r.reconciliation && (
                      <p style={{ fontSize: 12, lineHeight: 1.4, color: "var(--cds-text-helper)", marginTop: 4 }}>
                        {r.reconciliation}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          <section className={styles.railCard}>
            <h4 className={styles.railH}>
              <ChartLineSmooth size={12} aria-hidden /> Cycle PTBA
            </h4>
            <div className={styles.railBody}>
              <div className={styles.railRow}>
                <div className={styles.railK}>Exercice</div>
                <div className={`${styles.railV} ${styles.railVMono}`}>{year?.year ?? "—"}</div>
              </div>
              <div className={styles.railRow}>
                <div className={styles.railK}>Statut</div>
                <div className={styles.railV}>{year ? STATUT[year.status] : "—"}</div>
              </div>
              <div className={styles.railRow}>
                <div className={styles.railK}>Validé le</div>
                <div className={`${styles.railV} ${styles.railVMono}`}>
                  {year?.validatedAt
                    ? new Date(year.validatedAt).toLocaleDateString("fr-FR")
                    : "—"}
                </div>
              </div>
              <div className={styles.railRow}>
                <div className={styles.railK}>Activités inscrites</div>
                <div className={styles.railV}>
                  <strong>{activities.length}</strong>
                </div>
              </div>
            </div>
          </section>
        </aside>
      </div>
    </Shell>
  );
}
