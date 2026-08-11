import type { ReactNode } from "react";
import styles from "./Card.module.scss";

interface CardProps {
  title?: string;
  badge?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  /** Padding interne du body */
  noPadding?: boolean;
}

export function Card({ title, badge, action, children, noPadding }: CardProps) {
  return (
    <section className={styles.card}>
      {(title || badge || action) && (
        <header className={styles.head}>
          <div className={styles.headLeft}>
            {title && <h3 className={styles.title}>{title}</h3>}
            {badge && <span className={styles.badge}>{badge}</span>}
          </div>
          {action && <div className={styles.action}>{action}</div>}
        </header>
      )}
      <div className={`${styles.body} ${noPadding ? styles.bodyNoPad : ""}`}>{children}</div>
    </section>
  );
}
