"use client";

/**
 * Le bouton d'assistance d'une étape — engendrer, guider, arrêter.
 *
 * Il existait en deux exemplaires, recopiés entre l'éditeur de texte et la
 * liste d'entrées : même bouton scindé, même menu, mêmes classes. Les deux
 * copies avaient déjà divergé, et aucune ne se fermait au clic à côté.
 *
 * Trois règles le gouvernent, et elles viennent toutes du même constat —
 * l'assistant est UN, ses surfaces sont deux :
 *
 *  1. IL SE DÉSACTIVE QUAND L'ASSISTANT TRAVAILLE, où que la demande ait
 *     été lancée. Le fil pouvait écrire dans un champ pendant qu'on
 *     cliquait ici pour le même champ.
 *  2. IL S'ARRÊTE. Une génération engagée se subissait jusqu'au bout.
 *  3. L'ERREUR SE LIT À CÔTÉ DE LUI. Un échec annoncé à l'autre bout de
 *     l'écran laisse l'auteur sans le geste qui le lève.
 */

import { useEffect, useRef } from "react";
import { AiGenerate, Chat, ChevronDown, Undo } from "@carbon/icons-react";

export interface OptionMenu {
  cle: string;
  libelle: string;
  aide: string;
  icone: React.ReactNode;
  action: () => void;
}

export function BoutonAssistance({
  libelle,
  libelleEnCours,
  onGenerer,
  options,
  menuOuvert,
  setMenuOuvert,
  enCours,
  bloque,
  bloqueRaison,
}: {
  libelle: string;
  /**
   * Ce que le bouton dit pendant qu'il travaille — la PHASE, en un mot.
   *
   * Court à dessein. L'état complet est porté par le repère flottant, qui
   * reste visible quand la barre d'outils a défilé hors du cadre ; le
   * répéter ici mettait la même phrase deux fois à l'écran, à quatre cents
   * pixels d'écart.
   */
  libelleEnCours?: string;
  onGenerer: () => void;
  options: OptionMenu[];
  menuOuvert: boolean;
  setMenuOuvert: (v: boolean) => void;
  /** Cette étape-ci engendre. */
  enCours?: boolean;
  /** Quelque chose interdit de lancer — y compris un travail ailleurs. */
  bloque?: boolean;
  bloqueRaison?: string;
}) {
  const enveloppe = useRef<HTMLDivElement>(null);

  /**
   * Le menu se ferme au clic à côté, et à la touche d'échappement.
   *
   * Il ne se fermait ni l'un ni l'autre : ouvert, il fallait rouvrir la
   * flèche pour s'en défaire, et il restait posé sur le texte pendant ce
   * temps. C'est le comportement attendu de tout menu, et son absence se
   * remarque immédiatement.
   *
   * `pointerdown` et non `click` : un menu qui se ferme au relâchement
   * laisse passer le clic sur ce qui est dessous.
   */
  useEffect(() => {
    if (!menuOuvert) return;

    const dehors = (e: PointerEvent) => {
      if (!enveloppe.current?.contains(e.target as Node)) setMenuOuvert(false);
    };
    const echap = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOuvert(false);
    };

    document.addEventListener("pointerdown", dehors);
    document.addEventListener("keydown", echap);
    return () => {
      document.removeEventListener("pointerdown", dehors);
      document.removeEventListener("keydown", echap);
    };
  }, [menuOuvert, setMenuOuvert]);

  // NOTE — ce bouton ne porte PAS l'arrêt.
  //
  // L'assistant s'arrête depuis deux endroits, et deux suffisent : le
  // repère flottant posé sur le texte, qui reste visible quand la barre
  // d'outils a défilé hors du cadre, et le composeur du fil, dont le bouton
  // d'envoi devient l'arrêt. Un troisième ici mettait le même geste trois
  // fois à l'écran, dont deux à quatre cents pixels l'un de l'autre.

  return (
    <div ref={enveloppe} className="relative ml-2 flex">
      <button
        type="button"
        onClick={onGenerer}
        disabled={enCours || bloque}
        title={bloque ? bloqueRaison : "Rédiger à partir du dossier"}
        className="bg-ai hover:bg-ai-hover text-on-color text-caption ptn-carte-liste inline-flex items-center gap-2 px-3 py-1.5 font-medium transition-colors disabled:cursor-not-allowed disabled:hover:bg-ai disabled:opacity-40"
      >
        <AiGenerate size={16} aria-hidden />
        {enCours ? (libelleEnCours ?? "Rédaction…") : libelle}
      </button>
      <button
        type="button"
        onClick={() => setMenuOuvert(!menuOuvert)}
        disabled={bloque}
        aria-haspopup="menu"
        aria-expanded={menuOuvert}
        aria-label="Autres options d’assistance"
        className="bg-ai hover:bg-ai-hover text-on-color ptn-carte-liste border-l-on-color/25 inline-flex items-center border-l px-1.5 py-1.5 transition-colors disabled:cursor-not-allowed disabled:hover:bg-ai disabled:opacity-40"
      >
        <ChevronDown size={16} aria-hidden />
      </button>

      {menuOuvert && (
        <div
          role="menu"
          className="border-subtle bg-background ptn-entree-ligne absolute top-full right-0 z-10 mt-1 w-72 border shadow-lg"
        >
          {options.map((o, i) => (
            <button
              key={o.cle}
              type="button"
              role="menuitem"
              className={`hover:bg-layer flex w-full items-start gap-3 px-4 py-3 text-left ${
                i > 0 ? "border-subtle border-t" : ""
              }`}
              onClick={() => {
                setMenuOuvert(false);
                o.action();
              }}
            >
              <span className="mt-0.5 shrink-0">{o.icone}</span>
              <span>
                <span className="text-body text-primary block">{o.libelle}</span>
                <span className="text-caption text-helper block">{o.aide}</span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** Les deux entrées communes aux étapes : guider, et revenir en arrière. */
export function optionsCommunes({
  onOuvrirAssistant,
  onAnnuler,
}: {
  onOuvrirAssistant: () => void;
  onAnnuler?: () => void;
}): OptionMenu[] {
  const opts: OptionMenu[] = [
    {
      cle: "guider",
      libelle: "Guider l’assistant",
      aide: "Dire précisément ce que vous attendez, et relire tout ce qui a été fait sur ce dossier.",
      icone: <Chat size={16} className="text-ai" aria-hidden />,
      action: onOuvrirAssistant,
    },
  ];
  if (onAnnuler) {
    opts.push({
      cle: "annuler",
      libelle: "Revenir à mon texte",
      aide: "Rétablit ce qui était écrit avant la dernière génération.",
      icone: <Undo size={16} className="text-secondary" aria-hidden />,
      action: onAnnuler,
    });
  }
  return opts;
}
