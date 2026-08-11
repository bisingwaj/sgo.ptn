import type { Metadata } from "next";
import { Shell } from "@/components/shell/Shell";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Buttons";
import { KpiStrip, KpiTile } from "@/components/ui/KpiTile";
import { Tag } from "@/components/ui/Tag";
import { SidePanel, PanelSection } from "@/components/ui/SidePanel";
import shared from "@/components/ui/dashboard-shared.module.css";
import styles from "./cockpit.module.css";

export const metadata: Metadata = { title: "Cockpit UGP · PTN-RDC" };

export default function CockpitPage() {
  return (
    <Shell crumbs={[{ label: "Accueil", href: "/home" }, { label: "Cockpit UGP" }]}>
      <div className={shared.layout}>
        <div className={shared.content}>
          <PageHeader
            title="Cockpit UGP — PTN-RDC"
            meta={
              <>
                <span className={shared.dot} style={{ background: "var(--c-green-50)" }} />
                <span>
                  Synchronisé · <span className="mono">07 mai 2026 · 09:42 UTC+1</span>
                </span>
                <span>·</span>
                <span>
                  Période MEP :{" "}
                  <span className="mono">24 juin 2025 → 31 déc. 2029</span>
                </span>
                <span>·</span>
                <span>
                  Risques E&amp;S / EAS-HS :{" "}
                  <Tag tone="red" size="sm">
                    Substantiel
                  </Tag>
                </span>
              </>
            }
            actions={
              <>
                <Button variant="secondary" size="md">
                  Synthèse IA hebdo
                </Button>
                <Button variant="primary">+ Décision COPIL</Button>
              </>
            }
          />

          {/* 7 KPIs */}
          <KpiStrip cols={7}>
            <KpiTile
              label="Engagement total"
              value="510"
              unit="M USD"
              delta={{ dir: "neutral", text: "IDA 400 + AFD 110" }}
            />
            <KpiTile
              label="Décaissement IDA / AFD"
              value="112,4 / 29,9"
              unit="M USD · 79/21 %"
              extra={
                <>
                  <div className={shared.bar}>
                    <i style={{ width: "79%", background: "var(--c-blue-60)" }} />
                  </div>
                  <div className={styles.dualBar}>
                    <span className="mono" style={{ color: "var(--c-blue-60)" }}>
                      IDA 79%
                    </span>
                    <span className="mono" style={{ color: "var(--c-purple-60)" }}>
                      AFD 21%
                    </span>
                  </div>
                </>
              }
            />
            <KpiTile
              label="ANO en file"
              value="9"
              delta={{ dir: "up", text: "+3 vs S1" }}
            />
            <KpiTile
              label="Cadre de résultats"
              value="22 / 28"
              unit="IDD"
              delta={{ dir: "up", text: "79 % atteints" }}
            />
            <KpiTile
              label="Marchés actifs"
              value="34"
              unit="dont 12 critiques"
            />
            <KpiTile
              label="SBP — sous-projets"
              value="68"
              unit="/ 200"
              extra={
                <div className={shared.bar}>
                  <i style={{ width: "34%", background: "var(--c-magenta-60)" }} />
                </div>
              }
            />
            <KpiTile
              label="Note ISR"
              value="MS"
              unit="Modérément Satisf."
              delta={{ dir: "up", text: "Stable T-1" }}
            />
          </KpiStrip>

          {/* 4 composantes */}
          <section className={shared.card}>
            <header className={shared.cardHead}>
              <span className={shared.cardTitle}>
                Composantes PTN-RDC · MEP du 23 juin 2025
              </span>
              <span className={shared.cardSubtle}>
                Total <strong className="mono">510</strong> M USD (IDA + AFD)
              </span>
            </header>
            <div className={styles.compGrid}>
              {[
                {
                  k: "C1",
                  label: "Accès & Inclusion numériques",
                  amount: "385",
                  desc: "Backbone fibre, haut débit rural, connexion universelle",
                  pct: 28,
                  color: "var(--c-blue-60)",
                },
                {
                  k: "C2",
                  label: "Fondations Numériques",
                  amount: "95",
                  desc: "Identité, services en ligne, paiements, cybersécurité",
                  pct: 41,
                  color: "var(--c-purple-60)",
                },
                {
                  k: "C3",
                  label: "Compétences & Innovation",
                  amount: "30",
                  desc: "Hubs, EESU, startups SBP, formations",
                  pct: 22,
                  color: "var(--c-teal-60)",
                },
                {
                  k: "C4",
                  label: "Coordination & Gestion projet",
                  amount: "20",
                  desc: "UGP, audit, S&E, communication, fiduciaire",
                  pct: 35,
                  color: "var(--c-green-50)",
                },
              ].map((c) => (
                <div key={c.k} className={styles.comp}>
                  <div className={styles.compHead}>
                    <span
                      className={`${styles.compK} mono`}
                      style={{ background: c.color, color: "#fff" }}
                    >
                      {c.k}
                    </span>
                    <span className={styles.compAmount}>
                      <strong className="mono">{c.amount}</strong> M USD
                    </span>
                  </div>
                  <div className={styles.compLabel}>{c.label}</div>
                  <div className={styles.compDesc}>{c.desc}</div>
                  <div className={shared.bar}>
                    <i style={{ width: `${c.pct}%`, background: c.color }} />
                  </div>
                  <div className={styles.compPct}>
                    <span className="mono">{c.pct} %</span> décaissé
                  </div>
                </div>
              ))}
            </div>
          </section>

          <div className={shared.split2}>
            {/* Encart SBP */}
            <section className={shared.card}>
              <header className={shared.cardHead}>
                <span className={shared.cardTitle}>SBP — Sous-projets bénéficiaires</span>
                <Tag tone="magenta">68 / 200</Tag>
              </header>
              <div className={shared.cardBody}>
                <div className={styles.sbpBreak}>
                  {[
                    { l: "EESU", v: 18, c: "var(--c-blue-60)" },
                    { l: "Hubs technologiques", v: 22, c: "var(--c-teal-60)" },
                    { l: "Startups SBP", v: 28, c: "var(--c-magenta-60)" },
                  ].map((s) => (
                    <div key={s.l} className={styles.sbpRow}>
                      <span style={{ flex: "0 0 130px" }}>{s.l}</span>
                      <div className={shared.bar} style={{ flex: 1 }}>
                        <i style={{ width: `${s.v * 1.5}%`, background: s.c }} />
                      </div>
                      <span className="mono">{s.v}</span>
                    </div>
                  ))}
                </div>
                <div className={styles.sbpFoot}>
                  Allocation totale ·{" "}
                  <strong className="mono">12,5 M USD</strong> · Décaissé{" "}
                  <strong className="mono">4,8</strong> M
                </div>
              </div>
            </section>

            {/* Échéances réglementaires */}
            <section className={shared.card}>
              <header className={shared.cardHead}>
                <span className={shared.cardTitle}>Échéances réglementaires</span>
                <Tag tone="yellow">5</Tag>
              </header>
              <div className={shared.cardBody} style={{ padding: "8px 14px" }}>
                {[
                  { d: "14 mai", l: "Rapport S1 PTN-RDC", j: "J−7", t: "yellow" as const },
                  { d: "02 juin", l: "Audit externe Cour des Comptes", j: "J−26", t: "yellow" as const },
                  { d: "17 juin", l: "PPM v2 · soumission BM", j: "J−41", t: "blue" as const },
                  { d: "30 juin", l: "Cadre S&E Q2", j: "J−54", t: "blue" as const },
                  { d: "15 juil", l: "PTBA 2027 — pré-arbitrage", j: "J−69", t: "gray" as const },
                ].map((e, i) => (
                  <div key={i} className={styles.deadlineRow}>
                    <span className={`${styles.dlDate} mono`}>{e.d}</span>
                    <span className={styles.dlLabel}>{e.l}</span>
                    <Tag tone={e.t} size="sm">
                      {e.j}
                    </Tag>
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* Alertes catégorisées */}
          <section className={shared.card}>
            <header className={shared.cardHead}>
              <span className={shared.cardTitle}>Alertes catégorisées</span>
              <span className={shared.cardSubtle}>5 familles · 14 actives</span>
            </header>
            <div className={styles.alertsGrid}>
              {[
                {
                  cat: "Critique / Fiduciaire",
                  count: 2,
                  cls: shared.alertCrit,
                  items: [
                    "Décaissement IDA en retard sur jalon DPL2",
                    "Audit interne · 2 NC majeures non corrigées",
                  ],
                },
                {
                  cat: "Attention / Passation",
                  count: 4,
                  cls: shared.alertWarn,
                  items: [
                    "PTN-2026-021 · ANO BM > 10 j",
                    "PTN-2026-019 · Clarifications attendues",
                    "Commission 014 · COI à signer",
                    "Plan PPM Q3 non mis à jour",
                  ],
                },
                {
                  cat: "E&S",
                  count: 3,
                  cls: shared.alertEs,
                  items: [
                    "PGES Backbone Goma-Bukavu en revue",
                    "Mission TPM Kasaï · juin 2026",
                    "Plan d'engagement parties prenantes",
                  ],
                },
                {
                  cat: "EAS-HS · confidentiel",
                  count: 2,
                  cls: shared.alertConfid,
                  items: [
                    "MGP · 1 plainte en traitement (anonymisé)",
                    "Code de conduite · 2 signatures manquantes",
                  ],
                },
                {
                  cat: "Information",
                  count: 3,
                  cls: shared.alertInfo,
                  items: [
                    "Mise à jour cadre résultats Q2",
                    "Workshop ID4Africa Abidjan inscrit",
                    "Nouveau document MEP § 5.2.8",
                  ],
                },
              ].map((c) => (
                <div key={c.cat} className={styles.alertCol}>
                  <div className={`${styles.alertColHead} ${c.cls}`}>
                    <span>{c.cat}</span>
                    <span className="mono">{c.count}</span>
                  </div>
                  <ul className={styles.alertList}>
                    {c.items.map((it) => (
                      <li key={it}>{it}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>
        </div>

        <SidePanel>
          <PanelSection title="Synthèse IA · semaine">
            <div className={styles.aiBlock}>
              <div className={styles.aiBadge}>
                <Tag tone="purple" size="sm">
                  IA · Carbon
                </Tag>
                <span className="mono" style={{ fontSize: 11 }}>
                  Refresh 09:30
                </span>
              </div>
              <p className={styles.aiText}>
                Cycle PTBA 2026-Q2 majoritairement vert. Retard contenu sur ANO BM
                (+1,2 j cible). 3 conditionnalités fiduciaires à clore avant le 15 juin.
                EAS-HS : aucun incident critique ; vigilance sur formations EESU.
              </p>
              <ul className={styles.aiBullets}>
                <li>Backbone fibre · J−9 soumission DAO</li>
                <li>Audit Cour des Comptes · 02 juin</li>
                <li>SBP · 12 sous-projets en signature</li>
              </ul>
            </div>
          </PanelSection>

          <PanelSection title="ANO en file" badge={9}>
            {[
              { ref: "PTN-2026-021", t: "Backbone fibre Goma-Bukavu", j: "BM · 4 j" },
              { ref: "PTN-2026-019", t: "Plateforme identité numérique", j: "BM · 7 j" },
              { ref: "PTN-2026-014", t: "PGES Tier III", j: "AFD · 9 j" },
              { ref: "PTN-2026-031", t: "Formation EESU", j: "AFD · 12 j" },
              { ref: "PTN-2026-027", t: "Hubs Lubumbashi/Goma", j: "BM · 14 j" },
            ].map((a) => (
              <div key={a.ref} className={styles.anoRow}>
                <span className="mono" style={{ fontSize: 11 }}>
                  {a.ref}
                </span>
                <span className={styles.anoTitle}>{a.t}</span>
                <span className={`${styles.anoMono} mono`}>{a.j}</span>
              </div>
            ))}
          </PanelSection>

          <PanelSection title="IDD · top mouvements">
            {[
              { l: "Couverture haut débit rural", v: "47 %", trend: "up" },
              { l: "Femmes formées · EESU", v: "62 %", trend: "up" },
              { l: "Délai ANO moyen", v: "14,2 j", trend: "down" },
              { l: "Plaintes MGP traitées", v: "94 %", trend: "up" },
            ].map((i) => (
              <div key={i.l} className={styles.iddRow}>
                <span className={styles.iddLabel}>{i.l}</span>
                <span className={`${styles.iddVal} mono`}>{i.v}</span>
                <span
                  className={
                    i.trend === "up" ? styles.trendUp : styles.trendDown
                  }
                >
                  {i.trend === "up" ? "▲" : "▼"}
                </span>
              </div>
            ))}
          </PanelSection>
        </SidePanel>
      </div>
    </Shell>
  );
}
