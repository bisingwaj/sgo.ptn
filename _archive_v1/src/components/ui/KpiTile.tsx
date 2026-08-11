import type { ReactNode } from "react";
import styles from "./KpiTile.module.css";

interface KpiTileProps {
  label: string;
  icon?: ReactNode;
  value: ReactNode;
  unit?: string;
  delta?: { dir: "up" | "down" | "neutral"; text: string };
  extra?: ReactNode;
}

export function KpiTile({ label, icon, value, unit, delta, extra }: KpiTileProps) {
  return (
    <div className={styles.kpi}>
      <div className={styles.k}>
        {icon && <span className={styles.ico}>{icon}</span>}
        <span>{label}</span>
      </div>
      <div className={styles.v}>
        <span className="mono">{value}</span>
        {unit && <span className={styles.unit}>{unit}</span>}
      </div>
      {delta && (
        <div className={`${styles.delta} ${styles[`d_${delta.dir}`]}`}>
          {delta.dir === "up" && (
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6">
              <path d="M3 12l5-5 5 5M3 6l5-5 5 5" />
            </svg>
          )}
          {delta.dir === "down" && (
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6">
              <path d="M3 4l5 5 5-5M3 10l5 5 5-5" />
            </svg>
          )}
          <span>{delta.text}</span>
        </div>
      )}
      {extra && <div className={styles.extra}>{extra}</div>}
    </div>
  );
}

export function KpiStrip({
  cols = 4,
  children,
}: {
  cols?: number;
  children: ReactNode;
}) {
  return (
    <div
      className={styles.strip}
      style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
    >
      {children}
    </div>
  );
}
