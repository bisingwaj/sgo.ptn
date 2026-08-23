"use client";

/**
 * Surface de rédaction d'une section du TDR.
 *
 * Trois partis pris, chacun contre un défaut constaté à l'écran.
 *
 *  1. LA ZONE SE VOIT. Un cadre discret qui ne se révélait qu'au focus ne
 *     disait pas où l'on écrit. Elle porte maintenant une barre d'outils,
 *     une marge et une mesure de lecture : on reconnaît un traitement de
 *     texte avant d'avoir cliqué.
 *
 *  2. ELLE GRANDIT AVEC LE TEXTE. Faire défiler à l'intérieur d'une boîte
 *     pendant que la page défile elle aussi est le pire des deux mondes.
 *     Le texte reste entièrement visible, comme sur une page.
 *
 *  3. AUCUN OUTIL QUI NE FASSE RIEN. Le document produit ne rend que des
 *     paragraphes — `document-plan.ts` ne connaît ni gras, ni italique, ni
 *     balisage. Des boutons B / I seraient donc des boutons sans effet, et
 *     le corps interdit ce qui suggère une conséquence qu'il n'a pas.
 *     Ce qui reste est réel : les sauts de ligne, eux, sont rendus — sur
 *     les champs qui attendent une entrée par ligne, la puce a un effet.
 */

import { useEffect, useRef, useState } from "react";
import {
  AiGenerate,
  ChevronDown,
  Chat,
  List,
  Undo,
} from "@carbon/icons-react";

interface Props {
  valeur: string;
  onChange: (v: string) => void;
  placeholder?: string;
  ariaLabel: string;
  /** Le champ attend une entrée par ligne : la puce a alors un sens. */
  parLigne?: boolean;
  /** Génération directe, sans passer par le fil. */
  onGenerer: () => void;
  /** Ouvre l'assistant pour guider la demande. */
  onOuvrirAssistant: () => void;
  /** Rend la valeur d'avant la dernière reprise. */
  onAnnuler?: () => void;
  enCours?: boolean;
  desactive?: boolean;
  desactiveRaison?: string;
}

export function EditeurTexte({
  valeur,
  onChange,
  placeholder,
  ariaLabel,
  parLigne,
  onGenerer,
  onOuvrirAssistant,
  onAnnuler,
  enCours,
  desactive,
  desactiveRaison,
}: Props) {
  const zone = useRef<HTMLTextAreaElement>(null);
  const [menu, setMenu] = useState(false);

  /**
   * La hauteur suit le contenu, JUSQU'À UN PLAFOND.
   *
   * Elle le suivait sans limite. Mesuré à l'étape 14, à 150 % de zoom :
   * un texte de douze lignes portait l'éditeur à 1248 px dans une fenêtre
   * de 504, et le contenu de l'étape à 2133 px. Les cases à cocher
   * placées dessous — trois postes au minimum, règle de conformité —
   * se trouvaient à plus de TROIS ÉCRANS du haut, après une longue
   * étendue blanche où rien n'indique qu'il reste quelque chose à faire.
   * On croit la page vide.
   *
   * Le plafond suit la fenêtre plutôt qu'un nombre de pixels : à 125 ou
   * 150 % de zoom, une valeur fixe redeviendrait démesurée. Au-delà, le
   * texte défile DANS le champ — c'est ce que fait n'importe quel
   * éditeur, et cela garde le reste de l'étape à portée.
   *
   * Recalculé au redimensionnement : changer de zoom en cours de
   * rédaction laisserait sinon une hauteur calculée pour l'autre.
   */
  useEffect(() => {
    const el = zone.current;
    if (!el) return;

    const ajuster = () => {
      // Une mesure fiable exige de rendre la hauteur au contenu d'abord :
      // `scrollHeight` d'un champ déjà contraint vaut sa contrainte.
      el.style.height = "auto";
      const plafond = Math.max(220, Math.round(window.innerHeight * 0.55));
      const voulue = el.scrollHeight;
      el.style.height = `${Math.min(voulue, plafond)}px`;
      el.style.overflowY = voulue > plafond ? "auto" : "hidden";
    };

    ajuster();
    window.addEventListener("resize", ajuster);
    return () => window.removeEventListener("resize", ajuster);
  }, [valeur]);

  const mots = valeur.trim() ? valeur.trim().split(/\s+/).length : 0;
  const signes = valeur.length;

  /** Préfixe les lignes sélectionnées, ou la ligne courante. */
  const puces = () => {
    const el = zone.current;
    if (!el) return;
    const debut = valeur.lastIndexOf("\n", Math.max(el.selectionStart - 1, 0)) + 1;
    const finSel = el.selectionEnd;
    const fin = valeur.indexOf("\n", finSel) === -1 ? valeur.length : valeur.indexOf("\n", finSel);
    const bloc = valeur.slice(debut, fin);
    const transforme = bloc
      .split("\n")
      .map((l) => (l.trim().startsWith("—") ? l : l.trim() ? `— ${l}` : l))
      .join("\n");
    onChange(valeur.slice(0, debut) + transforme + valeur.slice(fin));
    el.focus();
  };

  return (
    <div className="border-subtle bg-background focus-within:border-strong flex w-full flex-col border shadow-sm">
      {/* ---------- Barre d'outils ---------- */}
      <div className="border-subtle bg-layer flex flex-wrap items-center gap-1 border-b px-2 py-1.5">
        {parLigne && (
          <button
            type="button"
            onClick={puces}
            title="Mettre en liste — une entrée par ligne"
            aria-label="Mettre en liste"
            className="ptn-carte-liste text-secondary hover:bg-layer-hover hover:text-primary inline-flex h-8 w-8 items-center justify-center"
          >
            <List size={16} aria-hidden />
          </button>
        )}

        <span className="text-caption text-helper mono ml-auto tabular-nums" aria-live="polite">
          {mots} mot{mots > 1 ? "s" : ""} · {signes} signe{signes > 1 ? "s" : ""}
        </span>

        {/* Bouton scindé : le clic direct engendre, la flèche donne la main.
            Deux gestes distincts pour deux intentions distinctes. */}
        <div className="relative ml-2 flex">
          <button
            type="button"
            onClick={onGenerer}
            disabled={enCours || desactive}
            title={desactive ? desactiveRaison : "Rédiger à partir du dossier"}
            className="bg-ai hover:bg-ai-hover text-on-color text-caption ptn-carte-liste inline-flex items-center gap-2 px-3 py-1.5 font-medium disabled:cursor-not-allowed disabled:hover:bg-ai disabled:opacity-40"
          >
            <AiGenerate size={16} aria-hidden />
            {/* « Reprendre » ne disait pas ce qu'il faisait. Sur un champ
                déjà écrit, l'assistant améliore ce qui est là ; sur un champ
                vide, il rédige. Le retour arrière, lui, est au menu. */}
            {enCours ? "Rédaction…" : valeur.trim() ? "Améliorer" : "Générer"}
          </button>
          <button
            type="button"
            onClick={() => setMenu((v) => !v)}
            disabled={desactive}
            aria-haspopup="menu"
            aria-expanded={menu}
            aria-label="Autres options d’assistance"
            className="bg-ai hover:bg-ai-hover text-on-color ptn-carte-liste border-l-on-color/25 inline-flex items-center border-l px-1.5 py-1.5 disabled:cursor-not-allowed disabled:hover:bg-ai disabled:opacity-40"
          >
            <ChevronDown size={16} aria-hidden />
          </button>

          {menu && (
            <div
              role="menu"
              className="border-subtle bg-background ptn-entree-ligne absolute top-full right-0 z-10 mt-1 w-72 border shadow-lg"
            >
              <button
                type="button"
                role="menuitem"
                className="hover:bg-layer flex w-full items-start gap-3 px-4 py-3 text-left"
                onClick={() => {
                  setMenu(false);
                  onOuvrirAssistant();
                }}
              >
                <Chat size={16} className="text-ai mt-0.5 shrink-0" aria-hidden />
                <span>
                  <span className="text-body text-primary block">Guider l’assistant</span>
                  <span className="text-caption text-helper block">
                    Dire précisément ce que vous attendez, et relire tout ce qui a été fait
                    sur ce dossier.
                  </span>
                </span>
              </button>

              {onAnnuler && (
                <button
                  type="button"
                  role="menuitem"
                  className="hover:bg-layer border-subtle flex w-full items-start gap-3 border-t px-4 py-3 text-left"
                  onClick={() => {
                    setMenu(false);
                    onAnnuler();
                  }}
                >
                  <Undo size={16} className="text-secondary mt-0.5 shrink-0" aria-hidden />
                  <span>
                    <span className="text-body text-primary block">Revenir à mon texte</span>
                    <span className="text-caption text-helper block">
                      Rétablit ce qui était écrit avant la dernière génération.
                    </span>
                  </span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ---------- Page ----------
          Marges franches, mesure bornée : on écrit dans une page, pas dans
          un champ de formulaire. */}
      <div className="relative px-6 py-6 sm:px-10 sm:py-8">
        <textarea
          ref={zone}
          value={valeur}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          aria-label={ariaLabel}
          rows={6}
          readOnly={enCours}
          className="ptn-zone-redaction text-body-lg text-primary placeholder:text-placeholder mx-auto block w-full max-w-[72ch] resize-none border-0 bg-transparent leading-relaxed outline-none"
        />

        {/* Le texte s'écrit sous les yeux : le voile qui le masquait n'a
            plus lieu d'être. La saisie reste fermée — taper dans un texte en
            train d'arriver produirait un mélange que personne n'a voulu — et
            un repère dit que ce n'est pas fini. */}
        {enCours && (
          <div
            className="pointer-events-none sticky bottom-4 flex justify-center"
            role="status"
            aria-live="polite"
          >
            <span className="border-ai bg-background text-caption text-ai-text ptn-entree-ligne inline-flex items-center gap-2.5 border px-3 py-2 shadow-sm">
              <span className="ptn-points" aria-hidden>
                <i />
                <i />
                <i />
              </span>
              L’assistant rédige — laissez-le finir
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
