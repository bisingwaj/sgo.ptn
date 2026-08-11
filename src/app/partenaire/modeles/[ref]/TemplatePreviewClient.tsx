"use client";

import { useState } from "react";
import Link from "next/link";
import {
  CheckmarkFilled,
  Document,
  Locked,
  AiGenerate,
  Time,
  ArrowRight,
  Download,
  WarningAltFilled,
  TaskApproved,
} from "@carbon/icons-react";
import styles from "./template-preview.module.scss";

interface Template {
  ref: string;
  type: string;
  title: string;
  desc: string;
  composante: string;
  budget: string;
  duration: string;
  anoTime: string;
  reused: number;
  ai: boolean;
}

interface Annex {
  name: string;
  type: "PDF" | "DOCX" | "XLSX";
  size: string;
}

interface Usage {
  ref: string;
  date: string;
  amount: string;
  anoDelay: string;
}

interface AuditEvent {
  ts: string;
  who: string;
  action: string;
  body?: React.ReactNode;
}

interface TemplatePreviewClientProps {
  template: Template;
}

const ANNEXES: Annex[] = [
  { name: "Annexe A · Critères d'évaluation pondérés", type: "PDF", size: "180 Ko" },
  { name: "Annexe B · Profils-clés détaillés (5 profils)", type: "DOCX", size: "240 Ko" },
  { name: "Annexe C · Modèle de contrat-type SBQC", type: "DOCX", size: "320 Ko" },
  { name: "Annexe D · Tableau budgétaire détaillé", type: "XLSX", size: "180 Ko" },
  { name: "Annexe E · Calendrier-type (Gantt)", type: "PDF", size: "140 Ko" },
  { name: "Annexe F · Plan de sauvegarde environnementale type", type: "PDF", size: "1,2 Mo" },
];

const USAGES: Usage[] = [
  { ref: "PTN-2025-094", date: "déc. 2025", amount: "7,2 M USD", anoDelay: "8 j" },
  { ref: "PTN-2025-082", date: "oct. 2025", amount: "9,1 M USD", anoDelay: "11 j" },
  { ref: "PTN-2025-067", date: "août 2025", amount: "5,8 M USD", anoDelay: "9 j" },
  { ref: "PTN-2025-051", date: "juin 2025", amount: "6,4 M USD", anoDelay: "10 j" },
  { ref: "PTN-2025-038", date: "mai 2025", amount: "8,9 M USD", anoDelay: "7 j" },
  { ref: "PTN-2024-117", date: "déc. 2024", amount: "4,2 M USD", anoDelay: "12 j" },
  { ref: "PTN-2024-089", date: "août 2024", amount: "10,5 M USD", anoDelay: "9 j" },
];

const AUDIT_EVENTS: AuditEvent[] = [
  {
    ts: "01 mai 2026 · 14:22",
    who: "UGP · K. Lufima (RPM)",
    action: "Mise à jour majeure",
    body: (
      <>
        Conformité Procurement Regulations <strong>février 2025</strong>. Sections{" "}
        <span className="ptn-mono">02 / 03 / 04</span> régénérées par IA puis validées
        manuellement. Hash <span className="ptn-mono">a3f2e1c4</span>.
      </>
    ),
  },
  {
    ts: "12 mars 2026 · 10:15",
    who: "Assistant IA · claude-opus-4-7",
    action: "Régénération section 03 (objectifs spécifiques)",
    body: (
      <>
        Sources : 4 TDR similaires ayant obtenu un ANO ≤ 10 j. Confiance{" "}
        <strong>89 %</strong>. Validation manuelle UGP requise avant publication.
      </>
    ),
  },
  {
    ts: "08 févr. 2026 · 09:42",
    who: "UGP · M. Mukendi (Coord)",
    action: "Approbation usage en production",
    body: (
      <>
        Modèle approuvé pour utilisation par les partenaires institutionnels (ANIE,
        RegidSO, BCC) sur projets identité numérique.
      </>
    ),
  },
  {
    ts: "15 janv. 2026 · 16:08",
    who: "Banque mondiale · S. Adesina (TTL)",
    action: "Validation cadre ID4D",
    body: (
      <>
        Conforme cadre ID4D Banque mondiale et standards ICAO 9303. Référencé pour
        réplication régionale (CEMAC).
      </>
    ),
  },
  {
    ts: "01 déc. 2025 · 11:30",
    who: "UGP · Équipe TDR",
    action: "Création initiale",
    body: <>Création du modèle à partir des TDR PTN-2025-094 et PTN-2025-082.</>,
  },
];

const TABS = [
  { id: "preview", label: "Aperçu sections" },
  { id: "annexes", label: "Annexes" },
  { id: "history", label: "Historique d'utilisation" },
  { id: "audit", label: "Audit IA" },
];

function FileIcon({ type }: { type: Annex["type"] }) {
  const bg =
    type === "PDF"
      ? { background: "#fff1f1", color: "#da1e28" }
      : type === "XLSX"
        ? { background: "var(--ptn-status-success-surface)", color: "#198038" }
        : { background: "var(--ptn-accent-light)", color: "var(--ptn-accent)" };
  return (
    <div
      style={{
        width: 32,
        height: 32,
        display: "grid",
        placeItems: "center",
        flexShrink: 0,
        ...bg,
      }}
    >
      <Document size={16} aria-hidden />
    </div>
  );
}

export function TemplatePreviewClient({ template: t }: TemplatePreviewClientProps) {
  const [activeTab, setActiveTab] = useState<string>("preview");

  return (
    <div>
      <div className={styles.tabs}>
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`${styles.tab} ${activeTab === tab.id ? styles.tabActive : ""}`}
            onClick={() => setActiveTab(tab.id)}
            aria-pressed={activeTab === tab.id}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className={styles.panel}>
        {activeTab === "preview" && <PreviewPanel />}
        {activeTab === "annexes" && <AnnexesPanel />}
        {activeTab === "history" && <HistoryPanel />}
        {activeTab === "audit" && <AuditPanel />}
      </div>
    </div>
  );
}

function PreviewPanel() {
  return (
    <>
      <section className={styles.section}>
        <div className={styles.sectionH}>
          <span className={styles.sectionNum}>01</span>
          <h3 className={styles.sectionTitle}>Contexte</h3>
          <span className={styles.aiBadge}>✦ IA contextuel</span>
        </div>
        <div className={styles.sectionBody}>
          <p>
            Le ministère / l&apos;institution bénéficiaire souhaite déployer une plateforme
            d&apos;identité numérique inclusive pour <em>[N]</em> millions de citoyens, conforme
            aux standards ICAO 9303 et au cadre ID4D Banque mondiale.
          </p>
          <div className={styles.placeholder}>
            [Personnaliser le contexte spécifique au pays / partenaire]
          </div>
          <p>
            L&apos;activité s&apos;inscrit dans la Composante <em>[Cx]</em> et fait l&apos;objet
            d&apos;un cofinancement IDA + AFD.
          </p>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionH}>
          <span className={styles.sectionNum}>02</span>
          <h3 className={styles.sectionTitle}>Objectif général</h3>
          <span className={styles.lockBadge}>
            <Locked size={10} aria-hidden /> MEP §4.2
          </span>
        </div>
        <div className={styles.sectionBody}>
          <p>
            Doter l&apos;État d&apos;une plateforme d&apos;identité numérique inclusive,
            interopérable et conforme aux standards internationaux (ICAO 9303, cadre ID4D Banque
            mondiale, normes biométriques NIST).
          </p>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionH}>
          <span className={styles.sectionNum}>03</span>
          <h3 className={styles.sectionTitle}>Objectifs spécifiques</h3>
          <span className={styles.aiBadge}>✦ IA structuré</span>
        </div>
        <div className={`${styles.sectionBodyAi}`}>
          <p>O1 · Concevoir l&apos;architecture technique cible et son schéma directeur.</p>
          <p>O2 · Accompagner la passation du marché de réalisation (DAO + évaluation).</p>
          <p>O3 · Former les équipes bénéficiaires à la gouvernance opérationnelle.</p>
          <p>O4 · Définir le plan de continuité d&apos;activité.</p>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionH}>
          <span className={styles.sectionNum}>04</span>
          <h3 className={styles.sectionTitle}>Livrables attendus</h3>
          <span className={styles.lockBadge}>
            <Locked size={10} aria-hidden /> MEP §4.2
          </span>
        </div>
        <div className={styles.sectionBody}>
          <p>L1 · Note de cadrage stratégique (J+15)</p>
          <p>L2 · Architecture technique cible (J+45)</p>
          <p>L3 · DAO complet (J+90)</p>
          <p>L4 · Rapport d&apos;assistance évaluation (J+150)</p>
          <p>L5 · Rapport de pilotage (J+180 puis trimestriel)</p>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionH}>
          <span className={styles.sectionNum}>05</span>
          <h3 className={styles.sectionTitle}>Profils-clés requis</h3>
        </div>
        <div className={styles.sectionBody}>
          <p>P1 · Chef de mission — 10 ans d&apos;expérience</p>
          <p>P2 · Expert architecture identité — référence ID4D ≥ 2 projets</p>
          <p>P3 · Expert biométrie — certification ICAO 9303</p>
          <p>P4 · Expert E&S — sauvegardes Banque mondiale</p>
          <p>P5 · Expert genre & inclusion</p>
        </div>
      </section>
    </>
  );
}

function AnnexesPanel() {
  return (
    <div>
      <div
        style={{
          background: "var(--cds-layer-accent-01)",
          padding: "10px 14px",
          fontSize: 12,
          color: "var(--cds-text-secondary)",
          marginBottom: 16,
          display: "flex",
          gap: 10,
          alignItems: "flex-start",
        }}
      >
        <Document size={14} aria-hidden style={{ flexShrink: 0, marginTop: 2 }} />
        <div>
          <strong style={{ color: "var(--cds-text-primary)" }}>
            6 annexes prêtes à l&apos;emploi
          </strong>{" "}
          — incluses dans le modèle. Toutes éditables après import dans votre proposition.
          Conformes aux Procurement Regulations Banque mondiale 2025.
        </div>
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 1,
          background: "var(--cds-border-subtle)",
          border: "1px solid var(--cds-border-subtle)",
        }}
      >
        {ANNEXES.map((a, i) => (
          <div
            key={i}
            style={{
              background: "var(--cds-layer)",
              padding: "12px 16px",
              display: "grid",
              gridTemplateColumns: "32px 1fr auto auto",
              gap: 12,
              alignItems: "center",
            }}
          >
            <FileIcon type={a.type} />
            <div>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 500,
                  color: "var(--cds-text-primary)",
                }}
              >
                {a.name}
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: "var(--cds-text-helper)",
                  fontFamily: "var(--font-ibm-plex-mono)",
                  marginTop: 2,
                }}
              >
                {a.type} · {a.size}
              </div>
            </div>
            <button
              type="button"
              style={{
                background: "transparent",
                border: 0,
                color: "var(--ptn-accent)",
                fontSize: 12,
                cursor: "pointer",
                padding: "4px 10px",
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                textDecoration: "none",
              }}
            >
              Aperçu
            </button>
            <button
              type="button"
              style={{
                background: "transparent",
                border: 0,
                color: "var(--cds-text-secondary)",
                cursor: "pointer",
                padding: 4,
                display: "grid",
                placeItems: "center",
              }}
              aria-label={`Télécharger ${a.name}`}
            >
              <Download size={16} aria-hidden />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function HistoryPanel() {
  const total = USAGES.length;
  const avg = (USAGES.reduce((acc, u) => acc + parseInt(u.anoDelay), 0) / total).toFixed(1);

  return (
    <div>
      {/* Mini stats */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 1,
          background: "var(--cds-border-subtle)",
          border: "1px solid var(--cds-border-subtle)",
          marginBottom: 16,
        }}
      >
        {[
          { k: "Réutilisations", v: total.toString() },
          { k: "Délai ANO moyen", v: `${avg} j`, ok: true },
          { k: "Taux d'approbation", v: "100 %", ok: true },
        ].map((kpi, i) => (
          <div
            key={i}
            style={{ background: "var(--cds-layer)", padding: "12px 16px" }}
          >
            <div
              style={{
                fontSize: 11,
                textTransform: "uppercase",
                letterSpacing: "0.32px",
                color: "var(--cds-text-helper)",
                marginBottom: 4,
              }}
            >
              {kpi.k}
            </div>
            <div
              style={{
                fontFamily: "var(--font-ibm-plex-mono)",
                fontSize: 22,
                fontWeight: 300,
                color: kpi.ok ? "var(--ptn-status-success)" : "var(--cds-text-primary)",
              }}
            >
              {kpi.v}
            </div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div
        style={{
          background: "var(--cds-layer)",
          border: "1px solid var(--cds-border-subtle)",
        }}
      >
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th
                style={{
                  textAlign: "left",
                  background: "var(--cds-layer-accent-01)",
                  fontSize: 12,
                  fontWeight: 500,
                  padding: "12px 16px",
                  borderBottom: "1px solid var(--cds-border-subtle)",
                }}
              >
                Référence
              </th>
              <th
                style={{
                  textAlign: "left",
                  background: "var(--cds-layer-accent-01)",
                  fontSize: 12,
                  fontWeight: 500,
                  padding: "12px 16px",
                  borderBottom: "1px solid var(--cds-border-subtle)",
                }}
              >
                Date
              </th>
              <th
                style={{
                  textAlign: "right",
                  background: "var(--cds-layer-accent-01)",
                  fontSize: 12,
                  fontWeight: 500,
                  padding: "12px 16px",
                  borderBottom: "1px solid var(--cds-border-subtle)",
                }}
              >
                Montant
              </th>
              <th
                style={{
                  textAlign: "right",
                  background: "var(--cds-layer-accent-01)",
                  fontSize: 12,
                  fontWeight: 500,
                  padding: "12px 16px",
                  borderBottom: "1px solid var(--cds-border-subtle)",
                }}
              >
                Délai ANO
              </th>
              <th style={{ background: "var(--cds-layer-accent-01)", borderBottom: "1px solid var(--cds-border-subtle)", padding: "12px 16px" }} />
            </tr>
          </thead>
          <tbody>
            {USAGES.map((u, i) => (
              <tr key={i}>
                <td
                  style={{
                    padding: "10px 16px",
                    borderBottom: i < USAGES.length - 1 ? "1px solid var(--cds-border-subtle)" : 0,
                    fontFamily: "var(--font-ibm-plex-mono)",
                    fontSize: 12,
                    color: "var(--cds-text-primary)",
                    fontWeight: 500,
                  }}
                >
                  {u.ref}
                </td>
                <td
                  style={{
                    padding: "10px 16px",
                    borderBottom: i < USAGES.length - 1 ? "1px solid var(--cds-border-subtle)" : 0,
                    fontFamily: "var(--font-ibm-plex-mono)",
                    fontSize: 12,
                    color: "var(--cds-text-helper)",
                  }}
                >
                  {u.date}
                </td>
                <td
                  style={{
                    padding: "10px 16px",
                    borderBottom: i < USAGES.length - 1 ? "1px solid var(--cds-border-subtle)" : 0,
                    textAlign: "right",
                    fontFamily: "var(--font-ibm-plex-mono)",
                    fontSize: 12,
                    color: "var(--cds-text-primary)",
                  }}
                >
                  {u.amount}
                </td>
                <td
                  style={{
                    padding: "10px 16px",
                    borderBottom: i < USAGES.length - 1 ? "1px solid var(--cds-border-subtle)" : 0,
                    textAlign: "right",
                    fontFamily: "var(--font-ibm-plex-mono)",
                    fontSize: 12,
                  }}
                >
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                      color: "var(--ptn-status-success)",
                    }}
                  >
                    <CheckmarkFilled size={10} aria-hidden /> {u.anoDelay}
                  </span>
                </td>
                <td
                  style={{
                    padding: "10px 16px",
                    borderBottom: i < USAGES.length - 1 ? "1px solid var(--cds-border-subtle)" : 0,
                    textAlign: "right",
                  }}
                >
                  <Link
                    href={`/dashboard/initiatives/${u.ref}`}
                    style={{
                      color: "var(--ptn-accent)",
                      fontSize: 12,
                      textDecoration: "none",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    Ouvrir <ArrowRight size={12} aria-hidden />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AuditPanel() {
  return (
    <div>
      <div
        style={{
          background: "var(--ptn-status-ai-surface)",
          borderLeft: "2px solid var(--ptn-status-ai)",
          padding: "12px 14px",
          marginBottom: 16,
          fontSize: 12,
          color: "var(--cds-text-primary)",
          lineHeight: 1.5,
          display: "flex",
          gap: 10,
          alignItems: "flex-start",
        }}
      >
        <AiGenerate
          size={16}
          aria-hidden
          style={{ color: "var(--ptn-status-ai)", flexShrink: 0, marginTop: 2 }}
        />
        <div>
          <strong>Audit trail IA · ISO/IEC 42001</strong>
          <p style={{ margin: "4px 0 0", color: "var(--cds-text-secondary)" }}>
            Chaque suggestion IA est journalisée avec prompt, modèle, version, sources, signataire
            humain et hash HMAC. Conservation 5 ans après clôture du projet.
          </p>
        </div>
      </div>

      <ol
        style={{
          listStyle: "none",
          margin: 0,
          padding: 0,
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        {AUDIT_EVENTS.map((e, i) => {
          const isAi = /IA|claude/i.test(e.who);
          return (
            <li
              key={i}
              style={{
                background: "var(--cds-layer)",
                border: "1px solid var(--cds-border-subtle)",
                borderLeft: `2px solid ${isAi ? "var(--ptn-status-ai)" : "var(--ptn-accent)"}`,
                padding: "12px 14px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 6,
                  flexWrap: "wrap",
                }}
              >
                <span
                  style={{
                    fontSize: 11,
                    fontFamily: "var(--font-ibm-plex-mono)",
                    color: "var(--cds-text-helper)",
                  }}
                >
                  {e.ts}
                </span>
                <span
                  style={{
                    fontSize: 11,
                    color: isAi ? "var(--ptn-status-ai)" : "var(--ptn-accent)",
                    fontWeight: 500,
                  }}
                >
                  {e.who}
                </span>
              </div>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 500,
                  color: "var(--cds-text-primary)",
                  marginBottom: 4,
                }}
              >
                {e.action}
              </div>
              {e.body && (
                <div
                  style={{
                    fontSize: 12,
                    color: "var(--cds-text-secondary)",
                    lineHeight: 1.5,
                  }}
                >
                  {e.body}
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
