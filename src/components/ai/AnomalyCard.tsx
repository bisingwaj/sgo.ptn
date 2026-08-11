/**
 * AnomalyCard — détection d'anomalies & conflits d'intérêt (cas IA #5).
 * Graph analysis sur soumissionnaires / évaluateurs / historique d'attributions.
 */

import {
  AiGenerate,
  WarningAltFilled,
  WatsonHealthMagnify,
  Connect,
} from "@carbon/icons-react";
import styles from "./AnomalyCard.module.scss";

interface Anomaly {
  id: string;
  severity: "high" | "med" | "low";
  title: string;
  description: string;
  entities: string[];
  score: number;
}

const ANOMALIES: Anomaly[] = [
  {
    id: "a-001",
    severity: "high",
    title: "Lien capitalistique soumissionnaire ↔ évaluateur",
    description:
      "Le soumissionnaire DigitalCongo SARL partage 2 administrateurs avec le cabinet d'un membre de la commission CE-2026-007. Détection par cross-référencement RCCM.",
    entities: ["DigitalCongo SARL", "CE-2026-007", "PROP-2026-019"],
    score: 0.92,
  },
  {
    id: "a-002",
    severity: "high",
    title: "Pattern d'attribution répétitive — fournisseur unique",
    description:
      "Konnect SARL a remporté 4 marchés consécutifs en C1 Accès (3,2 M USD cumulés) sur 6 mois. Concurrence moyenne 1,3 offre/marché (vs 4,7 médiane).",
    entities: ["Konnect SARL", "C1 · Accès", "PTN-2025-094"],
    score: 0.87,
  },
  {
    id: "a-003",
    severity: "med",
    title: "Montant inhabituel pour la catégorie",
    description:
      "Activité « Formation EESU » à 1,2 M USD — 3,4× la médiane (340 k USD) sur 24 marchés similaires depuis 2024. À vérifier.",
    entities: ["PROP-2026-024", "C3 · Compét.", "Formation"],
    score: 0.71,
  },
  {
    id: "a-004",
    severity: "med",
    title: "Délai de traitement aberrant",
    description:
      "TDR PROP-2026-019 traité en 4 j alors que la médiane catégorie AMOA est de 18 j. Possible court-circuit du workflow d'arbitrage.",
    entities: ["PROP-2026-019", "UGP", "AMOA"],
    score: 0.65,
  },
];

interface AnomalyCardProps {
  /** Limite d'affichage (défaut 4) */
  limit?: number;
  /** Référence (ex. dashboard global vs détail d'un marché) */
  scope?: string;
}

export function AnomalyCard({ limit = 4, scope }: AnomalyCardProps) {
  const items = ANOMALIES.slice(0, limit);
  const counts = {
    high: ANOMALIES.filter((a) => a.severity === "high").length,
    med: ANOMALIES.filter((a) => a.severity === "med").length,
    low: ANOMALIES.filter((a) => a.severity === "low").length,
  };

  return (
    <section className={styles.card} aria-label="Détection d'anomalies IA">
      <header className={styles.head}>
        <h4 className={styles.title}>
          <AiGenerate size={12} aria-hidden /> Détection d&apos;anomalies & conflits
          d&apos;intérêt
        </h4>
        <span className={styles.badge}>✦ IA #5</span>
      </header>

      <div className={styles.body}>
        <div className={styles.stats}>
          <div className={styles.stat}>
            <div className={styles.statK}>Haute sévérité</div>
            <div className={`${styles.statV} ${styles.statVErr}`}>{counts.high}</div>
          </div>
          <div className={styles.stat}>
            <div className={styles.statK}>Modérée</div>
            <div className={`${styles.statV} ${styles.statVWarn}`}>{counts.med}</div>
          </div>
          <div className={styles.stat}>
            <div className={styles.statK}>Entités liées</div>
            <div className={styles.statV}>
              {new Set(items.flatMap((a) => a.entities)).size}
            </div>
          </div>
        </div>

        <ul className={styles.list} style={{ listStyle: "none", margin: 0, padding: 0 }}>
          {items.map((a) => {
            const itemCls =
              a.severity === "high"
                ? styles.itemHigh
                : a.severity === "med"
                  ? styles.itemMed
                  : styles.itemLow;
            const icoCls =
              a.severity === "high"
                ? styles.itemIcoHigh
                : a.severity === "med"
                  ? styles.itemIcoMed
                  : "";
            const scoreCls =
              a.severity === "high"
                ? styles.itemScoreHigh
                : a.severity === "med"
                  ? styles.itemScoreMed
                  : "";
            const Icon = a.severity === "high" ? WarningAltFilled : WatsonHealthMagnify;
            return (
              <li key={a.id} className={`${styles.item} ${itemCls}`}>
                <span className={`${styles.itemIco} ${icoCls}`}>
                  <Icon size={14} aria-hidden />
                </span>
                <div className={styles.itemBody}>
                  <div className={styles.itemTitle}>{a.title}</div>
                  <div className={styles.itemDesc}>{a.description}</div>
                  <div className={styles.itemEntities}>
                    {a.entities.map((e, i) => (
                      <span key={i} className={styles.entity}>
                        <Connect
                          size={9}
                          aria-hidden
                          style={{ verticalAlign: "middle", marginRight: 3 }}
                        />
                        {e}
                      </span>
                    ))}
                  </div>
                </div>
                <div className={`${styles.itemScore} ${scoreCls}`}>
                  Score{" "}
                  <span style={{ display: "block", marginTop: 2 }}>
                    {(a.score * 100).toFixed(0)} %
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      <div className={styles.foot}>
        <span>Modèle graphe · NetworkX + scoring custom</span>
        <span>{scope ?? "Scope · portefeuille global"}</span>
      </div>
    </section>
  );
}
