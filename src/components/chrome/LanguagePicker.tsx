"use client";

/**
 * Sélecteur de langue.
 *
 * Six langues prévues par le MEP pour les communications publiques :
 * FR (défaut) · EN · Lingala · Swahili · Tshiluba · Kikongo.
 *
 * Il ne traduit encore rien : l'internationalisation n'est pas en place. Le
 * choix est mémorisé pour que la préférence survive à la bascule, et les
 * langues non desservies sont annoncées comme telles plutôt que proposées
 * comme actives.
 */

import { useCallback, useRef, useState } from "react";
import { Earth, ChevronDown, Checkmark } from "@carbon/icons-react";
import { SUPPORTED_LANGUAGES } from "@/lib/project-data";
import { useDismissable } from "@/lib/use-dismissable";
import { createPersistentStore } from "@/lib/persistent-store";
import { cn } from "@/lib/cn";

/** Préférence de langue — voir persistent-store.ts pour le choix technique. */
const languageStore = createPersistentStore("ptn-rdc.language", "fr", (raw) => raw);

/** Seules ces langues disposeront de catalogues à la première livraison. */
const READY = new Set(["fr", "en"]);

interface LanguagePickerProps {
  variant?: "compact" | "full";
  /** Tonalité du fond — le bandeau sombre demande un contraste inversé. */
  tone?: "light" | "dark";
}

export function LanguagePicker({ variant = "compact", tone = "light" }: LanguagePickerProps) {
  const lang = languageStore.use();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const dismiss = useCallback(() => setOpen(false), []);
  useDismissable(wrapRef, open, dismiss);

  const choose = (code: string) => {
    languageStore.set(code);
    setOpen(false);
    triggerRef.current?.focus();
  };

  const current = SUPPORTED_LANGUAGES.find((l) => l.code === lang);
  const dark = tone === "dark";

  if (variant === "full") {
    return (
      <div role="radiogroup" aria-label="Langue" className="flex flex-wrap gap-px">
        {SUPPORTED_LANGUAGES.map((l) => {
          const active = l.code === lang;
          return (
            <button
              key={l.code}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => choose(l.code)}
              className={cn(
                "text-caption border-subtle focus-visible:outline-accent min-h-9 border px-3 focus-visible:outline-2",
                active ? "bg-accent-surface text-primary font-medium" : "bg-layer text-secondary",
              )}
            >
              {l.code.toUpperCase()}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div ref={wrapRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        aria-label={`Langue : ${current?.label ?? "Français"}`}
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "focus-visible:outline-accent flex h-10 shrink-0 items-center gap-1.5 px-2 focus-visible:outline-2",
          dark
            ? "text-white/70 hover:bg-white/10 hover:text-white"
            : "text-secondary hover:bg-layer-hover hover:text-primary",
          open && (dark ? "bg-white/10 text-white" : "bg-layer-hover text-primary"),
        )}
      >
        <Earth size={20} aria-hidden />
        <span className="text-caption mono">{current?.code.toUpperCase()}</span>
        <ChevronDown
          size={16}
          aria-hidden
          className={cn("transition-transform duration-[var(--ptn-motion-fast-02)]", open && "rotate-180")}
        />
      </button>

      {open && (
        <ul
          role="listbox"
          aria-label="Langue"
          className="border-subtle bg-layer absolute top-full right-0 z-40 mt-px w-60 border shadow-[var(--shadow-overlay)]"
        >
          {SUPPORTED_LANGUAGES.map((l) => {
            const active = l.code === lang;
            const ready = READY.has(l.code);
            return (
              <li key={l.code}>
                <button
                  type="button"
                  role="option"
                  aria-selected={active}
                  onClick={() => choose(l.code)}
                  className={cn(
                    "hover:bg-layer-hover focus-visible:outline-accent flex w-full items-center gap-3 px-3 py-2 text-left focus-visible:outline-2",
                    active && "bg-accent-surface",
                  )}
                >
                  <span className="text-caption mono text-secondary w-6 shrink-0">
                    {l.code.toUpperCase()}
                  </span>
                  <span className="text-body text-primary flex-1 truncate">{l.label}</span>
                  {!ready && (
                    <span className="text-caption text-helper border-subtle shrink-0 border px-1">
                      bientôt
                    </span>
                  )}
                  {active && <Checkmark size={16} aria-hidden className="text-accent shrink-0" />}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
