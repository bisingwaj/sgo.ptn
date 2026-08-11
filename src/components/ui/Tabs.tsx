"use client";

import { useState, type ReactNode } from "react";
import styles from "./Tabs.module.scss";

export interface Tab {
  key: string;
  label: string;
  count?: string | number;
  content: ReactNode;
}

interface TabsProps {
  tabs: Tab[];
  defaultTab?: string;
}

export function Tabs({ tabs, defaultTab }: TabsProps) {
  const [active, setActive] = useState(defaultTab ?? tabs[0]?.key);
  const activeTab = tabs.find((t) => t.key === active) ?? tabs[0];

  return (
    <div className={styles.wrap}>
      <div className={styles.tablist} role="tablist">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={t.key === active}
            onClick={() => setActive(t.key)}
            className={`${styles.tab} ${t.key === active ? styles.tabActive : ""}`}
          >
            {t.label}
            {t.count !== undefined && (
              <span className={styles.tabCount}>{t.count}</span>
            )}
          </button>
        ))}
      </div>
      <div className={styles.panel} role="tabpanel">
        {activeTab.content}
      </div>
    </div>
  );
}
