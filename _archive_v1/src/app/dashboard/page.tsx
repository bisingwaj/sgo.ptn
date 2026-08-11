import type { Metadata } from "next";
import { Shell } from "@/components/shell/Shell";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Buttons";
import { KpiStrip, KpiTile } from "@/components/ui/KpiTile";
import { Tag } from "@/components/ui/Tag";
import { SidePanel, PanelSection } from "@/components/ui/SidePanel";
import styles from "./dashboard.module.css";

export const metadata: Metadata = {
  title: "Tableau de bord · Ministère du Numérique · PTN-RDC",
};

interface Initiative {
  ref: string;
  title: string;
  comp: { code: string; tone: "blue" | "purple" | "teal" | "green" };
  ptba: string;
  status: { label: string; tone: "blue" | "yellow" | "green" | "red" | "purple" | "gray" };
  step: { current: number; total: number; label: string };
  lastAction: string;
  ai?: boolean;
}

const INITIATIVES: Initiative[] = [
  {
    ref: "PTN-2026-019",
    title: "Plateforme nationale d'identité numérique",
    comp: { code: "C2 · Fond.", tone: "purple" },
    ptba: "A2.3.1",
    status: { label: "ANO en attente", tone: "yellow" },
    step: { current: 3, total: 6, label: "ANO BANQUE" },
    lastAction: "il y a 2h · J. Mukendi",
    ai: true,
  },
  {
    ref: "PTN-2026-021",
    title: "Backbone fibre Goma-Bukavu",
    comp: { code: "C1 · Accès", tone: "blue" },
    ptba: "A1.4.2",
    status: { label: "Évaluation", tone: "blue" },
    step: { current: 5, total: 6, label: "ÉVALUATION" },
    lastAction: "hier · M. Lufima",
  },
  {
    ref: "PTN-2026-014",
    title: "Étude PGES Centre de données Tier III",
    comp: { code: "C2 · Fond.", tone: "purple" },
    ptba: "A2.5.1",
    status: { label: "En cours", tone: "blue" },
    step: { current: 2, total: 6, label: "REVUE UGP" },
    lastAction: "2 jours · ANIE",
  },
  {
    ref: "PTN-2026-027",
    title: "Hubs technologiques Lubumbashi & Goma",
    comp: { code: "C3 · Compét.", tone: "teal" },
    ptba: "A3.2.1",
    status: { label: "Brouillon IA", tone: "purple" },
    step: { current: 1, total: 6, label: "TDR" },
    lastAction: "3 jours · UGP",
    ai: true,
  },
  {
    ref: "PTN-2026-009",
    title: "Cybersécurité — SOC national",
    comp: { code: "C2 · Fond.", tone: "purple" },
    ptba: "A2.7.2",
    status: { label: "ANO obtenu", tone: "green" },
    step: { current: 4, total: 6, label: "DAO" },
    lastAction: "5 jours · TTL BM",
  },
  {
    ref: "PTN-2026-031",
    title: "Formation EESU 200 enseignants",
    comp: { code: "C3 · Compét.", tone: "teal" },
    ptba: "A3.4.1",
    status: { label: "Clarifications", tone: "red" },
    step: { current: 3, total: 6, label: "ANO BANQUE" },
    lastAction: "6 jours · AFD",
  },
  {
    ref: "PTN-2026-005",
    title: "Modernisation registre des entreprises",
    comp: { code: "C2 · Fond.", tone: "purple" },
    ptba: "A2.2.3",
    status: { label: "Attribué", tone: "green" },
    step: { current: 6, total: 6, label: "ATTRIBUTION" },
    lastAction: "1 sem · UGP",
  },
  {
    ref: "PTN-2026-033",
    title: "Atelier ID4Africa Abidjan 2026",
    comp: { code: "C4 · Coord.", tone: "green" },
    ptba: "A4.1.4",
    status: { label: "En cours", tone: "blue" },
    step: { current: 2, total: 6, label: "REVUE UGP" },
    lastAction: "10h · KKO",
  },
];

export default function DashboardPage() {
  return (
    <Shell crumbs={[{ label: "Accueil", href: "/home" }, { label: "Tableau de bord" }]}>
      <div className={styles.layout}>
        <div className={styles.content}>
          <PageHeader
            title="Bonjour Jean — Ministère du Numérique"
            meta={
              <>
                <span className="dot" />
                <span>
                  Synchronisé · <span className="mono">07 mai 2026 · 09:42 UTC+1</span>
                </span>
                <span>·</span>
                <span>
                  Cycle PTBA : <span className="mono">2026-Q2</span>
                </span>
              </>
            }
            actions={
              <>
                <Button
                  variant="secondary"
                  size="md"
                  iconPosition="left"
                  icon={
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4">
                      <path d="M8 2v10M3 7l5-5 5 5M2 14h12" />
                    </svg>
                  }
                >
                  Exporter
                </Button>
                <Button
                  variant="primary"
                  icon={
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4">
                      <path d="M6 3l5 5-5 5" />
                    </svg>
                  }
                >
                  + Proposer une initiative
                </Button>
              </>
            }
          />

          <KpiStrip cols={4}>
            <KpiTile
              label="Initiatives actives"
              icon={<MiniIcon path="M3 2h7l3 3v9H3z" />}
              value="12"
              delta={{ dir: "up", text: "+2 vs avr. 2026" }}
            />
            <KpiTile
              label="En attente d'ANO"
              icon={<MiniIcon path="M8 2a6 6 0 110 12 6 6 0 010-12zM8 4v4l2.5 2" />}
              value="3"
              delta={{ dir: "neutral", text: "Délai 14,2 j · cible 12 j" }}
            />
            <KpiTile
              label="Budget mobilisé"
              icon={<MiniIcon path="M2 3h12v10H2zM2 6h12M5 9.5h6" />}
              value="42,8"
              unit="/ 69,0 M USD"
              extra={
                <>
                  <div className="pbar">
                    <i style={{ width: "62%" }} />
                  </div>
                  <div className="pbar-meta">
                    <span>62 %</span>
                    <span>Restant 26,2 M</span>
                  </div>
                </>
              }
            />
            <KpiTile
              label="Délai TDR → ANO"
              icon={<MiniIcon path="M2 13h12M4 13V8M7 13V5M10 13V9M13 13V6" />}
              value="38"
              unit="jours"
              delta={{ dir: "down", text: "−6 j vs S1 2026" }}
              extra={
                <svg viewBox="0 0 120 26" preserveAspectRatio="none" className={styles.sl}>
                  <polyline
                    points="0,18 20,16 40,20 60,12 80,14 100,9 120,7"
                    fill="none"
                    stroke="#0f62fe"
                    strokeWidth="1.5"
                  />
                  <polyline
                    points="0,18 20,16 40,20 60,12 80,14 100,9 120,7 120,26 0,26"
                    fill="#edf5ff"
                    stroke="none"
                  />
                  <circle cx="120" cy="7" r="2" fill="#0f62fe" />
                </svg>
              }
            />
          </KpiStrip>

          {/* DataTable */}
          <section className={styles.tableCard}>
            <div className={styles.tbar}>
              <h3 className={styles.tbarTitle}>
                Initiatives en cours <span className="mono">(12)</span>
              </h3>
              <div className={styles.tbarSep} />
              <button className={styles.filter}>
                Statut <span className="mono">2</span>
                <Chev />
              </button>
              <button className={styles.filter}>
                Composante <Chev />
              </button>
              <button className={styles.filter}>
                Période <span className="mono">2026-Q2</span>
                <Chev />
              </button>
              <div className={styles.tbarSpacer} />
              <div className={styles.tsearch}>
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3">
                  <circle cx="7" cy="7" r="4.5" />
                  <path d="M10.5 10.5L14 14" />
                </svg>
                <input placeholder="Rechercher une initiative…" />
              </div>
            </div>

            <div className={styles.chipsRow}>
              <span className={styles.chipsLabel}>Filtres actifs</span>
              <Chip>Statut : En cours</Chip>
              <Chip>Statut : ANO en attente</Chip>
              <Chip>Période : 2026-Q2</Chip>
              <button className={styles.chipsClear}>Effacer tout</button>
            </div>

            <div className={styles.tableScroll}>
              <table className={styles.dt}>
                <colgroup>
                  <col style={{ width: "11%" }} />
                  <col style={{ width: "26%" }} />
                  <col style={{ width: "10%" }} />
                  <col style={{ width: "8%" }} />
                  <col style={{ width: "13%" }} />
                  <col style={{ width: "14%" }} />
                  <col style={{ width: "14%" }} />
                  <col style={{ width: "4%" }} />
                </colgroup>
                <thead>
                  <tr>
                    <th>Réf</th>
                    <th>Intitulé</th>
                    <th>Composante</th>
                    <th>PTBA</th>
                    <th>Statut</th>
                    <th>Étape pipeline</th>
                    <th>Dernière action</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {INITIATIVES.map((i) => (
                    <tr key={i.ref} className={styles.row}>
                      <td className="mono">{i.ref}</td>
                      <td>
                        <div className={styles.cellTitle}>
                          {i.title}
                          {i.ai && <Tag tone="purple" size="sm">IA</Tag>}
                        </div>
                      </td>
                      <td>
                        <Tag tone={i.comp.tone}>{i.comp.code}</Tag>
                      </td>
                      <td className="mono">{i.ptba}</td>
                      <td>
                        <Tag tone={i.status.tone}>
                          <span className={styles.dot} />
                          {i.status.label}
                        </Tag>
                      </td>
                      <td>
                        <Stepper current={i.step.current} total={i.step.total} />
                        <div className={styles.stepLabel}>
                          {i.step.label} ·{" "}
                          <span className="mono">
                            {i.step.current}/{i.step.total}
                          </span>
                        </div>
                      </td>
                      <td className={styles.faint}>{i.lastAction}</td>
                      <td>
                        <button className={styles.kebab} aria-label="Actions">
                          ⋯
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className={styles.pag}>
              <span>10 / page</span>
              <span className={styles.pagSep} />
              <span className="mono">1–8 de 12</span>
              <div className={styles.tbarSpacer} />
              <button className={styles.pagBtn}>‹</button>
              <span className="mono">1 / 2</span>
              <button className={styles.pagBtn}>›</button>
            </div>
          </section>
        </div>

        <SidePanel>
          <PanelSection title="Activité récente" badge={9}>
            {[
              {
                kind: "ai",
                txt: (
                  <>
                    <span className={styles.who}>IA Carbon</span> a généré le brouillon
                    TDR pour <span className={`${styles.who} mono`}>PTN-2026-019</span>
                  </>
                ),
                when: "il y a 12 min",
              },
              {
                kind: "ok",
                txt: (
                  <>
                    <span className={styles.who}>TTL BM</span> a délivré l&apos;ANO
                    Cybersécurité
                  </>
                ),
                when: "il y a 1h",
              },
              {
                kind: "warn",
                txt: (
                  <>
                    <span className={styles.who}>AFD</span> demande des clarifications
                    sur PTN-2026-031
                  </>
                ),
                when: "il y a 6h",
              },
              {
                kind: "ai",
                txt: (
                  <>
                    Synthèse IA disponible :{" "}
                    <span className={styles.who}>conditionnalités Q2</span>
                  </>
                ),
                when: "hier 17:23",
              },
            ].map((it, idx) => (
              <div key={idx} className={styles.feedItem}>
                <span className={`${styles.feedIco} ${styles[`feed_${it.kind}`]}`}>
                  {it.kind === "ai" && (
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4">
                      <circle cx="8" cy="8" r="2" />
                      <path d="M8 1v3M8 12v3M1 8h3M12 8h3M3 3l2 2M11 11l2 2M3 13l2-2M11 5l2-2" />
                    </svg>
                  )}
                  {it.kind === "ok" && (
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6">
                      <path d="M3 8l3 3 7-7" />
                    </svg>
                  )}
                  {it.kind === "warn" && (
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M8 1.5L15 14H1z" />
                      <path d="M8 6v4M8 12v.01" strokeLinecap="round" />
                    </svg>
                  )}
                </span>
                <div>
                  <div className={styles.feedTxt}>{it.txt}</div>
                  <div className={`${styles.feedWhen} mono`}>{it.when}</div>
                </div>
              </div>
            ))}
          </PanelSection>

          <PanelSection title="Échéances ≤ 7 jours" badge={3}>
            {[
              { d: "12", m: "MAI", title: "Rapport S1 PTN-RDC", ref: "RP-S1", j: "J−5", urgent: true },
              { d: "16", m: "MAI", title: "Soumission DAO Backbone", ref: "PTN-2026-021", j: "J−9" },
              { d: "23", m: "MAI", title: "Audit externe T1", ref: "AUD-T1", j: "J−16" },
            ].map((d, idx) => (
              <div key={idx} className={`${styles.dl} ${d.urgent ? styles.dlUrgent : ""}`}>
                <div className={styles.dlDay}>
                  <div className={styles.dlD}>{d.d}</div>
                  <div className={styles.dlM}>{d.m}</div>
                </div>
                <div className={styles.dlMeta}>
                  <div>{d.title}</div>
                  <div className="mono" style={{ fontSize: 11, color: "var(--c-text-helper)" }}>
                    {d.ref}
                  </div>
                </div>
                <div className={styles.dlCount}>{d.j}</div>
              </div>
            ))}
          </PanelSection>

          <PanelSection title="Documents requis" badge={4}>
            {[
              { name: "PGES initial · PTN-2026-014", sub: "ANIE · à valider" },
              { name: "Cadre de résultats Q2", sub: "S&E · UGP" },
              { name: "Rapport audit Cour des Comptes", sub: "Annexe MEP" },
              { name: "PV Commission éval. PTN-2026-009", sub: "Signatures requises" },
            ].map((doc, idx) => (
              <button key={idx} className={styles.doc}>
                <span className={styles.docIco}>
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4">
                    <path d="M3 2h7l3 3v9H3z" />
                    <path d="M10 2v3h3" />
                  </svg>
                </span>
                <span className={styles.docMeta}>
                  <span className={styles.docName}>{doc.name}</span>
                  <span className={`${styles.docSub} mono`}>{doc.sub}</span>
                </span>
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4">
                  <path d="M5 3l5 5-5 5" />
                </svg>
              </button>
            ))}
          </PanelSection>
        </SidePanel>
      </div>
    </Shell>
  );
}

function MiniIcon({ path }: { path: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4">
      <path d={path} />
    </svg>
  );
}

function Chev() {
  return (
    <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4">
      <path d="M3 6l5 5 5-5" />
    </svg>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className={styles.chip}>
      {children}
      <span className={styles.chipX}>×</span>
    </span>
  );
}

function Stepper({ current, total }: { current: number; total: number }) {
  return (
    <div className={styles.stepper}>
      {Array.from({ length: total }).map((_, i) => (
        <span
          key={i}
          className={
            i < current
              ? styles.stepDone
              : i === current
                ? styles.stepCurrent
                : styles.stepIdle
          }
        />
      ))}
    </div>
  );
}
