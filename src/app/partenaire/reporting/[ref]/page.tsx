import { Shell } from "@/components/shell/Shell";
import {
  AiGenerate,
  CheckmarkFilled,
  WarningAltFilled,
  Document,
  Download,
  Send,
  Edit,
  Renew,
  Activity,
} from "@carbon/icons-react";
import styles from "./rapport-detail.module.scss";

export const metadata = { title: "Rapport semestriel · Espace partenaire · PTN-RDC" };

interface Props {
  params: Promise<{ ref: string }>;
}

interface Section {
  num: string;
  title: string;
  status: "ok" | "warn" | "empty";
  ai: boolean;
  body: React.ReactNode | null;
  source?: string;
}

const SECTIONS: Section[] = [
  {
    num: "01",
    title: "Résumé exécutif",
    status: "ok",
    ai: true,
    source: "claude-opus-4-7 · 4 propositions sources · confiance 87 %",
    body: (
      <>
        <p>
          Au cours du semestre 1 2026, l&apos;Office National d&apos;Identité (ANIE) a soumis 4
          propositions au PTBA dont une AMOA Plateforme nationale d&apos;identité numérique de 8,7
          M USD. Le portefeuille engagé atteint 11,6 M USD au 8 mai 2026.
        </p>
        <p>
          Sur la même période, ANIE a obtenu 1 ANO Banque mondiale (PROP-2026-018 · Datacenter
          Tier-3) avec un délai TDR-ANO de 12 jours, conforme à la cible projet de 12 j et nettement
          inférieur à la moyenne projet (38 j). Une délégation de 5 personnes a participé à
          l&apos;atelier ID4Africa Abidjan 2026.
        </p>
      </>
    ),
  },
  {
    num: "02",
    title: "Réalisations principales",
    status: "ok",
    ai: true,
    source: "Croisement avec PROP-2026-019 / 014 / 011 / 007",
    body: (
      <>
        <p>R1 · Soumission de la proposition AMOA Plateforme identité (8,7 M USD) — en arbitrage UGP.</p>
        <p>R2 · Intégration au PPM Q3 de la proposition Datacenter Tier-3 (PROP-2026-014).</p>
        <p>R3 · Délégation ID4Africa Abidjan 2026 — 5 délégués formés, 12 contacts institutionnels établis.</p>
        <p>R4 · Démarrage de la modernisation du registre des personnes (en attribution AON).</p>
      </>
    ),
  },
  {
    num: "03",
    title: "Difficultés rencontrées",
    status: "warn",
    ai: false,
    body: (
      <>
        <p>D1 · Délais de validation interne ANIE plus longs que prévus sur les TDR techniques.</p>
        <p>D2 · Coupure réseau du 06 mai 2026 (Lubumbashi) ayant impacté la soumission d&apos;un livrable critique.</p>
      </>
    ),
  },
  {
    num: "04",
    title: "Indicateurs cadre de résultats",
    status: "ok",
    ai: true,
    source: "Auto-renseignés depuis les livrables",
    body: null,
  },
  {
    num: "05",
    title: "Sauvegardes E&S — bilan",
    status: "warn",
    ai: false,
    body: <p>À compléter manuellement — synthèse PEES catégorie Substantielle.</p>,
  },
  {
    num: "06",
    title: "Perspectives S2 2026",
    status: "warn",
    ai: false,
    body: <p>Section à rédiger — rappel : 250 mots maximum.</p>,
  },
  {
    num: "07",
    title: "Leçons apprises",
    status: "empty",
    ai: false,
    body: null,
  },
  {
    num: "08",
    title: "Annexes signées",
    status: "empty",
    ai: false,
    body: null,
  },
];

const INDICATORS = [
  { name: "Personnes connectées", current: "127k", target: "300k", pct: 42 },
  { name: "Femmes touchées", current: "58k", target: "150k", pct: 38 },
  { name: "Provinces couvertes", current: "11", target: "26", pct: 42 },
  { name: "Agents publics formés", current: "340", target: "1 200", pct: 28 },
];

export default async function RapportDetailPage({ params }: Props) {
  const { ref } = await params;

  const completed = SECTIONS.filter((s) => s.status === "ok").length;
  const total = SECTIONS.length;
  const pct = Math.round((completed / total) * 100);

  return (
    <Shell
      crumbs={[
        { label: "Espace partenaire", href: "/partenaire" },
        { label: "Reporting", href: "/partenaire/reporting" },
        { label: ref },
      ]}
    >
      <div className={styles.headerRow}>
        <div className={styles.metaCol}>
          <div className={styles.eyebrow}>
            <span className="ptn-mono">{ref}</span> · ANIE · RAPPORT SEMESTRIEL S1 2026
          </div>
          <h1 className={styles.title}>Rapport semestriel S1 2026</h1>
          <p className={styles.subtitle}>
            Période <strong>01 janvier — 30 juin 2026</strong> · Soumission UGP attendue le{" "}
            <span className="ptn-mono">15 juillet 2026</span>
          </p>
        </div>
        <div className={styles.actionsRow}>
          <button type="button" className={styles.btnSecondary}>
            <Download size={16} aria-hidden /> Exporter PDF
          </button>
          <button type="button" className={styles.btnSecondary}>
            <Edit size={16} aria-hidden /> Édition complète
          </button>
          <button type="button" className={styles.btnPrimary}>
            <Send size={16} aria-hidden /> Soumettre à l&apos;UGP
          </button>
        </div>
      </div>

      <div className={styles.progressCard}>
        <span className={styles.progressLabel}>Avancement global</span>
        <div className={styles.progressBar}>
          <i style={{ width: `${pct}%` }} />
        </div>
        <span className={styles.progressPct}>{pct} %</span>
      </div>

      <div className={styles.aiBanner}>
        <div className={styles.aiIco}>
          <AiGenerate size={16} aria-hidden />
        </div>
        <div>
          <div className={styles.aiTitle}>
            Brouillon IA pré-rempli{" "}
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
          <div className={styles.aiText}>
            L&apos;assistant IA a généré 3 sections sur 8 à partir de vos propositions, livrables
            et indicateurs renseignés ce semestre. Il reste 4 sections à compléter manuellement
            (difficultés détaillées, sauvegardes E&S, perspectives S2, leçons apprises). Toute
            section IA doit être validée manuellement avant soumission.
          </div>
        </div>
      </div>

      <div className={styles.layout}>
        <div className={styles.sections}>
          {SECTIONS.map((s) => (
            <div key={s.num} className={styles.section}>
              <div className={styles.sectionHead}>
                <span className={styles.sectionNum}>{s.num}</span>
                <div className={styles.sectionMain}>
                  <h3 className={styles.sectionTitle}>{s.title}</h3>
                  {s.source && <div className={styles.sectionSub}>{s.source}</div>}
                </div>
                <div className={styles.sectionTags}>
                  {s.ai && <span className={styles.aiBadge}>✦ IA</span>}
                  <span
                    className={`${styles.sectionStatus} ${
                      s.status === "ok"
                        ? styles.sectionStatusOk
                        : s.status === "warn"
                          ? styles.sectionStatusWarn
                          : styles.sectionStatusEmpty
                    }`}
                  >
                    {s.status === "ok" && (
                      <>
                        <CheckmarkFilled size={10} aria-hidden /> Complète
                      </>
                    )}
                    {s.status === "warn" && (
                      <>
                        <WarningAltFilled size={10} aria-hidden /> À compléter
                      </>
                    )}
                    {s.status === "empty" && "Non démarrée"}
                  </span>
                </div>
              </div>
              {s.body ? (
                <div className={s.ai ? styles.sectionBodyAi : styles.sectionBody}>{s.body}</div>
              ) : s.num === "04" ? (
                <div className={styles.sectionBody}>
                  {INDICATORS.map((ind, i) => (
                    <div key={i} className={styles.indicator}>
                      <div className={styles.indicatorH}>
                        <span>{ind.name}</span>
                        <span className="ptn-mono">{ind.pct} %</span>
                      </div>
                      <div className={styles.indicatorBar}>
                        <i style={{ width: `${ind.pct}%` }} />
                      </div>
                      <div className={styles.indicatorTarget}>
                        {ind.current} / {ind.target} (cible 2029)
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className={styles.sectionEmpty}>
                  Section non encore rédigée. Cliquez sur &laquo; Rédiger &raquo; pour démarrer.
                </div>
              )}
              <div className={styles.sectionActions}>
                <button type="button" className={styles.btnGhost}>
                  <Edit size={12} aria-hidden /> Éditer
                </button>
                {s.ai && (
                  <button type="button" className={styles.btnGhost}>
                    <Renew size={12} aria-hidden /> Régénérer IA
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        <aside className={styles.rail}>
          <section className={styles.railCard}>
            <h4 className={styles.railH}>Synthèse</h4>
            <div className={styles.railBody}>
              <div className={styles.railRow}>
                <div className={styles.railK}>Référence</div>
                <div className={`${styles.railV} ${styles.railVMono}`}>{ref}</div>
              </div>
              <div className={styles.railRow}>
                <div className={styles.railK}>Type</div>
                <div className={styles.railV}>Semestriel</div>
              </div>
              <div className={styles.railRow}>
                <div className={styles.railK}>Période</div>
                <div className={styles.railV}>S1 2026</div>
              </div>
              <div className={styles.railRow}>
                <div className={styles.railK}>Échéance UGP</div>
                <div className={`${styles.railV} ${styles.railVMono}`}>15 juil. 2026</div>
              </div>
              <div className={styles.railRow}>
                <div className={styles.railK}>Sections</div>
                <div className={styles.railV}>
                  {completed} / {total} complètes
                </div>
              </div>
              <div className={styles.railRow}>
                <div className={styles.railK}>Brouillon IA</div>
                <div className={styles.railV}>
                  {SECTIONS.filter((s) => s.ai).length} sections
                </div>
              </div>
            </div>
          </section>

          <section className={styles.railCard}>
            <h4 className={styles.railH}>
              <Activity size={12} aria-hidden style={{ marginRight: 4, verticalAlign: "middle" }} />
              Indicateurs S1
            </h4>
            <div className={styles.railBody}>
              {INDICATORS.map((ind, i) => (
                <div key={i} className={styles.indicator}>
                  <div className={styles.indicatorH}>
                    <span>{ind.name}</span>
                    <span className="ptn-mono">{ind.pct} %</span>
                  </div>
                  <div className={styles.indicatorBar}>
                    <i style={{ width: `${ind.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className={styles.railCard}>
            <h4 className={styles.railH}>Documents annexes</h4>
            <div className={styles.railBody}>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                  fontSize: 12,
                  color: "var(--cds-text-secondary)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Document size={14} aria-hidden style={{ color: "var(--cds-text-helper)" }} />
                  L1 cadrage AMOA · 1,2 Mo
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Document size={14} aria-hidden style={{ color: "var(--cds-text-helper)" }} />
                  Bilan ID4Africa · 480 Ko
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Document size={14} aria-hidden style={{ color: "var(--cds-text-helper)" }} />
                  PV commission CE-2026-007 · 320 Ko
                </div>
              </div>
            </div>
          </section>
        </aside>
      </div>
    </Shell>
  );
}
