"use client";

/**
 * Bandeau d'état système.
 * Affiche le statut live des 4 services critiques :
 * - IDA (Compte Désigné Banque mondiale)
 * - AFD (Compte Désigné AFD)
 * - STEP (Systematic Tracking BM)
 * - TOMWEB (logiciel comptable UGP)
 */

import { useState } from "react";
import styles from "./SystemStatusBar.module.scss";

type ServiceStatus = "ok" | "warn" | "down";

interface ServiceState {
  code: string;
  label: string;
  status: ServiceStatus;
  detail?: string;
}

interface SystemStatusBarProps {
  tone?: "light" | "dark";
  /** Mode compact : affiche juste un dot global. Mode full : 4 services. */
  variant?: "compact" | "full";
}

const DEFAULT_STATE: ServiceState[] = [
  { code: "IDA", label: "Compte Désigné IDA", status: "ok" },
  { code: "AFD", label: "Compte Désigné AFD", status: "ok" },
  { code: "STEP", label: "World Bank STEP", status: "ok" },
  { code: "TOMWEB", label: "Comptabilité TOMWEB", status: "warn", detail: "Sync différée 4 min" },
];

export function SystemStatusBar({
  tone = "light",
  variant = "full",
}: SystemStatusBarProps) {
  const [services] = useState<ServiceState[]>(DEFAULT_STATE);
  const overall: ServiceStatus = services.some((s) => s.status === "down")
    ? "down"
    : services.some((s) => s.status === "warn")
      ? "warn"
      : "ok";

  if (variant === "compact") {
    return (
      <div className={`${styles.bar} ${styles[tone]} ${styles.compact}`}>
        <span className={`${styles.dot} ${styles[`dot_${overall}`]}`} aria-hidden />
        <span>
          {overall === "ok" && "Tous les services opérationnels"}
          {overall === "warn" && "Maintenance partielle"}
          {overall === "down" && "Incident en cours"}
        </span>
      </div>
    );
  }

  return (
    <div className={`${styles.bar} ${styles[tone]}`} role="status" aria-live="polite">
      <span className={styles.label}>État système</span>
      {services.map((s) => (
        <span key={s.code} className={styles.service} title={s.detail ?? s.label}>
          <span className={`${styles.dot} ${styles[`dot_${s.status}`]}`} aria-hidden />
          <span className={`${styles.code} ptn-mono`}>{s.code}</span>
        </span>
      ))}
    </div>
  );
}
