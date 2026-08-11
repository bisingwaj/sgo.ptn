import type { Metadata } from "next";
import { Shell } from "@/components/shell/Shell";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Buttons";
import { KpiStrip, KpiTile } from "@/components/ui/KpiTile";
import { Tag } from "@/components/ui/Tag";
import { SidePanel, PanelSection } from "@/components/ui/SidePanel";
import shared from "@/components/ui/dashboard-shared.module.css";
import styles from "./bailleur.module.css";

export const metadata: Metadata = { title: "Dashboard Bailleur · PTN-RDC" };

export default function BailleurPage() {
  return (
    <Shell crumbs={[{ label: "Accueil", href: "/home" }, { label: "Dashboard Bailleur" }]}>
      <div className={shared.layout}>
        <div className={shared.content}>
          <PageHeader
            title="Bonjour Sarah — Banque mondiale · IDA"
            meta={
              <>
                <span className={shared.dot} style={{ background: "var(--c-green-50)" }} />
                <span>
                  Engagement IDA : <span className="mono">400</span> M USD ·
                  Décaissé <span className="mono">112,4</span> M
                </span>
                <span>·</span>
                <span>
                  ISR : <Tag tone="green" size="sm">MS</Tag>
                </span>
              </>
            }
            actions={
              <>
                <div className={styles.bailleurSwitch}>
                  <button className={styles.bailleurActive}>BM · IDA</button>
                  <button>AFD</button>
                  <button>Conjoint</button>
                </div>
                <Button variant="primary">Émettre un ANO</Button>
              </>
            }
          />

          <KpiStrip cols={6}>
            <KpiTile label="Engagement IDA" value="400" unit="M USD" delta={{ dir: "neutral", text: "79 % du total" }} />
            <KpiTile
              label="Décaissé"
              value="112,4"
              unit="M USD"
              extra={
                <div className={shared.bar}>
                  <i style={{ width: "28%", background: "var(--c-blue-60)" }} />
                </div>
              }
              delta={{ dir: "up", text: "+8,2 vs T-1" }}
            />
            <KpiTile label="ANO en file" value="9" delta={{ dir: "up", text: "+3 cette sem." }} />
            <KpiTile label="Cadre résultats" value="22 / 28" unit="IDD" delta={{ dir: "up", text: "79 %" }} />
            <KpiTile label="Risque E&S" value="MS" unit="Substantiel" delta={{ dir: "neutral", text: "Stable T-1" }} />
            <KpiTile label="Note ISR" value="MS" delta={{ dir: "up", text: "Stable" }} />
          </KpiStrip>

          {/* Inbox ANO */}
          <section className={shared.card}>
            <header className={shared.cardHead}>
              <span className={shared.cardTitle}>Inbox ANO unifiée</span>
              <span className={shared.cardSubtle}>
                <Tag tone="yellow" size="sm">9 en file</Tag>{" "}
                · délai moyen <strong className="mono">14,2 j</strong>
              </span>
            </header>
            <div className={styles.tableScroll}>
              <table className={styles.dt}>
                <thead>
                  <tr>
                    <th>Réf</th>
                    <th>Objet</th>
                    <th>Bailleur</th>
                    <th>Composante</th>
                    <th>Statut</th>
                    <th>Montant</th>
                    <th>Échéance</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { r: "PTN-2026-021", o: "DAO Backbone fibre Goma-Bukavu", b: "BM", c: "C1", s: { l: "ANO en revue", t: "yellow" as const }, m: "12,4 M", e: "J−4", urg: false },
                    { r: "PTN-2026-019", o: "TDR Plateforme identité numérique", b: "BM", c: "C2", s: { l: "Clarifications", t: "red" as const }, m: "8,7 M", e: "J−7", urg: true },
                    { r: "PTN-2026-014", o: "PGES Centre données Tier III", b: "AFD", c: "C2", s: { l: "ANO en revue", t: "yellow" as const }, m: "3,2 M", e: "J−9", urg: false },
                    { r: "PTN-2026-031", o: "TDR Formation EESU 200 enseignants", b: "AFD", c: "C3", s: { l: "Clarifications", t: "red" as const }, m: "1,9 M", e: "J−12", urg: false },
                    { r: "PTN-2026-027", o: "DAO Hubs Lubumbashi & Goma", b: "BM", c: "C3", s: { l: "ANO en revue", t: "yellow" as const }, m: "5,6 M", e: "J−14", urg: false },
                    { r: "PTN-2026-009", o: "Contrat SOC national cybersécurité", b: "BM", c: "C2", s: { l: "ANO délivré", t: "green" as const }, m: "14,2 M", e: "J−18", urg: false },
                    { r: "PTN-2026-005", o: "Avenant registre des entreprises", b: "BM", c: "C2", s: { l: "ANO délivré", t: "green" as const }, m: "0,8 M", e: "J−22", urg: false },
                    { r: "PTN-2026-033", o: "TDR Atelier ID4Africa Abidjan", b: "BM", c: "C4", s: { l: "ANO en revue", t: "yellow" as const }, m: "0,2 M", e: "J−26", urg: false },
                    { r: "PTN-2026-040", o: "DAO Modernisation routes numériques", b: "BM", c: "C1", s: { l: "Soumis", t: "blue" as const }, m: "22,1 M", e: "J−28", urg: false },
                  ].map((r) => (
                    <tr key={r.r} className={r.urg ? styles.rowUrgent : ""}>
                      <td className="mono">{r.r}</td>
                      <td>{r.o}</td>
                      <td>
                        <Tag tone={r.b === "BM" ? "blue" : "purple"} size="sm">
                          {r.b}
                        </Tag>
                      </td>
                      <td>
                        <Tag tone="gray" size="sm">{r.c}</Tag>
                      </td>
                      <td>
                        <Tag tone={r.s.t} size="sm">
                          {r.s.l}
                        </Tag>
                      </td>
                      <td className="mono">{r.m}</td>
                      <td className={`mono ${r.urg ? styles.urgentText : ""}`}>{r.e}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Portefeuille + Conditionnalités */}
          <div className={shared.split2}>
            <section className={shared.card}>
              <header className={shared.cardHead}>
                <span className={shared.cardTitle}>Portefeuille par composante</span>
              </header>
              <div className={shared.cardBody}>
                {[
                  { k: "C1", l: "Accès & Inclusion", e: "385", d: "108,2", p: 28, c: "var(--c-blue-60)" },
                  { k: "C2", l: "Fondations Numériques", e: "95", d: "39,4", p: 41, c: "var(--c-purple-60)" },
                  { k: "C3", l: "Compétences & Innovation", e: "30", d: "6,5", p: 22, c: "var(--c-teal-60)" },
                  { k: "C4", l: "Coordination & Gestion", e: "20", d: "7,2", p: 35, c: "var(--c-green-50)" },
                ].map((c) => (
                  <div key={c.k} className={styles.portRow}>
                    <span className={styles.portTag} style={{ background: c.c, color: "#fff" }}>
                      {c.k}
                    </span>
                    <span className={styles.portLabel}>{c.l}</span>
                    <div className={shared.bar}>
                      <i style={{ width: `${c.p}%`, background: c.c }} />
                    </div>
                    <span className={`${styles.portFig} mono`}>
                      {c.d} / {c.e}
                    </span>
                    <span className={`${styles.portPct} mono`}>{c.p}%</span>
                  </div>
                ))}
              </div>
            </section>

            <section className={shared.card}>
              <header className={shared.cardHead}>
                <span className={shared.cardTitle}>Conditionnalités & seuils</span>
                <span className={shared.cardSubtle}>6 lignes</span>
              </header>
              <div className={shared.cardBody}>
                {[
                  { l: "MEP signé · arrêté ministériel", s: "ok" },
                  { l: "Audit externe Cour des Comptes (annuel)", s: "warn" },
                  { l: "PGES initial · Backbone fibre", s: "warn" },
                  { l: "Code de cybersécurité national", s: "ko" },
                  { l: "Cadre de résultats trimestriel", s: "ok" },
                  { l: "Plan EAS-HS · canal MGP confidentiel", s: "ok" },
                ].map((c) => (
                  <div key={c.l} className={styles.condRow}>
                    <span
                      className={`${styles.condDot} ${
                        c.s === "ok"
                          ? styles.dotOk
                          : c.s === "warn"
                            ? styles.dotWarn
                            : styles.dotKo
                      }`}
                    />
                    <span>{c.l}</span>
                    <Tag
                      tone={c.s === "ok" ? "green" : c.s === "warn" ? "yellow" : "red"}
                      size="sm"
                    >
                      {c.s === "ok" ? "Rempli" : c.s === "warn" ? "Attention" : "Manquant"}
                    </Tag>
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* Courbe décaissement */}
          <section className={shared.card}>
            <header className={shared.cardHead}>
              <span className={shared.cardTitle}>Courbe de décaissement · IDA + AFD</span>
              <span className={shared.cardSubtle}>
                vs trajectoire cible (pointillé)
              </span>
            </header>
            <div className={shared.cardBody}>
              <DisbursementChart />
              <div className={styles.legend}>
                <span className={styles.legendItem}>
                  <span style={{ background: "var(--c-blue-60)" }} /> IDA réel
                </span>
                <span className={styles.legendItem}>
                  <span style={{ background: "var(--c-purple-60)" }} /> AFD réel
                </span>
                <span className={styles.legendItem}>
                  <span className={styles.legendDash} /> Cible
                </span>
              </div>
            </div>
          </section>
        </div>

        <SidePanel>
          <PanelSection title="Synthèse IA · pré-ISR">
            <p className={styles.aiText}>
              Décaissement IDA conforme à la trajectoire (28 % vs cible 30 %). Risque
              fiduciaire stable, audit Cour des Comptes en cours. Cadre de résultats à
              79 % : 6 IDD à requalifier avant le prochain ISR.
            </p>
            <div style={{ fontSize: 11, color: "var(--c-text-helper)", marginTop: 8 }}>
              Sources : 12 documents · MEP § 5.2 · audit T-1
            </div>
          </PanelSection>

          <PanelSection title="Alertes seuils" badge={5}>
            {[
              { l: "Décaissement < cible -2 pts", t: "yellow" as const },
              { l: "ANO J+10 PTN-2026-021", t: "red" as const },
              { l: "PGES Backbone en attente", t: "yellow" as const },
              { l: "Cybersécurité · seuil critique", t: "red" as const },
              { l: "Cadre résultats Q2 < cible", t: "yellow" as const },
            ].map((a, i) => (
              <div key={i} className={styles.alertSide}>
                <span className={styles.alertSideDot} style={{
                  background: a.t === "red" ? "var(--c-red-60)" : "var(--c-yellow-30)",
                }}/>
                <span>{a.l}</span>
              </div>
            ))}
          </PanelSection>
        </SidePanel>
      </div>
    </Shell>
  );
}

function DisbursementChart() {
  return (
    <svg viewBox="0 0 600 160" className={styles.chart} preserveAspectRatio="none">
      <line x1="0" y1="40" x2="600" y2="40" stroke="#e0e0e0" />
      <line x1="0" y1="80" x2="600" y2="80" stroke="#e0e0e0" />
      <line x1="0" y1="120" x2="600" y2="120" stroke="#e0e0e0" />
      <polyline
        points="0,140 60,135 120,128 180,118 240,110 300,98 360,86 420,74 480,60 540,46 600,38"
        fill="none"
        stroke="#0f62fe"
        strokeWidth="2"
      />
      <polyline
        points="0,142 60,140 120,135 180,128 240,124 300,116 360,108 420,98 480,90 540,80 600,72"
        fill="none"
        stroke="#8a3ffc"
        strokeWidth="2"
      />
      <polyline
        points="0,150 60,138 120,124 180,108 240,92 300,76 360,60 420,46 480,32 540,20 600,10"
        fill="none"
        stroke="#525252"
        strokeWidth="1.4"
        strokeDasharray="4 4"
      />
      <line x1="380" y1="0" x2="380" y2="160" stroke="#161616" strokeWidth="1" strokeDasharray="3 3" />
      <text x="384" y="14" fontSize="10" fill="#161616">
        maintenant
      </text>
    </svg>
  );
}
