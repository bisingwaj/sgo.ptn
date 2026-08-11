"use client";

/**
 * Sélecteur de langue.
 * 6 langues per MEP § 7 (communications publiques) :
 * FR (défaut) · EN · Lingala · Swahili · Tshiluba · Kikongo.
 */

import { useEffect, useState } from "react";
import { SUPPORTED_LANGUAGES } from "@/lib/project-data";
import styles from "./LanguagePicker.module.scss";

const STORAGE_KEY = "ptn-rdc.language";

interface LanguagePickerProps {
  variant?: "compact" | "full";
  /** Tonalité du fond (utile pour panneau sombre du login) */
  tone?: "light" | "dark";
}

export function LanguagePicker({
  variant = "compact",
  tone = "light",
}: LanguagePickerProps) {
  const [lang, setLang] = useState<string>("fr");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved) setLang(saved);
    } catch {
      /* ignore */
    }
  }, []);

  const choose = (code: string) => {
    setLang(code);
    setOpen(false);
    try {
      window.localStorage.setItem(STORAGE_KEY, code);
    } catch {
      /* ignore */
    }
  };

  const current = SUPPORTED_LANGUAGES.find((l) => l.code === lang);

  if (variant === "compact") {
    return (
      <div className={`${styles.compact} ${styles[tone]}`}>
        <button
          type="button"
          aria-label="Choisir la langue"
          aria-expanded={open}
          aria-haspopup="listbox"
          onClick={() => setOpen((v) => !v)}
          className={styles.trigger}
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4">
            <circle cx="8" cy="8" r="6.5" />
            <path d="M2 8h12M8 1.5c2 2 2 11 0 13M8 1.5c-2 2-2 11 0 13" />
          </svg>
          <span className="ptn-mono">{current?.code.toUpperCase()}</span>
          <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4">
            <path d="M3 6l5 5 5-5" />
          </svg>
        </button>
        {open && (
          <ul className={styles.menu} role="listbox">
            {SUPPORTED_LANGUAGES.map((l) => (
              <li key={l.code}>
                <button
                  type="button"
                  role="option"
                  aria-selected={l.code === lang}
                  className={`${styles.option} ${l.code === lang ? styles.optionSelected : ""}`}
                  onClick={() => choose(l.code)}
                >
                  <span className={`${styles.code} ptn-mono`}>{l.code.toUpperCase()}</span>
                  <span>{l.label}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  // variant: "full" — segments visibles
  return (
    <div className={`${styles.segments} ${styles[tone]}`} role="radiogroup" aria-label="Langue">
      {SUPPORTED_LANGUAGES.map((l) => (
        <button
          key={l.code}
          type="button"
          role="radio"
          aria-checked={l.code === lang}
          onClick={() => choose(l.code)}
          className={`${styles.segment} ${l.code === lang ? styles.segmentActive : ""}`}
          title={l.label}
        >
          <span className="ptn-mono">{l.code.toUpperCase()}</span>
        </button>
      ))}
    </div>
  );
}
