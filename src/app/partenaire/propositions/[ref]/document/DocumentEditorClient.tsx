"use client";

import { useState } from "react";
import {
  AiGenerate,
  Save,
  Download,
  Document,
  Edit,
  Renew,
  Send,
  Locked,
  CheckmarkFilled,
  Time,
} from "@carbon/icons-react";
import { RichEditor, type AiDiff } from "@/components/editor/RichEditor";
import { useToast } from "@/components/toast/ToastContext";
import { SubmissionLoader } from "@/components/wizard/SubmissionLoader";
import styles from "./document.module.scss";

interface DraftDoc {
  id: string;
  name: string;
  meta: string;
  status: "active" | "draft" | "signed";
}

interface DocumentEditorClientProps {
  propRef: string;
}

const DRAFTS: DraftDoc[] = [
  { id: "v3", name: "TDR v3 — version finale", meta: "08 mai · 1,2 Mo", status: "active" },
  { id: "v2", name: "TDR v2", meta: "01 mai · 1,1 Mo", status: "draft" },
  { id: "v1", name: "TDR v1 — brouillon initial IA", meta: "21 avr. · 0,9 Mo", status: "draft" },
  { id: "annexe-budget", name: "Annexe budgétaire", meta: "21 avr. · 560 Ko", status: "draft" },
  { id: "note-cadrage", name: "Note de cadrage signée", meta: "12 avr. · 320 Ko", status: "signed" },
];

const SECTIONS = [
  { num: "01", label: "Page de garde" },
  { num: "02", label: "Contexte" },
  { num: "03", label: "Objectif général" },
  { num: "04", label: "Objectifs spécifiques" },
  { num: "05", label: "Livrables attendus" },
  { num: "06", label: "Profils-clés" },
  { num: "07", label: "Calendrier" },
  { num: "08", label: "Budget & cofinancement" },
  { num: "09", label: "Sauvegardes E&S" },
  { num: "10", label: "Critères d'évaluation" },
];

const INITIAL_DOC = `
<h1>AMOA Plateforme nationale d'identité numérique</h1>
<p><em>Assistance à maîtrise d'ouvrage — composante C2 Fondations Numériques · 8,7 M USD · IDA + AFD</em></p>

<h2>01 · Page de garde</h2>
<p><strong>Maître d'ouvrage</strong> · Office National d'Identité (ANIE)<br>
<strong>Tutelle</strong> · Ministère du Numérique (MPTN)<br>
<strong>Bailleurs</strong> · Banque mondiale (IDA, 79 %) · AFD (21 %)<br>
<strong>Référence projet</strong> · P180495 · PTN-RDC<br>
<strong>Composante</strong> · C2 Fondations Numériques · A2.3.1 (PTBA-2026-Q2)</p>

<h2>02 · Contexte</h2>
<p>Le ministère du Numérique (MPTN) souhaite doter la République Démocratique du Congo d'une plateforme nationale d'identité numérique inclusive, conforme aux standards ICAO 9303 et au cadre ID4D de la Banque mondiale. L'Office National d'Identité (ANIE), institution rattachée au MPTN, est désigné comme entité partenaire pour la maîtrise d'ouvrage technique.</p>
<p>Cette mission d'Assistance à Maîtrise d'Ouvrage (AMOA) vise à accompagner ANIE dans la conception, la passation et le pilotage de la plateforme cible — phase préalable au DAO de réalisation prévu en S2 2026.</p>

<h2>03 · Objectif général</h2>
<p>Doter l'État congolais d'une plateforme d'identité numérique inclusive, interopérable et conforme aux standards internationaux (ICAO 9303, cadre ID4D Banque mondiale, normes biométriques NIST), permettant à terme la délivrance de pièces d'identité aux 95 millions de citoyens et la consommation de services publics dématérialisés.</p>

<h2>04 · Objectifs spécifiques</h2>
<p><strong>O1</strong> · Concevoir l'architecture technique cible et son schéma directeur.</p>
<p><strong>O2</strong> · Accompagner la passation du marché de réalisation (DAO + évaluation).</p>
<p><strong>O3</strong> · Former les équipes ANIE à la gouvernance opérationnelle de la plateforme.</p>
<p><strong>O4</strong> · Définir le plan de continuité d'activité et les conventions interopérabilité.</p>

<h2>05 · Livrables attendus</h2>
<p><strong>L1</strong> · Note de cadrage stratégique (J+15)<br>
<strong>L2</strong> · Architecture technique cible et schéma directeur (J+45)<br>
<strong>L3</strong> · DAO complet de réalisation (J+90)<br>
<strong>L4</strong> · Rapport d'assistance à l'évaluation des offres (J+150)<br>
<strong>L5</strong> · Rapport de pilotage (J+180 puis trimestriel)</p>

<h2>06 · Profils-clés requis</h2>
<p><strong>P1 · Chef de mission</strong> — 10 ans d'expérience minimum, dont 3 références ID4D ou identité numérique en Afrique subsaharienne.</p>
<p><strong>P2 · Expert architecture identité</strong> — référence ID4D ≥ 2 projets, certification ICAO 9303.</p>
<p><strong>P3 · Expert biométrie</strong> — connaissance NIST + algorithmes 1:N, supervision de tests interopérabilité.</p>
<p><strong>P4 · Expert E&S</strong> — sauvegardes Banque mondiale (NES 1-10), CGES PTN-RDC.</p>
<p><strong>P5 · Expert genre & inclusion</strong> — sensible aux contextes fragiles (RDC).</p>

<h2>07 · Calendrier indicatif</h2>
<p>Démarrage prévisionnel <strong>15 juillet 2026</strong> · Durée d'exécution <strong>240 jours-homme sur 9 mois</strong> · Charge moyenne 27 j-h/mois.</p>
`;

const SUGGESTED_DIFFS: AiDiff[] = [
  {
    id: "diff-1",
    kind: "rephrase",
    section: "02 · Contexte",
    text:
      "Cette mission AMOA s'inscrit dans la stratégie nationale de transformation numérique 2025-2029 et complète l'investissement souverain de la RDC dans une infrastructure d'identité fondatrice (cadre ID4D Banque mondiale).",
    original:
      "Cette mission d'Assistance à Maîtrise d'Ouvrage (AMOA) vise à accompagner ANIE dans la conception, la passation et le pilotage de la plateforme cible — phase préalable au DAO de réalisation prévu en S2 2026.",
    model: "claude-opus-4-7",
    confidence: 0.84,
  },
  {
    id: "diff-2",
    kind: "add",
    section: "06 · Profils-clés",
    text:
      "P6 · Expert cybersécurité — certification ISO 27001 lead auditor, pratique des audits NIST 800-53 et expérience 5+ ans sur architectures critiques.",
    model: "claude-opus-4-7",
    confidence: 0.91,
  },
];

export function DocumentEditorClient({ propRef }: DocumentEditorClientProps) {
  const [editable, setEditable] = useState(false);
  const [activeDraft, setActiveDraft] = useState<string>("v3");
  const [activeSection, setActiveSection] = useState<string>("02");
  const [diffs, setDiffs] = useState<AiDiff[]>(SUGGESTED_DIFFS);
  const [diffJournal, setDiffJournal] = useState<
    Array<{ id: string; decision: "accepted" | "rejected"; ts: number }>
  >([]);
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  const handleDiffDecision = (diff: AiDiff, decision: "accepted" | "rejected") => {
    setDiffJournal((cur) => [...cur, { id: diff.id, decision, ts: Date.now() }]);
    toast({
      tone: decision === "accepted" ? "success" : "info",
      title: decision === "accepted" ? "Suggestion IA acceptée" : "Suggestion refusée",
      message: `${diff.section} · journalisée HMAC pour audit`,
      duration: 2500,
    });
  };

  const handleRegenerate = () => {
    toast({
      tone: "ai",
      title: "Régénération IA en cours",
      message: "claude-opus-4-7 · 4 sources consultées · ~8s",
      duration: 3000,
    });
    // Mock: après 1s, ajout d'une nouvelle suggestion
    setTimeout(() => {
      setDiffs((cur) => [
        ...cur,
        {
          id: `diff-${Date.now()}`,
          kind: "rephrase",
          section: "03 · Objectif général",
          text:
            "Doter l'État d'une plateforme d'identité numérique fondatrice (foundational ID), inclusive et interopérable, permettant la délivrance de pièces d'identité aux 100 millions de citoyens à horizon 2029 et la consommation de plus de 50 services publics dématérialisés (cadre ID4D Banque mondiale).",
          original:
            "Doter l'État congolais d'une plateforme d'identité numérique inclusive, interopérable et conforme aux standards internationaux…",
          model: "claude-opus-4-7",
          confidence: 0.79,
        },
      ]);
    }, 1200);
  };

  return (
    <div className={styles.shell}>
      {/* ============ Topbar ============ */}
      <div className={styles.topbar}>
        <span className={styles.topbarRef}>{propRef}</span>
        <span className={styles.topbarTitle}>
          AMOA Plateforme nationale d&apos;identité numérique — TDR v3 finale
        </span>

        <span className={styles.topbarStatus}>
          <CheckmarkFilled size={10} aria-hidden /> Auto-sauvegardé
        </span>

        <div style={{ flex: 1 }} />

        <button type="button" className={styles.btnAi} onClick={handleRegenerate}>
          <AiGenerate size={12} aria-hidden /> Régénérer IA
        </button>
        <button type="button" className={styles.btnSecondary}>
          <Download size={12} aria-hidden /> Exporter
        </button>
        {editable ? (
          <button
            type="button"
            className={styles.btnPrimary}
            onClick={() => {
              setEditable(false);
              toast({
                tone: "success",
                title: "Modifications enregistrées",
                message: "Document signé HMAC · audit trail mis à jour.",
                duration: 3000,
              });
            }}
          >
            <Save size={12} aria-hidden /> Enregistrer
          </button>
        ) : (
          <button
            type="button"
            className={styles.btnPrimary}
            onClick={() => setEditable(true)}
          >
            <Edit size={12} aria-hidden /> Modifier
          </button>
        )}
      </div>

      {/* ============ Body 3 colonnes ============ */}
      <div className={styles.body}>
        {/* Nav sections */}
        <nav className={styles.nav} aria-label="Sections du document">
          <div className={styles.navTitle}>Sections</div>
          {SECTIONS.map((s) => (
            <button
              key={s.num}
              type="button"
              className={`${styles.navItem} ${activeSection === s.num ? styles.navItemActive : ""}`}
              onClick={() => setActiveSection(s.num)}
              aria-pressed={activeSection === s.num}
            >
              <span className={styles.navNum}>{s.num}</span>
              <span>{s.label}</span>
            </button>
          ))}
        </nav>

        {/* Pages document */}
        <div className={styles.pages}>
          <article className={styles.page}>
            <RichEditor
              initialHtml={INITIAL_DOC}
              editable={editable}
              ref_={`${propRef}-TDR-v3`}
              diffs={diffs}
              onDiffDecision={handleDiffDecision}
            />
            <div className={styles.pageNumber}>3 pages · 4 287 mots</div>
          </article>
        </div>

        {/* Meta panel */}
        <aside className={styles.meta}>
          <section className={styles.metaSection}>
            <h4 className={styles.metaH}>Document actif</h4>
            <div className={styles.metaRow}>
              <div className={styles.metaK}>Référence</div>
              <div className={`${styles.metaV} ${styles.metaVMono}`}>{propRef}-TDR-v3</div>
            </div>
            <div className={styles.metaRow}>
              <div className={styles.metaK}>Format</div>
              <div className={styles.metaV}>DOCX · A4</div>
            </div>
            <div className={styles.metaRow}>
              <div className={styles.metaK}>Mots</div>
              <div className={styles.metaV}>4 287</div>
            </div>
            <div className={styles.metaRow}>
              <div className={styles.metaK}>Mode</div>
              <div className={styles.metaV}>
                {editable ? (
                  <span style={{ color: "var(--ptn-status-warning-text)" }}>
                    <Edit
                      size={12}
                      aria-hidden
                      style={{ marginRight: 4, verticalAlign: "middle" }}
                    />
                    Édition Tiptap
                  </span>
                ) : (
                  <span style={{ color: "var(--cds-text-helper)" }}>
                    <Locked
                      size={12}
                      aria-hidden
                      style={{ marginRight: 4, verticalAlign: "middle" }}
                    />
                    Lecture seule
                  </span>
                )}
              </div>
            </div>
          </section>

          <section className={styles.metaSection}>
            <h4 className={styles.metaH}>
              <AiGenerate size={12} aria-hidden style={{ color: "var(--ptn-status-ai)" }} />
              IA · audit diffs
            </h4>
            <div className={styles.aiInfo}>
              {diffs.length} suggestion{diffs.length > 1 ? "s" : ""} générée{diffs.length > 1 ? "s" : ""}
              {" · "}
              {diffJournal.length} décision{diffJournal.length > 1 ? "s" : ""} journalisée
              {diffJournal.length > 1 ? "s" : ""}
              {" · "}
              modèle <strong>claude-opus-4-7</strong>.
            </div>
            <button
              type="button"
              className={styles.btnAi}
              style={{ width: "100%", justifyContent: "center", marginTop: 8 }}
              onClick={handleRegenerate}
            >
              <Renew size={12} aria-hidden /> Régénérer la mise en page
            </button>
          </section>

          <section className={styles.metaSection}>
            <h4 className={styles.metaH}>Versions du document</h4>
            <div className={styles.draftList}>
              {DRAFTS.map((d) => {
                const dotColor =
                  d.status === "signed"
                    ? "var(--ptn-status-success)"
                    : d.status === "active"
                      ? "var(--ptn-accent)"
                      : "var(--cds-text-helper)";
                return (
                  <button
                    key={d.id}
                    type="button"
                    className={`${styles.draftItem} ${activeDraft === d.id ? styles.draftItemActive : ""}`}
                    onClick={() => setActiveDraft(d.id)}
                    aria-pressed={activeDraft === d.id}
                  >
                    <span
                      className={`${styles.draftIco} ${activeDraft === d.id ? styles.draftIcoActive : ""}`}
                    >
                      <Document size={12} aria-hidden />
                    </span>
                    <div className={styles.draftMain}>
                      <div className={styles.draftName}>{d.name}</div>
                      <div className={styles.draftMeta}>{d.meta}</div>
                    </div>
                    <span className={styles.statusDot} style={{ background: dotColor }} />
                  </button>
                );
              })}
            </div>
          </section>

          <section className={styles.metaSection}>
            <h4 className={styles.metaH}>
              <Time size={12} aria-hidden /> Validation UGP
            </h4>
            <button
              type="button"
              className={styles.btnPrimary}
              style={{ width: "100%", justifyContent: "center" }}
              onClick={() => setSubmitting(true)}
            >
              <Send size={12} aria-hidden /> Soumettre à l&apos;UGP
            </button>
          </section>
        </aside>
      </div>

      <SubmissionLoader
        open={submitting}
        onComplete={() => {
          setSubmitting(false);
          toast({
            tone: "success",
            title: "Document soumis à l'UGP",
            message: `${propRef} · accusé de réception attendu sous 4h ouvrables`,
            duration: 5000,
          });
        }}
      />
    </div>
  );
}
