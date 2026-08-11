"use client";

/**
 * SubmissionLoader — overlay d'analyse IA visible pendant la soumission
 * d'une proposition à l'UGP.
 *
 * Étapes mockées (production : remplacer par l'orchestration réelle) :
 * 1. Vérification cohérence MEP/PTBA (cas #6)
 * 2. Pré-vérification documents requis
 * 3. Génération document PDF (mise en page IA)
 * 4. Calcul prédiction délai ANO (cas #4)
 * 5. Soumission UGP
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  AiGenerate,
  CheckmarkFilled,
  CheckmarkOutline,
  Renew,
  TaskApproved,
  ArrowRight,
  Home,
  Document,
} from "@carbon/icons-react";
import styles from "./SubmissionLoader.module.scss";

export interface SubmissionStep {
  id: string;
  label: string;
  sub: string;
  /** Durée en ms */
  duration: number;
}

export const DEFAULT_STEPS: SubmissionStep[] = [
  {
    id: "mep",
    label: "Vérification cohérence MEP/PTBA",
    sub: "Règles déterministes · cas IA #6",
    duration: 900,
  },
  {
    id: "docs",
    label: "Vérification documents requis",
    sub: "TDR · annexes · sauvegardes E&S",
    duration: 800,
  },
  {
    id: "ai-doc",
    label: "Génération du document final IA",
    sub: "Mise en page · DOCX/PDF · multi-pages",
    duration: 1400,
  },
  {
    id: "ai-pred",
    label: "Prédiction délai ANO bailleur",
    sub: "Modèle XGBoost · 247 TDR historiques",
    duration: 700,
  },
  {
    id: "ugp",
    label: "Soumission au secrétariat UGP",
    sub: "Signature HMAC · audit trail",
    duration: 600,
  },
];

interface SubmissionLoaderProps {
  open: boolean;
  steps?: SubmissionStep[];
  /** Référence affichée dans le panneau de succès (ex. "PROP-2026-019") */
  propRef?: string;
  /** Lien "Voir le dossier" dans le succès */
  detailHref?: string;
  /** Lien "Retour à l'accueil" dans le succès */
  homeHref?: string;
  /** Appelé une fois la dernière étape franchie (transition vers succès) */
  onComplete?: () => void;
  /** Appelé quand l'utilisateur ferme le panneau de succès */
  onClose?: () => void;
}

export function SubmissionLoader({
  open,
  steps = DEFAULT_STEPS,
  propRef = "PROP-2026-019",
  detailHref,
  homeHref = "/partenaire",
  onComplete,
  onClose,
}: SubmissionLoaderProps) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [done, setDone] = useState(false);

  // Reset on open
  useEffect(() => {
    if (open) {
      setCurrentIdx(0);
      setDone(false);
    }
  }, [open]);

  // Advance through steps
  useEffect(() => {
    if (!open || done) return;
    if (currentIdx >= steps.length) {
      setDone(true);
      onComplete?.();
      return;
    }
    const step = steps[currentIdx];
    const tid = setTimeout(() => {
      setCurrentIdx((i) => i + 1);
    }, step.duration);
    return () => clearTimeout(tid);
  }, [open, currentIdx, steps, done, onComplete]);

  const totalDuration = steps.reduce((acc, s) => acc + s.duration, 0);
  const elapsed = steps.slice(0, currentIdx).reduce((acc, s) => acc + s.duration, 0);
  const progress = Math.min(100, Math.round((elapsed / totalDuration) * 100));

  return (
    <div
      className={`${styles.overlay} ${open ? styles.overlayOpen : ""}`}
      role={open ? "dialog" : undefined}
      aria-modal={open ? "true" : undefined}
      aria-label="Soumission en cours"
    >
      <div className={styles.panel}>
        {!done ? (
          <>
            <div className={styles.head}>
              <div className={styles.headIco}>
                <AiGenerate size={20} aria-hidden />
              </div>
              <div className={styles.headInfo}>
                <h2 className={styles.headTitle}>Soumission en cours · ✦ IA</h2>
                <div className={styles.headSub}>
                  Analyse, génération et transmission au secrétariat UGP
                </div>
              </div>
            </div>

            <div className={styles.body}>
              <ul className={styles.steps}>
                {steps.map((s, i) => {
                  const isActive = i === currentIdx;
                  const isDone = i < currentIdx;
                  const isPending = i > currentIdx;
                  return (
                    <li key={s.id} className={styles.step}>
                      <span
                        className={`${styles.stepIco} ${
                          isDone
                            ? styles.stepIcoDone
                            : isActive
                              ? styles.stepIcoActive
                              : ""
                        }`}
                        aria-hidden
                      >
                        {isDone ? (
                          <CheckmarkFilled size={14} />
                        ) : isActive ? (
                          <Renew size={14} className={styles.spin} />
                        ) : (
                          <CheckmarkOutline size={14} />
                        )}
                      </span>
                      <div
                        className={`${styles.stepLabel} ${
                          isDone
                            ? styles.stepLabelDone
                            : isActive
                              ? styles.stepLabelActive
                              : styles.stepLabelPending
                        }`}
                      >
                        {s.label}
                        <div className={styles.stepSub}>{s.sub}</div>
                      </div>
                      <span className={styles.stepDuration}>
                        {isDone ? "✓" : isActive ? "..." : `${(s.duration / 1000).toFixed(1)}s`}
                      </span>
                    </li>
                  );
                })}
              </ul>

              <div className={styles.progress}>
                <div className={styles.progressBar} style={{ width: `${progress}%` }} />
              </div>
            </div>

            <div className={styles.foot}>
              ne fermez pas cette fenêtre · audit trail signé HMAC
            </div>
          </>
        ) : (
          <>
            <div className={styles.successPanel}>
              <div className={styles.successIco}>
                <TaskApproved size={28} aria-hidden />
              </div>
              <h2 className={styles.successTitle}>Proposition soumise avec succès</h2>
              <p className={styles.successSub}>
                Votre proposition a été transmise au secrétariat UGP. Vous recevrez un accusé de
                réception sous 4 h ouvrables. Délai indicatif arbitrage : 7 j ouvrables.
              </p>
              <div className={styles.successRef}>
                <Document size={12} aria-hidden /> {propRef} · audit signé HMAC
              </div>
              <div className={styles.successActions}>
                <Link
                  href={homeHref}
                  className={styles.btnSecondary}
                  onClick={() => onClose?.()}
                >
                  <Home size={14} aria-hidden /> Retour à l&apos;accueil
                </Link>
                {detailHref && (
                  <Link
                    href={detailHref}
                    className={styles.btnPrimary}
                    onClick={() => onClose?.()}
                  >
                    Voir le dossier <ArrowRight size={14} aria-hidden />
                  </Link>
                )}
              </div>
            </div>
            <div className={styles.foot}>réf. {propRef} · audit signé</div>
          </>
        )}
      </div>
    </div>
  );
}
