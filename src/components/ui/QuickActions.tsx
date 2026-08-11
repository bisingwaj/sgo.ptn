import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight } from "@carbon/icons-react";
import styles from "./QuickActions.module.scss";

export interface QuickAction {
  label: string;
  description?: string;
  href: string;
  icon: ReactNode;
  count?: string;
  emphasis?: boolean;
}

interface QuickActionsProps {
  actions: QuickAction[];
}

export function QuickActions({ actions }: QuickActionsProps) {
  return (
    <ul className={styles.list}>
      {actions.map((a, i) => (
        <li key={i}>
          <Link
            href={a.href}
            className={`${styles.action} ${a.emphasis ? styles.emphasis : ""}`}
          >
            <span className={styles.icon} aria-hidden>
              {a.icon}
            </span>
            <span className={styles.body}>
              <span className={styles.label}>{a.label}</span>
              {a.description && <span className={styles.desc}>{a.description}</span>}
            </span>
            {a.count && <span className={`${styles.count} ptn-mono`}>{a.count}</span>}
            <ArrowRight size={14} aria-hidden className={styles.arrow} />
          </Link>
        </li>
      ))}
    </ul>
  );
}
