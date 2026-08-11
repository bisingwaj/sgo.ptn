import type { ReactNode } from "react";
import styles from "./SidePanel.module.css";

interface SidePanelProps {
  children: ReactNode;
}

export function SidePanel({ children }: SidePanelProps) {
  return <aside className={styles.sp}>{children}</aside>;
}

interface SectionProps {
  title: string;
  badge?: string | number;
  children: ReactNode;
  scrollable?: boolean;
}

export function PanelSection({ title, badge, children, scrollable = true }: SectionProps) {
  return (
    <section className={styles.section}>
      <h4 className={styles.h4}>
        <span>{title}</span>
        {badge !== undefined && <span className={styles.badge}>{badge}</span>}
      </h4>
      <div className={`${styles.body} ${scrollable ? styles.scroll : ""}`}>
        {children}
      </div>
    </section>
  );
}
