/**
 * ScoringCard — matching offres ↔ critères assistant scoring (cas IA #7).
 * Pondération automatique des critères publiés. L'humain valide.
 */

import { AiGenerate, TaskApproved } from "@carbon/icons-react";
import styles from "./ScoringCard.module.scss";

interface Criterion {
  label: string;
  weight: number; // pourcentage 0-100
  score: number; // pourcentage 0-100 (moyenne pondérée des offres)
}

interface Offer {
  rank: number;
  name: string;
  ref: string;
  price: string;
  score: number; // 0-100
}

const CRITERIA: Criterion[] = [
  { label: "Méthodologie & approche", weight: 30, score: 78 },
  { label: "Expérience référentielle", weight: 25, score: 82 },
  { label: "Profils-clés (CV)", weight: 20, score: 71 },
  { label: "Calendrier proposé", weight: 10, score: 88 },
  { label: "Innovation / différenciation", weight: 10, score: 65 },
  { label: "Engagements E&S", weight: 5, score: 92 },
];

const OFFERS: Offer[] = [
  { rank: 1, name: "Cabinet AURA Conseil", ref: "OFF-2026-AMOA-04", price: "8,4 M USD", score: 87 },
  { rank: 2, name: "Sopra Steria Africa", ref: "OFF-2026-AMOA-02", price: "9,1 M USD", score: 81 },
  { rank: 3, name: "ECONET Consulting", ref: "OFF-2026-AMOA-07", price: "7,9 M USD", score: 76 },
  { rank: 4, name: "Atos Côte d'Ivoire", ref: "OFF-2026-AMOA-01", price: "8,8 M USD", score: 72 },
];

interface ScoringCardProps {
  /** Référence du marché (ex. CE-2026-007) */
  marketRef?: string;
}

export function ScoringCard({ marketRef = "CE-2026-007" }: ScoringCardProps) {
  const totalWeight = CRITERIA.reduce((a, c) => a + c.weight, 0);
  const weightedAverage = CRITERIA.reduce((a, c) => a + (c.score * c.weight) / 100, 0);

  return (
    <section className={styles.card} aria-label="Scoring offres IA">
      <header className={styles.head}>
        <h4 className={styles.title}>
          <AiGenerate size={12} aria-hidden /> Matching offres ↔ critères
        </h4>
        <span className={styles.badge}>✦ IA #7</span>
      </header>

      <div className={styles.body}>
        <p className={styles.intro}>
          <strong>{OFFERS.length} offres</strong> évaluées par scoring assisté contre{" "}
          <strong>{CRITERIA.length} critères pondérés</strong>. La commission garde la décision
          finale — ce scoring est indicatif et journalisé pour audit.
        </p>

        <h5
          style={{
            fontSize: 11,
            textTransform: "uppercase",
            letterSpacing: "0.32px",
            color: "var(--cds-text-helper)",
            margin: "0 0 8px",
            fontWeight: 500,
            fontFamily: "var(--font-ibm-plex-mono)",
          }}
        >
          Critères pondérés
        </h5>

        <div className={styles.criteriaList}>
          {CRITERIA.map((c, i) => {
            const barCls =
              c.score >= 85 ? styles.critBarHigh : c.score < 70 ? styles.critBarLow : "";
            return (
              <div key={i} className={styles.criterion}>
                <div className={styles.critLabel}>{c.label}</div>
                <div className={styles.critWeight}>{c.weight} %</div>
                <div className={styles.critScore}>
                  <div className={`${styles.critBar} ${barCls}`}>
                    <i style={{ width: `${c.score}%` }} />
                  </div>
                  <span className={styles.critPct}>{c.score}</span>
                </div>
              </div>
            );
          })}
          <div className={styles.totalRow}>
            <div>Score moyen pondéré</div>
            <div className={styles.critWeight}>{totalWeight} %</div>
            <div className={styles.critScore}>
              <div className={styles.critBar}>
                <i
                  style={{
                    width: `${weightedAverage}%`,
                    background: "var(--ptn-status-success)",
                  }}
                />
              </div>
              <span className={styles.critPct}>{weightedAverage.toFixed(1)}</span>
            </div>
          </div>
        </div>

        <h5
          style={{
            fontSize: 11,
            textTransform: "uppercase",
            letterSpacing: "0.32px",
            color: "var(--cds-text-helper)",
            margin: "0 0 8px",
            fontWeight: 500,
            fontFamily: "var(--font-ibm-plex-mono)",
          }}
        >
          Classement offres
        </h5>

        <div className={styles.offers}>
          {OFFERS.map((o) => (
            <div key={o.ref} className={styles.offerRow}>
              <span className={`${styles.offerRank} ${o.rank === 1 ? styles.offerRankTop : ""}`}>
                {o.rank}
              </span>
              <div>
                <div className={styles.offerName}>{o.name}</div>
                <div className={styles.offerSub}>{o.ref}</div>
              </div>
              <span className={styles.offerPrice}>{o.price}</span>
              <span className={`${styles.offerScore} ${o.rank === 1 ? styles.offerScoreTop : ""}`}>
                {o.score}
              </span>
            </div>
          ))}
        </div>

        <div className={styles.justification}>
          <AiGenerate
            size={12}
            aria-hidden
            style={{
              color: "var(--ptn-status-ai)",
              verticalAlign: "middle",
              marginRight: 4,
            }}
          />
          <strong>Justification IA :</strong> AURA Conseil arrive en tête grâce à une méthodologie
          structurée (Archimate + sprints) et un calendrier réaliste. Pondération automatique sur
          base des critères publiés au DAO. Toute décision divergeant du scoring doit être motivée
          par la commission au PV.
        </div>
      </div>

      <div className={styles.foot}>
        <span>Modèle · matching pondéré déterministe</span>
        <span>Réf. {marketRef}</span>
        <span>
          <TaskApproved
            size={10}
            aria-hidden
            style={{ verticalAlign: "middle", marginRight: 4 }}
          />
          Décision humaine requise
        </span>
      </div>
    </section>
  );
}
