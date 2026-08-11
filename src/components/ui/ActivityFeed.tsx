import type { ReactNode } from "react";
import {
  CheckmarkFilled,
  Idea,
  WarningAltFilled,
  Information,
  Locked,
} from "@carbon/icons-react";
import styles from "./ActivityFeed.module.scss";

export type ActivityKind = "success" | "warning" | "info" | "ai" | "locked";

export interface ActivityItem {
  kind: ActivityKind;
  title: ReactNode;
  meta?: ReactNode;
  time: string;
}

interface ActivityFeedProps {
  items: ActivityItem[];
}

const ICONS: Record<ActivityKind, typeof CheckmarkFilled> = {
  success: CheckmarkFilled,
  warning: WarningAltFilled,
  info: Information,
  ai: Idea,
  locked: Locked,
};

export function ActivityFeed({ items }: ActivityFeedProps) {
  return (
    <ul className={styles.feed}>
      {items.map((it, i) => {
        const Icon = ICONS[it.kind];
        return (
          <li key={i} className={styles.item}>
            <span className={`${styles.icon} ${styles[`icon_${it.kind}`]}`}>
              <Icon size={14} aria-hidden />
            </span>
            <div className={styles.body}>
              <div className={styles.title}>{it.title}</div>
              {it.meta && <div className={styles.meta}>{it.meta}</div>}
              <div className={`${styles.time} ptn-mono`}>{it.time}</div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
