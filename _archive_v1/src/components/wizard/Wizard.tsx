"use client";

import { useState, useMemo, type ReactNode } from "react";
import Link from "next/link";
import { useProfile } from "@/lib/profile-context";
import { Tag } from "@/components/ui/Tag";
import { Button } from "@/components/ui/Buttons";
import styles from "./Wizard.module.css";

export interface WizardStep {
  num: string;
  label: string;
  sub?: string;
  visibleFor?: ("ugp" | "partenaire" | "sbp")[];
  render: (ctx: WizardContext) => ReactNode;
}

export interface WizardContext {
  profile: "ugp" | "partenaire" | "sbp" | "bailleur";
  step: number;
  total: number;
}

interface WizardProps {
  title: string;
  subtitle?: string;
  reference?: string;
  steps: WizardStep[];
  helpRail?: (ctx: WizardContext) => ReactNode;
  cancelHref?: string;
  finishLabel?: string;
}

export function Wizard({
  title,
  subtitle,
  reference,
  steps: rawSteps,
  helpRail,
  cancelHref = "/tdr",
  finishLabel = "Soumettre pour ANO",
}: WizardProps) {
  const { profile, config } = useProfile();

  // Si bailleur : lecture seule, on ne montre que la première étape mais avec un message clair.
  const canAuthor = config.canAuthorTdr;
  const authorProfile: WizardContext["profile"] =
    profile === "bailleur" ? "ugp" : profile;

  const steps = useMemo(
    () =>
      rawSteps.filter(
        (s) =>
          !s.visibleFor || s.visibleFor.includes(authorProfile as "ugp" | "partenaire" | "sbp"),
      ),
    [rawSteps, authorProfile],
  );

  const [step, setStep] = useState(0);
  const [done, setDone] = useState<Set<number>>(new Set());

  const goNext = () => {
    if (step < steps.length - 1) {
      setDone((d) => new Set(d).add(step));
      setStep((s) => s + 1);
    }
  };
  const goBack = () => setStep((s) => Math.max(0, s - 1));
  const jumpTo = (n: number) => {
    if (done.has(n) || n === step || n < step) setStep(n);
  };

  const ctx: WizardContext = { profile: authorProfile, step, total: steps.length };

  if (!canAuthor) {
    return (
      <div className={styles.wrap}>
        <div className={styles.readOnlyBanner}>
          <svg width="20" height="20" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="8" cy="8" r="6.5" />
            <path d="M8 4.5v4M8 11v.01" strokeLinecap="round" />
          </svg>
          <div>
            <strong>Accès Bailleur — lecture seule.</strong> Les bailleurs ne rédigent
            pas de TDR. Vos prérogatives sont la consultation et l&apos;émission
            d&apos;ANO. Pour rédiger, basculez sur UGP, Partenaire ou SBP via le
            sélecteur de profil dans le header.
          </div>
        </div>
      </div>
    );
  }

  const profileTone =
    authorProfile === "ugp"
      ? "blue"
      : authorProfile === "partenaire"
        ? "teal"
        : "magenta";

  return (
    <div
      className={styles.wrap}
      style={{ ["--c-accent" as string]: config.accent }}
    >
      {/* Page header */}
      <header className={styles.head}>
        <div>
          <div className={styles.eyebrow}>
            <Tag tone={profileTone} size="sm">
              {config.label}
            </Tag>
            {reference && <span className={`${styles.ref} mono`}>{reference}</span>}
          </div>
          <h1 className={styles.title}>{title}</h1>
          {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
        </div>
        <div className={styles.headRight}>
          <span className={`${styles.draft} mono`}>● Brouillon · auto-save 12s</span>
        </div>
      </header>

      {/* Layout 3 colonnes : stepper vertical · contenu · helpRail */}
      <div className={styles.layout}>
        {/* Stepper vertical */}
        <ol className={styles.stepper}>
          {steps.map((s, i) => {
            const isActive = step === i;
            const isDone = done.has(i);
            return (
              <li
                key={s.num}
                className={`${styles.stepItem} ${isActive ? styles.stepActive : ""} ${
                  isDone ? styles.stepDone : ""
                } ${isDone || isActive || i < step ? styles.stepClick : ""}`}
                onClick={() => jumpTo(i)}
              >
                <span className={styles.stepCircle}>
                  {isDone ? (
                    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M3 8l3 3 7-7" />
                    </svg>
                  ) : (
                    i + 1
                  )}
                </span>
                <div className={styles.stepMeta}>
                  <span className={`${styles.stepNum} mono`}>{s.num}</span>
                  <span className={styles.stepLabel}>{s.label}</span>
                  {s.sub && <span className={styles.stepSub}>{s.sub}</span>}
                </div>
              </li>
            );
          })}
        </ol>

        {/* Contenu de l'étape — strict no-scroll, height fixe */}
        <div className={styles.body}>
          <div className={styles.bodyHead}>
            <span className={`${styles.bodyNum} mono`}>
              ÉTAPE {step + 1} / {steps.length}
            </span>
            <h2 className={styles.bodyTitle}>{steps[step].label}</h2>
            {steps[step].sub && (
              <p className={styles.bodySub}>{steps[step].sub}</p>
            )}
          </div>
          <div className={styles.bodyContent}>{steps[step].render(ctx)}</div>
        </div>

        {/* Help rail */}
        {helpRail && <aside className={styles.rail}>{helpRail(ctx)}</aside>}
      </div>

      {/* Footer fixe */}
      <footer className={styles.foot}>
        <div className={styles.footLeft}>
          <Link href={cancelHref} className={styles.cancelLink}>
            Annuler
          </Link>
          <span className={styles.footSep} />
          <span className={styles.footMeta}>
            Étape <span className="mono">{step + 1}</span> / {steps.length} ·{" "}
            <span style={{ color: config.accent }}>{config.short}</span>
          </span>
        </div>
        <div className={styles.footRight}>
          {step > 0 && (
            <Button variant="ghost" onClick={goBack}>
              Précédent
            </Button>
          )}
          {step < steps.length - 1 ? (
            <Button
              variant="primary"
              onClick={goNext}
              icon={
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4">
                  <path d="M3 8h10M8 3l5 5-5 5" />
                </svg>
              }
            >
              Suivant
            </Button>
          ) : (
            <Button variant="primary">{finishLabel}</Button>
          )}
        </div>
      </footer>
    </div>
  );
}
