"use client";

/**
 * Menu déroulant du bandeau.
 *
 * Comportement commun aux quatre entrées (aide, notifications, compte,
 * langue) pour qu'elles se ferment toutes de la même façon — Échap, clic
 * extérieur, sélection — et rendent le focus à leur déclencheur.
 *
 * Ce dernier point n'est pas un détail : sans lui, refermer un menu au
 * clavier renvoie le focus au début du document, et il faut retraverser tout
 * le bandeau pour revenir où l'on était.
 *
 * Le contenu est une fonction recevant `close` : chaque panneau décide
 * lui-même de ce qui referme le menu (un lien, oui ; un filtre, non).
 */

import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";

interface HeaderMenuProps {
  label: string;
  icon: ReactNode;
  children: (close: () => void) => ReactNode;
  /** Largeur du panneau — les contenus n'ont pas tous la même densité. */
  width?: string;
  /** Pastille d'activité sur le déclencheur. */
  badge?: boolean;
  /** `end` aligne le panneau sur le bord droit du bandeau. */
  align?: "start" | "end";
  /** Contenu additionnel dans le déclencheur (identité, par exemple). */
  trailing?: ReactNode;
}

export function HeaderMenu({
  label,
  icon,
  children,
  width = "20rem",
  badge = false,
  align = "end",
  trailing,
}: HeaderMenuProps) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();

  // `close` ne touche pas la référence : elle se contente de fermer. La
  // restitution du focus est faite par l'effet ci-dessous, sans quoi la règle
  // `react-hooks/refs` signale — à raison — une lecture de référence pendant
  // le rendu, puisque `close` est transmise aux enfants au moment du rendu.
  const close = useCallback(() => setOpen(false), []);

  // Rend le focus au déclencheur à la FERMETURE seulement : sans ce
  // témoin, l'effet le volerait au premier montage, alors que le menu n'a
  // jamais été ouvert.
  const wasOpen = useRef(false);
  useEffect(() => {
    if (wasOpen.current && !open) triggerRef.current?.focus();
    wasOpen.current = open;
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: MouseEvent) => {
      if (!wrapRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        close();
      }
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, close]);

  return (
    <div ref={wrapRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={trailing ? undefined : label}
        title={trailing ? undefined : label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        className={cn(
          "text-secondary hover:bg-layer-hover hover:text-primary focus-visible:outline-accent relative flex h-10 shrink-0 items-center gap-2 focus-visible:outline-2",
          trailing ? "px-2" : "w-10 justify-center",
          open && "bg-layer-hover text-primary",
        )}
      >
        <span className="relative flex items-center">
          {icon}
          {badge && (
            <span
              aria-hidden
              className="border-layer absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full border-2 bg-[var(--ptn-accent)]"
            />
          )}
        </span>
        {trailing}
        {trailing && <span className="sr-only">{label}</span>}
      </button>

      {open && (
        <div
          id={panelId}
          role="menu"
          aria-label={label}
          style={{ width }}
          className={cn(
            // `shadow-overlay` est la seule élévation que Carbon admette,
            // réservée aux éléments flottants.
            "border-subtle bg-layer absolute top-full z-40 mt-px max-w-[calc(100vw-1rem)] border shadow-[var(--shadow-overlay)]",
            align === "end" ? "right-0" : "left-0",
          )}
        >
          {children(close)}
        </div>
      )}
    </div>
  );
}
