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

  // La hauteur suit le contenu. Mesurée après chaque frappe plutôt que
  // calculée depuis le nombre de lignes : les retours à la ligne
  // automatiques ne se comptent pas.
  useEffect(() => {
    const el = zone.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
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
    <div className="border-subtle bg-background flex w-full flex-col border">
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

        {onAnnuler && (
          <button
            type="button"
            onClick={onAnnuler}
            title="Rétablir le texte d’avant la dernière reprise"
            aria-label="Rétablir le texte précédent"
            className="ptn-carte-liste text-secondary hover:bg-layer-hover hover:text-primary inline-flex h-8 w-8 items-center justify-center"
          >
            <Undo size={16} aria-hidden />
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
            className="bg-ai text-on-color text-caption ptn-carte-liste inline-flex items-center gap-2 px-3 py-1.5 font-medium disabled:cursor-not-allowed disabled:opacity-40"
          >
            <AiGenerate size={16} aria-hidden />
            {enCours ? "Rédaction…" : valeur.trim() ? "Reprendre" : "Générer"}
          </button>
          <button
            type="button"
            onClick={() => setMenu((v) => !v)}
            disabled={desactive}
            aria-haspopup="menu"
            aria-expanded={menu}
            aria-label="Autres options d’assistance"
            className="bg-ai text-on-color ptn-carte-liste border-l-on-color/25 inline-flex items-center border-l px-1.5 py-1.5 disabled:cursor-not-allowed disabled:opacity-40"
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
                    Dire précisément ce que vous attendez, et voir tout ce qui a été fait sur
                    ce dossier.
                  </span>
                </span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ---------- Page ----------
          Marges franches, mesure bornée : on écrit dans une page, pas dans
          un champ de formulaire. */}
      <div className="px-6 py-6 sm:px-10 sm:py-8">
        <textarea
          ref={zone}
          value={valeur}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          aria-label={ariaLabel}
          rows={6}
          className="text-body-lg text-primary placeholder:text-placeholder mx-auto block w-full max-w-[72ch] resize-none border-0 bg-transparent leading-relaxed outline-none"
        />
      </div>
    </div>
  );
}
