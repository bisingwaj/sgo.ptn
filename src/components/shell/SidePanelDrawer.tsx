"use client";

/**
 * Panneau contextuel, en tiroir.
 *
 * ---------------------------------------------------------------------------
 * POURQUOI UN TIROIR
 *
 * Le panneau occupait 320 px en permanence, sur tous les écrans qui en
 * déclaraient un. Il n'était ni refermable ni consulté en continu : autant de
 * largeur retirée aux tableaux, qui sont le vrai contenu de ces écrans. Il est
 * désormais masqué par défaut et s'ouvre à la demande depuis le bandeau.
 *
 * PIÉGEAGE DU FOCUS
 *
 * Il est implémenté ici, pour de bon. L'ancien `ui/Drawer.tsx` annonçait
 * `role="dialog"` et `aria-modal="true"` sans jamais retenir le focus : au
 * clavier, la tabulation sortait du tiroir et parcourait la page située
 * derrière, que le lecteur d'écran annonçait comme si elle était accessible.
 * Un dialogue modal qui ne retient pas le focus n'est pas un dialogue, c'est
 * une div qui prétend l'être.
 * ---------------------------------------------------------------------------
 */

import { useEffect, useRef, type ReactNode } from "react";
import { Close } from "@carbon/icons-react";
import { cn } from "@/lib/cn";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

interface SidePanelDrawerProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}

export function SidePanelDrawer({
  open,
  onClose,
  title = "Panneau contextuel",
  children,
}: SidePanelDrawerProps) {
  const panelRef = useRef<HTMLElement>(null);
  const restoreRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;

    // Mémorise l'élément à qui rendre le focus à la fermeture.
    restoreRef.current = document.activeElement as HTMLElement | null;

    const panel = panelRef.current;
    panel?.querySelector<HTMLElement>(FOCUSABLE)?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
        return;
      }
      if (event.key !== "Tab" || !panel) return;

      const items = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) => el.offsetParent !== null,
      );
      if (items.length === 0) return;

      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;

      // Boucle explicite aux deux extrémités : c'est ce qui retient le focus.
      if (event.shiftKey && (active === first || !panel.contains(active))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      restoreRef.current?.focus();
    };
  }, [open, onClose]);

  return (
    <>
      {/* Voile : ferme au clic et signale que l'arrière-plan est en retrait.
          Masqué aux lecteurs d'écran, l'Échap et le bouton suffisent. */}
      <div
        aria-hidden
        onClick={onClose}
        className={cn(
          "fixed inset-0 z-40 bg-black/40 transition-opacity duration-[var(--ptn-motion-moderate-01)]",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      />

      <aside
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        // `inert` retire de l'ordre de tabulation ce qui est hors écran :
        // sans lui, le tiroir fermé reste atteignable au clavier. React 19
        // le gère comme un vrai booléen — une chaîne vide y serait comprise
        // comme « false ».
        inert={!open}
        className={cn(
          "border-subtle bg-layer fixed top-0 right-0 z-50 flex h-full w-[22rem] max-w-[calc(100vw-2rem)] flex-col border-l",
          "transition-transform duration-[var(--ptn-motion-moderate-02)] ease-[var(--ease-productive)]",
          "motion-reduce:transition-none",
          open ? "translate-x-0" : "translate-x-full",
        )}
      >
        <header className="border-subtle flex shrink-0 items-center justify-between border-b px-4 py-3">
          <h2 className="text-heading-01 text-primary">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer le panneau"
            className="text-secondary hover:bg-layer-hover hover:text-primary focus-visible:outline-accent flex h-8 w-8 items-center justify-center focus-visible:outline-2"
          >
            <Close size={20} aria-hidden />
          </button>
        </header>

        <div className="scroll-region flex-1">{children}</div>
      </aside>
    </>
  );
}
