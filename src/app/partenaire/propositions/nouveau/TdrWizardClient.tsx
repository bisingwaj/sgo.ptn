"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Wizard, type WizardStep } from "@/components/wizard/Wizard";
import { SubmissionLoader } from "@/components/wizard/SubmissionLoader";
import { useToast } from "@/components/toast/ToastContext";
import {
  Field,
  Input,
  Textarea,
  Segmented,
  SelectableTile,
  CheckRow,
} from "@/components/wizard/WizardFields";
import { DropdownPicker } from "@/components/ui/DropdownPicker";
import {
  AiGenerate,
  CheckmarkFilled,
  WarningAltFilled,
  Locked,
  Document,
  Edit,
  Renew,
  Time,
  Earth,
  TaskApproved,
} from "@carbon/icons-react";
import styles from "./tdr-wizard.module.scss";

export interface TdrState {
  /* Étape 1 — Type d'activité */
  activityType: string;

  /* Étape 2 — Cadrage stratégique */
  composante: string;
  ptbaCode: string;
  contexte: string;
  justification: string;
  beneficiaires: string;

  /* Étape 3 — Objectifs */
  objectifGeneral: string;
  objectifsSpec: string;
  resultatsAttendus: string;

  /* Étape 4 — Méthodologie */
  approche: string;
  methodologie: string;
  contraintes: string;

  /* Étape 5 — Livrables détaillés */
  livrables: string;
  formatLivrables: string;
  rythmeReporting: string;

  /* Étape 6 — Calendrier & expertise */
  dateDebut: string;
  duree: string;
  province: string;
  expertise: string;
  profilsCles: string[];

  /* Étape 7 — Budget */
  budgetTotal: string;
  partIda: string;
  partAfd: string;
  partGouv: string;

  /* Étape 8 — Sauvegardes E&S */
  esCategory: string;
  esRisks: string[];

  /* Étape 9 — Indicateurs cadre résultats */
  indicateurs: string[];

  /* Étape 10 — Risques projet */
  risquesIdentifies: string;
  mitigation: string;

  /* Étape 11 — Validations confirmées */
  consentMep: boolean;
  consentRgpd: boolean;
}

const INITIAL: TdrState = {
  activityType: "",
  composante: "",
  ptbaCode: "",
  contexte: "",
  justification: "",
  beneficiaires: "",
  objectifGeneral: "",
  objectifsSpec: "",
  resultatsAttendus: "",
  approche: "",
  methodologie: "",
  contraintes: "",
  livrables: "",
  formatLivrables: "",
  rythmeReporting: "",
  dateDebut: "",
  duree: "",
  province: "",
  expertise: "",
  profilsCles: [],
  budgetTotal: "",
  partIda: "",
  partAfd: "",
  partGouv: "",
  esCategory: "",
  esRisks: [],
  indicateurs: [],
  risquesIdentifies: "",
  mitigation: "",
  consentMep: false,
  consentRgpd: false,
};

const ACTIVITY_TYPES = [
  {
    id: "amoa",
    tag: "AMOA",
    title: "Assistance à maîtrise d'ouvrage",
    description:
      "Cabinet d'AMOA pour accompagner la conception, la passation et le pilotage d'une activité technique.",
    metrics: "SBQC · ANO BM · ~14 j",
  },
  {
    id: "etude",
    tag: "ÉTUDE",
    title: "Étude / consultance courte",
    description: "Étude technique, juridique, économique ou de marché — livrable rapport.",
    metrics: "CQS / SED · 30-90 j",
  },
  {
    id: "biens",
    tag: "BIENS",
    title: "Acquisition de biens IT / équipements",
    description: "Serveurs, équipements réseau, postes de travail, mobilier technique.",
    metrics: "AOI / AON · 60-120 j",
  },
  {
    id: "travaux",
    tag: "TRAVAUX",
    title: "Travaux de génie civil",
    description: "Construction ou réhabilitation d'infrastructure — datacenter, antenne, fibre.",
    metrics: "AON / AOI · PGES requis",
  },
  {
    id: "formation",
    tag: "FORMATION",
    title: "Formation / atelier",
    description: "Formation des agents, ateliers de cadrage, séminaires de partage.",
    metrics: "MD / CQS · 7-30 j",
  },
  {
    id: "mission",
    tag: "MISSION",
    title: "Mission terrain / représentation",
    description: "Mission de représentation institutionnelle, voyage d'études, conférence.",
    metrics: "MD · 5-15 j",
  },
];

const COMPOSANTES = [
  { value: "C1", label: "C1 · Accès & Inclusion (105 M USD)" },
  { value: "C2", label: "C2 · Fondations Numériques (385 M USD)" },
  { value: "C3", label: "C3 · Compétences & Innovation (95 M USD)" },
  { value: "C4", label: "C4 · Coordination & Gestion (30 M USD)" },
];

const PROFIL_KEYS = [
  { id: "chef", label: "Chef de mission", description: "10 ans d'expérience minimum" },
  { id: "expert-tech", label: "Expert technique sénior", description: "Domaine principal" },
  { id: "expert-junior", label: "Expert technique junior", description: "Appui à la mission" },
  { id: "expert-es", label: "Expert E&S", description: "Sauvegardes environnementales et sociales" },
  { id: "expert-genre", label: "Expert genre & inclusion", description: "Spécifique aux activités sensibles" },
];

const ES_RISKS = [
  { id: "deplacement", title: "Déplacement involontaire / acquisition foncière", level: { label: "Élevé", tone: "red" as const } },
  { id: "biodiversite", title: "Biodiversité / aires protégées", level: { label: "Modéré", tone: "yellow" as const } },
  { id: "patrimoine", title: "Patrimoine culturel", level: { label: "Faible", tone: "green" as const } },
  { id: "travail", title: "Conditions de travail / EAS-HS", level: { label: "Modéré", tone: "yellow" as const } },
  { id: "sante", title: "Santé et sécurité communautaire", level: { label: "Faible", tone: "green" as const } },
];

function buildSteps(): WizardStep<TdrState>[] {
  return [
    /* ===== Étape 1 ===== */
    {
      num: "01",
      label: "Type d'activité",
      sub: "Choisissez la catégorie de votre proposition",
      validate: (s) => (s.activityType ? null : "Sélectionnez un type d'activité."),
      render: (s, set) => (
        <>
          <div className={styles.aiBanner}>
            <div className={styles.aiIco}>
              <AiGenerate size={16} aria-hidden />
            </div>
            <div className={styles.aiBody}>
              <div className={styles.aiTitle}>
                Suggestion IA <span className={styles.aiBadge}>✦ IA</span>
              </div>
              <div className={styles.aiText}>
                D&apos;après votre profil ANIE et vos propositions précédentes, le type{" "}
                <strong>AMOA</strong> est cohérent avec vos activités identité numérique en cours
                (PROP-2026-019, PROP-2026-007). Le délai moyen TDR → ANO sur ce type est de{" "}
                <strong>11 jours</strong>.
              </div>
              <div className={styles.aiMeta}>
                <span>Sources · MEP §4.2 / PTBA-2026-Q2 / 12 TDR validés</span>
                <span>Confiance · 87 %</span>
              </div>
            </div>
          </div>

          <div className={styles.tileGrid}>
            {ACTIVITY_TYPES.map((a) => (
              <SelectableTile
                key={a.id}
                tag={a.tag}
                title={a.title}
                description={a.description}
                metrics={a.metrics}
                selected={s.activityType === a.id}
                onClick={() => set({ ...s, activityType: a.id })}
              />
            ))}
          </div>
        </>
      ),
    },

    /* ===== Étape 2 ===== */
    {
      num: "02",
      label: "Cadrage stratégique",
      sub: "Composante, lien PTBA, contexte et bénéficiaires",
      validate: (s) =>
        s.composante && s.ptbaCode && s.contexte.length >= 50 && s.justification.length >= 30
          ? null
          : "Renseignez composante, code PTBA, contexte (50+ car.) et justification (30+ car.).",
      render: (s, set) => (
        <div className={styles.stepGrid}>
          <div className={`${styles.stepGrid} ${styles.row2}`}>
            <Field
              label="Composante de rattachement"
              required
              helper="Source : PTBA 2026-Q2 — choix conditionne les seuils de procédure."
            >
              <DropdownPicker
                value={s.composante}
                onChange={(v) => set({ ...s, composante: v })}
                options={COMPOSANTES.map((c) => ({ value: c.value, label: c.label }))}
                placeholder="Sélectionnez une composante"
                ariaLabel="Composante de rattachement"
              />
            </Field>

            <Field
              label="Code activité PTBA"
              required
              helper={
                <>
                  Format A<em>x.y.z</em> · Vérification automatique au PTBA en cours.
                </>
              }
            >
              <Input
                value={s.ptbaCode}
                onChange={(e) => set({ ...s, ptbaCode: e.target.value })}
                placeholder="ex. A2.3.1"
              />
            </Field>
          </div>

          <Field
            label="Contexte de l'activité"
            required
            helper="Décrivez l'enjeu institutionnel, le cadre stratégique et l'arrière-plan technique."
          >
            <Textarea
              rows={4}
              value={s.contexte}
              onChange={(e) => set({ ...s, contexte: e.target.value })}
              placeholder="Le ministère du Numérique souhaite déployer une plateforme nationale d'identité…"
            />
          </Field>

          <Field
            label="Justification du besoin"
            required
            helper="Pourquoi cette activité maintenant ? Quel problème résout-elle ?"
          >
            <Textarea
              rows={3}
              value={s.justification}
              onChange={(e) => set({ ...s, justification: e.target.value })}
              placeholder="Sans cette mission AMOA, ANIE ne dispose pas de l'expertise pour piloter…"
            />
          </Field>

          <Field
            label="Bénéficiaires visés"
            helper="Quantifier si possible (nombre, segmentation genre, géographie)."
          >
            <Textarea
              rows={3}
              value={s.beneficiaires}
              onChange={(e) => set({ ...s, beneficiaires: e.target.value })}
              placeholder={`Bénéficiaires directs : 800 agents publics ANIE/MPTN\nBénéficiaires indirects : 95 millions de citoyens dont 48 % de femmes`}
            />
          </Field>

          <div className={styles.mepLock}>
            <Locked size={12} aria-hidden className={styles.mepLockIco} />
            Sections suivantes verrouillées MEP § 4.2 — non éditables
          </div>
        </div>
      ),
    },

    /* ===== Étape 3 — Objectifs ===== */
    {
      num: "03",
      label: "Objectifs",
      sub: "Objectif général, spécifiques et résultats attendus",
      validate: (s) =>
        s.objectifGeneral.length >= 30 && s.objectifsSpec.length >= 30
          ? null
          : "Renseignez l'objectif général et au moins 2 objectifs spécifiques (30 car. minimum chacun).",
      render: (s, set) => (
        <div className={styles.stepGrid}>
          <div className={styles.aiBanner}>
            <div className={styles.aiIco}>
              <AiGenerate size={16} aria-hidden />
            </div>
            <div className={styles.aiBody}>
              <div className={styles.aiTitle}>
                Brouillon des objectifs <span className={styles.aiBadge}>✦ IA</span>
              </div>
              <div className={styles.aiText}>
                D&apos;après votre contexte et 4 TDR similaires (ANO ≤ 12 j), voici un brouillon
                d&apos;objectifs structurés selon le cadre logique Banque mondiale.
              </div>
              <div className={styles.aiMeta}>
                <span>Modèle · claude-opus-4-7</span>
                <span>Confiance · 87 %</span>
              </div>
              <div className={styles.aiActions}>
                <button type="button" className={`${styles.aiBtn} ${styles.aiBtnPrimary}`}>
                  <CheckmarkFilled size={12} aria-hidden /> Accepter le brouillon
                </button>
                <button type="button" className={styles.aiBtn}>
                  <Renew size={12} aria-hidden /> Régénérer
                </button>
                <button type="button" className={styles.aiBtn}>
                  <Edit size={12} aria-hidden /> Éditer manuellement
                </button>
              </div>
            </div>
          </div>

          <div className={styles.aiSection}>
            <div className={styles.aiSectionHeader}>
              <AiGenerate size={12} aria-hidden /> Section générée par IA
            </div>
            <Field
              label="Objectif général"
              required
              helper="Une seule phrase qui résume l'ambition de l'activité."
            >
              <Textarea
                rows={3}
                value={s.objectifGeneral}
                onChange={(e) => set({ ...s, objectifGeneral: e.target.value })}
                placeholder="Doter l'État congolais d'une plateforme d'identité numérique inclusive et conforme ID4D…"
              />
            </Field>
          </div>

          <div className={styles.aiSection}>
            <div className={styles.aiSectionHeader}>
              <AiGenerate size={12} aria-hidden /> Section générée par IA
            </div>
            <Field
              label="Objectifs spécifiques"
              required
              helper="Un objectif par ligne, débutant par un verbe d'action (Concevoir, Accompagner, Former…)."
            >
              <Textarea
                rows={5}
                value={s.objectifsSpec}
                onChange={(e) => set({ ...s, objectifsSpec: e.target.value })}
                placeholder={`O1 · Concevoir l'architecture technique cible et son schéma directeur\nO2 · Accompagner la passation du marché de réalisation (DAO + évaluation)\nO3 · Former les équipes à la gouvernance opérationnelle\nO4 · Définir le plan de continuité d'activité`}
              />
            </Field>
          </div>

          <Field
            label="Résultats attendus / impact"
            helper="Quels indicateurs de succès à 6 mois / 1 an / 4 ans (cadre de résultats projet) ?"
          >
            <Textarea
              rows={4}
              value={s.resultatsAttendus}
              onChange={(e) => set({ ...s, resultatsAttendus: e.target.value })}
              placeholder={`R1 · Architecture cible documentée et validée par le COPIL (J+45)\nR2 · DAO de réalisation publié sans clarification (J+120)\nR3 · 95 % des agents formés certifiés (J+180)`}
            />
          </Field>
        </div>
      ),
    },

    /* ===== Étape 4 — Méthodologie ===== */
    {
      num: "04",
      label: "Méthodologie",
      sub: "Approche, méthodes et contraintes opérationnelles",
      validate: (s) =>
        s.approche.length >= 30
          ? null
          : "Décrivez votre approche méthodologique (30 caractères minimum).",
      render: (s, set) => (
        <div className={styles.stepGrid}>
          <Field
            label="Approche générale"
            required
            helper="Quelle est votre démarche pour atteindre les objectifs ? Phasage, principes."
          >
            <Textarea
              rows={4}
              value={s.approche}
              onChange={(e) => set({ ...s, approche: e.target.value })}
              placeholder={`Phase 1 · Cadrage stratégique (4 semaines)\nPhase 2 · Conception détaillée (8 semaines)\nPhase 3 · Accompagnement passation (12 semaines)\nPhase 4 · Pilotage exécution (continu)`}
            />
          </Field>

          <Field
            label="Méthodologie / outils utilisés"
            helper="Standards, frameworks, outils techniques."
          >
            <Textarea
              rows={4}
              value={s.methodologie}
              onChange={(e) => set({ ...s, methodologie: e.target.value })}
              placeholder={`Cadre · ID4D Banque mondiale, ICAO 9303, NIST biométrique\nMéthodes · ateliers de co-conception, sprints itératifs (Scrum)\nOutils · Archimate (architecture), Confluence (documentation)`}
            />
          </Field>

          <Field
            label="Contraintes & dépendances"
            helper="Autres projets, ressources critiques, dépendances tierces."
          >
            <Textarea
              rows={3}
              value={s.contraintes}
              onChange={(e) => set({ ...s, contraintes: e.target.value })}
              placeholder={`Dépendance fournisseur biométrique (PROP-2025-094)\nDélai légal RDC 2023-006 sur les données personnelles\nFenêtre COPIL semestrielle pour validation`}
            />
          </Field>
        </div>
      ),
    },

    /* ===== Étape 5 — Livrables détaillés ===== */
    {
      num: "05",
      label: "Livrables détaillés",
      sub: "Format, échéancier et rythme de reporting",
      validate: (s) =>
        s.livrables.length >= 30
          ? null
          : "Renseignez au moins 3 livrables avec leur échéance.",
      render: (s, set) => (
        <div className={styles.stepGrid}>
          <Field
            label="Liste des livrables (L1, L2, ...)"
            required
            helper="Un livrable par ligne avec échéance (J+N) et description courte."
          >
            <Textarea
              rows={6}
              value={s.livrables}
              onChange={(e) => set({ ...s, livrables: e.target.value })}
              placeholder={`L1 · Note de cadrage stratégique (J+15) · 20 pages\nL2 · Architecture technique cible (J+45) · 60 pages + annexes\nL3 · DAO complet de réalisation (J+90) · DAO + critères d'évaluation\nL4 · Rapport d'assistance évaluation (J+150) · 40 pages\nL5 · Rapport de pilotage (J+180 puis trimestriel) · 25 pages`}
            />
          </Field>

          <div className={`${styles.stepGrid} ${styles.row2}`}>
            <Field label="Format des livrables" helper="DOCX éditable + PDF signé électroniquement.">
              <DropdownPicker
                value={s.formatLivrables}
                onChange={(v) => set({ ...s, formatLivrables: v })}
                options={[
                  { value: "docx-pdf", label: "DOCX + PDF signé", sub: "Standard UGP" },
                  { value: "pdf", label: "PDF uniquement", sub: "Lecture seule" },
                  { value: "structured", label: "JSON structuré + PDF", sub: "Cas d'usage IA" },
                  { value: "mixed", label: "Mixte (selon livrable)", sub: "À préciser" },
                ]}
                placeholder="Sélectionner le format"
                ariaLabel="Format des livrables"
              />
            </Field>
            <Field label="Rythme de reporting" helper="Fréquence des points d'avancement avec l'UGP.">
              <DropdownPicker
                value={s.rythmeReporting}
                onChange={(v) => set({ ...s, rythmeReporting: v })}
                options={[
                  { value: "weekly", label: "Hebdomadaire", sub: "≤ 6 mois projet" },
                  { value: "biweekly", label: "Bi-mensuel", sub: "Standard" },
                  { value: "monthly", label: "Mensuel", sub: "Projets > 6 mois" },
                  { value: "milestone", label: "Par jalon", sub: "Livrable-driven" },
                ]}
                placeholder="Sélectionner le rythme"
                ariaLabel="Rythme de reporting"
              />
            </Field>
          </div>
        </div>
      ),
    },

    /* ===== Étape 6 ===== */
    {
      num: "06",
      label: "Calendrier & expertise",
      sub: "Profils-clés et planning indicatif",
      validate: (s) =>
        s.dateDebut && s.duree && s.profilsCles.length >= 3
          ? null
          : "Date de démarrage, durée, et au moins 3 profils-clés requis.",
      render: (s, set) => (
        <div className={styles.stepGrid}>
          <div className={`${styles.stepGrid} ${styles.row3}`}>
            <Field label="Date prévisionnelle de démarrage" required>
              <Input
                type="date"
                value={s.dateDebut}
                onChange={(e) => set({ ...s, dateDebut: e.target.value })}
              />
            </Field>
            <Field label="Durée d'exécution" required helper="En jours-homme ou en mois.">
              <Input
                value={s.duree}
                onChange={(e) => set({ ...s, duree: e.target.value })}
                placeholder="ex. 240 j-h sur 9 mois"
              />
            </Field>
            <Field label="Province de mise en œuvre">
              <DropdownPicker
                value={s.province}
                onChange={(v) => set({ ...s, province: v })}
                options={[
                  { value: "kinshasa", label: "Kinshasa", sub: "Capitale" },
                  { value: "kongo-central", label: "Kongo-Central", sub: "Sud-Ouest" },
                  { value: "haut-katanga", label: "Haut-Katanga", sub: "Lubumbashi" },
                  { value: "nord-kivu", label: "Nord-Kivu", sub: "Goma" },
                  { value: "national", label: "Couverture nationale", sub: "26 provinces" },
                ]}
                placeholder="Sélectionner"
                searchable
                ariaLabel="Province de mise en œuvre"
              />
            </Field>
          </div>

          <Field
            label="Domaine d'expertise principal"
            helper="Décrivez le profil de l'institution à recruter."
          >
            <Textarea
              rows={3}
              value={s.expertise}
              onChange={(e) => set({ ...s, expertise: e.target.value })}
              placeholder="Cabinet d'AMOA spécialisé en identité numérique, expérience ID4D, références Afrique centrale…"
            />
          </Field>

          <div>
            <h4 className={styles.sectionTitle}>
              Profils-clés requis <span className="ptn-mono" style={{ color: "var(--cds-text-helper)", fontSize: 11 }}>5 / minimum 3</span>
            </h4>
            <div className={styles.stepGrid}>
              {PROFIL_KEYS.map((p) => (
                <CheckRow
                  key={p.id}
                  checked={s.profilsCles.includes(p.id)}
                  onChange={(next) => {
                    const list = next
                      ? [...s.profilsCles, p.id]
                      : s.profilsCles.filter((x) => x !== p.id);
                    set({ ...s, profilsCles: list });
                  }}
                  title={p.label}
                  description={p.description}
                />
              ))}
            </div>
          </div>
        </div>
      ),
    },

    /* ===== Étape 7 — Budget ===== */
    {
      num: "07",
      label: "Budget & cofinancement",
      sub: "Montant total et répartition par bailleur",
      validate: (s) => (s.budgetTotal ? null : "Renseignez le budget total."),
      render: (s, set) => {
        const total = parseFloat(s.budgetTotal || "0");
        const ida = parseFloat(s.partIda || "0");
        const afd = parseFloat(s.partAfd || "0");
        const gouv = parseFloat(s.partGouv || "0");
        const sum = ida + afd + gouv;

        return (
          <div className={styles.stepGrid}>
            <Field
              label="Budget total estimé (USD)"
              required
              helper="Hors taxes — l'IPR et la TVA sont gérés séparément."
            >
              <Input
                type="number"
                value={s.budgetTotal}
                onChange={(e) => set({ ...s, budgetTotal: e.target.value })}
                placeholder="ex. 8700000"
              />
            </Field>

            <h4 className={styles.sectionTitle}>Répartition cofinancement</h4>

            <table className={styles.budgetTable}>
              <thead>
                <tr>
                  <th>Bailleur</th>
                  <th>Source</th>
                  <th className="right">Montant USD</th>
                  <th className="right">% du total</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Banque mondiale</td>
                  <td className="ptn-mono" style={{ fontSize: 11, color: "var(--cds-text-helper)" }}>IDA · 79 %</td>
                  <td>
                    <input
                      className={styles.budgetInput}
                      type="number"
                      value={s.partIda}
                      onChange={(e) => set({ ...s, partIda: e.target.value })}
                      placeholder="0"
                    />
                  </td>
                  <td className={styles.num} style={{ color: "var(--cds-text-helper)" }}>
                    {total > 0 ? `${((ida / total) * 100).toFixed(1)} %` : "—"}
                  </td>
                </tr>
                <tr>
                  <td>AFD</td>
                  <td className="ptn-mono" style={{ fontSize: 11, color: "var(--cds-text-helper)" }}>Subv · 21 %</td>
                  <td>
                    <input
                      className={styles.budgetInput}
                      type="number"
                      value={s.partAfd}
                      onChange={(e) => set({ ...s, partAfd: e.target.value })}
                      placeholder="0"
                    />
                  </td>
                  <td className={styles.num} style={{ color: "var(--cds-text-helper)" }}>
                    {total > 0 ? `${((afd / total) * 100).toFixed(1)} %` : "—"}
                  </td>
                </tr>
                <tr>
                  <td>Gouvernement RDC</td>
                  <td className="ptn-mono" style={{ fontSize: 11, color: "var(--cds-text-helper)" }}>Contrepartie</td>
                  <td>
                    <input
                      className={styles.budgetInput}
                      type="number"
                      value={s.partGouv}
                      onChange={(e) => set({ ...s, partGouv: e.target.value })}
                      placeholder="0"
                    />
                  </td>
                  <td className={styles.num} style={{ color: "var(--cds-text-helper)" }}>
                    {total > 0 ? `${((gouv / total) * 100).toFixed(1)} %` : "—"}
                  </td>
                </tr>
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={2}>Total saisi</td>
                  <td className={styles.num}>
                    {sum.toLocaleString("fr-FR")} USD
                  </td>
                  <td className={styles.num}>
                    {total > 0
                      ? sum === total
                        ? "100 % ✓"
                        : `Écart ${(total - sum).toLocaleString("fr-FR")}`
                      : "—"}
                  </td>
                </tr>
              </tfoot>
            </table>

            {total > 0 && sum !== total && (
              <div
                style={{
                  background: "var(--ptn-status-warning-surface, #fcf4d6)",
                  borderLeft: "2px solid var(--ptn-status-warning, #f1c21b)",
                  padding: "8px 12px",
                  fontSize: 12,
                  color: "var(--cds-text-primary)",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <WarningAltFilled size={14} aria-hidden />
                La somme des cofinancements ne correspond pas au budget total — corrigez la
                répartition pour passer à l&apos;étape suivante.
              </div>
            )}
          </div>
        );
      },
    },

    /* ===== Étape 8 — Sauvegardes E&S ===== */
    {
      num: "08",
      label: "Sauvegardes E&S",
      sub: "Catégorisation environnementale et sociale",
      validate: (s) => (s.esCategory ? null : "Catégorisez les risques E&S."),
      render: (s, set) => (
        <div className={styles.stepGrid}>
          <Field
            label="Catégorie de risque E&S (auto-évaluée)"
            required
            helper="Conformément au CGES du PTN-RDC. Catégorie modifiable par l'expert UGP."
          >
            <Segmented
              value={s.esCategory}
              onChange={(v) => set({ ...s, esCategory: v })}
              ariaLabel="Catégorie E&S"
              options={[
                { value: "F", label: "Faible" },
                { value: "M", label: "Modéré" },
                { value: "S", label: "Substantiel" },
                { value: "E", label: "Élevé" },
              ]}
            />
          </Field>

          <h4 className={styles.sectionTitle}>
            <Earth size={14} aria-hidden /> Risques identifiés
          </h4>

          <div className={styles.stepGrid}>
            {ES_RISKS.map((r) => (
              <CheckRow
                key={r.id}
                checked={s.esRisks.includes(r.id)}
                onChange={(next) => {
                  const list = next
                    ? [...s.esRisks, r.id]
                    : s.esRisks.filter((x) => x !== r.id);
                  set({ ...s, esRisks: list });
                }}
                title={r.title}
                level={r.level}
              />
            ))}
          </div>
        </div>
      ),
    },

    /* ===== Étape 9 — Indicateurs cadre résultats ===== */
    {
      num: "09",
      label: "Indicateurs cadre résultats",
      sub: "Mesure de l'impact projet (PDO + intermédiaires)",
      render: (s, set) => {
        const INDICATORS = [
          { id: "users", label: "Personnes connectées (cumulatif)", desc: "Indicateur PDO · cible 300 k à 2029" },
          { id: "women", label: "Femmes touchées par les services", desc: "Désagrégation genre · cible 150 k" },
          { id: "provinces", label: "Provinces couvertes", desc: "Sur 26 provinces · cible 26" },
          { id: "agents", label: "Agents publics formés", desc: "Cumulatif depuis démarrage · cible 1 200" },
          { id: "uptime", label: "Taux de disponibilité services", desc: "Mesure qualité · cible 99,5 %" },
          { id: "satisfaction", label: "Satisfaction utilisateurs", desc: "Enquête trimestrielle · cible 80 %" },
          { id: "interop", label: "Services interopérables", desc: "Cumulatif · cible 50 services" },
        ];
        return (
          <div className={styles.stepGrid}>
            <div
              style={{
                background: "var(--cds-layer-accent-01)",
                padding: "10px 14px",
                fontSize: 12,
                color: "var(--cds-text-secondary)",
                lineHeight: 1.5,
                display: "flex",
                gap: 10,
                alignItems: "flex-start",
              }}
            >
              <CheckmarkFilled
                size={14}
                aria-hidden
                style={{ color: "var(--ptn-status-success)", flexShrink: 0, marginTop: 2 }}
              />
              <div>
                Cochez les <strong>indicateurs du cadre de résultats projet</strong> impactés par
                cette activité. Vous serez tenu de les renseigner dans vos rapports semestriels.
              </div>
            </div>
            {INDICATORS.map((ind) => (
              <CheckRow
                key={ind.id}
                checked={s.indicateurs.includes(ind.id)}
                onChange={(next) => {
                  const list = next
                    ? [...s.indicateurs, ind.id]
                    : s.indicateurs.filter((x) => x !== ind.id);
                  set({ ...s, indicateurs: list });
                }}
                title={ind.label}
                description={ind.desc}
              />
            ))}
          </div>
        );
      },
    },

    /* ===== Étape 10 — Risques projet ===== */
    {
      num: "10",
      label: "Risques projet",
      sub: "Identification + plan de mitigation",
      render: (s, set) => (
        <div className={styles.stepGrid}>
          <Field
            label="Risques identifiés"
            helper="Format : R1 · Description · Probabilité (F/M/E) · Impact (F/M/E)"
          >
            <Textarea
              rows={5}
              value={s.risquesIdentifies}
              onChange={(e) => set({ ...s, risquesIdentifies: e.target.value })}
              placeholder={`R1 · Délai validation interne ANIE plus long que prévu · Probabilité M · Impact M\nR2 · Indisponibilité fournisseur biométrique · Probabilité F · Impact E\nR3 · Évolution réglementaire RDC sur données personnelles · Probabilité M · Impact E`}
            />
          </Field>

          <Field
            label="Plan de mitigation"
            helper="Pour chaque risque, action préventive ou contournement prévu."
          >
            <Textarea
              rows={5}
              value={s.mitigation}
              onChange={(e) => set({ ...s, mitigation: e.target.value })}
              placeholder={`R1 · Comité de pilotage hebdomadaire ANIE\nR2 · Mise en place d'un fournisseur secondaire qualifié\nR3 · Veille juridique active + clause d'adaptation contractuelle`}
            />
          </Field>

          <div
            style={{
              background: "var(--cds-layer-accent-01)",
              padding: "10px 14px",
              fontSize: 12,
              color: "var(--cds-text-secondary)",
              display: "flex",
              gap: 10,
              alignItems: "flex-start",
            }}
          >
            <Locked size={14} aria-hidden style={{ flexShrink: 0, marginTop: 2 }} />
            <div>
              Section facultative mais fortement recommandée — un TDR avec analyse de risques
              obtient en moyenne <strong>2,8 jours</strong> de délai ANO en moins.
            </div>
          </div>
        </div>
      ),
    },

    /* ===== Étape 11 — Cohérence MEP/PTBA ===== */
    {
      num: "11",
      label: "Cohérence MEP/PTBA",
      sub: "Vérifications déterministes — cas d'usage IA #6",
      render: (s) => {
        const total = parseFloat(s.budgetTotal || "0");
        const rules = [
          {
            ok: !!s.ptbaCode,
            warn: false,
            err: !s.ptbaCode,
            title: "Activité enregistrée au PTBA en cours",
            sub: s.ptbaCode ? `Code ${s.ptbaCode} · validé contre PTBA-2026-Q2` : "Aucun code activité fourni",
            status: s.ptbaCode ? "Conforme" : "Bloquant",
          },
          {
            ok: total <= 50_000_000,
            warn: total > 5_000_000 && total <= 50_000_000,
            err: total > 50_000_000,
            title: "Seuil de procédure compatible",
            sub:
              total > 5_000_000
                ? "Procédure AOI obligatoire · ANO préalable Banque mondiale"
                : "Procédure AON / SBQC selon type d'activité",
            status: total > 5_000_000 ? "Vigilance" : "Conforme",
          },
          {
            ok: s.composante !== "",
            warn: false,
            err: s.composante === "",
            title: "Composante MEP référencée",
            sub: s.composante ? `${s.composante} · MEP §3.${s.composante.replace("C", "")}` : "Composante manquante",
            status: s.composante ? "Conforme" : "Bloquant",
          },
          {
            ok: s.esCategory !== "" && s.esCategory !== "E",
            warn: s.esCategory === "S" || s.esCategory === "E",
            err: false,
            title: "Plan de sauvegarde E&S — niveau requis",
            sub:
              s.esCategory === "E"
                ? "PEES + PMPP + PGMO requis · délai 30 j supplémentaires"
                : s.esCategory === "S"
                  ? "PEES requis · délai 14 j supplémentaires"
                  : s.esCategory === "M"
                    ? "Procédures simplifiées · screening UGP"
                    : "Auto-évaluation suffisante",
            status:
              s.esCategory === "E"
                ? "Vigilance"
                : s.esCategory === "S"
                  ? "Vigilance"
                  : "Conforme",
          },
          {
            ok: s.profilsCles.length >= 3,
            warn: false,
            err: s.profilsCles.length < 3,
            title: "Profils-clés conformes (minimum 3)",
            sub: `${s.profilsCles.length} profil${s.profilsCles.length > 1 ? "s" : ""} sélectionné${s.profilsCles.length > 1 ? "s" : ""}`,
            status: s.profilsCles.length >= 3 ? "Conforme" : "Bloquant",
          },
        ];

        return (
          <div className={styles.stepGrid}>
            <div className={styles.kpiStrip}>
              <div className={styles.kpi}>
                <div className={styles.kpiK}>Règles vérifiées</div>
                <div className={styles.kpiV}>{rules.length}</div>
              </div>
              <div className={styles.kpi}>
                <div className={styles.kpiK}>Conformes</div>
                <div className={styles.kpiV} style={{ color: "var(--ptn-status-success)" }}>
                  {rules.filter((r) => r.ok && !r.warn).length}
                </div>
              </div>
              <div className={styles.kpi}>
                <div className={styles.kpiK}>À traiter</div>
                <div className={styles.kpiV} style={{ color: "var(--ptn-status-warning)" }}>
                  {rules.filter((r) => r.warn || r.err).length}
                </div>
              </div>
            </div>

            <div className={styles.rules}>
              {rules.map((r, i) => (
                <div key={i} className={styles.rule}>
                  <div className={styles.ruleIco}>
                    {r.err ? (
                      <span className={styles.ruleIcoErr}>
                        <WarningAltFilled size={20} aria-hidden />
                      </span>
                    ) : r.warn ? (
                      <span className={styles.ruleIcoWarn}>
                        <WarningAltFilled size={20} aria-hidden />
                      </span>
                    ) : (
                      <span className={styles.ruleIcoOk}>
                        <CheckmarkFilled size={20} aria-hidden />
                      </span>
                    )}
                  </div>
                  <div>
                    <div className={styles.ruleTitle}>{r.title}</div>
                    <div className={styles.ruleSub}>{r.sub}</div>
                  </div>
                  <div
                    className={`${styles.ruleStatus} ${
                      r.err ? styles.ruleStatusErr : r.warn ? styles.ruleStatusWarn : styles.ruleStatusOk
                    }`}
                  >
                    {r.status}
                  </div>
                </div>
              ))}
            </div>

            <div className={styles.mepLock}>
              <Locked size={12} aria-hidden className={styles.mepLockIco} /> Audit trail · règles
              YAML versionnées · v 2026.05.01
            </div>
          </div>
        );
      },
    },

    /* ===== Étape 12 — Récapitulatif ===== */
    {
      num: "12",
      label: "Récapitulatif & soumission",
      sub: "Vérifiez puis soumettez à l'UGP",
      validate: (s) =>
        s.consentMep && s.consentRgpd
          ? null
          : "Cochez les deux consentements pour soumettre la proposition.",
      render: (s, set) => {
        const activity = ACTIVITY_TYPES.find((a) => a.id === s.activityType);
        return (
          <div className={styles.stepGrid}>
            <div className={styles.recap}>
              <div className={styles.recapRow}>
                <div className={styles.recapK}>Type d&apos;activité</div>
                <div className={styles.recapV}>
                  {activity ? (
                    <>
                      <span className="ptn-mono" style={{ color: "var(--cds-text-helper)", marginRight: 8 }}>
                        {activity.tag}
                      </span>
                      {activity.title}
                    </>
                  ) : (
                    "—"
                  )}
                </div>
                <button type="button" className={styles.recapEdit}>
                  Modifier
                </button>
              </div>
              <div className={styles.recapRow}>
                <div className={styles.recapK}>Composante / PTBA</div>
                <div className={styles.recapV}>
                  {s.composante || "—"} · <span className="ptn-mono">{s.ptbaCode || "—"}</span>
                </div>
                <button type="button" className={styles.recapEdit}>
                  Modifier
                </button>
              </div>
              <div className={styles.recapRow}>
                <div className={styles.recapK}>Justification</div>
                <div
                  className={styles.recapV}
                  style={{
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    lineHeight: 1.4,
                  }}
                >
                  {s.justification || "—"}
                </div>
                <button type="button" className={styles.recapEdit}>
                  Modifier
                </button>
              </div>
              <div className={styles.recapRow}>
                <div className={styles.recapK}>Bénéficiaires</div>
                <div
                  className={styles.recapV}
                  style={{
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    lineHeight: 1.4,
                  }}
                >
                  {s.beneficiaires || "—"}
                </div>
                <button type="button" className={styles.recapEdit}>
                  Modifier
                </button>
              </div>
              <div className={styles.recapRow}>
                <div className={styles.recapK}>Objectifs</div>
                <div className={styles.recapV}>
                  {s.objectifGeneral ? "Objectif général + " : "—"}
                  {s.objectifsSpec
                    ? `${
                        s.objectifsSpec.split("\n").filter((l) => l.trim()).length
                      } objectifs spécifiques`
                    : "0 objectif spécifique"}
                  {s.resultatsAttendus ? " · résultats attendus définis" : ""}
                </div>
                <button type="button" className={styles.recapEdit}>
                  Modifier
                </button>
              </div>
              <div className={styles.recapRow}>
                <div className={styles.recapK}>Méthodologie</div>
                <div className={styles.recapV}>
                  {s.approche ? "Approche définie" : "—"}
                  {s.methodologie ? " · méthodes/outils précisés" : ""}
                  {s.contraintes ? " · contraintes identifiées" : ""}
                </div>
                <button type="button" className={styles.recapEdit}>
                  Modifier
                </button>
              </div>
              <div className={styles.recapRow}>
                <div className={styles.recapK}>Livrables</div>
                <div className={styles.recapV}>
                  {s.livrables
                    ? `${
                        s.livrables.split("\n").filter((l) => l.trim()).length
                      } livrables`
                    : "—"}
                  {s.formatLivrables ? ` · ${s.formatLivrables}` : ""}
                  {s.rythmeReporting ? ` · reporting ${s.rythmeReporting}` : ""}
                </div>
                <button type="button" className={styles.recapEdit}>
                  Modifier
                </button>
              </div>
              <div className={styles.recapRow}>
                <div className={styles.recapK}>Calendrier</div>
                <div className={styles.recapV}>
                  Démarrage <span className="ptn-mono">{s.dateDebut || "—"}</span> · Durée{" "}
                  {s.duree || "—"}
                  {s.province ? ` · ${s.province}` : ""}
                </div>
                <button type="button" className={styles.recapEdit}>
                  Modifier
                </button>
              </div>
              <div className={styles.recapRow}>
                <div className={styles.recapK}>Profils-clés</div>
                <div className={styles.recapV}>
                  {s.profilsCles.length} profil{s.profilsCles.length > 1 ? "s" : ""} sélectionné
                  {s.profilsCles.length > 1 ? "s" : ""}
                </div>
                <button type="button" className={styles.recapEdit}>
                  Modifier
                </button>
              </div>
              <div className={styles.recapRow}>
                <div className={styles.recapK}>Budget total</div>
                <div className={styles.recapV}>
                  <span className="ptn-mono">
                    {s.budgetTotal
                      ? `${parseFloat(s.budgetTotal).toLocaleString("fr-FR")} USD`
                      : "—"}
                  </span>
                </div>
                <button type="button" className={styles.recapEdit}>
                  Modifier
                </button>
              </div>
              <div className={styles.recapRow}>
                <div className={styles.recapK}>Catégorie E&S</div>
                <div className={styles.recapV}>
                  {{ F: "Faible", M: "Modéré", S: "Substantiel", E: "Élevé" }[s.esCategory] ?? "—"}{" "}
                  · {s.esRisks.length} risque{s.esRisks.length > 1 ? "s" : ""} identifié
                  {s.esRisks.length > 1 ? "s" : ""}
                </div>
                <button type="button" className={styles.recapEdit}>
                  Modifier
                </button>
              </div>
              <div className={styles.recapRow}>
                <div className={styles.recapK}>Indicateurs</div>
                <div className={styles.recapV}>
                  {s.indicateurs.length} indicateur
                  {s.indicateurs.length > 1 ? "s" : ""} du cadre de résultats coché
                  {s.indicateurs.length > 1 ? "s" : ""}
                </div>
                <button type="button" className={styles.recapEdit}>
                  Modifier
                </button>
              </div>
              <div className={styles.recapRow}>
                <div className={styles.recapK}>Risques projet</div>
                <div className={styles.recapV}>
                  {s.risquesIdentifies ? "Risques identifiés" : "Non renseigné"}
                  {s.mitigation ? " · plan de mitigation défini" : ""}
                </div>
                <button type="button" className={styles.recapEdit}>
                  Modifier
                </button>
              </div>
            </div>

            <div className={styles.sectionDivider} />

            <CheckRow
              checked={s.consentMep}
              onChange={(v) => set({ ...s, consentMep: v })}
              title="J'atteste que cette proposition respecte le MEP du PTN-RDC du 23 juin 2025"
              description="Toute non-conformité détectée pourra entraîner un retour pour corrections par l'UGP."
            />
            <CheckRow
              checked={s.consentRgpd}
              onChange={(v) => set({ ...s, consentRgpd: v })}
              title="J'autorise le journal d'audit IA et la conservation 5 ans après clôture du projet"
              description="Conforme à la Loi RDC 2023 sur la protection des données et à ISO/IEC 42001."
            />
          </div>
        );
      },
    },
  ];
}

export interface TdrWizardClientProps {
  mode?: "create" | "edit";
  propRef?: string;
  initial?: Partial<TdrState>;
}

export function TdrWizardClient({ mode = "create", propRef, initial }: TdrWizardClientProps = {}) {
  const router = useRouter();
  const { toast } = useToast();
  const [loaderOpen, setLoaderOpen] = useState(false);
  const steps = buildSteps();
  const initialState: TdrState = { ...INITIAL, ...(initial ?? {}) };
  const isEdit = mode === "edit";
  const targetRef = propRef ?? "PROP-2026-019";

  return (
    <>
    <Wizard<TdrState>
      eyebrow={
        isEdit
          ? `ANIE · ÉDITION ${propRef ?? "PROPOSITION"}`
          : "ANIE · NOUVELLE PROPOSITION TDR"
      }
      title={isEdit ? "Modifier la proposition" : "Assistant de rédaction TDR"}
      subtitle={
        isEdit
          ? "Modification d'une proposition existante. Les changements seront soumis à un nouvel arbitrage UGP."
          : "Wizard guidé par IA — génération conforme MEP, validation déterministe PTBA, audit trail complet."
      }
      steps={steps}
      initialState={initialState}
      cancelHref={
        isEdit && propRef
          ? `/partenaire/propositions/${propRef}`
          : "/partenaire/propositions"
      }
      finishLabel={isEdit ? "Enregistrer les modifications" : "Soumettre à l'UGP"}
      headerTrailing={
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, color: "var(--cds-text-helper)" }}>
          <Document size={14} aria-hidden />
          <span className="ptn-mono">{propRef ?? "PROP-2026-DRAFT-019"}</span>
          <span>·</span>
          <Time size={14} aria-hidden />
          <span>{isEdit ? "Édition" : "~12 min"}</span>
          <span>·</span>
          <TaskApproved size={14} aria-hidden style={{ color: "var(--ptn-status-ai)" }} />
          <span style={{ color: "var(--ptn-status-ai)" }}>Assistance IA active</span>
        </div>
      }
      onFinish={async () => {
        // Édition rapide : pas de loader IA (juste un toast)
        if (isEdit) {
          await new Promise((r) => setTimeout(r, 400));
          toast({
            tone: "success",
            title: "Proposition mise à jour",
            message: `Vos modifications sur ${targetRef} ont été enregistrées et signalées au référent UGP.`,
            action: {
              label: "Ouvrir le détail",
              onClick: () => router.push(`/partenaire/propositions/${targetRef}`),
            },
            duration: 6000,
          });
          router.push(`/partenaire/propositions/${targetRef}`);
          return;
        }

        // Création : pipeline d'analyse IA visible (overlay loader)
        setLoaderOpen(true);
        // La redirection + toast se font dans onComplete du loader
      }}
    />

    <SubmissionLoader
      open={loaderOpen}
      propRef={targetRef}
      detailHref={`/partenaire/propositions/${targetRef}`}
      homeHref="/partenaire"
      onComplete={() => {
        // Toast léger en plus du panneau (audit / journal)
        toast({
          tone: "success",
          title: "Proposition transmise à l'UGP",
          message: `Réf. ${targetRef} · arbitrage UGP sous 7 j ouvrables.`,
          duration: 5000,
        });
      }}
      onClose={() => setLoaderOpen(false)}
    />
    </>
  );
}
