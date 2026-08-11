import type { Metadata } from "next";
import { Shell } from "@/components/shell/Shell";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Buttons";
import { KpiStrip, KpiTile } from "@/components/ui/KpiTile";
import { Tag } from "@/components/ui/Tag";
import { SidePanel, PanelSection } from "@/components/ui/SidePanel";
import shared from "@/components/ui/dashboard-shared.module.css";
import styles from "./soum.module.css";

export const metadata: Metadata = { title: "Dashboard Soumissionnaire · PTN-RDC" };

export default function SoumPage() {
  return (
    <Shell crumbs={[{ label: "Accueil", href: "/home" }, { label: "Soumissionnaire" }]}>
      <div className={shared.layout}>
        <div className={shared.content}>
          <PageHeader
            title="DigitalCongo Sarl — espace soumissionnaire"
            meta={
              <>
                <span className={shared.dot} style={{ background: "var(--c-green-50)" }} />
                <span>
                  KYC vérifié · <Tag tone="green" size="sm">Niveau 3</Tag>
                </span>
                <span>·</span>
                <span>
                  Catégories qualifiées :{" "}
                  <Tag tone="blue" size="sm">Travaux</Tag>{" "}
                  <Tag tone="purple" size="sm">Conseil</Tag>{" "}
                  <Tag tone="teal" size="sm">Fournitures</Tag>
                </span>
              </>
            }
            actions={
              <Button variant="primary">+ Déposer une offre</Button>
            }
          />

          <KpiStrip cols={5}>
            <KpiTile label="AO ouverts compatibles" value="14" delta={{ dir: "up", text: "+3 cette sem." }} />
            <KpiTile label="Mes soumissions" value="6" delta={{ dir: "neutral", text: "2 en évaluation" }} />
            <KpiTile label="Contrats actifs" value="3" delta={{ dir: "up", text: "+1 ce trimestre" }} />
            <KpiTile
              label="Délai paiement moyen"
              value="38"
              unit="jours"
              delta={{ dir: "down", text: "−4 j vs T-1" }}
            />
            <KpiTile
              label="CA réalisé YTD"
              value="2,8"
              unit="M USD"
              extra={
                <div className={shared.bar}>
                  <i style={{ width: "60%", background: "var(--c-green-50)" }} />
                </div>
              }
            />
          </KpiStrip>

          {/* Marketplace + Mes soumissions */}
          <div className={shared.split2}>
            <section className={shared.card}>
              <header className={shared.cardHead}>
                <span className={shared.cardTitle}>Marketplace · AO ouverts</span>
                <Tag tone="blue">14 compatibles</Tag>
              </header>
              <div className={shared.cardBody} style={{ padding: 0 }}>
                {[
                  { ref: "AO-PTN-058", t: "Backbone fibre Goma-Bukavu", c: "C1", m: "12,4 M USD", d: "16 mai", method: "AOI", q: ["Travaux", "Géotech"] },
                  { ref: "AO-PTN-049", t: "PGES Centre données Tier III", c: "C2", m: "3,2 M USD", d: "23 mai", method: "SFQC", q: ["Conseil"] },
                  { ref: "AO-PTN-061", t: "Fournitures stations enrôlement biométrique", c: "C2", m: "5,8 M USD", d: "31 mai", method: "AON", q: ["Fournitures"] },
                  { ref: "AO-PTN-064", t: "Maintenance SOC cybersécurité", c: "C2", m: "1,4 M USD", d: "07 juin", method: "SBQ", q: ["Conseil"] },
                  { ref: "AO-PTN-067", t: "Formation 200 enseignants EESU", c: "C3", m: "1,9 M USD", d: "12 juin", method: "AON", q: ["Conseil"] },
                ].map((ao) => (
                  <div key={ao.ref} className={styles.aoRow}>
                    <div className={styles.aoLeft}>
                      <span className="mono" style={{ fontSize: 11, color: "var(--c-text-helper)" }}>
                        {ao.ref}
                      </span>
                      <div className={styles.aoTitle}>{ao.t}</div>
                      <div className={styles.aoTags}>
                        <Tag tone="gray" size="sm">{ao.c}</Tag>
                        <Tag tone="blue" size="sm">{ao.method}</Tag>
                        {ao.q.map((tag) => (
                          <Tag key={tag} tone="green" size="sm">{tag}</Tag>
                        ))}
                      </div>
                    </div>
                    <div className={styles.aoRight}>
                      <div className={styles.aoMontant}>{ao.m}</div>
                      <div className={styles.aoDeadline}>
                        <span className="mono">{ao.d}</span>
                      </div>
                      <Button size="sm" variant="primary">
                        Voir
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className={shared.card}>
              <header className={shared.cardHead}>
                <span className={shared.cardTitle}>Mes soumissions</span>
                <Tag tone="purple">6 en cours</Tag>
              </header>
              <div className={shared.cardBody} style={{ padding: 0 }}>
                {[
                  { r: "SUB-2026-027", t: "DAO Backbone fibre", s: "Évaluation", t2: "blue" as const, p: 75 },
                  { r: "SUB-2026-021", t: "PGES Tier III", s: "Soumis", t2: "yellow" as const, p: 50 },
                  { r: "SUB-2026-019", t: "Stations enrôlement", s: "Préparation", t2: "purple" as const, p: 25 },
                  { r: "SUB-2026-014", t: "Formation EESU", s: "Attribué", t2: "green" as const, p: 100 },
                  { r: "SUB-2026-009", t: "SOC cybersécurité", s: "Attribué", t2: "green" as const, p: 100 },
                  { r: "SUB-2026-006", t: "Avenant registre", s: "Écarté", t2: "red" as const, p: 0 },
                ].map((s) => (
                  <div key={s.r} className={styles.subRow}>
                    <div>
                      <span className="mono" style={{ fontSize: 11, color: "var(--c-text-helper)" }}>
                        {s.r}
                      </span>
                      <div className={styles.subTitle}>{s.t}</div>
                    </div>
                    <div className={styles.subRight}>
                      <Tag tone={s.t2} size="sm">{s.s}</Tag>
                      <div className={shared.bar} style={{ width: 60 }}>
                        <i
                          style={{
                            width: `${s.p}%`,
                            background:
                              s.p === 0 ? "var(--c-red-60)" : s.p === 100 ? "var(--c-green-50)" : "var(--c-blue-60)",
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* Contrats + Paiements */}
          <div className={shared.split2}>
            <section className={shared.card}>
              <header className={shared.cardHead}>
                <span className={shared.cardTitle}>Mes contrats actifs</span>
              </header>
              <div className={shared.cardBody}>
                {[
                  { r: "CONT-2026-014", t: "Formation 200 enseignants", j: "Jalon 3 / 5", m: "1,9 M", p: 60 },
                  { r: "CONT-2026-009", t: "Maintenance SOC", j: "Jalon 2 / 4", m: "1,4 M", p: 50 },
                  { r: "CONT-2025-101", t: "Étude étalonnage rural", j: "Réception", m: "0,8 M", p: 95 },
                ].map((c) => (
                  <div key={c.r} className={styles.contRow}>
                    <div>
                      <span className="mono" style={{ fontSize: 11, color: "var(--c-text-helper)" }}>
                        {c.r}
                      </span>
                      <div style={{ fontSize: 13 }}>{c.t}</div>
                      <div style={{ fontSize: 11, color: "var(--c-text-helper)" }}>{c.j}</div>
                    </div>
                    <div className={styles.contRight}>
                      <div style={{ fontSize: 13 }} className="mono">
                        {c.m} USD
                      </div>
                      <div className={shared.bar} style={{ width: 100 }}>
                        <i style={{ width: `${c.p}%`, background: "var(--c-green-50)" }} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className={shared.card}>
              <header className={shared.cardHead}>
                <span className={shared.cardTitle}>Suivi paiements</span>
                <span className={shared.cardSubtle}>Délai moyen 38 j</span>
              </header>
              <div className={shared.cardBody}>
                {[
                  { l: "Facture émise", v: 8, t: "blue" as const },
                  { l: "Ordonnancée", v: 4, t: "yellow" as const },
                  { l: "Payée (T)", v: 3, t: "green" as const },
                  { l: "En litige", v: 1, t: "red" as const },
                ].map((p) => (
                  <div key={p.l} className={styles.payRow}>
                    <Tag tone={p.t}>{p.l}</Tag>
                    <div className={shared.bar} style={{ flex: 1 }}>
                      <i
                        style={{
                          width: `${p.v * 12}%`,
                          background:
                            p.t === "red"
                              ? "var(--c-red-60)"
                              : p.t === "yellow"
                                ? "var(--c-yellow-30)"
                                : p.t === "green"
                                  ? "var(--c-green-50)"
                                  : "var(--c-blue-60)",
                        }}
                      />
                    </div>
                    <span className="mono" style={{ width: 24, textAlign: "right" }}>
                      {p.v}
                    </span>
                  </div>
                ))}
                <div style={{ borderTop: "1px solid var(--c-border)", marginTop: 12, paddingTop: 12, fontSize: 11, color: "var(--c-text-helper)" }}>
                  Total facturé YTD ·{" "}
                  <strong className="mono">2,8 M USD</strong> · Encaissé{" "}
                  <strong className="mono">1,9 M</strong>
                </div>
              </div>
            </section>
          </div>
        </div>

        <SidePanel>
          <PanelSection title="Suivi sous-projet SBP" badge="Hub">
            <div className={styles.sbpBlock}>
              <div className={styles.sbpTitle}>Hub Lubumbashi · KIN-LAB</div>
              <div style={{ fontSize: 11, color: "var(--c-text-helper)" }} className="mono">
                SBP-2026-042 · Tranche 2 / 4
              </div>
              <div className={shared.bar} style={{ marginTop: 12 }}>
                <i style={{ width: "45%", background: "var(--c-magenta-60)" }} />
              </div>
              <ul className={styles.sbpList}>
                <li>Décaissé · 92 k USD / 200 k</li>
                <li>Accompagnement hub · 8 séances</li>
                <li>Prochain jalon · livrable rapport milieu</li>
              </ul>
            </div>
          </PanelSection>

          <PanelSection title="Notifications" badge={3}>
            {[
              { t: "Nouvelle DAO publié pour Backbone fibre", w: "il y a 12 min", k: "info" as const },
              { t: "Avis d'attribution Formation EESU", w: "il y a 3h", k: "ok" as const },
              { t: "Demande de clarification Tier III", w: "hier 17:23", k: "warn" as const },
            ].map((n, i) => (
              <div key={i} className={styles.notifRow}>
                <span
                  className={
                    n.k === "ok"
                      ? styles.notifOk
                      : n.k === "warn"
                        ? styles.notifWarn
                        : styles.notifInfo
                  }
                />
                <div>
                  <div style={{ fontSize: 12 }}>{n.t}</div>
                  <div className="mono" style={{ fontSize: 10, color: "var(--c-text-helper)" }}>
                    {n.w}
                  </div>
                </div>
              </div>
            ))}
          </PanelSection>
        </SidePanel>
      </div>
    </Shell>
  );
}
