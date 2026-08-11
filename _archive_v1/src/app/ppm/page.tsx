import type { Metadata } from "next";
import { Shell } from "@/components/shell/Shell";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Buttons";
import { KpiStrip, KpiTile } from "@/components/ui/KpiTile";
import { Tag } from "@/components/ui/Tag";
import shared from "@/components/ui/dashboard-shared.module.css";
import styles from "./ppm.module.css";

export const metadata: Metadata = { title: "PPM · Plan de Passation des Marchés · PTN-RDC" };

interface Marche {
  ref: string;
  intitule: string;
  comp: string;
  ptba: string;
  methode: string;
  bailleur: "BM" | "AFD";
  montant: string;
  trim: { q: number; pct: number; status: "done" | "active" | "future" }[];
  ano: "delivre" | "en_revue" | "non_demarre" | "clarif";
}

const MARCHES: Marche[] = [
  {
    ref: "PTN-2026-021",
    intitule: "Backbone fibre Goma-Bukavu",
    comp: "C1",
    ptba: "A1.4.2",
    methode: "AOI",
    bailleur: "BM",
    montant: "12,4 M",
    trim: [
      { q: 1, pct: 100, status: "done" },
      { q: 2, pct: 60, status: "active" },
      { q: 3, pct: 0, status: "future" },
      { q: 4, pct: 0, status: "future" },
    ],
    ano: "en_revue",
  },
  {
    ref: "PTN-2026-019",
    intitule: "Plateforme nationale identité numérique",
    comp: "C2",
    ptba: "A2.3.1",
    methode: "SFQC",
    bailleur: "BM",
    montant: "8,7 M",
    trim: [
      { q: 1, pct: 100, status: "done" },
      { q: 2, pct: 80, status: "active" },
      { q: 3, pct: 0, status: "future" },
      { q: 4, pct: 0, status: "future" },
    ],
    ano: "clarif",
  },
  {
    ref: "PTN-2026-014",
    intitule: "Étude PGES Centre données Tier III",
    comp: "C2",
    ptba: "A2.5.1",
    methode: "SFQC",
    bailleur: "AFD",
    montant: "3,2 M",
    trim: [
      { q: 1, pct: 100, status: "done" },
      { q: 2, pct: 100, status: "done" },
      { q: 3, pct: 50, status: "active" },
      { q: 4, pct: 0, status: "future" },
    ],
    ano: "delivre",
  },
  {
    ref: "PTN-2026-027",
    intitule: "Hubs technologiques Lubumbashi & Goma",
    comp: "C3",
    ptba: "A3.2.1",
    methode: "AON",
    bailleur: "BM",
    montant: "5,6 M",
    trim: [
      { q: 1, pct: 30, status: "active" },
      { q: 2, pct: 0, status: "future" },
      { q: 3, pct: 0, status: "future" },
      { q: 4, pct: 0, status: "future" },
    ],
    ano: "non_demarre",
  },
  {
    ref: "PTN-2026-031",
    intitule: "Formation 200 enseignants EESU",
    comp: "C3",
    ptba: "A3.4.1",
    methode: "AON",
    bailleur: "AFD",
    montant: "1,9 M",
    trim: [
      { q: 1, pct: 100, status: "done" },
      { q: 2, pct: 70, status: "active" },
      { q: 3, pct: 0, status: "future" },
      { q: 4, pct: 0, status: "future" },
    ],
    ano: "clarif",
  },
  {
    ref: "PTN-2026-009",
    intitule: "SOC national cybersécurité",
    comp: "C2",
    ptba: "A2.7.2",
    methode: "AOI",
    bailleur: "BM",
    montant: "14,2 M",
    trim: [
      { q: 1, pct: 100, status: "done" },
      { q: 2, pct: 100, status: "done" },
      { q: 3, pct: 80, status: "active" },
      { q: 4, pct: 0, status: "future" },
    ],
    ano: "delivre",
  },
  {
    ref: "PTN-2026-033",
    intitule: "Atelier ID4Africa Abidjan 2026",
    comp: "C4",
    ptba: "A4.1.4",
    methode: "Marché direct",
    bailleur: "BM",
    montant: "0,2 M",
    trim: [
      { q: 1, pct: 0, status: "future" },
      { q: 2, pct: 60, status: "active" },
      { q: 3, pct: 0, status: "future" },
      { q: 4, pct: 0, status: "future" },
    ],
    ano: "en_revue",
  },
];

const ANO_TONE: Record<Marche["ano"], { l: string; t: "green" | "yellow" | "red" | "gray" }> = {
  delivre: { l: "ANO délivré", t: "green" },
  en_revue: { l: "ANO en revue", t: "yellow" },
  clarif: { l: "Clarifications", t: "red" },
  non_demarre: { l: "Non démarré", t: "gray" },
};

export default function PPMPage() {
  return (
    <Shell crumbs={[{ label: "Accueil", href: "/home" }, { label: "PPM 2026" }]}>
      <div className={styles.wrap}>
        <PageHeader
          title="PPM 2026 · Plan de Passation des Marchés"
          meta={
            <>
              <span className={shared.dot} style={{ background: "var(--c-blue-60)" }} />
              <span>
                Lignes PTBA · <span className="mono">62 / 78</span> couvertes
              </span>
              <span>·</span>
              <span>
                Dernière soumission BM ·{" "}
                <span className="mono">28 avr. 2026</span>
              </span>
              <span>·</span>
              <Tag tone="purple" size="sm">v 1.4</Tag>
            </>
          }
          actions={
            <>
              <Button variant="secondary" size="md">
                Scénario alternatif
              </Button>
              <Button variant="secondary" size="md">
                Avenant PPM
              </Button>
              <Button variant="primary">Soumettre v2 BM/AFD</Button>
            </>
          }
        />

        <KpiStrip cols={5}>
          <KpiTile label="Marchés planifiés" value="78" delta={{ dir: "up", text: "+6 vs v1.3" }} />
          <KpiTile
            label="Engagement total"
            value="124,8"
            unit="M USD"
            extra={
              <div className={shared.bar}>
                <i style={{ width: "62%", background: "var(--c-blue-60)" }} />
              </div>
            }
          />
          <KpiTile label="Méthodes" value="6" unit="AOI · AON · SFQC · SBQ · MD · AC" />
          <KpiTile label="ANO délivrés" value="34" delta={{ dir: "up", text: "+8 ce trim." }} />
          <KpiTile label="Avenants en cours" value="3" delta={{ dir: "neutral", text: "v 1.4 → 1.5" }} />
        </KpiStrip>

        {/* Filtres */}
        <div className={styles.filters}>
          <div className={styles.filterGroup}>
            <span className={styles.filterLabel}>Composante</span>
            <button className={styles.filterChip}>Tout</button>
            <button className={styles.filterChip}>C1</button>
            <button className={`${styles.filterChip} ${styles.filterActive}`}>C2</button>
            <button className={styles.filterChip}>C3</button>
            <button className={styles.filterChip}>C4</button>
          </div>
          <div className={styles.filterGroup}>
            <span className={styles.filterLabel}>Méthode</span>
            <button className={styles.filterChip}>AOI</button>
            <button className={styles.filterChip}>AON</button>
            <button className={styles.filterChip}>SFQC</button>
            <button className={styles.filterChip}>Autre</button>
          </div>
          <div className={styles.filterGroup}>
            <span className={styles.filterLabel}>Bailleur</span>
            <button className={`${styles.filterChip} ${styles.filterActive}`}>BM</button>
            <button className={styles.filterChip}>AFD</button>
          </div>
          <div className={styles.filterGroup} style={{ marginLeft: "auto" }}>
            <Button variant="ghost" size="sm">Vue Gantt</Button>
            <Button variant="secondary" size="sm">Vue tableau</Button>
          </div>
        </div>

        {/* Gantt */}
        <section className={styles.gantt}>
          <div className={styles.ganttHead}>
            <div className={styles.ganttCol1}>Marché</div>
            <div className={styles.ganttCol2}>Méth.</div>
            <div className={styles.ganttCol3}>Bailleur</div>
            <div className={styles.ganttCol4}>Montant</div>
            <div className={styles.ganttCol5}>ANO</div>
            <div className={styles.ganttTimeline}>
              {[1, 2, 3, 4].map((q) => (
                <div key={q} className={styles.ganttQ}>
                  <span>Q{q} 2026</span>
                </div>
              ))}
            </div>
          </div>

          <div className={styles.ganttBody}>
            {MARCHES.map((m) => (
              <div key={m.ref} className={styles.ganttRow}>
                <div className={styles.ganttCol1}>
                  <Tag tone="gray" size="sm">{m.comp}</Tag>
                  <div className={styles.gMarche}>
                    <span className={styles.gTitle}>{m.intitule}</span>
                    <span className={`${styles.gMeta} mono`}>
                      {m.ref} · {m.ptba}
                    </span>
                  </div>
                </div>
                <div className={styles.ganttCol2}>
                  <Tag tone="blue" size="sm">{m.methode}</Tag>
                </div>
                <div className={styles.ganttCol3}>
                  <Tag tone={m.bailleur === "BM" ? "blue" : "purple"} size="sm">
                    {m.bailleur}
                  </Tag>
                </div>
                <div className={`${styles.ganttCol4} mono`}>{m.montant}</div>
                <div className={styles.ganttCol5}>
                  <Tag tone={ANO_TONE[m.ano].t} size="sm">
                    {ANO_TONE[m.ano].l}
                  </Tag>
                </div>
                <div className={styles.ganttTimeline}>
                  {m.trim.map((t, i) => (
                    <div key={i} className={styles.ganttQCell}>
                      {t.pct > 0 && (
                        <div
                          className={`${styles.ganttBar} ${
                            t.status === "done"
                              ? styles.ganttDone
                              : styles.ganttActive
                          }`}
                          style={{ width: `${t.pct}%` }}
                        >
                          <span className="mono">{t.pct}%</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </Shell>
  );
}
