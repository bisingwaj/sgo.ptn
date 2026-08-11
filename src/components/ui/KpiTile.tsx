import type { ReactNode } from "react";
import { ArrowUp, ArrowDown, Subtract } from "@carbon/icons-react";
import styles from "./KpiTile.module.scss";

interface KpiTileProps {
  label: string;
  value: ReactNode;
  unit?: string;
  trend?: {
    direction: "up" | "down" | "neutral";
    label: string;
  };
  icon?: ReactNode;
  /** Contenu additionnel (sparkline, mini barchart, etc.) */
  extra?: ReactNode;
  href?: string;
}

export function KpiTile({ label, value, unit, trend, icon, extra }: KpiTileProps) {
  return (
    <div className={styles.tile}>
      <div className={styles.head}>
        {icon && <span className={styles.icon}>{icon}</span>}
        <span className={styles.label}>{label}</span>
      </div>
      <div className={styles.value}>
        <span className={`${styles.valueNum} ptn-mono`}>{value}</span>
        {unit && <span className={styles.unit}>{unit}</span>}
      </div>
      {trend && (
        <div className={`${styles.trend} ${styles[`trend_${trend.direction}`]}`}>
          {trend.direction === "up" && <ArrowUp size={12} aria-hidden />}
          {trend.direction === "down" && <ArrowDown size={12} aria-hidden />}
          {trend.direction === "neutral" && <Subtract size={12} aria-hidden />}
          <span>{trend.label}</span>
        </div>
      )}
      {extra && <div className={styles.extra}>{extra}</div>}
    </div>
  );
}

interface KpiStripProps {
  cols?: number;
  children: ReactNode;
}

export function KpiStrip({ cols = 4, children }: KpiStripProps) {
  return (
    <div
      className={styles.strip}
      style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
    >
      {children}
    </div>
  );
}
