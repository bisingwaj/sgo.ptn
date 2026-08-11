"use client";

import { useRouter } from "next/navigation";
import { Wizard, type WizardStep } from "@/components/wizard/Wizard";
import { useToast } from "@/components/toast/ToastContext";
import {
  Field,
  Textarea,
  Segmented,
  SelectableTile,
  CheckRow,
} from "@/components/wizard/WizardFields";
import { DropdownPicker } from "@/components/ui/DropdownPicker";
import {
  AiGenerate,
  Document,
  Activity,
  Time,
  Renew,
} from "@carbon/icons-react";

interface RapportState {
  type: string;
  period: string;
  proposition: string;
  resume: string;
  realisations: string;
  difficultes: string;
  perspectives: string;
  indicators: string[];
  consent: boolean;
}

const INITIAL: RapportState = {
  type: "",
  period: "",
  proposition: "",
  resume: "",
  realisations: "",
  difficultes: "",
  perspectives: "",
  indicators: [],
  consent: false,
};

const TYPES = [
  {
    id: "semestriel",
    tag: "SEMESTRE",
    title: "Rapport semestriel",
    description: "Rapport périodique sur l'ensemble de l'activité du partenaire (S1 ou S2).",
    metrics: "8 sections · brouillon IA disponible",
  },
  {
    id: "annuel",
    tag: "ANNEE",
    title: "Rapport annuel",
    description: "Synthèse annuelle consolidée — soumise au Comité de Pilotage avant 28 février.",
    metrics: "12 sections · COPIL",
  },
  {
    id: "livrable",
    tag: "LIVRABLE",
    title: "Livrable de proposition",
    description: "Livrable contractuel d'une proposition (note, rapport, étude, formation).",
    metrics: "1 livrable = 1 rapport · J+15 à J+180",
  },
  {
    id: "mission",
    tag: "MISSION",
    title: "Rapport de mission",
    description: "Compte rendu d'une mission terrain, atelier, voyage d'études ou conférence.",
    metrics: "5 sections · J+15",
  },
];

const INDICATORS = [
  { id: "users", title: "Personnes connectées (cumulatif)", description: "Nombre cumulatif d'utilisateurs uniques des services PTN" },
  { id: "women", title: "Femmes touchées par les services", description: "Désagrégation genre — exigence cadre de résultats" },
  { id: "provinces", title: "Provinces couvertes", description: "Sur 26 provinces de la RDC" },
  { id: "agents", title: "Agents publics formés", description: "Cumulatif depuis le démarrage du projet" },
  { id: "sbp", title: "Bénéficiaires SBP touchés", description: "Hubs locaux, écoles, centres de santé" },
  { id: "uptime", title: "Taux de disponibilité services", description: "Mesure de qualité de service" },
];

function buildSteps(): WizardStep<RapportState>[] {
  return [
    {
      num: "01",
      label: "Type de rapport",
      sub: "Choisissez le type de rapport à produire",
      validate: (s) => (s.type ? null : "Sélectionnez un type."),
      render: (s, set) => (
        <>
          <div
            style={{
              display: "flex",
              gap: 12,
              padding: "14px 16px",
              background: "var(--ptn-status-ai-surface)",
              borderLeft: "2px solid var(--ptn-status-ai)",
              marginBottom: 16,
              alignItems: "flex-start",
            }}
          >
            <div
              style={{
                width: 28,
                height: 28,
                background: "var(--cds-layer)",
                display: "grid",
                placeItems: "center",
                color: "var(--ptn-status-ai)",
                flexShrink: 0,
              }}
            >
              <AiGenerate size={16} aria-hidden />
            </div>
            <div>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 500,
                  marginBottom: 4,
                  color: "var(--cds-text-primary)",
                }}
              >
                Pré-remplissage IA disponible{" "}
                <span
                  style={{
                    background: "var(--ptn-status-ai)",
                    color: "#fff",
                    fontSize: 10,
                    padding: "1px 6px",
                    marginLeft: 4,
                    fontFamily: "var(--font-ibm-plex-sans)",
                  }}
                >
                  ✦ IA
                </span>
              </div>
              <div style={{ fontSize: 12, color: "var(--cds-text-secondary)", lineHeight: 1.5 }}>
                Selon le type choisi, l&apos;assistant IA pré-remplit jusqu&apos;à 64 % des
                sections à partir de vos propositions, livrables et indicateurs déjà saisis. Toute
                section générée par IA est marquée et auditée.
              </div>
            </div>
          </div>

          <div
            style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8 }}
          >
            {TYPES.map((t) => (
              <SelectableTile
                key={t.id}
                tag={t.tag}
                title={t.title}
                description={t.description}
                metrics={t.metrics}
                selected={s.type === t.id}
                onClick={() => set({ ...s, type: t.id })}
              />
            ))}
          </div>
        </>
      ),
    },
    {
      num: "02",
      label: "Période & rattachement",
      sub: "Période couverte et proposition liée",
      validate: (s) => (s.period ? null : "Renseignez la période couverte."),
      render: (s, set) => (
        <div style={{ display: "grid", gap: 16 }}>
          <Field label="Période couverte" required>
            <Segmented
              value={s.period}
              onChange={(v) => set({ ...s, period: v })}
              ariaLabel="Période"
              options={
                s.type === "semestriel"
                  ? [
                      { value: "s1-2026", label: "S1 2026" },
                      { value: "s2-2025", label: "S2 2025" },
                      { value: "autre", label: "Autre" },
                    ]
                  : s.type === "annuel"
                    ? [
                        { value: "2026", label: "2026" },
                        { value: "2025", label: "2025" },
                      ]
                    : [
                        { value: "q1-2026", label: "Q1 2026" },
                        { value: "q2-2026", label: "Q2 2026" },
                        { value: "ponctuel", label: "Ponctuel" },
                      ]
              }
            />
          </Field>

          <Field label="Proposition rattachée (facultatif)">
            <DropdownPicker
              value={s.proposition}
              onChange={(v) => set({ ...s, proposition: v })}
              options={[
                { value: "", label: "Aucune (rapport général partenaire)", sub: "Tous projets" },
                { value: "PROP-2026-019", label: "Plateforme identité numérique", sub: "PROP-2026-019" },
                { value: "PROP-2026-014", label: "PGES Datacenter Tier-3", sub: "PROP-2026-014" },
                { value: "PROP-2026-011", label: "Atelier ID4Africa", sub: "PROP-2026-011" },
                { value: "PROP-2026-007", label: "Modernisation registre", sub: "PROP-2026-007" },
              ]}
              placeholder="Sélectionner une proposition"
              searchable
              ariaLabel="Proposition rattachée"
            />
          </Field>
        </div>
      ),
    },
    {
      num: "03",
      label: "Sections rédigées",
      sub: "Brouillon IA pré-rempli — éditable",
      render: (s, set) => (
        <div style={{ display: "grid", gap: 16 }}>
          <div
            style={{
              display: "flex",
              gap: 12,
              padding: "12px 14px",
              background: "var(--ptn-status-ai-surface)",
              borderLeft: "2px solid var(--ptn-status-ai)",
              alignItems: "center",
            }}
          >
            <AiGenerate size={16} aria-hidden style={{ color: "var(--ptn-status-ai)", flexShrink: 0 }} />
            <div style={{ flex: 1, fontSize: 12, color: "var(--cds-text-secondary)" }}>
              Brouillon généré à partir de 4 propositions et 8 livrables soumis ce semestre ·
              Confiance 87 % · Modèle <span className="ptn-mono">claude-opus-4-7</span>
            </div>
            <button
              type="button"
              style={{
                background: "var(--cds-layer)",
                border: "1px solid var(--cds-border-subtle)",
                padding: "4px 10px",
                fontSize: 12,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <Renew size={12} aria-hidden /> Régénérer
            </button>
          </div>

          <Field label="Résumé exécutif" helper="Maximum 250 mots — lu par les bailleurs.">
            <Textarea
              rows={5}
              value={s.resume}
              onChange={(e) => set({ ...s, resume: e.target.value })}
              placeholder="Au cours du semestre 1 2026, ANIE a soumis 4 propositions au PTBA dont une AMOA Identité numérique de 8,7 M USD…"
            />
          </Field>

          <Field label="Réalisations principales">
            <Textarea
              rows={6}
              value={s.realisations}
              onChange={(e) => set({ ...s, realisations: e.target.value })}
              placeholder={`R1 · Soumission de la proposition AMOA Plateforme identité (8,7 M USD)…\nR2 · Atelier ID4Africa Abidjan — 5 délégués formés…`}
            />
          </Field>

          <Field
            label="Difficultés rencontrées"
            helper="Identification honnête des obstacles — la Banque mondiale valorise la transparence."
          >
            <Textarea
              rows={4}
              value={s.difficultes}
              onChange={(e) => set({ ...s, difficultes: e.target.value })}
              placeholder="D1 · Délais de validation interne ANIE plus longs que prévus sur les TDR techniques…"
            />
          </Field>

          <Field label="Perspectives S2 2026">
            <Textarea
              rows={4}
              value={s.perspectives}
              onChange={(e) => set({ ...s, perspectives: e.target.value })}
              placeholder="Au S2, ANIE prévoit le démarrage de la mission AMOA, le lancement du DAO datacenter…"
            />
          </Field>
        </div>
      ),
    },
    {
      num: "04",
      label: "Indicateurs cadre résultats",
      sub: "Indicateurs à renseigner pour ce rapport",
      render: (s, set) => (
        <div style={{ display: "grid", gap: 12 }}>
          <div
            style={{
              fontSize: 12,
              color: "var(--cds-text-secondary)",
              lineHeight: 1.5,
              padding: "10px 14px",
              background: "var(--cds-layer-accent-01)",
            }}
          >
            <Activity size={14} aria-hidden style={{ verticalAlign: "middle", marginRight: 8 }} />
            Cochez les indicateurs concernés par votre activité ce semestre. Les valeurs seront
            saisies dans la section dédiée du rapport.
          </div>

          <div style={{ display: "grid", gap: 8 }}>
            {INDICATORS.map((ind) => (
              <CheckRow
                key={ind.id}
                checked={s.indicators.includes(ind.id)}
                onChange={(next) => {
                  const list = next
                    ? [...s.indicators, ind.id]
                    : s.indicators.filter((x) => x !== ind.id);
                  set({ ...s, indicators: list });
                }}
                title={ind.title}
                description={ind.description}
              />
            ))}
          </div>
        </div>
      ),
    },
    {
      num: "05",
      label: "Soumission",
      sub: "Vérifiez puis soumettez à l'UGP",
      validate: (s) => (s.consent ? null : "Vous devez attester l'exactitude des informations."),
      render: (s, set) => {
        const type = TYPES.find((t) => t.id === s.type);
        return (
          <div style={{ display: "grid", gap: 16 }}>
            <div
              style={{
                background: "var(--cds-layer)",
                border: "1px solid var(--cds-border-subtle)",
              }}
            >
              <Recap label="Type" value={type?.title ?? "—"} />
              <Recap label="Période" value={s.period || "—"} />
              <Recap
                label="Proposition liée"
                value={s.proposition || "Aucune (rapport général)"}
              />
              <Recap
                label="Indicateurs"
                value={`${s.indicators.length} indicateur${s.indicators.length > 1 ? "s" : ""} sélectionné${s.indicators.length > 1 ? "s" : ""}`}
              />
              <Recap
                label="Sections IA"
                value={
                  <>
                    Résumé · Réalisations · Difficultés · Perspectives ·{" "}
                    <span
                      style={{
                        background: "var(--ptn-status-ai-surface)",
                        color: "var(--ptn-status-ai)",
                        fontSize: 10,
                        padding: "1px 6px",
                      }}
                    >
                      ✦ IA validé manuellement
                    </span>
                  </>
                }
              />
            </div>

            <CheckRow
              checked={s.consent}
              onChange={(v) => set({ ...s, consent: v })}
              title="J'atteste l'exactitude des informations renseignées"
              description="Toute information manifestement erronée pourra entraîner un retour à l'UGP et un retard du cycle de validation."
            />
          </div>
        );
      },
    },
  ];
}

function Recap({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "180px 1fr",
        gap: 16,
        padding: "12px 16px",
        borderBottom: "1px solid var(--cds-border-subtle)",
        fontSize: 13,
        alignItems: "baseline",
      }}
    >
      <span
        style={{
          fontSize: 11,
          textTransform: "uppercase",
          letterSpacing: "0.32px",
          color: "var(--cds-text-helper)",
        }}
      >
        {label}
      </span>
      <span>{value}</span>
    </div>
  );
}

export function RapportWizardClient() {
  const router = useRouter();
  const { toast } = useToast();
  const steps = buildSteps();

  return (
    <Wizard<RapportState>
      eyebrow="ANIE · NOUVEAU RAPPORT"
      title="Créer un rapport"
      subtitle="Wizard guidé par IA — pré-remplissage à partir de vos propositions, livrables et indicateurs."
      steps={steps}
      initialState={INITIAL}
      cancelHref="/partenaire/reporting"
      finishLabel="Soumettre à l'UGP"
      headerTrailing={
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, color: "var(--cds-text-helper)" }}>
          <Document size={14} aria-hidden />
          <span className="ptn-mono">RPT-2026-DRAFT</span>
          <span>·</span>
          <Time size={14} aria-hidden />
          <span>~8 min</span>
          <span>·</span>
          <AiGenerate size={14} aria-hidden style={{ color: "var(--ptn-status-ai)" }} />
          <span style={{ color: "var(--ptn-status-ai)" }}>Brouillon IA prêt</span>
        </div>
      }
      onFinish={async () => {
        await new Promise((r) => setTimeout(r, 400));
        toast({
          tone: "success",
          title: "Rapport soumis à l'UGP",
          message:
            "Délai moyen de revue UGP : 4,2 j. Vous serez notifié dès la validation ou le retour pour modifications.",
          duration: 5000,
        });
        router.push("/partenaire/reporting");
      }}
    />
  );
}
