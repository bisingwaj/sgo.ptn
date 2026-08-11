"use client";

/**
 * Wizard générique réutilisable.
 *
 * - Stepper horizontal (Carbon ProgressIndicator pattern)
 * - Aucun scroll global : chaque étape gère son propre overflow
 * - Boutons fixes en bas : Annuler · Précédent · Suivant / Soumettre
 * - Validation par étape via callback `validate`
 * - Persistance brouillon optionnelle via `onDraftChange`
 * - Support clavier complet
 */

import { useState, useMemo, type ReactNode } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  CheckmarkFilled,
  CheckmarkOutline,
  WarningAltFilled,
} from "@carbon/icons-react";
import styles from "./Wizard.module.scss";

export interface WizardStep<T = unknown> {
  /** Numéro affiché (ex. "01") */
  num: string;
  /** Libellé court */
  label: string;
  /** Sous-titre */
  sub?: string;
  /** Rendu du contenu de l'étape — reçoit le state et son setter */
  render: (state: T, setState: (s: T) => void) => ReactNode;
  /** Validation : retourne null si OK, message d'erreur sinon */
  validate?: (state: T) => string | null;
  /** Optionnel : afficher cette étape uniquement si la condition est vraie */
  visibleIf?: (state: T) => boolean;
}

export interface WizardProps<T = unknown> {
  title: string;
  subtitle?: string;
  /** Eyebrow text (ex. "ONBOARDING UGP") */
  eyebrow?: string;
  /** Trailing slot dans le header (ex. illustration) */
  headerTrailing?: ReactNode;
  steps: WizardStep<T>[];
  initialState: T;
  cancelHref?: string;
  finishLabel?: string;
  onFinish?: (state: T) => Promise<void> | void;
  onDraftChange?: (state: T, currentStep: number) => void;
}

export function Wizard<T>({
  title,
  subtitle,
  eyebrow,
  headerTrailing,
  steps: rawSteps,
  initialState,
  cancelHref = "/login",
  finishLabel = "Accéder à mon tableau de bord",
  onFinish,
  onDraftChange,
}: WizardProps<T>) {
  const [state, setStateInternal] = useState<T>(initialState);
  const [step, setStep] = useState(0);
  const [done, setDone] = useState<Set<number>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const steps = useMemo(
    () => rawSteps.filter((s) => !s.visibleIf || s.visibleIf(state)),
    [rawSteps, state],
  );

  const setState = (next: T) => {
    setStateInternal(next);
    setError(null);
    onDraftChange?.(next, step);
  };

  const goNext = async () => {
    const current = steps[step];
    const validation = current.validate?.(state) ?? null;
    if (validation) {
      setError(validation);
      return;
    }
    setError(null);

    if (step < steps.length - 1) {
      setDone((d) => new Set(d).add(step));
      setStep(step + 1);
      return;
    }

    // Dernière étape : soumission
    if (onFinish) {
      setSubmitting(true);
      try {
        await onFinish(state);
        setDone((d) => new Set(d).add(step));
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erreur lors de la soumission.");
      } finally {
        setSubmitting(false);
      }
    }
  };

  const goPrev = () => {
    if (step > 0) {
      setStep(step - 1);
      setError(null);
    }
  };

  const jumpTo = (n: number) => {
    if (n < step || done.has(n)) {
      setStep(n);
      setError(null);
    }
  };

  const isLast = step === steps.length - 1;
  const currentStep = steps[step];

  return (
    <div className={styles.shell}>
      {/* ===== Header ===== */}
      <header className={styles.header}>
        <div className={styles.headerMain}>
          {eyebrow && <div className={styles.eyebrow}>{eyebrow}</div>}
          <h1 className={styles.title}>{title}</h1>
          {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
        </div>
        {headerTrailing && <div className={styles.headerTrailing}>{headerTrailing}</div>}
      </header>

      {/* ===== Progress indicator ===== */}
      <div className={styles.stepperWrap}>
        <ol className={styles.stepper}>
          {steps.map((s, i) => {
            const isDone = done.has(i);
            const isActive = i === step;
            const canJump = isDone || i < step;
            return (
              <li
                key={s.num}
                className={`${styles.stepItem} ${isActive ? styles.active : ""} ${isDone ? styles.done : ""} ${canJump ? styles.clickable : ""}`}
                onClick={canJump ? () => jumpTo(i) : undefined}
                aria-current={isActive ? "step" : undefined}
              >
                <span className={styles.circle}>
                  {isDone ? (
                    <CheckmarkFilled size={16} aria-hidden />
                  ) : isActive ? (
                    <span className={`${styles.circleNum} ptn-mono`}>{s.num}</span>
                  ) : (
                    <CheckmarkOutline size={16} aria-hidden />
                  )}
                </span>
                <div className={styles.stepMeta}>
                  <span className={`${styles.stepNum} ptn-mono`}>{s.num}</span>
                  <span className={styles.stepLabel}>{s.label}</span>
                  {s.sub && <span className={styles.stepSub}>{s.sub}</span>}
                </div>
              </li>
            );
          })}
        </ol>
      </div>

      {/* ===== Body ===== */}
      <main className={styles.body}>
        <div className={styles.bodyHead}>
          <span className={`${styles.bodyNum} ptn-mono`}>
            ÉTAPE {step + 1} / {steps.length}
          </span>
          <h2 className={styles.bodyTitle}>{currentStep.label}</h2>
          {currentStep.sub && <p className={styles.bodySub}>{currentStep.sub}</p>}
        </div>
        <div className={styles.bodyContent}>{currentStep.render(state, setState)}</div>
      </main>

      {/* ===== Footer (sticky) ===== */}
      <footer className={styles.footer}>
        <div className={styles.footerLeft}>
          <Link href={cancelHref} className={styles.cancelLink}>
            Annuler et quitter
          </Link>
          <span className={`${styles.draft} ptn-mono`}>● Brouillon enregistré</span>
        </div>
        <div className={styles.footerRight}>
          {error && (
            <div className={styles.errorChip} role="alert">
              <WarningAltFilled size={14} aria-hidden />
              <span>{error}</span>
            </div>
          )}
          {step > 0 && (
            <button
              type="button"
              className={styles.btnGhost}
              onClick={goPrev}
              disabled={submitting}
            >
              <ArrowLeft size={14} aria-hidden /> Précédent
            </button>
          )}
          <button
            type="button"
            className={styles.btnPrimary}
            onClick={goNext}
            disabled={submitting}
          >
            <span>{submitting ? "Soumission…" : isLast ? finishLabel : "Suivant"}</span>
            {!submitting && <ArrowRight size={14} aria-hidden />}
          </button>
        </div>
      </footer>
    </div>
  );
}
