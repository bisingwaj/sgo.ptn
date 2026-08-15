"use client";

/**
 * Écran d'un champ de texte du dossier.
 *
 * Un champ, une question, une assistance. Les six sections rédigées du TDR
 * partagent cette forme : les tenir ici plutôt que d'écrire six écrans
 * jumeaux évite qu'une amélioration n'en touche qu'un seul.
 *
 * La question est posée en toutes lettres. « Contexte » ne dit pas quoi
 * écrire ; « Qu'est-ce qui motive ce marché, et pourquoi maintenant ? » si.
 */

import type { ReactNode } from "react";
import { Textarea } from "@/components/wizard/WizardFields";
import type { State } from "../etat";
import { AssistanceChamp } from "./AssistanceChamp";

export interface ChampTexte {
  /** Clé au registre du serveur et propriété de l'état. */
  cle: keyof State & string;
  /** La question posée, à la première personne du lecteur. */
  question: string;
  /** Ce qu'on attend, et surtout ce qu'il ne faut pas mettre là. */
  aide: ReactNode;
  /** Ce que l'assistant fera, dit avant le clic. */
  annonceIa: string;
  placeholder?: string;
  lignes?: number;
  /** Repères de rédaction, en marge. */
  reperes?: string[];
}

export function EtapeTexte({
  champ,
  state,
  set,
  gabarit,
}: {
  champ: ChampTexte;
  state: State;
  set: (s: State) => void;
  /**
   * Gabarit du référentiel, propre au type de marché.
   *
   * Ce n'est PAS de l'assistance : c'est une substitution de marqueurs,
   * sans modèle. Une version antérieure l'affichait sous un badge « IA »,
   * ce qui laissait croire à une intelligence qui n'existait pas. Il garde
   * ici sa place, et son nom.
   */
  gabarit?: string;
}) {
  const valeur = String(state[champ.cle] ?? "");
  const mots = valeur.trim() ? valeur.trim().split(/\s+/).length : 0;
  const dejaAssiste = state.aiAssistedFields.includes(champ.cle);

  const ecrire = (texte: string, parAssistant: boolean) =>
    set({
      ...state,
      [champ.cle]: texte,
      // Marque persistante : l'auteur peut réécrire par-dessus, la
      // contribution a bien eu lieu et le document produit la rend.
      aiAssistedFields:
        parAssistant && !dejaAssiste
          ? [...state.aiAssistedFields, champ.cle]
          : state.aiAssistedFields,
    });

  return (
    <div className="mx-auto flex w-full max-w-[68rem] flex-col gap-6">
      <div className="max-w-[68ch]">
        <h3 className="text-heading-03 text-primary">{champ.question}</h3>
        <p className="text-body text-secondary mt-2">{champ.aide}</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
        <div className="flex min-w-0 flex-col gap-2">
          <Textarea
            rows={champ.lignes ?? 12}
            value={valeur}
            placeholder={champ.placeholder}
            aria-label={champ.question}
            onChange={(e) => ecrire(e.target.value, false)}
          />
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <span className="text-caption text-helper mono tabular-nums">
              {mots} mot{mots > 1 ? "s" : ""}
            </span>
            {dejaAssiste && (
              <span className="text-caption text-ai-text">
                L’assistant a contribué à ce champ.
              </span>
            )}
          </div>
        </div>

        <aside className="flex flex-col gap-4">
          {gabarit && !valeur.trim() && (
            <section className="border-subtle bg-layer border">
              <h4 className="border-subtle text-caption text-secondary border-b px-4 py-2.5 font-semibold tracking-wider uppercase">
                Gabarit du référentiel
              </h4>
              <div className="flex flex-col gap-3 p-4">
                <p className="text-caption text-secondary">
                  Trame prévue pour ce type de marché, avec l’activité du plan substituée.
                  Aucun modèle n’intervient — c’est un point de départ à reprendre.
                </p>
                <p className="text-caption text-helper border-subtle max-h-32 overflow-y-auto border-l-2 pl-3 whitespace-pre-wrap">
                  {gabarit}
                </p>
                <div>
                  <button
                    type="button"
                    className="ptn-carte-liste border-strong text-caption text-primary hover:bg-layer-hover border px-3 py-2"
                    onClick={() => ecrire(gabarit, false)}
                  >
                    Partir de ce gabarit
                  </button>
                </div>
              </div>
            </section>
          )}

          <AssistanceChamp
            tdrId={state.tdrId}
            champ={champ.cle}
            annonce={champ.annonceIa}
            valeur={valeur}
            onReprendre={(t) => ecrire(t, true)}
            dejaAssiste={dejaAssiste}
          />

          {champ.reperes && champ.reperes.length > 0 && (
            <section className="border-subtle border">
              <h4 className="border-subtle text-caption text-secondary border-b px-4 py-2.5 font-semibold tracking-wider uppercase">
                Ce qu’on attend ici
              </h4>
              <ul className="flex flex-col gap-2 p-4">
                {champ.reperes.map((r) => (
                  <li key={r} className="text-caption text-secondary flex gap-2">
                    <span aria-hidden className="text-helper">
                      —
                    </span>
                    {r}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}
