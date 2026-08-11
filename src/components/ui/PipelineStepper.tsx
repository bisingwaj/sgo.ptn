import styles from "./PipelineStepper.module.scss";

interface PipelineStepperProps {
  /** Étape courante (1-indexée) */
  current: number;
  /** Nombre total d'étapes */
  total: number;
  /** Libellé de l'étape courante */
  label?: string;
  /** Compact : juste les barres + le label */
  compact?: boolean;
}

export function PipelineStepper({ current, total, label, compact }: PipelineStepperProps) {
  return (
    <div className={`${styles.wrap} ${compact ? styles.compact : ""}`}>
      <div className={styles.bars}>
        {Array.from({ length: total }).map((_, i) => {
          const state =
            i < current - 1 ? "done" : i === current - 1 ? "current" : "future";
          return <span key={i} className={`${styles.bar} ${styles[`bar_${state}`]}`} />;
        })}
      </div>
      {label && (
        <span className={styles.label}>
          {label} ·{" "}
          <span className="ptn-mono">
            {current}/{total}
          </span>
        </span>
      )}
    </div>
  );
}
