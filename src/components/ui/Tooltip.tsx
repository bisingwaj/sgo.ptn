"use client";

/**
 * Infobulle.
 *
 * POURQUOI PAS `Tooltip` DE @carbon/react. La règle du projet est d'y recourir
 * pour tout ce qui est interactif ou complexe, et elle ne souffre pas beaucoup
 * d'exceptions. Celle-ci en est une, pour une raison mécanique : le composant
 * Carbon rend sa bulle dans le flux, à côté du déclencheur. Or les deux
 * endroits qui en ont besoin sont justement des conteneurs qui rognent —
 * `.sn { overflow: hidden }`, indispensable pour animer la largeur de la
 * colonne, et `.nav { overflow-y: auto }` pour son défilement. Une bulle rendue
 * à droite d'une icône y serait coupée net au filet. Le portail est la seule
 * sortie ; l'apparence, elle, reste celle de Carbon.
 *
 * ACCESSIBILITÉ — la bulle est décorative (`aria-hidden`). Le nom accessible
 * est déjà porté par `aria-label` sur le déclencheur ; l'exposer une seconde
 * fois ferait annoncer l'intitulé deux fois de suite. Elle apparaît au survol
 * ET au focus clavier, et se referme à Échap — WCAG 2.2 § 1.4.13, « Content on
 * Hover or Focus ».
 *
 * L'attribut `title` natif est à proscrire partout où ce composant est posé :
 * le navigateur afficherait sa propre bulle par-dessus celle-ci.
 */

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/cn";

type Side = "right" | "bottom";
type Align = "start" | "center" | "end";

interface TooltipProps {
  /** Intitulé. Doit reprendre mot pour mot le nom accessible du déclencheur. */
  label: string;
  /**
   * Seconde ligne — la forme développée d'un sigle, une précision de portée.
   * Le produit est saturé d'acronymes (PTBA, PPM, TDR, ANO, PEES, EAS/HS) qui
   * ne disent rien à qui prend ses fonctions.
   */
  hint?: string;
  /** Contenu accessoire aligné à droite de l'intitulé — un compteur, par exemple. */
  trailing?: ReactNode;
  side?: Side;
  /** Neutralise l'infobulle : l'intitulé est déjà lisible à l'écran. */
  disabled?: boolean;
  /** Posé sur l'ancre. Le défaut `block` convient à une entrée de liste. */
  className?: string;
  children: ReactNode;
}

/** Écart entre le déclencheur et la bulle : laisse passer la flèche. */
const GAP = 10;
/**
 * Demi-largeur maximale de la bulle, qui décide du basculement d'alignement :
 * au-delà, la bulle s'aligne sur le bord du déclencheur plutôt que de se
 * centrer dessus et de déborder de la fenêtre.
 */
const HALF = 152;
/**
 * Le survol doit durer. Une bulle qui s'ouvre au passage de la souris est un
 * clignotement de plus dans une interface qui en compte déjà.
 */
const HOVER_DELAY = 350;

interface Placement {
  top: number;
  left: number;
  align: Align;
  /**
   * Côté RETENU, qui n'est pas toujours celui demandé : « à droite » se
   * rabat dessous quand la place manque. La flèche et le décalage se
   * règlent sur lui — les régler sur le côté demandé les mettrait du
   * mauvais côté de la bulle, une fois le rabattement fait.
   */
  cote: Side;
}

export function Tooltip({
  label,
  hint,
  trailing,
  side = "right",
  disabled = false,
  className,
  children,
}: TooltipProps) {
  const anchorRef = useRef<HTMLSpanElement>(null);
  const timer = useRef<number | null>(null);
  const [at, setAt] = useState<Placement | null>(null);

  /**
   * L'alignement horizontal est décidé à partir de la seule position du
   * déclencheur, sans mesurer la bulle : mesurer imposerait un rendu
   * intermédiaire, donc un saut visible. Au-delà d'une demi-largeur du bord,
   * la bulle s'aligne sur ce bord plutôt que de le franchir.
   */
  const place = useCallback(() => {
    const el = anchorRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();

    // « À droite » n'était opposé à AUCUNE limite : posée sur un déclencheur
    // proche du bord — le panneau de l'assistant y est collé — la bulle
    // partait hors de l'écran, visible nulle part. Elle bascule dessous
    // quand la place manque, plutôt que de disparaître.
    if (side === "right" && r.right + GAP + 2 * HALF < window.innerWidth) {
      setAt({ top: r.top + r.height / 2, left: r.right + GAP, align: "center", cote: "right" });
      return;
    }

    const centre = r.left + r.width / 2;
    const align: Align =
      centre > window.innerWidth - HALF ? "end" : centre < HALF ? "start" : "center";
    const left = align === "end" ? r.right : align === "start" ? r.left : centre;
    setAt({ top: r.bottom + GAP, left, align, cote: "bottom" });
  }, [side]);

  const hide = useCallback(() => {
    if (timer.current !== null) {
      window.clearTimeout(timer.current);
      timer.current = null;
    }
    setAt(null);
  }, []);

  const show = useCallback(
    (delay: number) => {
      if (timer.current !== null) window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => {
        timer.current = null;
        place();
      }, delay);
    },
    [place],
  );

  const shown = at !== null && !disabled;

  // Le défilement de la colonne repositionne la bulle au lieu de l'abandonner :
  // la souris n'a pas bougé, aucun `pointerenter` ne serait réémis, et une
  // bulle restée en place montrerait l'intitulé d'une autre icône.
  useEffect(() => {
    if (!shown) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") hide();
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("scroll", place, true);
    window.addEventListener("resize", place);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", place, true);
      window.removeEventListener("resize", place);
    };
  }, [shown, hide, place]);

  // Un déclencheur démonté pendant le délai laisserait le minuteur ouvrir une
  // bulle sur une ancre disparue.
  useEffect(() => () => {
    if (timer.current !== null) window.clearTimeout(timer.current);
  }, []);

  return (
    <>
      <span
        ref={anchorRef}
        className={cn("block", className)}
        onPointerEnter={disabled ? undefined : () => show(HOVER_DELAY)}
        onPointerLeave={hide}
        // Au clavier, pas d'attente : le focus est déjà une intention.
        onFocusCapture={disabled ? undefined : () => show(0)}
        onBlurCapture={hide}
      >
        {children}
      </span>

      {shown &&
        createPortal(
          <div
            aria-hidden
            style={{
              top: at.top,
              left: at.left,
              transform:
                at.cote === "right"
                  ? "translateY(-50%)"
                  : at.align === "center"
                    ? "translateX(-50%)"
                    : at.align === "end"
                      ? "translateX(-100%)"
                      : undefined,
            }}
            className="pointer-events-none fixed z-[var(--ptn-z-tooltip)] max-w-[19rem]"
          >
            <div className="bg-inverse-surface text-inverse relative px-3 py-2 shadow-[var(--shadow-overlay)]">
              {/* Flèche : un carré de 8 px pivoté, sans bordure ni rayon —
                  il se fond dans la bulle dont il partage le fond.
                  Alignée sur le HAUT de la bulle et non sur son milieu quand
                  elle porte deux lignes : c'est l'icône qu'elle doit
                  désigner, pas le centre du texte. */}
              <span
                aria-hidden
                className={cn(
                  "bg-inverse-surface absolute h-2 w-2 rotate-45",
                  at.cote === "right" && "top-1/2 -left-1 -translate-y-1/2",
                  at.cote === "bottom" && "-top-1",
                  at.cote === "bottom" && at.align === "center" && "left-1/2 -translate-x-1/2",
                  at.cote === "bottom" && at.align === "start" && "left-3",
                  at.cote === "bottom" && at.align === "end" && "right-3",
                )}
              />

              <div className="relative flex items-center gap-2">
                {/* 14 px et non les 12 px de Carbon : le public vise 125–150 %
                    de zoom, et une infobulle sert à ceux qui ne reconnaissent
                    pas déjà l'icône. */}
                <span className="text-body leading-tight whitespace-nowrap">{label}</span>
                {trailing !== undefined && trailing !== null && (
                  <span className="shrink-0">{trailing}</span>
                )}
              </div>

              {/* La forme développée passe au second plan par l'opacité, pas
                  par une couleur : il n'existe pas de token de texte
                  secondaire sur fond inversé. */}
              {hint && (
                <p className="text-caption relative mt-1 leading-snug opacity-75">{hint}</p>
              )}
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
