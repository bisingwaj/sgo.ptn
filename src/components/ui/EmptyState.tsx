import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowRight } from "@carbon/icons-react";
import styles from "./EmptyState.module.scss";

interface EmptyStateAction {
  label: string;
  href?: string;
  onClick?: () => void;
  primary?: boolean;
  icon?: ReactNode;
}

interface EmptyStateProps {
  /** Variante visuelle de l'icône (couleur de fond) */
  tone?: "default" | "ai" | "success" | "neutral";
  /** Icône (Carbon) */
  icon: ReactNode;
  title: string;
  description?: ReactNode;
  hint?: string;
  actions?: EmptyStateAction[];
  /** Liste de conseils contextuels (bullets) */
  tips?: Array<{ icon?: ReactNode; text: ReactNode }>;
  /** Quand l'EmptyState n'est PAS dans une toolbar (border-top à ajouter) */
  standalone?: boolean;
}

export function EmptyState({
  tone = "default",
  icon,
  title,
  description,
  hint,
  actions = [],
  tips,
  standalone,
}: EmptyStateProps) {
  const toneCls =
    tone === "ai"
      ? styles.iconAi
      : tone === "success"
        ? styles.iconSuccess
        : tone === "neutral"
          ? styles.iconNeutral
          : "";

  return (
    <div className={`${styles.wrap} ${standalone ? styles.wrapStandalone : ""}`}>
      <div className={`${styles.icon} ${toneCls}`}>{icon}</div>
      <h3 className={styles.title}>{title}</h3>
      {description && <p className={styles.description}>{description}</p>}
      {hint && <div className={styles.hint}>{hint}</div>}

      {tips && tips.length > 0 && (
        <div className={styles.tips}>
          {tips.map((t, i) => (
            <div key={i} className={styles.tip}>
              <span className={styles.tipIco}>{t.icon ?? <ArrowRight size={12} aria-hidden />}</span>
              <span>{t.text}</span>
            </div>
          ))}
        </div>
      )}

      {actions.length > 0 && (
        <div className={styles.actions}>
          {actions.map((a, i) => {
            const cls = a.primary ? styles.btnPrimary : styles.btnSecondary;
            if (a.href) {
              return (
                <Link key={i} href={a.href} className={cls}>
                  {a.icon}
                  {a.label}
                </Link>
              );
            }
            return (
              <button key={i} type="button" className={cls} onClick={a.onClick}>
                {a.icon}
                {a.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
