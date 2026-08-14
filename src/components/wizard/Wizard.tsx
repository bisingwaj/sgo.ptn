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

import { useEffect, useState, useMemo, type ReactNode } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  CheckmarkFilled,
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
  /**
   * Action asynchrone exécutée avant de passer à l'étape suivante.
   * Utile quand une étape doit aboutir côté serveur pour que la suivante
   * soit accessible — par exemple un changement de mot de passe temporaire,
   * qui déverrouille les autres routes de l'API. Une erreur laisse
   * l'utilisateur sur l'étape courante.
   */
  commit?: (state: T) => Promise<void>;
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
  /**
   * Panneau latéral persistant — l'assistant du dossier.
   *
   * Troisième colonne de l'espace de travail plutôt que fenêtre flottante :
   * il suit l'auteur d'étape en étape sans masquer le formulaire, et le
   * corps se contracte au lieu de passer dessous.
   */
  aside?: ReactNode;
  asideOpen?: boolean;
  /**
   * Modification poussée de l'extérieur.
   *
   * Le Wizard détient l'état du dossier ; un panneau latéral qui écrit en
   * base doit pouvoir aligner le formulaire dessus. `nonce` déclenche
   * l'application — une fonction seule ne dit pas quand elle a changé.
   */
  patch?: { nonce: number; fn: (state: T) => T };
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
  aside,
  asideOpen = false,
  patch,
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

  // Appliqué hors du rendu : une écriture venue du panneau ne doit pas
  // écraser une saisie en cours dans un autre champ, d'où la forme
  // fonctionnelle.
  useEffect(() => {
    if (patch) setStateInternal((s) => patch.fn(s));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patch?.nonce]);

  /**
   * Seul chemin pour changer d'étape.
   *
   * Changer d'étape est aussi un évènement pour qui écoute : un panneau
   * latéral doit savoir où en est l'auteur, même s'il n'a rien saisi. Les
   * trois sites de navigation — suivant, précédent, et le rail des étapes —
   * passent par ici.
   */
  const allerA = (n: number) => {
    setStep(n);
    onDraftChange?.(state, n);
  };

  const goNext = async () => {
    const current = steps[step];
    const validation = current.validate?.(state) ?? null;
    if (validation) {
      setError(validation);
      return;
    }
    setError(null);

    if (current.commit) {
      setSubmitting(true);
      try {
        await current.commit(state);
      } catch (e) {
        setError(e instanceof Error ? e.message : "L'opération a échoué.");
        return;
      } finally {
        setSubmitting(false);
      }
    }

    if (step < steps.length - 1) {
      setDone((d) => new Set(d).add(step));
      allerA(step + 1);
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
      allerA(step - 1);
      setError(null);
    }
  };

  const jumpTo = (n: number) => {
    if (n < step || done.has(n)) {
      allerA(n);
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

      <div className={styles.workspace} data-aside={aside ? (asideOpen ? "ouvert" : "replie") : undefined}>
        {/* ===== Rail des étapes =====
            Vertical plutôt qu'horizontal : au-delà de cinq ou six étapes,
            une rangée écrase les libellés jusqu'à l'illisible. Le numéro
            n'apparaît qu'une fois — il était auparavant rendu à la fois
            dans la pastille et sous elle. */}
        <nav className={styles.rail} aria-label="Étapes du dossier">
          <span className={styles.railTitle}>Étapes</span>

          <ol className={styles.stepper}>
            {steps.map((s, i) => {
              const isDone = done.has(i);
              const isActive = i === step;
              const canJump = isDone || i < step;
              return (
                <li
                  key={s.num}
                  className={`${styles.stepItem} ${isActive ? styles.active : ""} ${isDone ? styles.done : ""}`}
                  aria-current={isActive ? "step" : undefined}
                >
                  <button
                    type="button"
                    className={styles.stepBtn}
                    onClick={canJump ? () => jumpTo(i) : undefined}
                    disabled={!canJump}
                    aria-label={`Étape ${s.num} — ${s.label}`}
                  >
                    <span className={styles.stepMarker} aria-hidden>
                      {isDone ? (
                        <CheckmarkFilled size={14} />
                      ) : (
                        <span className="ptn-mono">{s.num}</span>
                      )}
                    </span>
                    <span className={styles.stepText}>
                      <span className={styles.stepLabel}>{s.label}</span>
                      {s.sub && <span className={styles.stepSub}>{s.sub}</span>}
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>

          <p className={styles.railFoot}>
            Étape <span className="ptn-mono">{step + 1}</span> sur{" "}
            <span className="ptn-mono">{steps.length}</span>
          </p>
        </nav>

        {/* ===== Body ===== */}
        <main className={styles.body}>
          <div className={styles.bodyHead}>
            <h2 className={styles.bodyTitle}>{currentStep.label}</h2>
            {currentStep.sub && <p className={styles.bodySub}>{currentStep.sub}</p>}
          </div>
          <div className={styles.bodyContent}>{currentStep.render(state, setState)}</div>
        </main>

        {aside}
      </div>

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
