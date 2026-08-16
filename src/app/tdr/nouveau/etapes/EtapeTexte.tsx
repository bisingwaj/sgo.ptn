"use client";

/**
 * Écran d'une section rédigée du dossier.
 *
 * Une seule colonne. L'écran en comptait quatre — rail des étapes, texte,
 * panneau d'assistance, panneau conversationnel — et l'œil ne savait plus
 * où se poser. Ce qu'il faut avoir lu AVANT d'écrire se lit maintenant
 * au-dessus de la zone de saisie, dans l'ordre où l'on en a besoin :
 * la question, ce qu'on attend, puis la page blanche.
 *
 * L'assistance n'a plus de panneau propre. Elle est dans la barre d'outils
 * de l'éditeur, là où l'on écrit — et ouvre le fil quand il faut la guider.
 */

import { useState } from "react";
import type { ReactNode } from "react";
import { WarningAltFilled } from "@carbon/icons-react";
import { redigerChamp } from "@/lib/agent-stream";
import type { State } from "../etat";
import { useAssistant } from "../assistant-contexte";
import { EditeurTexte } from "./EditeurTexte";

export interface ChampTexte {
  cle: keyof State & string;
  question: string;
  aide: ReactNode;
  annonceIa: string;
  placeholder?: string;
  lignes?: number;
  reperes?: string[];
  /** Le champ attend une entrée par ligne. */
  parLigne?: boolean;
}

export function EtapeTexte({
  champ,
  state,
  set,
  gabarit,
  complement,
}: {
  champ: ChampTexte;
  state: State;
  set: (s: State) => void;
  /**
   * Gabarit du référentiel, propre au type de marché. Ce n'est PAS de
   * l'assistance : une substitution de marqueurs, sans modèle.
   */
  gabarit?: string;
  /**
   * Ce que la section demande EN PLUS de sa rédaction — l'expertise a des
   * profils à désigner, qui se cochent et ne se rédigent pas.
   *
   * Rendu sous l'éditeur, jamais au-dessus : un bloc interactif placé avant
   * la surface d'écriture repousse la page blanche hors du premier écran,
   * et c'est elle qu'on vient chercher.
   */
  complement?: ReactNode;
}) {
  const assistant = useAssistant();
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  // Valeur d'avant la dernière reprise. Un état, non une ref : le bouton
  // « rétablir » doit apparaître au moment même où la reprise a lieu.
  const [avant, setAvant] = useState<string | null>(null);

  const valeur = String(state[champ.cle] ?? "");

  const ecrire = (texte: string, parAssistant: boolean) =>
    set({
      ...state,
      [champ.cle]: texte,
      aiAssistedFields:
        parAssistant && !state.aiAssistedFields.includes(champ.cle)
          ? [...state.aiAssistedFields, champ.cle]
          : state.aiAssistedFields,
    });

  /**
   * Génération directe. La proposition remplace le texte — et l'ancienne
   * valeur reste sous la main : sans retour possible, un clic malheureux
   * efface un paragraphe qu'on a mis vingt minutes à écrire.
   */
  const generer = async () => {
    if (!state.tdrId || enCours) return;
    setEnCours(true);
    setErreur(null);
    setAvant(valeur);

    // Le texte s'écrit dans le champ à mesure qu'il arrive. Il n'est pas
    // révélé après coup : chaque fragment vient du serveur, et l'auteur voit
    // réellement où en est la rédaction.
    let accumule = "";
    let echec: string | null = null;

    try {
      for await (const ev of redigerChamp(state.tdrId, champ.cle)) {
        if (ev.type === "texte") {
          accumule += ev.delta;
          ecrire(accumule, true);
        } else if (ev.type === "erreur") {
          echec = ev.message;
          break;
        }
      }
    } catch (e) {
      echec = e instanceof Error ? e.message : "La proposition n’a pas abouti.";
    } finally {
      setEnCours(false);
    }

    if (echec) {
      // Le champ retrouve son état d'avant : une rédaction interrompue ne
      // doit pas laisser un demi-paragraphe à la place du texte de l'auteur.
      ecrire(valeur, false);
      setAvant(null);
      setErreur(echec);
      return;
    }

    // Consigné au fil, panneau ouvert ou non : c'est ce qui fait de
    // l'assistant une mémoire du dossier et non deux outils séparés.
    assistant.consignerEnLigne(
      valeur.trim() ? `Améliorer « ${champ.question} »` : `Rédiger « ${champ.question} »`,
      accumule,
      champ.cle,
    );
  };

  return (
    <div className="mx-auto flex w-full max-w-[60rem] flex-col gap-6">
      <header className="max-w-[68ch]">
        <h3 className="text-heading-03 text-primary">{champ.question}</h3>
        <p className="text-body-lg text-secondary mt-3">{champ.aide}</p>
      </header>

      {/* Ce qu'on attend, juste avant d'écrire. C'était en colonne de
          droite, donc lu après coup — ou pas lu du tout. */}
      {champ.reperes && champ.reperes.length > 0 && (
        // Un filet coloré et des séparateurs : sans eux, ces repères se
        // lisaient comme du texte d'ambiance qu'on saute.
        <ul className="border-accent bg-accent-surface flex flex-wrap items-center gap-x-3 gap-y-1.5 border-l-2 px-4 py-2.5">
          {champ.reperes.map((r, i) => (
            <li key={r} className="text-caption text-secondary flex items-center gap-3">
              {i > 0 && (
                <span aria-hidden className="bg-border-subtle inline-block h-3 w-px" />
              )}
              {r}
            </li>
          ))}
        </ul>
      )}

      {gabarit && !valeur.trim() && (
        <div className="border-subtle bg-layer flex flex-wrap items-center gap-3 border p-3">
          <span className="text-caption text-secondary flex-1">
            Une trame existe pour ce type de marché, au référentiel. Aucun modèle
            n’intervient : c’est un point de départ à reprendre.
          </span>
          <button
            type="button"
            className="ptn-carte-liste border-strong text-caption text-primary hover:bg-layer-hover border px-3 py-1.5"
            onClick={() => ecrire(gabarit, false)}
          >
            Partir du gabarit
          </button>
        </div>
      )}

      <EditeurTexte
        valeur={valeur}
        onChange={(t) => ecrire(t, false)}
        placeholder={champ.placeholder}
        ariaLabel={champ.question}
        parLigne={champ.parLigne}
        enCours={enCours}
        desactive={!state.tdrId}
        desactiveRaison="Disponible une fois le brouillon ouvert, à l’étape Identification."
        onGenerer={() => void generer()}
        onOuvrirAssistant={() => {
          assistant.setChampCourant(champ.question);
          assistant.ouvrir();
        }}
        onAnnuler={
          avant !== null
            ? () => {
                const v = avant;
                setAvant(null);
                // La marque de contribution reste : l'assistant a bien écrit
                // ici, et un relecteur doit continuer de le savoir.
                ecrire(v, false);
              }
            : undefined
        }
      />

      {erreur && (
        <p className="text-caption text-danger-text flex items-start gap-2">
          <WarningAltFilled size={16} className="mt-0.5 shrink-0" aria-hidden />
          {erreur}
        </p>
      )}

      {complement}
    </div>
  );
}
