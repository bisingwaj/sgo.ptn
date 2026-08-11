import type { Metadata } from "next";
import { Shell } from "@/components/shell/Shell";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Buttons";
import { KpiStrip, KpiTile } from "@/components/ui/KpiTile";
import { Tag } from "@/components/ui/Tag";
import { SidePanel, PanelSection } from "@/components/ui/SidePanel";
import shared from "@/components/ui/dashboard-shared.module.css";
import styles from "./auditeur.module.css";

export const metadata: Metadata = { title: "Dashboard Auditeur · PTN-RDC" };

export default function AuditeurPage() {
  return (
    <Shell crumbs={[{ label: "Accueil", href: "/home" }, { label: "Auditeur" }]}>
      <div className={shared.layout}>
        <div className={shared.content}>
          <PageHeader
            title="Cabinet KPMG · Audit externe"
            meta={
              <>
                <span className={shared.dot} style={{ background: "var(--c-green-50)" }} />
                <span>
                  Mission : <span className="mono">AUD-EXT-2026-T1</span>
                </span>
                <span>·</span>
                <span>
                  ISA conforme · Période 01/01 → 31/03/2026
                </span>
              </>
            }
            actions={
              <>
                <Button variant="secondary" size="md">
                  Exporter rapport
                </Button>
                <Button variant="primary">+ Nouvelle constatation</Button>
              </>
            }
          />

          <KpiStrip cols={5}>
            <KpiTile label="Missions actives" value="3" delta={{ dir: "neutral", text: "T1 + interim" }} />
            <KpiTile
              label="Échantillon stratifié"
              value="48 / 142"
              unit="dossiers"
              extra={
                <div className={shared.bar}>
                  <i style={{ width: "34%", background: "var(--c-blue-60)" }} />
                </div>
              }
            />
            <KpiTile label="Constatations" value="14" delta={{ dir: "down", text: "−3 vs T-1" }} />
            <KpiTile label="NC majeures" value="2" delta={{ dir: "neutral", text: "à corriger" }} />
            <KpiTile label="Recommandations suivies" value="86 %" delta={{ dir: "up", text: "+4 pts" }} />
          </KpiStrip>

          {/* Plan d'audit */}
          <section className={shared.card}>
            <header className={shared.cardHead}>
              <span className={shared.cardTitle}>Plan d&apos;audit annuel — PTN-RDC 2026</span>
              <span className={shared.cardSubtle}>3 missions · 4 trimestres</span>
            </header>
            <div className={shared.cardBody} style={{ padding: 0 }}>
              <table className={styles.dt}>
                <thead>
                  <tr>
                    <th>Mission</th>
                    <th>Périmètre</th>
                    <th>Échantillon</th>
                    <th>Stade</th>
                    <th>Échéance</th>
                    <th>Constatations</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { ref: "AUD-EXT-T1", p: "Audit externe T1 · revue annuelle", e: "Stratifié 48/142", s: "Travaux en cours", e2: "12 mai", c: 8, t: "blue" as const },
                    { ref: "AUD-INT-PGES", p: "Audit E&S · PGES Backbone fibre", e: "100 % composante", s: "Démarrage", e2: "30 juin", c: 0, t: "yellow" as const },
                    { ref: "AUD-EAS-HS", p: "MGP confidentiel EAS-HS", e: "Stat. agrégées", s: "Continu", e2: "Permanent", c: 6, t: "purple" as const },
                  ].map((m) => (
                    <tr key={m.ref}>
                      <td className="mono">{m.ref}</td>
                      <td>{m.p}</td>
                      <td className="mono">{m.e}</td>
                      <td>
                        <Tag tone={m.t} size="sm">{m.s}</Tag>
                      </td>
                      <td className="mono">{m.e2}</td>
                      <td className="mono">{m.c}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Échantillonnage + Constatations */}
          <div className={shared.split2}>
            <section className={shared.card}>
              <header className={shared.cardHead}>
                <span className={shared.cardTitle}>Échantillonnage stratifié</span>
                <span className={shared.cardSubtle}>par composante × montant × risque</span>
              </header>
              <div className={shared.cardBody}>
                {[
                  { l: "C1 · Backbone fibre (haut risque)", n: 12, r: "rouge" },
                  { l: "C1 · Connectivité rurale (moyen)", n: 8, r: "orange" },
                  { l: "C2 · Identité numérique (haut)", n: 10, r: "rouge" },
                  { l: "C2 · Cybersécurité (moyen)", n: 6, r: "orange" },
                  { l: "C3 · Hubs / EESU (faible)", n: 8, r: "vert" },
                  { l: "C4 · Coordination (faible)", n: 4, r: "vert" },
                ].map((s) => (
                  <div key={s.l} className={styles.sampleRow}>
                    <span className={styles.sampleLabel}>{s.l}</span>
                    <span
                      className={`${styles.sampleDot} ${
                        s.r === "rouge"
                          ? styles.riskHi
                          : s.r === "orange"
                            ? styles.riskMid
                            : styles.riskLow
                      }`}
                    />
                    <span className={`${styles.sampleN} mono`}>{s.n}</span>
                  </div>
                ))}
              </div>
            </section>

            <section className={shared.card}>
              <header className={shared.cardHead}>
                <span className={shared.cardTitle}>Constatations & recommandations</span>
                <Tag tone="red">2 NC majeures</Tag>
              </header>
              <div className={shared.cardBody}>
                {[
                  { id: "NC-014", l: "Pièces justificatives manquantes — décaissement IDA #042", g: "Majeure", t: "red" as const },
                  { id: "NC-019", l: "Non-conformité passation marché direct seuil >50k", g: "Majeure", t: "red" as const },
                  { id: "OBS-022", l: "Délai validation factures > 30 j (3 cas)", g: "Mineure", t: "yellow" as const },
                  { id: "OBS-027", l: "Documentation PGES incomplète sur sous-projet 14", g: "Mineure", t: "yellow" as const },
                  { id: "OBS-031", l: "Code de conduite non signé (2 agents)", g: "Mineure", t: "yellow" as const },
                ].map((c) => (
                  <div key={c.id} className={styles.constRow}>
                    <span className="mono" style={{ fontSize: 11, color: "var(--c-text-helper)" }}>
                      {c.id}
                    </span>
                    <span className={styles.constLabel}>{c.l}</span>
                    <Tag tone={c.t} size="sm">
                      {c.g}
                    </Tag>
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* Pistes audit + TPM terrain */}
          <div className={shared.split2}>
            <section className={shared.card}>
              <header className={shared.cardHead}>
                <span className={shared.cardTitle}>Pistes d&apos;audit · registre immuable</span>
                <span className={shared.cardSubtle}>traçabilité complète</span>
              </header>
              <div className={shared.cardBody}>
                {[
                  { ref: "PTN-2026-019", t: "TDR → ANO BM → DAO → Évaluation", h: "0xae42…d1f9" },
                  { ref: "PTN-2026-021", t: "TDR → ANO BM (en cours)", h: "0x73b1…02ec" },
                  { ref: "PTN-2026-009", t: "ANO délivré → Contrat signé", h: "0x9ce7…4421" },
                ].map((p) => (
                  <div key={p.ref} className={styles.pisteRow}>
                    <div>
                      <span className="mono" style={{ fontSize: 11, color: "var(--c-text-helper)" }}>
                        {p.ref}
                      </span>
                      <div style={{ fontSize: 12 }}>{p.t}</div>
                    </div>
                    <span className={`${styles.hash} mono`} title="Hash registre">
                      {p.h}
                    </span>
                  </div>
                ))}
              </div>
            </section>

            <section className={shared.card}>
              <header className={shared.cardHead}>
                <span className={shared.cardTitle}>Vérification physique terrain · TPM</span>
                <Tag tone="teal" size="sm">5 missions</Tag>
              </header>
              <div className={shared.cardBody}>
                {[
                  { l: "Site fibre Goma · point GPS", g: "S 1.681° / E 29.222°", p: "12 photos" },
                  { l: "Site fibre Bukavu", g: "S 2.508° / E 28.860°", p: "9 photos" },
                  { l: "Hub Kinshasa Nord", g: "S 4.325° / E 15.322°", p: "6 photos" },
                  { l: "EESU Mbuji-Mayi", g: "S 6.150° / E 23.600°", p: "4 photos" },
                ].map((m) => (
                  <div key={m.l} className={styles.tpmRow}>
                    <div>
                      <div style={{ fontSize: 13 }}>{m.l}</div>
                      <div className="mono" style={{ fontSize: 11, color: "var(--c-text-helper)" }}>
                        {m.g}
                      </div>
                    </div>
                    <span className="mono" style={{ fontSize: 11, color: "var(--c-text-secondary)" }}>
                      {m.p}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>

        <SidePanel>
          <PanelSection title="Reporting · échéances">
            {[
              { l: "Rapport intermédiaire T1", j: "12 mai", t: "yellow" as const },
              { l: "Lettre observations UGP", j: "20 mai", t: "blue" as const },
              { l: "Rapport audit final 2025", j: "30 juin", t: "blue" as const },
            ].map((r) => (
              <div key={r.l} className={styles.repRow}>
                <span style={{ fontSize: 12 }}>{r.l}</span>
                <Tag tone={r.t} size="sm">{r.j}</Tag>
              </div>
            ))}
          </PanelSection>

          <PanelSection title="Lecture seule · garanties">
            <div className={styles.garanties}>
              <div className={styles.garLine}>
                <span>Aucun droit d&apos;édition</span>
                <Tag tone="green" size="sm">Active</Tag>
              </div>
              <div className={styles.garLine}>
                <span>Audit trail consultable</span>
                <Tag tone="green" size="sm">Active</Tag>
              </div>
              <div className={styles.garLine}>
                <span>Exports signés</span>
                <Tag tone="green" size="sm">Active</Tag>
              </div>
              <div className={styles.garLine}>
                <span>EAS-HS · stats agrégées</span>
                <Tag tone="green" size="sm">Active</Tag>
              </div>
            </div>
          </PanelSection>
        </SidePanel>
      </div>
    </Shell>
  );
}
