import type { ReactNode } from "react";
import styles from "./PageHeader.module.scss";

interface PageHeaderProps {
  eyebrow?: ReactNode;
  title: string;
  subtitle?: ReactNode;
  meta?: ReactNode;
  actions?: ReactNode;
}

export function PageHeader({ eyebrow, title, subtitle, meta, actions }: PageHeaderProps) {
  return (
    <header className={styles.header}>
      <div className={styles.left}>
        {eyebrow && <div className={styles.eyebrow}>{eyebrow}</div>}
        <h1 className={styles.title}>{title}</h1>
        {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
        {meta && <div className={styles.meta}>{meta}</div>}
      </div>
      {actions && <div className={styles.actions}>{actions}</div>}
    </header>
  );
}
