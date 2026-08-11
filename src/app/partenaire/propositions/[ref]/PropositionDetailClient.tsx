"use client";

import { useState } from "react";
import Link from "next/link";
import {
  AiGenerate,
  CheckmarkFilled,
  WarningAltFilled,
  Document,
  Download,
  Edit,
  Locked,
  Send,
  Time,
  Events,
  OverflowMenuVertical,
  ArrowUp,
  ArrowDown,
  ChartLineSmooth,
} from "@carbon/icons-react";
import {
  TranslationWidget,
  TranslationBanner,
  useText,
} from "@/components/translation/TranslationWidget";
import { useOrganisation } from "@/components/profile/OrganisationContext";
import { ScoringCard } from "@/components/ai/ScoringCard";
import styles from "./detail.module.scss";

const PIPELINE = [
  { label: "Brouillon", actor: "ANIE", state: "done" as const },
  { label: "Soumission UGP", actor: "ANIE → UGP", state: "done" as const },
  { label: "Arbitrage UGP", actor: "Coord + RPM", state: "current" as const },
  { label: "Intégration PPM", actor: "RPM UGP", state: "future" as const },
  { label: "ANO bailleur", actor: "TTL BM / AFD", state: "future" as const },
  { label: "Exécution", actor: "Co-exécution", state: "future" as const },
];

const TIMELINE = [
  {
    kind: "warn" as const,
    who: "Coord. UGP",
    txt: "a demandé une clarification sur la section profils-clés",
    when: "il y a 3h",
  },
  {
    kind: "default" as const,
    who: "RPM UGP",
    txt: "a accusé réception de la proposition pour arbitrage",
    when: "hier · 14:30",
  },
  {
    kind: "ai" as const,
    who: "Assistant IA",
    txt: "a généré le brouillon des objectifs et livrables (modèle claude-opus-4-7)",
    when: "21 avr. · 11:08",
  },
  {
    kind: "ok" as const,
    who: "Vous · ANIE",
    txt: "avez soumis la proposition à l'UGP",
    when: "21 avr. · 10:42",
  },
  {
    kind: "default" as const,
    who: "Vous · ANIE",
    txt: "avez créé la proposition (statut Brouillon)",
    when: "12 avr. · 09:15",
  },
];

const DOCUMENTS = [
  { name: "TDR AMOA Plateforme identité numérique — v3 finale", meta: "DOCX · 1,2 Mo · 08 mai 2026" },
  { name: "Annexe budgétaire détaillée", meta: "XLSX · 560 Ko · 21 avr. 2026" },
  { name: "Note de cadrage stratégique ANIE", meta: "PDF · 320 Ko · 12 avr. 2026" },
  { name: "Bibliographie & références ID4D", meta: "PDF · 180 Ko · 12 avr. 2026" },
];

const COMMENTS = [
  {
    who: "M. Mukendi",
    role: "Coord. UGP",
    initials: "MM",
    when: "il y a 3h",
    body: (
      <>
        Bonjour, merci pour cette proposition très complète. Pourriez-vous préciser le profil
        attendu pour l&apos;<strong>Expert E&S</strong> — notamment sur l&apos;expérience ICAO 9303
        et les déploiements ID4D Banque mondiale ? Cela conditionnera la complétude du dossier
        avant transmission au RPM pour intégration PPM.
      </>
    ),
  },
  {
    who: "Vous · ANIE",
    role: "Partenaire",
    initials: "AN",
    when: "21 avr. · 12:08",
    body: (
      <>
        Confirmation que la mission inclut bien le volet sauvegardes E&S avec un expert dédié,
        conformément au CGES du PTN-RDC. Le profil détaillé est en page 14 du TDR (annexe B).
      </>
    ),
  },
];

const TABS = [
  { key: "tdr", label: "TDR & sections", count: 7 },
  { key: "documents", label: "Documents", count: 4 },
  { key: "comments", label: "Commentaires UGP", count: 2 },
  { key: "ai", label: "Audit IA", count: 12 },
  { key: "compliance", label: "Conformité MEP/PTBA" },
  { key: "scoring", label: "Scoring offres ✦" },
];

export function PropositionDetailClient({ propRef }: { propRef: string }) {
  const [tab, setTab] = useState<string>("tdr");
  const [reply, setReply] = useState("");
  const { org } = useOrganisation();

  const titleText = useText({
    fr: "AMOA Plateforme nationale d'identité numérique",
    en: "AMOA — National digital identity platform",
    ln: "AMOA — Esika ya kobongisa mpe kotia tableau ya identité ya RDC",
    sw: "AMOA — Jukwaa la kitaifa la utambulisho dijitali",
  });
  const subtitleText = useText({
    fr: "Assistance à maîtrise d'ouvrage — composante C2 Fondations Numériques · 8,7 M USD · IDA + AFD",
    en: "Owner's Engineer Assistance — Component C2 Digital Foundations · 8.7M USD · IDA + AFD",
    ln: "Lisalisi ya mosala ya bopangi — eteni C2 Misingi ya Numérique · 8,7 M USD · IDA + AFD",
    sw: "Usaidizi wa usanifu — Sehemu C2 Misingi ya Dijitali · 8,7 M USD · IDA + AFD",
  });
  const eyebrowSuffix = useText({
    fr: "PARTENAIRE INSTITUTIONNEL",
    en: "INSTITUTIONAL PARTNER",
    ln: "MOSANGANI YA ETUKA",
    sw: "MSHIRIKA WA TAASISI",
  });
  const eyebrowText = `${org.sigle.toUpperCase()} · ${eyebrowSuffix}`;

  return (
    <>
      {/* Header avec actions */}
      <div className={styles.headerRow}>
        <div className={styles.metaCol}>
          <div
            style={{
              fontSize: 11,
              textTransform: "uppercase",
              letterSpacing: "0.32px",
              color: "var(--cds-text-helper)",
              marginBottom: 8,
            }}
          >
            <span className="ptn-mono">{propRef}</span> · {eyebrowText}
          </div>
          <h1
            style={{
              fontSize: 24,
              fontWeight: 300,
              letterSpacing: "-0.005em",
              margin: "0 0 4px",
            }}
          >
            {titleText}
          </h1>
          <p
            style={{
              fontSize: 14,
              color: "var(--cds-text-secondary)",
              margin: 0,
              lineHeight: 1.45,
            }}
          >
            {subtitleText}
          </p>
        </div>
        <div className={styles.actionsRow}>
          <TranslationWidget />
          <button type="button" className={styles.btnSecondary}>
            <Download size={16} aria-hidden /> Exporter PDF
          </button>
          <Link
            href={`/partenaire/propositions/${propRef}/edit`}
            className={styles.btnSecondary}
          >
            <Edit size={16} aria-hidden /> Modifier
          </Link>
          <Link
            href={`/partenaire/propositions/${propRef}/document`}
            className={styles.btnSecondary}
          >
            <Document size={16} aria-hidden /> Document IA
          </Link>
          <button type="button" className={styles.btnPrimary}>
            <Send size={16} aria-hidden /> Répondre à l&apos;UGP
          </button>
          <button type="button" className={styles.btnIcon} aria-label="Plus d'actions">
            <OverflowMenuVertical size={16} aria-hidden />
          </button>
        </div>
      </div>

      <TranslationBanner />

      <div className={styles.layout}>
        {/* ============ Colonne principale ============ */}
        <div>
          {/* Pipeline */}
          <div className={styles.pipeline}>
            <div className={styles.pipelineTitle}>
              <span>Étape pipeline · 3 / 6</span>
              <span className="ptn-mono" style={{ color: "var(--cds-text-helper)" }}>
                Délai indicatif 7 jours · J-3 restant
              </span>
            </div>
            <div className={styles.pipelineSegs}>
              {PIPELINE.map((p, i) => {
                const barCls =
                  p.state === "done"
                    ? styles.pipelineBarDone
                    : p.state === "current"
                      ? styles.pipelineBarCurrent
                      : "";
                const labelCls =
                  p.state !== "future" ? styles.pipelineLabelActive : "";
                return (
                  <div key={i} className={styles.pipelineSeg}>
                    <div className={`${styles.pipelineBar} ${barCls}`} />
                    <div className={`${styles.pipelineLabel} ${labelCls}`}>{p.label}</div>
                    <div className={styles.pipelineActor}>{p.actor}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Tabs */}
          <div className={styles.tabs}>
            {TABS.map((t) => (
              <button
                key={t.key}
                type="button"
                className={`${styles.tab} ${tab === t.key ? styles.tabActive : ""}`}
                onClick={() => setTab(t.key)}
              >
                {t.label}
                {typeof t.count === "number" && <span className={styles.tabCount}>{t.count}</span>}
              </button>
            ))}
          </div>

          {/* Panel content */}
          <div className={styles.panel}>
            {tab === "tdr" && (
              <>
                <section className={styles.section}>
                  <div className={styles.sectionH}>
                    <h3 className={styles.sectionTitle}>1 · Contexte</h3>
                    <span className={styles.sectionMeta}>Saisi par ANIE · 12 avr.</span>
                  </div>
                  <div className={styles.sectionBody}>
                    <p>
                      Le ministère du Numérique (MPTN) souhaite doter la République Démocratique du
                      Congo d&apos;une plateforme nationale d&apos;identité numérique inclusive,
                      conforme aux standards ICAO 9303 et au cadre ID4D de la Banque mondiale.
                      L&apos;Office National d&apos;Identité (ANIE), institution rattachée, est
                      désigné comme entité partenaire pour la maîtrise d&apos;ouvrage technique.
                    </p>
                    <p>
                      Cette mission d&apos;Assistance à Maîtrise d&apos;Ouvrage (AMOA) vise à
                      accompagner ANIE dans la conception, la passation et le pilotage de la
                      plateforme cible — phase préalable au DAO de réalisation prévu en S2 2026.
                    </p>
                  </div>
                </section>

                <section className={styles.section}>
                  <div className={styles.sectionH}>
                    <h3 className={styles.sectionTitle}>
                      2 · Objectif général
                      <span className={styles.aiBadge}>✦ IA</span>
                    </h3>
                    <span className={styles.sectionMeta}>Brouillon IA · validé manuellement</span>
                  </div>
                  <div className={`${styles.sectionBody} ${styles.sectionAi}`}>
                    <p>
                      Doter l&apos;État congolais d&apos;une plateforme d&apos;identité numérique
                      inclusive, interopérable et conforme aux standards internationaux (ICAO 9303,
                      cadre ID4D Banque mondiale, normes biométriques NIST), permettant à terme la
                      délivrance de pièces d&apos;identité aux 95 millions de citoyens et la
                      consommation de services publics dématérialisés.
                    </p>
                  </div>
                </section>

                <section className={styles.section}>
                  <div className={styles.sectionH}>
                    <h3 className={styles.sectionTitle}>
                      3 · Objectifs spécifiques
                      <span className={styles.aiBadge}>✦ IA</span>
                    </h3>
                    <span className={styles.sectionMeta}>Modèle · claude-opus-4-7 · 4 sources</span>
                  </div>
                  <div className={`${styles.sectionBody} ${styles.sectionAi}`}>
                    <p>O1 · Concevoir l&apos;architecture technique cible et son schéma directeur.</p>
                    <p>O2 · Accompagner la passation du marché de réalisation (DAO + évaluation).</p>
                    <p>O3 · Former les équipes ANIE à la gouvernance opérationnelle de la plateforme.</p>
                    <p>O4 · Définir le plan de continuité d&apos;activité et les conventions interopérabilité.</p>
                  </div>
                </section>

                <section className={styles.section}>
                  <div className={styles.sectionH}>
                    <h3 className={styles.sectionTitle}>
                      4 · Livrables attendus
                      <span className={styles.lockBadge}>
                        <Locked size={10} aria-hidden /> MEP §4.2
                      </span>
                    </h3>
                  </div>
                  <div className={styles.sectionBody}>
                    <p>L1 · Note de cadrage stratégique (J+15)</p>
                    <p>L2 · Architecture technique cible et schéma directeur (J+45)</p>
                    <p>L3 · DAO complet de réalisation (J+90)</p>
                    <p>L4 · Rapport d&apos;assistance à l&apos;évaluation des offres (J+150)</p>
                    <p>L5 · Rapport de pilotage de l&apos;exécution (J+180 puis trimestriel)</p>
                  </div>
                </section>

                <section className={styles.section}>
                  <div className={styles.sectionH}>
                    <h3 className={styles.sectionTitle}>5 · Calendrier & expertise</h3>
                  </div>
                  <div className={styles.sectionBody}>
                    <p>
                      Démarrage prévisionnel : <span className="ptn-mono">15 juillet 2026</span> ·
                      Durée d&apos;exécution : 240 jours-homme sur 9 mois calendaires.
                    </p>
                    <p>
                      Profils-clés : Chef de mission (sénior 10 ans), Expert architecture identité,
                      Expert biométrie, Expert E&S, Expert genre & inclusion.
                    </p>
                  </div>
                </section>
              </>
            )}

            {tab === "documents" && (
              <div className={styles.docList}>
                {DOCUMENTS.map((d, i) => (
                  <div key={i} className={styles.docRow}>
                    <div className={styles.docIco}>
                      <Document size={16} aria-hidden />
                    </div>
                    <div>
                      <div className={styles.docName}>{d.name}</div>
                      <div className={styles.docMeta}>{d.meta}</div>
                    </div>
                    <button type="button" className={styles.btnIcon} aria-label="Télécharger">
                      <Download size={16} aria-hidden />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {tab === "comments" && (
              <>
                <div className={styles.commentList}>
                  {COMMENTS.map((c, i) => (
                    <div key={i} className={styles.comment}>
                      <div className={styles.commentAvatar}>{c.initials}</div>
                      <div>
                        <div className={styles.commentHead}>
                          <span className={styles.commentWho}>{c.who}</span>
                          <span className={styles.commentRole}>{c.role}</span>
                          <span className={styles.commentWhen}>{c.when}</span>
                        </div>
                        <div className={styles.commentBody}>{c.body}</div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className={styles.commentReplyBox}>
                  <textarea
                    className={styles.commentInput}
                    placeholder="Répondre à l'UGP… (Markdown supporté)"
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                  />
                  <div className={styles.commentReplyActions}>
                    <button type="button" className={styles.btnSecondary}>
                      Brouillon
                    </button>
                    <button type="button" className={styles.btnPrimary}>
                      <Send size={14} aria-hidden /> Envoyer
                    </button>
                  </div>
                </div>
              </>
            )}

            {tab === "ai" && (
              <div>
                <div
                  style={{
                    background: "var(--ptn-status-ai-surface, #f6f2ff)",
                    borderLeft: "2px solid var(--ptn-status-ai)",
                    padding: "12px 16px",
                    marginBottom: 16,
                    fontSize: 12,
                    color: "var(--cds-text-primary)",
                    lineHeight: 1.55,
                  }}
                >
                  <strong>Audit trail IA</strong> — chaque suggestion est journalisée :
                  prompt, modèle, version, timestamp, signataire. Conforme ISO/IEC 42001 et
                  exigences Banque mondiale.
                </div>

                <ul className={styles.timeline}>
                  <li className={styles.tlItem}>
                    <div className={`${styles.tlIco} ${styles.tlIcoAi}`}>
                      <AiGenerate size={14} aria-hidden />
                    </div>
                    <div className={styles.tlBody}>
                      <div className={styles.tlTitle}>
                        <span className={styles.tlWho}>Brouillon objectif général</span> · Modèle
                        <span className="ptn-mono"> claude-opus-4-7</span> · Hash{" "}
                        <span className="ptn-mono">a3f2e1</span>
                      </div>
                      <div className={styles.tlWhen}>21 avr. · 11:08 · ACCEPTÉ par M. Tshibanda</div>
                    </div>
                  </li>
                  <li className={styles.tlItem}>
                    <div className={`${styles.tlIco} ${styles.tlIcoAi}`}>
                      <AiGenerate size={14} aria-hidden />
                    </div>
                    <div className={styles.tlBody}>
                      <div className={styles.tlTitle}>
                        <span className={styles.tlWho}>Brouillon objectifs spécifiques</span> · 4
                        TDR similaires consultés · Confiance 87 %
                      </div>
                      <div className={styles.tlWhen}>21 avr. · 11:09 · ÉDITÉ avant acceptation</div>
                    </div>
                  </li>
                  <li className={styles.tlItem}>
                    <div className={`${styles.tlIco} ${styles.tlIcoAi}`}>
                      <AiGenerate size={14} aria-hidden />
                    </div>
                    <div className={styles.tlBody}>
                      <div className={styles.tlTitle}>
                        <span className={styles.tlWho}>Suggestion type d&apos;activité</span> :
                        AMOA · Confiance 92 % (basé sur historique ANIE)
                      </div>
                      <div className={styles.tlWhen}>12 avr. · 09:18 · ACCEPTÉ</div>
                    </div>
                  </li>
                </ul>
              </div>
            )}

            {tab === "compliance" && (
              <ul className={styles.timeline}>
                <li className={styles.tlItem}>
                  <div className={`${styles.tlIco} ${styles.tlIcoOk}`}>
                    <CheckmarkFilled size={14} aria-hidden />
                  </div>
                  <div>
                    <div className={styles.tlTitle}>
                      <span className={styles.tlWho}>Activité au PTBA</span> · Code{" "}
                      <span className="ptn-mono">A2.3.1</span> validé contre PTBA-2026-Q2
                    </div>
                    <div className={styles.tlWhen}>Conforme</div>
                  </div>
                </li>
                <li className={styles.tlItem}>
                  <div className={`${styles.tlIco} ${styles.tlIcoOk}`}>
                    <CheckmarkFilled size={14} aria-hidden />
                  </div>
                  <div>
                    <div className={styles.tlTitle}>
                      <span className={styles.tlWho}>Composante MEP</span> · C2 Fondations
                      Numériques · MEP §3.2
                    </div>
                    <div className={styles.tlWhen}>Conforme</div>
                  </div>
                </li>
                <li className={styles.tlItem}>
                  <div className={`${styles.tlIco} ${styles.tlIcoWarn}`}>
                    <WarningAltFilled size={14} aria-hidden />
                  </div>
                  <div>
                    <div className={styles.tlTitle}>
                      <span className={styles.tlWho}>Risque E&S</span> · Catégorie Substantielle —
                      PEES requis · délai +14 j
                    </div>
                    <div className={styles.tlWhen}>Vigilance</div>
                  </div>
                </li>
                <li className={styles.tlItem}>
                  <div className={`${styles.tlIco} ${styles.tlIcoOk}`}>
                    <CheckmarkFilled size={14} aria-hidden />
                  </div>
                  <div>
                    <div className={styles.tlTitle}>
                      <span className={styles.tlWho}>Seuil de procédure</span> · 8,7 M USD ·
                      Procédure SBQC · ANO BM préalable
                    </div>
                    <div className={styles.tlWhen}>Conforme</div>
                  </div>
                </li>
              </ul>
            )}

            {tab === "scoring" && <ScoringCard marketRef={propRef} />}
          </div>
        </div>

        {/* ============ Side rail ============ */}
        <aside className={styles.rail}>
          <section className={styles.railCard}>
            <h4 className={styles.railH}>
              Synthèse <span className="ptn-mono" style={{ fontSize: 10, color: "var(--cds-text-helper)" }}>{propRef}</span>
            </h4>
            <div className={styles.railBody}>
              <div className={styles.railRow}>
                <div className={styles.railK}>Statut</div>
                <div className={styles.railV}>
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      background: "var(--ptn-status-warning-surface)",
                      color: "#8e6a00",
                      fontSize: 11,
                      padding: "2px 8px",
                    }}
                  >
                    <span
                      style={{
                        width: 8,
                        height: 8,
                        background: "var(--ptn-status-warning)",
                        borderRadius: "50%",
                      }}
                    />
                    Arbitrage UGP
                  </span>
                </div>
              </div>
              <div className={styles.railRow}>
                <div className={styles.railK}>Composante</div>
                <div className={styles.railV}>C2 Fondations</div>
              </div>
              <div className={styles.railRow}>
                <div className={styles.railK}>PTBA</div>
                <div className={`${styles.railV} ${styles.railVMono}`}>A2.3.1</div>
              </div>
              <div className={styles.railRow}>
                <div className={styles.railK}>Budget</div>
                <div className={`${styles.railV} ${styles.railVMono}`}>8,7 M USD</div>
              </div>
              <div className={styles.railRow}>
                <div className={styles.railK}>Bailleurs</div>
                <div className={styles.railV}>BM (79%) + AFD (21%)</div>
              </div>
              <div className={styles.railRow}>
                <div className={styles.railK}>Catégorie E&S</div>
                <div className={styles.railV}>Substantielle</div>
              </div>
              <div className={styles.railRow}>
                <div className={styles.railK}>Référent UGP</div>
                <div className={styles.railV}>M. Mukendi (Coord)</div>
              </div>
              <div className={styles.railRow}>
                <div className={styles.railK}>Créée le</div>
                <div className={`${styles.railV} ${styles.railVMono}`}>12 avr. 2026</div>
              </div>
            </div>
          </section>

          {/* Synthèse PV commission — cas d'usage IA #9 */}
          <section className={styles.pvCard}>
            <header className={styles.pvHead}>
              <h4 className={styles.pvTitle}>
                <Document size={12} aria-hidden /> Synthèse PV commission
                <span className={styles.pvBadge}>✦ IA</span>
              </h4>
            </header>
            <div className={styles.pvBody}>
              <div className={styles.pvMeta}>
                CE-2026-007 · 28 avr. 2026 · 5 membres · président A. Bopundja
              </div>
              <p className={styles.pvSummary}>
                La commission a examiné votre TDR. Avis globalement{" "}
                <strong>favorable sous réserve</strong> de 3 clarifications mineures.
              </p>
              <ul className={styles.pvBullets}>
                <li className={styles.pvBullet}>
                  <CheckmarkFilled size={10} aria-hidden className={styles.pvBulletIco} />
                  Pertinence stratégique confirmée (4/5 votes)
                </li>
                <li className={styles.pvBullet}>
                  <CheckmarkFilled size={10} aria-hidden className={styles.pvBulletIco} />
                  Budget cohérent avec PTBA-2026-Q2
                </li>
                <li className={styles.pvBullet}>
                  <WarningAltFilled size={10} aria-hidden style={{ color: "var(--ptn-status-warning)" }} />
                  Préciser profil Expert E&S (ID4D + ICAO 9303)
                </li>
                <li className={styles.pvBullet}>
                  <WarningAltFilled size={10} aria-hidden style={{ color: "var(--ptn-status-warning)" }} />
                  Détailler livrable L4 (rapport évaluation offres)
                </li>
              </ul>
              <div className={styles.pvDecision}>
                <CheckmarkFilled
                  size={12}
                  aria-hidden
                  style={{ color: "var(--ptn-status-success)" }}
                />
                <strong>Décision · Favorable sous réserve</strong>
              </div>
            </div>
            <div className={styles.pvFoot}>
              <button type="button" className={styles.pvFootBtn}>
                <Document size={10} aria-hidden /> PV intégral
              </button>
              <span style={{ color: "var(--cds-text-helper)" }}>·</span>
              <button type="button" className={styles.pvFootBtn}>
                <ChartLineSmooth size={10} aria-hidden /> Voir scoring détaillé
              </button>
            </div>
          </section>

          <section className={styles.predCard}>
            <header className={styles.predHead}>
              <h4 className={styles.predTitle}>
                <ChartLineSmooth size={12} aria-hidden /> Prédiction délai ANO
                <span className={styles.predBadge}>✦ IA</span>
              </h4>
            </header>
            <div className={styles.predBody}>
              <div className={styles.predValue}>
                <span className={styles.predNum}>14,8</span>
                <span className={styles.predUnit}>jours estimés</span>
              </div>
              <div className={styles.predRange}>Intervalle 11–19 j (95 %)</div>

              <div className={styles.predConf}>
                <span>Confiance</span>
                <div className={styles.predConfBar}>
                  <i style={{ width: "82%" }} />
                </div>
                <span className="ptn-mono">82 %</span>
              </div>

              <div className={styles.predGroup}>
                <div className={styles.predGroupH}>
                  <ArrowUp size={10} aria-hidden style={{ color: "var(--ptn-status-danger)" }} />
                  Facteurs ralentissants
                </div>
                <div className={styles.predFactor}>
                  <ArrowUp size={10} aria-hidden className={styles.predFactorIcoUp} />
                  <span>Catégorie E&S Substantielle</span>
                  <span className={`${styles.predDelta} ${styles.predDeltaUp}`}>+3,2 j</span>
                </div>
                <div className={styles.predFactor}>
                  <ArrowUp size={10} aria-hidden className={styles.predFactorIcoUp} />
                  <span>Budget &gt; 5 M USD (AOI)</span>
                  <span className={`${styles.predDelta} ${styles.predDeltaUp}`}>+1,8 j</span>
                </div>
                <div className={styles.predFactor}>
                  <ArrowUp size={10} aria-hidden className={styles.predFactorIcoUp} />
                  <span>Première AMOA identité ANIE</span>
                  <span className={`${styles.predDelta} ${styles.predDeltaUp}`}>+0,9 j</span>
                </div>
              </div>

              <div className={styles.predGroup}>
                <div className={styles.predGroupH}>
                  <ArrowDown size={10} aria-hidden style={{ color: "var(--ptn-status-success)" }} />
                  Facteurs accélérants
                </div>
                <div className={styles.predFactor}>
                  <ArrowDown size={10} aria-hidden className={styles.predFactorIcoDown} />
                  <span>Modèle TPL-AMOA-01 utilisé</span>
                  <span className={`${styles.predDelta} ${styles.predDeltaDown}`}>−4,5 j</span>
                </div>
                <div className={styles.predFactor}>
                  <ArrowDown size={10} aria-hidden className={styles.predFactorIcoDown} />
                  <span>5 profils-clés conformes</span>
                  <span className={`${styles.predDelta} ${styles.predDeltaDown}`}>−1,2 j</span>
                </div>
                <div className={styles.predFactor}>
                  <ArrowDown size={10} aria-hidden className={styles.predFactorIcoDown} />
                  <span>TTL BM connue · S. Adesina</span>
                  <span className={`${styles.predDelta} ${styles.predDeltaDown}`}>−0,8 j</span>
                </div>
              </div>
            </div>
            <div className={styles.predFoot}>
              Modèle XGBoost · 247 TDR · MAE 2,1 j · v 2026.04
            </div>
          </section>

          <section className={styles.railCard}>
            <h4 className={styles.railH}>Activité récente</h4>
            <div className={styles.railBody}>
              <ul className={styles.timeline}>
                {TIMELINE.map((t, i) => {
                  const ico =
                    t.kind === "ok"
                      ? styles.tlIcoOk
                      : t.kind === "warn"
                        ? styles.tlIcoWarn
                        : t.kind === "ai"
                          ? styles.tlIcoAi
                          : "";
                  const Icon =
                    t.kind === "ok"
                      ? CheckmarkFilled
                      : t.kind === "warn"
                        ? WarningAltFilled
                        : t.kind === "ai"
                          ? AiGenerate
                          : Events;
                  return (
                    <li key={i} className={styles.tlItem}>
                      <div className={`${styles.tlIco} ${ico}`}>
                        <Icon size={14} aria-hidden />
                      </div>
                      <div className={styles.tlBody}>
                        <div className={styles.tlTitle}>
                          <span className={styles.tlWho}>{t.who}</span> {t.txt}
                        </div>
                        <div className={styles.tlWhen}>{t.when}</div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          </section>

          <section className={styles.railCard}>
            <h4 className={styles.railH}>Échéances</h4>
            <div className={styles.railBody}>
              <div style={{ padding: "8px 0", display: "flex", gap: 10, alignItems: "center" }}>
                <Time size={14} aria-hidden style={{ color: "var(--ptn-status-danger)" }} />
                <div>
                  <div style={{ fontSize: 12, fontWeight: 500, color: "var(--cds-text-primary)" }}>
                    Réponse aux clarifications
                  </div>
                  <div
                    className="ptn-mono"
                    style={{ fontSize: 11, color: "var(--ptn-status-danger)" }}
                  >
                    Aujourd&apos;hui · J−1
                  </div>
                </div>
              </div>
              <div style={{ padding: "8px 0", display: "flex", gap: 10, alignItems: "center" }}>
                <Events size={14} aria-hidden style={{ color: "var(--cds-text-helper)" }} />
                <div>
                  <div style={{ fontSize: 12, fontWeight: 500, color: "var(--cds-text-primary)" }}>
                    Validation arbitrage UGP
                  </div>
                  <div className="ptn-mono" style={{ fontSize: 11, color: "var(--cds-text-helper)" }}>
                    13 mai 2026 · J+4
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className={styles.railCard}>
            <h4 className={styles.railH}>Acteurs</h4>
            <div className={styles.railBody}>
              <div className={styles.railRow}>
                <div className={styles.railK}>Partenaire</div>
                <div className={styles.railV}>ANIE (vous)</div>
              </div>
              <div className={styles.railRow}>
                <div className={styles.railK}>UGP</div>
                <div className={styles.railV}>M. Mukendi · Coord</div>
              </div>
              <div className={styles.railRow}>
                <div className={styles.railK}>RPM</div>
                <div className={styles.railV}>K. Lufima</div>
              </div>
              <div className={styles.railRow}>
                <div className={styles.railK}>TTL Banque</div>
                <div className={styles.railV}>S. Adesina</div>
              </div>
              <div className={styles.railRow}>
                <div className={styles.railK}>RC2</div>
                <div className={styles.railV}>J. Mbuyi</div>
              </div>
            </div>
          </section>
        </aside>
      </div>
    </>
  );
}
