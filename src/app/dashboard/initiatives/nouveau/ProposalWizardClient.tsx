"use client";

/**
 * Wizard de proposition d'initiative MDA — 7 étapes avec assistance IA.
 *
 * 1. Composante
 * 2. Activité PTBA
 * 3. Contexte (avec IA assist type-aware)
 * 4. Cadre & risques (clauses + indicateurs + risques type-aware)
 * 5. Objectifs & livrables (form gauche · liste droite)
 * 6. Budget & calendrier
 * 7. Revue & soumission
 */

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Wizard, type WizardStep } from "@/components/wizard/Wizard";
import {
  Field,
  Input,
  Textarea,
  SelectableTile,
  Note,
  Select,
} from "@/components/wizard/WizardFields";
import { COMPONENTS, ALL_PROVINCES } from "@/lib/project-data";
import {
  Idea,
  CheckmarkFilled,
  WarningAltFilled,
  Add,
  Edit,
  TrashCan,
  Flag,
  DocumentBlank,
  WarningHex,
  ChartLineSmooth,
  Scales,
} from "@carbon/icons-react";
import styles from "./proposal.module.scss";
import {
  CROSS_INDICATORS,
  CROSS_RISKS,
  getTypeContent,
  type ClauseTemplate,
  type IndicatorTemplate,
  type RiskTemplate,
} from "./tdr-content";

interface ProposalState {
  componentKey?: "C1" | "C2" | "C3" | "C4";
  ptbaCode?: string;
  ptbaTitle?: string;
  title?: string;
  context?: string;
  beneficiaries?: string;
  province?: string;
  /** Clauses retenues (mix templates type + libres) */
  selectedClauses: { label: string; text: string; cat: ClauseTemplate["cat"] }[];
  /** Indicateurs retenus */
  selectedIndicators: { label: string; measure: string; target: string }[];
  /** Risques retenus avec mitigation */
  selectedRisks: { label: string; description: string; mitigation: string; level: RiskTemplate["level"] }[];
  objectives: { title: string; criteria: string }[];
  deliverables: { title: string; format: string; deadline: string }[];
  budget?: number;
  durationMonths?: number;
  startDate?: string;
}

// Activités PTBA disponibles par composante (mock)
const PTBA_ACTIVITIES: Record<
  "C1" | "C2" | "C3" | "C4",
  { code: string; title: string; budget: number }[]
> = {
  C1: [
    { code: "A1.4.2", title: "Backbone fibre Goma-Bukavu", budget: 12.4 },
    { code: "A1.4.3", title: "Réseau dernier kilomètre — 145 territoires", budget: 28 },
    { code: "A1.5.1", title: "Connexion 1 000 institutions publiques", budget: 22 },
  ],
  C2: [
    { code: "A2.3.1", title: "Plateforme nationale d'identité numérique", budget: 8.7 },
    { code: "A2.5.1", title: "Centre de données Tier III", budget: 18 },
    { code: "A2.7.2", title: "SOC national cybersécurité", budget: 14.2 },
  ],
  C3: [
    { code: "A3.2.1", title: "Hubs technologiques", budget: 5.6 },
    { code: "A3.4.1", title: "Formation EESU 200 enseignants", budget: 1.9 },
    { code: "A3.5.1", title: "Subventions startups (SBP)", budget: 13 },
  ],
  C4: [
    { code: "A4.1.1", title: "Coordination institutionnelle", budget: 5 },
    { code: "A4.1.4", title: "Atelier ID4Africa Abidjan", budget: 0.2 },
  ],
};

export function ProposalWizardClient() {
  const router = useRouter();
  const sp = useSearchParams();
  const typeSlug = sp.get("type");
  const originSlug = sp.get("origin") ?? "partner";
  const typeContent = getTypeContent(typeSlug);

  const ORIGIN_LABEL: Record<string, string> = {
    ugp: "UGP-PTN",
    partner: "Partie prenante",
    donor: "Bailleur co-financeur",
    sbp: "Bénéficiaire SBP",
  };
  const eyebrowTxt = typeSlug
    ? `${ORIGIN_LABEL[originSlug] ?? "PARTIE PRENANTE"} · TDR ${typeContent.name.toUpperCase()} (${typeContent.code})`
    : `${ORIGIN_LABEL[originSlug] ?? "PARTIE PRENANTE"} · NOUVELLE INITIATIVE`;

  const initial: ProposalState = {
    objectives: [],
    deliverables: [],
    selectedClauses: [],
    selectedIndicators: [],
    selectedRisks: [],
  };

  const steps: WizardStep<ProposalState>[] = [
    // ===== Étape 1 : Composante =====
    {
      num: "01",
      label: "Composante",
      sub: "Sélectionnez la composante d'affectation",
      validate: (s) => (s.componentKey ? null : "Sélectionnez une composante."),
      render: (s, set) => (
        <div className={styles.tilesGrid}>
          {(["C1", "C2", "C3", "C4"] as const).map((k) => {
            const c = COMPONENTS[k];
            return (
              <SelectableTile
                key={k}
                tag={k}
                title={c.short}
                description={c.label}
                selected={s.componentKey === k}
                onClick={() => set({ ...s, componentKey: k, ptbaCode: undefined })}
                metrics={
                  <>
                    <span className="ptn-mono">{c.total} M USD</span>
                    <span>·</span>
                    <span className="ptn-mono">
                      {PTBA_ACTIVITIES[k]?.length ?? 0} activités PTBA
                    </span>
                  </>
                }
              />
            );
          })}
        </div>
      ),
    },

    // ===== Étape 2 : Activité PTBA =====
    {
      num: "02",
      label: "Activité PTBA",
      sub: "Choisissez l'activité du Plan de Travail et Budget Annuels",
      validate: (s) => (s.ptbaCode ? null : "Sélectionnez une activité."),
      render: (s, set) => {
        const activities = PTBA_ACTIVITIES[s.componentKey ?? "C1"];
        return (
          <div className={styles.formStack}>
            <table className={styles.ptbaTable}>
              <thead>
                <tr>
                  <th></th>
                  <th>Code PTBA</th>
                  <th>Intitulé activité</th>
                  <th>Budget enveloppe</th>
                </tr>
              </thead>
              <tbody>
                {activities.map((a) => {
                  const sel = s.ptbaCode === a.code;
                  return (
                    <tr
                      key={a.code}
                      className={sel ? styles.ptbaRowSel : ""}
                      onClick={() =>
                        set({ ...s, ptbaCode: a.code, ptbaTitle: a.title, budget: a.budget * 1_000_000 })
                      }
                    >
                      <td>
                        <input
                          type="radio"
                          name="ptba"
                          checked={sel}
                          onChange={() =>
                            set({
                              ...s,
                              ptbaCode: a.code,
                              ptbaTitle: a.title,
                              budget: a.budget * 1_000_000,
                            })
                          }
                        />
                      </td>
                      <td className="ptn-mono">{a.code}</td>
                      <td>{a.title}</td>
                      <td className="ptn-mono">{a.budget} M USD</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {s.ptbaCode && (
              <Note tone="ai" title={
                <span style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
                  <Idea size={14} aria-hidden /> Modèle de TDR associé chargé
                </span>
              }>
                Le modèle TDR pour cette activité est disponible. L&apos;assistant IA
                pourra vous aider à le pré-remplir à l&apos;étape Contexte.
              </Note>
            )}
          </div>
        );
      },
    },

    // ===== Étape 3 : Contexte =====
    {
      num: "03",
      label: "Contexte",
      sub: "Décrivez l'intitulé, la justification et les bénéficiaires",
      validate: (s) =>
        !s.title?.trim() || !s.context?.trim()
          ? "Renseignez l'intitulé et le contexte."
          : null,
      render: (s, set) => (
        <div className={styles.contextLayout}>
          <div className={styles.formStack}>
            <Field label="Intitulé du marché" required>
              <Input
                value={s.title ?? ""}
                onChange={(e) => set({ ...s, title: e.target.value })}
                placeholder="Ex. AMOA Plateforme nationale d'identité numérique"
              />
            </Field>
            <Field label="Justification & contexte" required>
              <Textarea
                value={s.context ?? ""}
                onChange={(e) => set({ ...s, context: e.target.value })}
                placeholder="Décrivez le besoin, le contexte sectoriel, les enjeux MEP, l'alignement avec le PTBA…"
                rows={6}
              />
            </Field>
            <div className={styles.row2}>
              <Field label="Bénéficiaires cibles">
                <Input
                  value={s.beneficiaries ?? ""}
                  onChange={(e) => set({ ...s, beneficiaries: e.target.value })}
                  placeholder="Ex. ANIE, ministères, citoyens, entreprises…"
                />
              </Field>
              <Field label="Province">
                <Select
                  value={s.province ?? ""}
                  onChange={(e) => set({ ...s, province: e.target.value })}
                  placeholder="— Sélectionner —"
                  options={ALL_PROVINCES.map((p) => ({ value: p, label: p }))}
                />
              </Field>
            </div>
          </div>
          <aside className={styles.aiPanel}>
            <header>
              <Idea size={16} aria-hidden />
              <strong>Suggestions IA · {typeContent.name}</strong>
              <span className={styles.aiBadge}>IA</span>
            </header>
            <p>
              Brouillon adapté au type <strong>{typeContent.code}</strong> sur la base du PTBA
              <span className="ptn-mono"> {s.ptbaCode ?? "—"}</span> et des sources MEP.
            </p>
            <button
              type="button"
              className={styles.aiBtn}
              onClick={() => {
                if (!s.ptbaTitle || !s.ptbaCode) return;
                set({
                  ...s,
                  title: s.title || s.ptbaTitle,
                  context: s.context || typeContent.contextHook(s.ptbaTitle, s.ptbaCode),
                  beneficiaries:
                    s.beneficiaries ||
                    "Population RDC, MDA bénéficiaires, partenaires institutionnels.",
                });
              }}
            >
              <Idea size={14} aria-hidden /> Générer un brouillon
            </button>
            <div className={styles.aiSources}>
              <span className={styles.aiSourcesLabel}>Sources citées :</span>
              <ul>
                <li>MEP § 2.2.4 — Composantes et financement</li>
                <li>MEP Annexe 4 — Modèles de TDR · {typeContent.code}</li>
                <li>PTBA 2026 — {s.ptbaCode ?? "à sélectionner"}</li>
                {typeContent.defaultMethod && (
                  <li>Méthode par défaut : {typeContent.defaultMethod}</li>
                )}
              </ul>
            </div>
          </aside>
        </div>
      ),
    },

    // ===== Étape 4 : Cadre & risques (type-aware) =====
    {
      num: "04",
      label: "Cadre & risques",
      sub: `Clauses, indicateurs et risques pré-cadrés pour ${typeContent.name}`,
      render: (s, set) => <FrameworkStep state={s} set={set} typeSlug={typeSlug} />,
    },

    // ===== Étape 5 : Objectifs & livrables =====
    {
      num: "05",
      label: "Objectifs & livrables",
      sub: "Définissez objectifs SMART et livrables avec critères d'acceptation",
      render: (s, set) => <ObjectivesStep state={s} set={set} />,
    },

    // ===== Étape 6 : Budget & calendrier =====
    {
      num: "06",
      label: "Budget & calendrier",
      sub: "Coût estimatif et durée prévisionnelle",
      validate: (s) => {
        if (!s.budget || s.budget <= 0) return "Renseignez un budget indicatif.";
        const enveloppe = s.componentKey
          ? COMPONENTS[s.componentKey].total * 1_000_000
          : Infinity;
        if (s.budget > enveloppe) return `Dépasse l'enveloppe (${enveloppe / 1_000_000} M USD).`;
        return null;
      },
      render: (s, set) => (
        <div className={styles.formStack}>
          <Field
            label="Budget indicatif (USD)"
            required
            helper="Doit rester ≤ enveloppe de l'activité PTBA"
          >
            <Input
              type="number"
              min={0}
              step={10000}
              value={s.budget ?? ""}
              onChange={(e) => set({ ...s, budget: Number(e.target.value) })}
              placeholder="Ex. 8700000"
            />
          </Field>
          <div className={styles.row2}>
            <Field label="Durée prévisionnelle (mois)">
              <Input
                type="number"
                min={1}
                max={36}
                value={s.durationMonths ?? ""}
                onChange={(e) => set({ ...s, durationMonths: Number(e.target.value) })}
                placeholder="Ex. 18"
              />
            </Field>
            <Field label="Date de démarrage souhaitée">
              <Input
                type="date"
                value={s.startDate ?? ""}
                onChange={(e) => set({ ...s, startDate: e.target.value })}
              />
            </Field>
          </div>
          {s.budget && s.componentKey && (
            <Note
              tone={
                s.budget > COMPONENTS[s.componentKey].total * 1_000_000
                  ? "danger"
                  : "info"
              }
              title="Vérification d'enveloppe"
            >
              Activité PTBA : <strong>{s.ptbaCode}</strong> · Budget proposé :{" "}
              <strong className="ptn-mono">{(s.budget / 1_000_000).toFixed(2)} M USD</strong> ·
              Enveloppe composante :{" "}
              <strong className="ptn-mono">{COMPONENTS[s.componentKey].total} M USD</strong>
            </Note>
          )}
        </div>
      ),
    },

    // ===== Étape 7 : Revue & soumission =====
    {
      num: "07",
      label: "Revue & soumission",
      sub: "Vérification de conformité et soumission à l'UGP",
      render: (s) => (
        <div className={styles.formStack}>
          <h3 className={styles.sectionTitle}>Récapitulatif</h3>
          <div className={styles.recapGrid}>
            <Recap label="Type TDR" value={typeContent.code} mono />
            <Recap label="Origine" value={ORIGIN_LABEL[originSlug] ?? "—"} />
            <Recap label="Composante" value={s.componentKey ?? "—"} />
            <Recap label="Activité PTBA" value={s.ptbaCode ?? "—"} mono />
            <Recap label="Intitulé" value={s.title ?? "—"} />
            <Recap label="Province" value={s.province ?? "—"} />
            <Recap label="Budget" value={s.budget ? `${(s.budget / 1_000_000).toFixed(2)} M USD` : "—"} mono />
            <Recap label="Durée" value={s.durationMonths ? `${s.durationMonths} mois` : "—"} />
            <Recap label="Clauses retenues" value={String(s.selectedClauses.length)} />
            <Recap label="Indicateurs SMART" value={String(s.selectedIndicators.length)} />
            <Recap label="Risques cartographiés" value={String(s.selectedRisks.length)} />
            <Recap label="Objectifs définis" value={String(s.objectives.filter((o) => o.title).length)} />
            <Recap label="Livrables définis" value={String(s.deliverables.filter((d) => d.title).length)} />
          </div>
          <h3 className={styles.sectionTitle}>Checklist de conformité</h3>
          <ul className={styles.checklist}>
            <ChecklistItem ok={!!s.componentKey} label="Composante sélectionnée" />
            <ChecklistItem ok={!!s.ptbaCode} label="Activité PTBA rattachée" />
            <ChecklistItem ok={!!s.title?.trim()} label="Intitulé renseigné" />
            <ChecklistItem ok={!!s.context?.trim()} label="Contexte rédigé" />
            <ChecklistItem
              ok={s.selectedClauses.length >= 3}
              label="≥ 3 clauses retenues (cadre réglementaire)"
            />
            <ChecklistItem
              ok={s.selectedIndicators.length >= 2}
              label="≥ 2 indicateurs SMART définis"
            />
            <ChecklistItem
              ok={s.selectedRisks.length >= 3}
              label="≥ 3 risques cartographiés avec mitigation"
            />
            <ChecklistItem
              ok={s.objectives.some((o) => o.title && o.criteria)}
              label="Au moins 1 objectif SMART"
            />
            <ChecklistItem
              ok={s.deliverables.some((d) => d.title)}
              label="Au moins 1 livrable défini"
            />
            <ChecklistItem
              ok={!!s.budget && (s.componentKey ? s.budget <= COMPONENTS[s.componentKey].total * 1_000_000 : true)}
              label="Budget conforme à l'enveloppe"
            />
          </ul>
        </div>
      ),
    },
  ];

  return (
    <Wizard<ProposalState>
      eyebrow={eyebrowTxt}
      title={typeSlug ? `Rédiger un TDR · ${typeContent.name}` : "Proposer une initiative au PTN-RDC"}
      subtitle={`7 étapes guidées avec assistance IA, pré-cadrées pour ${typeContent.name} — vos données sont sauvegardées en brouillon.`}
      steps={steps}
      initialState={initial}
      cancelHref="/tdr"
      finishLabel="Soumettre à l'UGP"
      onFinish={async () => {
        await new Promise((r) => setTimeout(r, 600));
        router.push("/dashboard/initiatives");
      }}
    />
  );
}

function Recap({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className={styles.recapItem}>
      <span>{label}</span>
      <strong className={mono ? "ptn-mono" : ""}>{value}</strong>
    </div>
  );
}

function ChecklistItem({ ok, label }: { ok: boolean; label: string }) {
  return (
    <li className={`${styles.checkItem} ${ok ? styles.checkItemOk : styles.checkItemKo}`}>
      {ok ? <CheckmarkFilled size={16} aria-hidden /> : <WarningAltFilled size={16} aria-hidden />}
      <span>{label}</span>
    </li>
  );
}

/* ============== Étape 4 — Cadre & risques (type-aware) ============== */

const CAT_LABEL: Record<ClauseTemplate["cat"], string> = {
  reg: "Réglementaire",
  tech: "Technique",
  conf: "Confidentialité",
  safe: "Sauvegarde E&S",
  gov: "Gouvernance",
};

function FrameworkStep({
  state,
  set,
  typeSlug,
}: {
  state: ProposalState;
  set: (s: ProposalState) => void;
  typeSlug: string | null;
}) {
  const [tab, setTab] = useState<"clauses" | "ind" | "risks">("clauses");
  const tc = getTypeContent(typeSlug);

  return (
    <div className={styles.formStack}>
      <div className={styles.objTabs}>
        <button
          type="button"
          className={`${styles.objTab} ${tab === "clauses" ? styles.objTabActive : ""}`}
          onClick={() => setTab("clauses")}
        >
          <Scales size={14} aria-hidden />
          Clauses & normes
          <span className={styles.objTabBadge}>{state.selectedClauses.length}</span>
        </button>
        <button
          type="button"
          className={`${styles.objTab} ${tab === "ind" ? styles.objTabActive : ""}`}
          onClick={() => setTab("ind")}
        >
          <ChartLineSmooth size={14} aria-hidden />
          Indicateurs
          <span className={styles.objTabBadge}>{state.selectedIndicators.length}</span>
        </button>
        <button
          type="button"
          className={`${styles.objTab} ${tab === "risks" ? styles.objTabActive : ""}`}
          onClick={() => setTab("risks")}
        >
          <WarningHex size={14} aria-hidden />
          Risques & mitigation
          <span className={styles.objTabBadge}>{state.selectedRisks.length}</span>
        </button>
      </div>

      {tab === "clauses" && (
        <ClausesPicker
          available={tc.clauses}
          selected={state.selectedClauses}
          onChange={(next) => set({ ...state, selectedClauses: next })}
          typeName={tc.name}
        />
      )}

      {tab === "ind" && (
        <IndicatorsPicker
          available={[...tc.indicators, ...CROSS_INDICATORS]}
          selected={state.selectedIndicators}
          onChange={(next) => set({ ...state, selectedIndicators: next })}
        />
      )}

      {tab === "risks" && (
        <RisksPicker
          available={[...tc.risks, ...CROSS_RISKS]}
          selected={state.selectedRisks}
          onChange={(next) => set({ ...state, selectedRisks: next })}
        />
      )}
    </div>
  );
}

function ClausesPicker({
  available,
  selected,
  onChange,
  typeName,
}: {
  available: ClauseTemplate[];
  selected: ProposalState["selectedClauses"];
  onChange: (next: ProposalState["selectedClauses"]) => void;
  typeName: string;
}) {
  const isOn = (label: string) => selected.some((c) => c.label === label);
  const toggle = (cl: ClauseTemplate) => {
    if (isOn(cl.label)) onChange(selected.filter((c) => c.label !== cl.label));
    else onChange([...selected, { label: cl.label, text: cl.text, cat: cl.cat }]);
  };

  // Group by category
  const groups = (["reg", "safe", "tech", "conf", "gov"] as const).map((cat) => ({
    cat,
    items: available.filter((c) => c.cat === cat),
  }));

  return (
    <div className={styles.splitLayout}>
      <div className={styles.splitForm}>
        <h4 className={styles.splitFormTitle}>Bibliothèque de clauses · {typeName}</h4>
        {groups.map(
          (g) =>
            g.items.length > 0 && (
              <div key={g.cat}>
                <div className={styles.suggestionsLabel}>{CAT_LABEL[g.cat]}</div>
                <div className={styles.suggestions}>
                  {g.items.map((cl) => (
                    <button
                      key={cl.label}
                      type="button"
                      className={`${styles.suggestionChip} ${isOn(cl.label) ? styles.chipSelected : ""}`}
                      onClick={() => toggle(cl)}
                      title={cl.text}
                    >
                      {isOn(cl.label) ? "✓ " : "+ "}
                      {cl.label}
                    </button>
                  ))}
                </div>
              </div>
            ),
        )}
      </div>

      <div className={styles.splitList}>
        <div className={styles.splitListHead}>
          <span>Clauses retenues pour le TDR</span>
          <span className="ptn-mono">{selected.length}</span>
        </div>
        <div className={styles.splitListBody}>
          {selected.length === 0 ? (
            <div className={styles.splitListEmpty}>
              Aucune clause sélectionnée. Cliquez sur les chips à gauche pour pré-cadrer le TDR.
              <br />Les clauses retenues seront intégrées au modèle généré.
            </div>
          ) : (
            selected.map((c, i) => (
              <div key={c.label} className={styles.listItem}>
                <div className={styles.listIdx}>{i + 1}</div>
                <div className={styles.listMain}>
                  <p className={styles.listTitle}>
                    <span className={styles.catBadge} data-cat={c.cat}>
                      {CAT_LABEL[c.cat]}
                    </span>
                    {c.label}
                  </p>
                  <div className={styles.listMeta}>{c.text}</div>
                </div>
                <div className={styles.listActions}>
                  <button
                    type="button"
                    className={`${styles.listIconBtn} ${styles.listIconBtnDanger}`}
                    aria-label="Retirer"
                    onClick={() => onChange(selected.filter((x) => x.label !== c.label))}
                  >
                    <TrashCan size={14} aria-hidden />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function IndicatorsPicker({
  available,
  selected,
  onChange,
}: {
  available: IndicatorTemplate[];
  selected: ProposalState["selectedIndicators"];
  onChange: (next: ProposalState["selectedIndicators"]) => void;
}) {
  const isOn = (label: string) => selected.some((c) => c.label === label);
  const toggle = (it: IndicatorTemplate) => {
    if (isOn(it.label)) onChange(selected.filter((c) => c.label !== it.label));
    else onChange([...selected, { label: it.label, measure: it.measure, target: it.target }]);
  };

  return (
    <div className={styles.splitLayout}>
      <div className={styles.splitForm}>
        <h4 className={styles.splitFormTitle}>Indicateurs SMART proposés</h4>
        <div className={styles.suggestionsLabel}>
          Spécifiques au type & transversaux PTN-RDC
        </div>
        <div className={styles.suggestions}>
          {available.map((it) => (
            <button
              key={it.label}
              type="button"
              className={`${styles.suggestionChip} ${isOn(it.label) ? styles.chipSelected : ""}`}
              onClick={() => toggle(it)}
              title={`${it.measure} · cible : ${it.target}`}
            >
              {isOn(it.label) ? "✓ " : "+ "}
              {it.label}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.splitList}>
        <div className={styles.splitListHead}>
          <span>Indicateurs retenus</span>
          <span className="ptn-mono">{selected.length}</span>
        </div>
        <div className={styles.splitListBody}>
          {selected.length === 0 ? (
            <div className={styles.splitListEmpty}>
              Aucun indicateur défini. Sélectionnez ceux qui structureront le suivi-évaluation.
            </div>
          ) : (
            selected.map((it, i) => (
              <div key={it.label} className={styles.listItem}>
                <div className={styles.listIdx}>{i + 1}</div>
                <div className={styles.listMain}>
                  <p className={styles.listTitle}>{it.label}</p>
                  <div className={styles.listMeta}>
                    <strong>Mesure :</strong> {it.measure} · <strong>Cible :</strong> {it.target}
                  </div>
                </div>
                <div className={styles.listActions}>
                  <button
                    type="button"
                    className={`${styles.listIconBtn} ${styles.listIconBtnDanger}`}
                    aria-label="Retirer"
                    onClick={() => onChange(selected.filter((x) => x.label !== it.label))}
                  >
                    <TrashCan size={14} aria-hidden />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function RisksPicker({
  available,
  selected,
  onChange,
}: {
  available: RiskTemplate[];
  selected: ProposalState["selectedRisks"];
  onChange: (next: ProposalState["selectedRisks"]) => void;
}) {
  const isOn = (label: string) => selected.some((c) => c.label === label);
  const toggle = (r: RiskTemplate) => {
    if (isOn(r.label)) onChange(selected.filter((c) => c.label !== r.label));
    else
      onChange([
        ...selected,
        { label: r.label, description: r.description, mitigation: r.mitigation, level: r.level },
      ]);
  };

  return (
    <div className={styles.splitLayout}>
      <div className={styles.splitForm}>
        <h4 className={styles.splitFormTitle}>Cartographie des risques</h4>
        <div className={styles.suggestionsLabel}>Risques type-spécifiques + transversaux RDC</div>
        <div className={styles.suggestions}>
          {available.map((r) => (
            <button
              key={r.label}
              type="button"
              className={`${styles.suggestionChip} ${isOn(r.label) ? styles.chipSelected : ""}`}
              onClick={() => toggle(r)}
              title={`${r.description} · niveau : ${r.level}`}
            >
              <span className={styles.riskLevel} data-level={r.level} />
              {isOn(r.label) ? "✓ " : "+ "}
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.splitList}>
        <div className={styles.splitListHead}>
          <span>Risques retenus avec mitigation</span>
          <span className="ptn-mono">{selected.length}</span>
        </div>
        <div className={styles.splitListBody}>
          {selected.length === 0 ? (
            <div className={styles.splitListEmpty}>
              Aucun risque cartographié. Au moins 3 risques sont recommandés.
            </div>
          ) : (
            selected.map((r, i) => (
              <div key={r.label} className={styles.listItem}>
                <div className={styles.listIdx} data-level={r.level}>
                  {i + 1}
                </div>
                <div className={styles.listMain}>
                  <p className={styles.listTitle}>
                    <span className={styles.riskLevelTag} data-level={r.level}>
                      {r.level}
                    </span>
                    {r.label}
                  </p>
                  <div className={styles.listMeta}>{r.description}</div>
                  <div className={styles.listMeta}>
                    <strong>Mitigation :</strong> {r.mitigation}
                  </div>
                </div>
                <div className={styles.listActions}>
                  <button
                    type="button"
                    className={`${styles.listIconBtn} ${styles.listIconBtnDanger}`}
                    aria-label="Retirer"
                    onClick={() => onChange(selected.filter((x) => x.label !== r.label))}
                  >
                    <TrashCan size={14} aria-hidden />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

/* ============== Étape 5 — Objectifs & livrables (form gauche · liste droite) ============== */

const OBJECTIVE_TEMPLATES = [
  { title: "Déployer une plateforme opérationnelle", criteria: "Mise en production avec ≥ 99,5 % de disponibilité sur 6 mois" },
  { title: "Renforcer les capacités des agents publics", criteria: "≥ 200 agents certifiés au curriculum sur 12 mois" },
  { title: "Réduire le délai de traitement administratif", criteria: "Délai moyen ramené de X jours à ≤ Y jours (mesuré M+12)" },
  { title: "Étendre la couverture géographique", criteria: "Service disponible dans ≥ N provinces / ≥ N% population" },
  { title: "Atteindre la parité de genre dans les bénéficiaires", criteria: "≥ 30 % de femmes bénéficiaires (cible MEP §3.4)" },
  { title: "Sécuriser les données sensibles", criteria: "Audit ISO 27001 conforme · 0 incident critique sur 12 mois" },
];

const DELIVERABLE_TEMPLATES = [
  { title: "Note de cadrage méthodologique", format: "PDF · 15-20 pages", deadline: "S+4" },
  { title: "Rapport de démarrage (inception)", format: "PDF · 25-40 pages", deadline: "S+6" },
  { title: "Rapport intermédiaire", format: "PDF · 40-60 pages", deadline: "M+6" },
  { title: "Rapport final + synthèse", format: "PDF + restitution PowerPoint", deadline: "M+12" },
  { title: "Plan de transfert de compétences", format: "PDF + livrables type", deadline: "M+10" },
  { title: "Plateforme livrée + documentation technique", format: "Code source + guide ops", deadline: "M+18" },
  { title: "Formation des utilisateurs (ToT)", format: "Sessions + supports", deadline: "M+15" },
];

function ObjectivesStep({
  state,
  set,
}: {
  state: ProposalState;
  set: (s: ProposalState) => void;
}) {
  const [tab, setTab] = useState<"obj" | "del">("obj");

  // Filtrer les items vides initiaux pour l'affichage de la liste
  const objectives = state.objectives.filter((o) => o.title.trim());
  const deliverables = state.deliverables.filter((d) => d.title.trim());

  return (
    <div className={styles.formStack}>
      <div className={styles.objTabs}>
        <button
          type="button"
          className={`${styles.objTab} ${tab === "obj" ? styles.objTabActive : ""}`}
          onClick={() => setTab("obj")}
        >
          <Flag size={14} aria-hidden />
          Objectifs SMART
          <span className={styles.objTabBadge}>{objectives.length}</span>
        </button>
        <button
          type="button"
          className={`${styles.objTab} ${tab === "del" ? styles.objTabActive : ""}`}
          onClick={() => setTab("del")}
        >
          <DocumentBlank size={14} aria-hidden />
          Livrables
          <span className={styles.objTabBadge}>{deliverables.length}</span>
        </button>
      </div>

      {tab === "obj" ? (
        <ObjectiveTab
          items={objectives}
          onAdd={(item) => set({ ...state, objectives: [...objectives, item] })}
          onUpdate={(idx, item) => {
            const next = [...objectives];
            next[idx] = item;
            set({ ...state, objectives: next });
          }}
          onRemove={(idx) =>
            set({ ...state, objectives: objectives.filter((_, i) => i !== idx) })
          }
        />
      ) : (
        <DeliverableTab
          items={deliverables}
          onAdd={(item) => set({ ...state, deliverables: [...deliverables, item] })}
          onUpdate={(idx, item) => {
            const next = [...deliverables];
            next[idx] = item;
            set({ ...state, deliverables: next });
          }}
          onRemove={(idx) =>
            set({ ...state, deliverables: deliverables.filter((_, i) => i !== idx) })
          }
        />
      )}
    </div>
  );
}

function ObjectiveTab({
  items,
  onAdd,
  onUpdate,
  onRemove,
}: {
  items: { title: string; criteria: string }[];
  onAdd: (item: { title: string; criteria: string }) => void;
  onUpdate: (idx: number, item: { title: string; criteria: string }) => void;
  onRemove: (idx: number) => void;
}) {
  const [title, setTitle] = useState("");
  const [criteria, setCriteria] = useState("");
  const [editIdx, setEditIdx] = useState<number | null>(null);

  const reset = () => {
    setTitle("");
    setCriteria("");
    setEditIdx(null);
  };

  const submit = () => {
    if (!title.trim()) return;
    const item = { title: title.trim(), criteria: criteria.trim() };
    if (editIdx !== null) onUpdate(editIdx, item);
    else onAdd(item);
    reset();
  };

  const loadTemplate = (tpl: { title: string; criteria: string }) => {
    setTitle(tpl.title);
    setCriteria(tpl.criteria);
  };

  const startEdit = (idx: number) => {
    const it = items[idx];
    setTitle(it.title);
    setCriteria(it.criteria);
    setEditIdx(idx);
  };

  return (
    <div className={styles.splitLayout}>
      {/* Form gauche */}
      <div className={styles.splitForm}>
        <h4 className={styles.splitFormTitle}>
          {editIdx !== null ? `Modifier l'objectif #${editIdx + 1}` : "Nouvel objectif SMART"}
        </h4>
        <Field label="Énoncé de l'objectif" required>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ex. Déployer une plateforme d'identité numérique"
          />
        </Field>
        <Field
          label="Critère de succès mesurable"
          helper="Spécifique · Mesurable · Atteignable · Réaliste · Temporel"
        >
          <Textarea
            value={criteria}
            onChange={(e) => setCriteria(e.target.value)}
            placeholder="Ex. 1 M citoyens enrôlés en 18 mois, dont ≥ 30 % de femmes"
            rows={3}
          />
        </Field>

        <div>
          <div className={styles.suggestionsLabel}>Modèles d&apos;objectifs PTN-RDC</div>
          <div className={styles.suggestions}>
            {OBJECTIVE_TEMPLATES.map((t, i) => (
              <button
                key={i}
                type="button"
                className={styles.suggestionChip}
                onClick={() => loadTemplate(t)}
              >
                {t.title}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.formActions}>
          {editIdx !== null && (
            <button type="button" className={styles.btnGhost} onClick={reset}>
              Annuler
            </button>
          )}
          <button
            type="button"
            className={styles.btnAdd}
            onClick={submit}
            disabled={!title.trim()}
          >
            <Add size={14} aria-hidden />
            {editIdx !== null ? "Enregistrer" : "Ajouter à la liste"}
          </button>
        </div>
      </div>

      {/* Liste droite */}
      <div className={styles.splitList}>
        <div className={styles.splitListHead}>
          <span>Objectifs définis</span>
          <span className="ptn-mono">{items.length}</span>
        </div>
        <div className={styles.splitListBody}>
          {items.length === 0 ? (
            <div className={styles.splitListEmpty}>
              Aucun objectif défini. Utilisez le formulaire à gauche ou un modèle.
              <br />
              ≥ 1 objectif SMART est requis pour la conformité.
            </div>
          ) : (
            items.map((o, i) => (
              <div
                key={i}
                className={`${styles.listItem} ${editIdx === i ? styles.listItemEditing : ""}`}
                onClick={() => startEdit(i)}
              >
                <div className={styles.listIdx}>{i + 1}</div>
                <div className={styles.listMain}>
                  <p className={styles.listTitle}>{o.title}</p>
                  {o.criteria && <div className={styles.listMeta}>✓ {o.criteria}</div>}
                </div>
                <div className={styles.listActions}>
                  <button
                    type="button"
                    className={styles.listIconBtn}
                    aria-label="Modifier"
                    onClick={(e) => {
                      e.stopPropagation();
                      startEdit(i);
                    }}
                  >
                    <Edit size={14} aria-hidden />
                  </button>
                  <button
                    type="button"
                    className={`${styles.listIconBtn} ${styles.listIconBtnDanger}`}
                    aria-label="Supprimer"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemove(i);
                      if (editIdx === i) reset();
                    }}
                  >
                    <TrashCan size={14} aria-hidden />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function DeliverableTab({
  items,
  onAdd,
  onUpdate,
  onRemove,
}: {
  items: { title: string; format: string; deadline: string }[];
  onAdd: (item: { title: string; format: string; deadline: string }) => void;
  onUpdate: (idx: number, item: { title: string; format: string; deadline: string }) => void;
  onRemove: (idx: number) => void;
}) {
  const [title, setTitle] = useState("");
  const [format, setFormat] = useState("");
  const [deadline, setDeadline] = useState("");
  const [editIdx, setEditIdx] = useState<number | null>(null);

  const reset = () => {
    setTitle("");
    setFormat("");
    setDeadline("");
    setEditIdx(null);
  };

  const submit = () => {
    if (!title.trim()) return;
    const item = { title: title.trim(), format: format.trim(), deadline: deadline.trim() };
    if (editIdx !== null) onUpdate(editIdx, item);
    else onAdd(item);
    reset();
  };

  const loadTemplate = (tpl: { title: string; format: string; deadline: string }) => {
    setTitle(tpl.title);
    setFormat(tpl.format);
    setDeadline(tpl.deadline);
  };

  const startEdit = (idx: number) => {
    const it = items[idx];
    setTitle(it.title);
    setFormat(it.format);
    setDeadline(it.deadline);
    setEditIdx(idx);
  };

  return (
    <div className={styles.splitLayout}>
      <div className={styles.splitForm}>
        <h4 className={styles.splitFormTitle}>
          {editIdx !== null ? `Modifier le livrable #${editIdx + 1}` : "Nouveau livrable"}
        </h4>
        <Field label="Intitulé du livrable" required>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ex. Note de cadrage méthodologique"
          />
        </Field>
        <div className={styles.row2}>
          <Field label="Format">
            <Input
              value={format}
              onChange={(e) => setFormat(e.target.value)}
              placeholder="PDF · Excel · Plateforme…"
            />
          </Field>
          <Field label="Échéance relative" helper="S+N (semaines) · M+N (mois)">
            <Input
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              placeholder="Ex. M+6"
            />
          </Field>
        </div>

        <div>
          <div className={styles.suggestionsLabel}>Modèles de livrables standards</div>
          <div className={styles.suggestions}>
            {DELIVERABLE_TEMPLATES.map((t, i) => (
              <button
                key={i}
                type="button"
                className={styles.suggestionChip}
                onClick={() => loadTemplate(t)}
              >
                {t.title}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.formActions}>
          {editIdx !== null && (
            <button type="button" className={styles.btnGhost} onClick={reset}>
              Annuler
            </button>
          )}
          <button
            type="button"
            className={styles.btnAdd}
            onClick={submit}
            disabled={!title.trim()}
          >
            <Add size={14} aria-hidden />
            {editIdx !== null ? "Enregistrer" : "Ajouter à la liste"}
          </button>
        </div>
      </div>

      <div className={styles.splitList}>
        <div className={styles.splitListHead}>
          <span>Livrables planifiés</span>
          <span className="ptn-mono">{items.length}</span>
        </div>
        <div className={styles.splitListBody}>
          {items.length === 0 ? (
            <div className={styles.splitListEmpty}>
              Aucun livrable défini. Utilisez un modèle pour démarrer rapidement.
              <br />
              ≥ 1 livrable est requis pour la conformité.
            </div>
          ) : (
            items.map((d, i) => (
              <div
                key={i}
                className={`${styles.listItem} ${editIdx === i ? styles.listItemEditing : ""}`}
                onClick={() => startEdit(i)}
              >
                <div className={styles.listIdx}>{i + 1}</div>
                <div className={styles.listMain}>
                  <p className={styles.listTitle}>{d.title}</p>
                  <div className={styles.listMeta}>
                    {d.format && <span>{d.format}</span>}
                    {d.format && d.deadline && <span> · </span>}
                    {d.deadline && <span className="ptn-mono">{d.deadline}</span>}
                  </div>
                </div>
                <div className={styles.listActions}>
                  <button
                    type="button"
                    className={styles.listIconBtn}
                    aria-label="Modifier"
                    onClick={(e) => {
                      e.stopPropagation();
                      startEdit(i);
                    }}
                  >
                    <Edit size={14} aria-hidden />
                  </button>
                  <button
                    type="button"
                    className={`${styles.listIconBtn} ${styles.listIconBtnDanger}`}
                    aria-label="Supprimer"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemove(i);
                      if (editIdx === i) reset();
                    }}
                  >
                    <TrashCan size={14} aria-hidden />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
