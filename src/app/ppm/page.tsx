"use client";

/**
 * PPM — Plan de Passation des Marchés.
 * Vue Gantt + tableau · 78 marchés actifs · cycle PTBA 2026.
 */

import { useState } from "react";
import { Shell } from "@/components/shell/Shell";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Tag } from "@/components/ui/Tag";
import { KpiStrip, KpiTile } from "@/components/ui/KpiTile";
import { Notebook, Send, Calendar, ChartLineSmooth, TaskApproved } from "@carbon/icons-react";
import styles from "./ppm.module.scss";

interface PpmRow {
  ref: string;
  title: string;
  componentCode: "C1" | "C2" | "C3" | "C4";
  componentTone: "blue" | "purple" | "teal" | "green";
  ptbaCode: string;
  method: "AOI" | "AON" | "SFQC" | "SBQ" | "SQC" | "MD" | "AC" | "DC";
  donor: "BM" | "AFD" | "BM+AFD";
  amount: string;
  amountUsd: number;
  status: "draft" | "review" | "ano" | "tendered" | "awarded" | "completed";
  /** Quart commencé / quart fini sur 8 (2026 Q1 → 2027 Q4) */
  startQ: number;
  endQ: number;
  reviewType: "Prior" | "Post";
}

const ROWS: PpmRow[] = [
  { ref: "PTN-2026-021", title: "Backbone fibre Goma-Bukavu", componentCode: "C1", componentTone: "blue", ptbaCode: "A1.4.2", method: "AOI", donor: "BM+AFD", amount: "12,4 M", amountUsd: 12400000, status: "ano", startQ: 1, endQ: 6, reviewType: "Prior" },
  { ref: "PTN-2026-005", title: "Réseau dernier km — 145 territoires", componentCode: "C1", componentTone: "blue", ptbaCode: "A1.4.3", method: "AOI", donor: "BM+AFD", amount: "28 M", amountUsd: 28000000, status: "draft", startQ: 2, endQ: 7, reviewType: "Prior" },
  { ref: "PTN-2026-019", title: "Plateforme identité numérique", componentCode: "C2", componentTone: "purple", ptbaCode: "A2.3.1", method: "SFQC", donor: "BM", amount: "8,7 M", amountUsd: 8700000, status: "ano", startQ: 1, endQ: 5, reviewType: "Prior" },
  { ref: "PTN-2026-014", title: "Étude PGES Centre données Tier III", componentCode: "C2", componentTone: "purple", ptbaCode: "A2.5.1", method: "SBQ", donor: "AFD", amount: "3,2 M", amountUsd: 3200000, status: "review", startQ: 1, endQ: 3, reviewType: "Prior" },
  { ref: "PTN-2026-009", title: "SOC national cybersécurité", componentCode: "C2", componentTone: "purple", ptbaCode: "A2.7.2", method: "AOI", donor: "BM", amount: "14,2 M", amountUsd: 14200000, status: "tendered", startQ: 1, endQ: 6, reviewType: "Prior" },
  { ref: "PTN-2026-027", title: "Hubs technologiques Lubumbashi & Goma", componentCode: "C3", componentTone: "teal", ptbaCode: "A3.2.1", method: "SFQC", donor: "BM", amount: "5,6 M", amountUsd: 5600000, status: "draft", startQ: 2, endQ: 5, reviewType: "Prior" },
  { ref: "PTN-2026-031", title: "Formation EESU 200 enseignants", componentCode: "C3", componentTone: "teal", ptbaCode: "A3.4.1", method: "AON", donor: "AFD", amount: "1,9 M", amountUsd: 1900000, status: "ano", startQ: 1, endQ: 4, reviewType: "Post" },
  { ref: "PTN-2026-040", title: "Modernisation routes numériques", componentCode: "C1", componentTone: "blue", ptbaCode: "A1.5.2", method: "AOI", donor: "BM", amount: "22,1 M", amountUsd: 22100000, status: "review", startQ: 2, endQ: 7, reviewType: "Prior" },
  { ref: "PTN-2026-018", title: "Marché direct géotech", componentCode: "C1", componentTone: "blue", ptbaCode: "A1.6.1", method: "MD", donor: "BM", amount: "0,4 M", amountUsd: 400000, status: "draft", startQ: 1, endQ: 2, reviewType: "Prior" },
  { ref: "PTN-2026-033", title: "Atelier ID4Africa Abidjan", componentCode: "C4", componentTone: "green", ptbaCode: "A4.1.4", method: "DC", donor: "BM", amount: "0,2 M", amountUsd: 200000, status: "review", startQ: 2, endQ: 3, reviewType: "Post" },
];

const QUARTERS = ["2026-Q1", "2026-Q2", "2026-Q3", "2026-Q4", "2027-Q1", "2027-Q2", "2027-Q3", "2027-Q4"];

const STATUS_LABELS: Record<PpmRow["status"], { label: string; tone: "blue" | "yellow" | "green" | "gray" | "red" | "purple" }> = {
  draft: { label: "Brouillon", tone: "gray" },
  review: { label: "Revue UGP", tone: "blue" },
  ano: { label: "ANO en file", tone: "yellow" },
  tendered: { label: "DAO publié", tone: "purple" },
  awarded: { label: "Attribué", tone: "green" },
  completed: { label: "Terminé", tone: "green" },
};

export default function PpmPage() {
  const [view, setView] = useState<"gantt" | "table">("gantt");
  const [methodFilter, setMethodFilter] = useState<string[]>([]);

  const filtered = ROWS.filter((r) => {
    if (methodFilter.length > 0 && !methodFilter.includes(r.method)) return false;
    return true;
  });

  const stats = {
    total: ROWS.length,
    totalUsd: ROWS.reduce((s, r) => s + r.amountUsd, 0),
    aoi: ROWS.filter((r) => r.method === "AOI").length,
    sfqc: ROWS.filter((r) => r.method === "SFQC").length,
  };

  return (
    <Shell crumbs={[{ label: "Accueil", href: "/cockpit" }, { label: "PPM 2026" }]}>
      <PageHeader
        eyebrow="UGP · CYCLE DE PASSATION"
        title="Plan de Passation des Marchés · v 1.4"
        subtitle="78 marchés planifiés sur 18 mois · IDA + AFD · validé 28 avr. 2026."
        actions={
          <>
            <button type="button" className={styles.btnSecondary}>
              <Calendar size={16} aria-hidden /> Scénario alternatif
            </button>
            <button type="button" className={styles.btnPrimary}>
              <Send size={16} aria-hidden /> Soumettre v2 BM/AFD
            </button>
          </>
        }
      />

      <KpiStrip cols={5}>
        <KpiTile
          icon={<Notebook size={14} />}
          label="Marchés planifiés"
          value="78"
          trend={{ direction: "up", label: "+6 vs v1.3" }}
        />
        <KpiTile
          icon={<TaskApproved size={14} />}
          label="Engagement total"
          value="124,8"
          unit="M USD"
          trend={{ direction: "neutral", label: "62 % budget mobilisé" }}
        />
        <KpiTile
          label="Méthodes utilisées"
          value="6"
          unit="AOI · AON · SFQC · SBQ · MD · DC"
        />
        <KpiTile
          icon={<ChartLineSmooth size={14} />}
          label="ANO délivrés"
          value="34"
          trend={{ direction: "up", label: "+8 ce trim." }}
        />
        <KpiTile
          label="Avenants"
          value="3"
          unit="en cours · v1.4 → 1.5"
        />
      </KpiStrip>

      <div className={styles.toolbar}>
        <div className={styles.tabs}>
          <button
            type="button"
            onClick={() => setView("gantt")}
            className={`${styles.tab} ${view === "gantt" ? styles.tabActive : ""}`}
          >
            Vue Gantt
          </button>
          <button
            type="button"
            onClick={() => setView("table")}
            className={`${styles.tab} ${view === "table" ? styles.tabActive : ""}`}
          >
            Vue tableau
          </button>
        </div>
        <div className={styles.filters}>
          <span className={styles.filterLabel}>Méthode</span>
          {(["AOI", "AON", "SFQC", "SBQ", "MD", "DC"] as const).map((m) => {
            const active = methodFilter.includes(m);
            return (
              <button
                key={m}
                type="button"
                onClick={() =>
                  setMethodFilter(active ? methodFilter.filter((x) => x !== m) : [...methodFilter, m])
                }
                className={`${styles.filterPill} ${active ? styles.filterPillActive : ""}`}
              >
                {m}
              </button>
            );
          })}
        </div>
      </div>

      <Card noPadding>
        {view === "gantt" ? (
          <div className={styles.ganttScroll}>
            <table className={styles.gantt}>
              <thead>
                <tr>
                  <th style={{ width: 240 }}>Marché</th>
                  <th style={{ width: 80 }}>Méth.</th>
                  <th style={{ width: 80 }}>Bailleur</th>
                  <th style={{ width: 80 }}>Montant</th>
                  <th style={{ width: 100 }}>Statut</th>
                  {QUARTERS.map((q) => (
                    <th key={q} style={{ width: 80 }}>
                      {q}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => {
                  const status = STATUS_LABELS[r.status];
                  return (
                    <tr key={r.ref}>
                      <td>
                        <div className={styles.marketCell}>
                          <Tag tone={r.componentTone} size="sm">
                            {r.componentCode}
                          </Tag>
                          <div>
                            <strong>{r.title}</strong>
                            <span className="ptn-mono">
                              {r.ref} · {r.ptbaCode}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <Tag tone="gray" size="sm">
                          {r.method}
                        </Tag>
                      </td>
                      <td>
                        <Tag
                          tone={r.donor === "BM" ? "blue" : r.donor === "AFD" ? "purple" : "outline"}
                          size="sm"
                        >
                          {r.donor}
                        </Tag>
                      </td>
                      <td className="ptn-mono">{r.amount}</td>
                      <td>
                        <Tag tone={status.tone} size="sm">
                          {status.label}
                        </Tag>
                      </td>
                      {QUARTERS.map((_, i) => {
                        const inRange = i + 1 >= r.startQ && i + 1 <= r.endQ;
                        return (
                          <td key={i} className={styles.qCell}>
                            {inRange && (
                              <div
                                className={`${styles.bar} ${
                                  r.status === "completed" || r.status === "awarded"
                                    ? styles.barDone
                                    : styles.barActive
                                }`}
                              />
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className={styles.ganttScroll}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Réf STEP</th>
                  <th>Description</th>
                  <th>Composante</th>
                  <th>Type</th>
                  <th>Méthode</th>
                  <th>Review</th>
                  <th>Montant USD</th>
                  <th>Statut</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => {
                  const status = STATUS_LABELS[r.status];
                  return (
                    <tr key={r.ref}>
                      <td className="ptn-mono">{r.ref}</td>
                      <td>{r.title}</td>
                      <td>
                        <Tag tone={r.componentTone} size="sm">
                          {r.componentCode}
                        </Tag>
                      </td>
                      <td>
                        <Tag tone="gray" size="sm">
                          {r.method === "SFQC" || r.method === "SBQ" || r.method === "SQC"
                            ? "Consulting"
                            : r.method === "AOI" || r.method === "AON"
                              ? "Goods/Works"
                              : "Direct"}
                        </Tag>
                      </td>
                      <td className="ptn-mono">{r.method}</td>
                      <td>
                        <Tag tone={r.reviewType === "Prior" ? "yellow" : "green"} size="sm">
                          {r.reviewType}
                        </Tag>
                      </td>
                      <td className="ptn-mono">{r.amountUsd.toLocaleString("fr-FR")}</td>
                      <td>
                        <Tag tone={status.tone} size="sm">
                          {status.label}
                        </Tag>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </Shell>
  );
}
