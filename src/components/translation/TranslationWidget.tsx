"use client";

/**
 * Translation widget — cas d'usage IA #8 du rapport stratégique.
 * Permet de basculer le contenu visible entre FR / EN / Lingala / Swahili.
 *
 * Pour la démo : provider/contexte simple qui expose la langue active.
 * Production : remplacer par un appel à un service de traduction.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  Translate,
  CheckmarkFilled,
  AiGenerate,
  ChevronDown,
  Close,
} from "@carbon/icons-react";
import styles from "./TranslationWidget.module.scss";

export type Language = "fr" | "en" | "ln" | "sw";

interface LanguageOption {
  code: Language;
  flag: string;
  label: string;
  sub: string;
  source: boolean;
}

const LANGUAGES: LanguageOption[] = [
  { code: "fr", flag: "FR", label: "Français", sub: "Langue officielle · source", source: true },
  { code: "en", flag: "EN", label: "English", sub: "Banque mondiale · TTL", source: false },
  { code: "ln", flag: "LN", label: "Lingala", sub: "Langue nationale RDC", source: false },
  { code: "sw", flag: "SW", label: "Kiswahili", sub: "Langue nationale Est-RDC", source: false },
];

/* ============== Context ============== */

interface TranslationContextValue {
  language: Language;
  setLanguage: (l: Language) => void;
  isTranslated: boolean;
  reset: () => void;
}

const TranslationCtx = createContext<TranslationContextValue | null>(null);

export function TranslationProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>("fr");

  const setLanguage = useCallback((l: Language) => {
    setLanguageState(l);
  }, []);

  const reset = useCallback(() => {
    setLanguageState("fr");
  }, []);

  return (
    <TranslationCtx.Provider
      value={{
        language,
        setLanguage,
        isTranslated: language !== "fr",
        reset,
      }}
    >
      {children}
    </TranslationCtx.Provider>
  );
}

export function useTranslation(): TranslationContextValue {
  const ctx = useContext(TranslationCtx);
  if (!ctx) {
    throw new Error("useTranslation doit être utilisé dans un <TranslationProvider>");
  }
  return ctx;
}

/* ============== Widget ============== */

export function TranslationWidget() {
  const { language, setLanguage } = useTranslation();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  // Click outside to close
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  // ESC to close
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const current = LANGUAGES.find((l) => l.code === language) ?? LANGUAGES[0];

  return (
    <div className={styles.wrap} ref={wrapRef}>
      <button
        type="button"
        className={styles.trigger}
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Langue active : ${current.label}. Changer de langue.`}
      >
        <Translate size={14} aria-hidden className={styles.triggerIco} />
        <span className={styles.lang}>{current.flag}</span>
        <ChevronDown size={12} aria-hidden />
      </button>

      <div className={`${styles.menu} ${open ? styles.menuOpen : ""}`} role="menu">
        <div className={styles.menuHead}>
          <span>
            <AiGenerate
              size={10}
              aria-hidden
              style={{ verticalAlign: "middle", marginRight: 4, color: "var(--ptn-status-ai)" }}
            />
            Traduction IA
          </span>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Fermer le menu"
            style={{
              background: "transparent",
              border: 0,
              cursor: "pointer",
              color: "var(--cds-text-helper)",
              padding: 0,
              display: "grid",
              placeItems: "center",
            }}
          >
            <Close size={12} aria-hidden />
          </button>
        </div>
        {LANGUAGES.map((l) => (
          <button
            key={l.code}
            type="button"
            role="menuitem"
            className={`${styles.option} ${language === l.code ? styles.optionActive : ""}`}
            onClick={() => {
              setLanguage(l.code);
              setOpen(false);
            }}
          >
            <span
              className={`${styles.optionFlag} ${language === l.code ? styles.optionFlagActive : ""}`}
            >
              {l.flag}
            </span>
            <div className={styles.optionMain}>
              <div className={styles.optionLabel}>{l.label}</div>
              <div className={styles.optionSub}>{l.sub}</div>
            </div>
            {language === l.code && (
              <span className={styles.optionCheck}>
                <CheckmarkFilled size={14} aria-hidden />
              </span>
            )}
          </button>
        ))}
        <div className={styles.menuFoot}>
          ✦ IA · modèle multilingual-e5 · validation manuelle requise
        </div>
      </div>
    </div>
  );
}

/* ============== Banner shown when in translated mode ============== */

export function TranslationBanner() {
  const { language, isTranslated, reset } = useTranslation();

  if (!isTranslated) return null;

  const current = LANGUAGES.find((l) => l.code === language) ?? LANGUAGES[0];

  return (
    <div className={styles.translatedBanner} role="status">
      <Translate size={14} aria-hidden className={styles.translatedBannerIco} />
      <span>
        <strong>Traduction automatique activée</strong> — vous lisez le contenu en{" "}
        <strong>{current.label}</strong>. Marquage <span className="ptn-mono">✦ IA</span> ·
        sources : MEP, PTBA, Procurement Reg.
      </span>
      <button type="button" className={styles.translatedReset} onClick={reset}>
        Revenir au français
      </button>
    </div>
  );
}

/* ============== Helper for translatable strings ============== */

export type LangText = Partial<Record<Language, string>> & { fr: string };

/**
 * Récupère le texte dans la langue active, retombe sur FR si non disponible.
 * Pour la démo : retombe sur le texte FR si la traduction n'existe pas.
 */
export function useText(text: LangText): string {
  const { language } = useTranslation();
  return text[language] ?? text.fr;
}
