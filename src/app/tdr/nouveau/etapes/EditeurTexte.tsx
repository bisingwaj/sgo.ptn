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
import { List, StopFilled, WarningAltFilled } from "@carbon/icons-react";
import { BoutonAssistance, optionsCommunes } from "./BoutonAssistance";

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
  /**
   * Échec de la dernière génération.
   *
   * Rendu DANS la barre d'outils, à gauche du bouton qui l'a produit —
   * et non sous le champ, où il tombait à des centaines de pixels du
   * geste à refaire, après un texte parfois long. Un message d'erreur se
   * lit là où se trouve l'action qui le lève.
   */
  erreur?: string | null;
  /** Rend la valeur d'avant la dernière reprise. */
  onAnnuler?: () => void;
  enCours?: boolean;
  /**
   * Interrompt la génération.
   *
   * Une génération engagée se subissait jusqu'au bout : vingt secondes
   * pendant lesquelles la saisie est fermée, sans autre issue que
   * d'attendre. Un travail qu'on ne peut pas arrêter n'est pas un outil,
   * c'est une contrainte.
   */
  onArreter?: () => void;
  /**
   * Ce que l'assistant est en train de faire, en clair.
   *
   * « L'assistant rédige » était dit d'emblée et restait figé, y compris
   * pendant les sept secondes — mesurées — où le modèle réfléchit sans
   * écrire un mot. Un repère qui ne bouge pas ne prouve rien.
   */
  etat?: string;
  desactive?: boolean;
  desactiveRaison?: string;
  /**
   * L'assistant travaille AILLEURS — sur un autre champ, ou depuis le fil.
   *
   * Le bouton se désactive alors, et le dit. Sans cela, deux demandes
   * partaient de front vers le même dossier.
   */
  occupeAilleurs?: boolean;
}

export function EditeurTexte({
  valeur,
  onChange,
  placeholder,
  ariaLabel,
  parLigne,
  onGenerer,
  onOuvrirAssistant,
  erreur,
  onAnnuler,
  enCours,
  onArreter,
  etat,
  desactive,
  desactiveRaison,
  occupeAilleurs,
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

  /** La phase, en un mot, pour le bouton. Le détail va au repère flottant. */
  const etatCourt = !enCours
    ? undefined
    : etat?.startsWith("L’assistant réfléchit")
      ? "Réflexion…"
      : etat?.startsWith("Lecture") || etat?.startsWith("Dossier lu")
        ? "Lecture…"
        : "Rédaction…";

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
    <div
      className={`bg-background flex w-full flex-col border shadow-sm transition-colors ${
        // Le cadre dit qui écrit. Pendant une génération, la surface porte
        // le liseré de l'IA : c'est le signe le plus large et le plus
        // périphérique qu'on puisse donner, et il se voit sans être lu.
        enCours ? "border-ai" : "border-subtle focus-within:border-strong"
      }`}
    >
      {/* ---------- Barre d'outils ---------- */}
      <div className="border-subtle bg-layer flex flex-wrap items-center gap-1 border-b px-2 py-1.5">
        {parLigne && (
          <button
            type="button"
            onClick={puces}
            disabled={enCours}
            title="Mettre en liste — une entrée par ligne"
            aria-label="Mettre en liste"
            className="ptn-carte-liste text-secondary hover:bg-layer-hover hover:text-primary inline-flex h-8 w-8 items-center justify-center disabled:opacity-40"
          >
            <List size={16} aria-hidden />
          </button>
        )}

        {erreur ? (
          /* L'échec se lit COLLÉ au bouton qui le lève, et il demande un
             geste plutôt que de constater une panne. Le compteur cède la
             place : de deux informations au même endroit, c'est celle qui
             appelle une décision qui passe. */
          <span
            role="alert"
            className="text-caption text-danger-text ml-auto inline-flex items-center gap-1.5 pl-2"
          >
            <WarningAltFilled size={14} className="shrink-0" aria-hidden />
            {erreur}
          </span>
        ) : enCours ? (
          /* Rien ici pendant la génération. Compter les mots d'un texte qui
             s'écrit n'apprend rien, et l'état complet est sur le repère
             flottant — le redire ici l'affichait deux fois à l'écran. */
          <span className="ml-auto" />
        ) : (
          /* Les signes ont été retirés : personne ne rédige un TDR à la
             frappe près, et deux nombres côte à côte se lisent moins vite
             qu'un seul. Le mot est l'unité dont parle l'auteur. */
          <span className="text-caption text-helper mono ml-auto tabular-nums" aria-live="polite">
            {mots} mot{mots > 1 ? "s" : ""}
          </span>
        )}

        <BoutonAssistance
          libelle={valeur.trim() ? "Améliorer" : "Générer"}
          onGenerer={onGenerer}
          enCours={enCours}
          libelleEnCours={
            etatCourt ?? "Rédaction…"
          }
          bloque={desactive || occupeAilleurs}
          bloqueRaison={
            occupeAilleurs
              ? "L’assistant travaille déjà sur ce dossier. Attendez qu’il ait fini, ou arrêtez-le."
              : desactiveRaison
          }
          menuOuvert={menu}
          setMenuOuvert={setMenu}
          options={optionsCommunes({ onOuvrirAssistant, onAnnuler })}
        />
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
            className="sticky bottom-4 flex justify-center"
            role="status"
            aria-live="polite"
          >
            {/* Assez grand pour se voir. En `text-caption` sur un liseré
                fin, le repère passait inaperçu au milieu d'un texte qui
                défile — or c'est le seul signe que la saisie est fermée à
                dessein et non bloquée.

                Il porte maintenant DEUX choses qu'il n'avait pas : ce que
                l'assistant fait à cet instant, et de quoi l'arrêter. Sans
                le second, une génération engagée se subissait. */}
            <span className="border-ai bg-ai-surface text-body-compact text-ai-text ptn-entree-ligne inline-flex items-center gap-3 border-2 py-2 pr-2 pl-5 font-medium shadow-md">
              <span className="ptn-points" aria-hidden>
                <i />
                <i />
                <i />
              </span>
              {etat ?? "L’assistant rédige — veuillez patienter"}
              {onArreter && (
                <button
                  type="button"
                  onClick={onArreter}
                  title="Arrêter la génération"
                  className="bg-ai hover:bg-ai-hover text-on-color ptn-carte-liste ml-1 inline-flex items-center gap-1.5 px-3 py-1.5 text-inherit transition-colors"
                >
                  <StopFilled size={14} aria-hidden />
                  Arrêter
                </button>
              )}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
