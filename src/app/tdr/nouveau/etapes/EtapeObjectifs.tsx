"use client";

/**
 * Étape — les objectifs SMART.
 *
 * Séparée des livrables, qu'elle partageait. Un objectif dit une intention,
 * un livrable dit une pièce à remettre : ce sont deux questions, et les
 * poser ensemble faisait écrire l'une en pensant à l'autre.
 *
 * Les résultats attendus ont eux aussi leur écran depuis la refonte du
 * cadrage. Ils étaient restés ici, en double — l'auteur les rencontrait
 * deux fois sans savoir laquelle des deux comptait.
 */

import { useEffect, useState } from "react";
import { tdrApi, ApiError } from "@/lib/api";
import type { State } from "../etat";
import { messageDEchec, useAssistant } from "../assistant-contexte";
import { GABARITS_OBJECTIF } from "../referentiel-ecran";
import { ListeEntrees } from "./ListeEntrees";

export function EtapeObjectifs({
  state,
  set,
  persist,
}: {
  state: State;
  set: (s: State) => void;
  /**
   * Enregistre sans attendre le changement d'étape.
   *
   * Même défaut que sur les champs de texte : une liste proposée par
   * l'assistant ne partait au serveur qu'au bouton « Suivant », et le rail
   * des étapes n'enregistre rien. Une écriture de l'agent déclenchait alors
   * une relecture qui rapportait la liste de la BASE — sans les entrées
   * qu'on venait d'obtenir.
   */
  persist?: (s: State, patch: Record<string, unknown>) => Promise<void>;
}) {
  const assistant = useAssistant();
  const [erreur, setErreur] = useState<string | null>(null);

  // L'état de travail est UNIQUE et vit dans le contexte : le bouton d'une
  // étape et le fil ne pouvaient pas se voir, et lançaient deux demandes
  // sur le même dossier sans que rien ne le signale.
  const travail = assistant.travail;
  const nôtre = travail?.origine === "champ" && travail.champ === "objectives";
  const ailleurs = Boolean(travail) && !nôtre;

  /** Un message d'échec qui s'installe cesse d'être lu. Voir `EtapeTexte`. */
  useEffect(() => {
    if (!erreur) return;
    const t = setTimeout(() => setErreur(null), 12_000);
    return () => clearTimeout(t);
  }, [erreur]);

  const proposer = async () => {
    if (!state.tdrId) return;
    const signal = assistant.demarrer({
      origine: "champ",
      champ: "objectives",
      libelleChamp: "Objectifs SMART",
      phase: "envoi",
    });
    if (!signal) return;
    setErreur(null);
    assistant.ouvrirEnLigne("Proposer des objectifs", "objectives");
    try {
      const r = await tdrApi.assistObjectives(state.tdrId);
      // Les propositions s'ajoutent à ce qui est déjà là : l'auteur qui a
      // écrit deux objectifs et en demande d'autres ne veut pas voir les
      // siens disparaître.
      const suivant = {
        ...state,
        objectives: [...state.objectives, ...r.proposal],
        aiAssistedFields: state.aiAssistedFields.includes("objectives")
          ? state.aiAssistedFields
          : [...state.aiAssistedFields, "objectives"],
      };
      set(suivant);
      // Au serveur tout de suite : voir `persist`.
      void persist?.(suivant, {
        objectives: suivant.objectives,
        aiAssisted: suivant.aiAssistedFields,
      })?.catch(() => undefined);
      // La bulle a été ouverte AVANT l'appel : on ne fait que la clore.
      // Elle était créée après coup, si bien que le fil restait immobile
      // pendant toute l'attente puis tout apparaissait d'un bloc — on ne
      // pouvait donc pas savoir où une génération avait échoué.
      assistant.majDerniere((b) => ({
        ...b,
        encours: false,
        texte: r.proposal.map((o, i) => `O${i + 1} · ${o.title} — ${o.criteria}`).join("\n"),
        actes: [
          ...b.actes,
          {
            genre: "ecriture",
            libelle: `${r.proposal.length} objectifs ajoutés à la liste`,
            champ: "objectives",
          },
        ],
      }));
    } catch (e) {
      const brut =
        e instanceof ApiError && e.status === 503
          ? "L’assistance n’est pas configurée sur ce serveur. Les objectifs restent à saisir à la main."
          : e instanceof Error
            ? e.message
            : "La proposition n’a pas abouti.";
      // Le message dit quoi FAIRE. Voir `messageDEchec`.
      const message = messageDEchec(brut);
      setErreur(message);
      assistant.majDerniere((b) => ({
        ...b,
        encours: false,
        actes: [...b.actes, { genre: "refus", libelle: message }],
      }));
    } finally {
      assistant.terminer();
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-[72rem] flex-col gap-6">
      <header className="max-w-[68ch]">
        <h3 className="text-heading-03 text-primary">
          Que ce marché doit-il permettre d’atteindre ?
        </h3>
        <p className="text-body-lg text-secondary mt-3">
          Un objectif énonce une intention, assortie du critère qui permettra d’en constater
          l’atteinte. Ce qui sera livré vient ensuite, à l’étape suivante.
        </p>
      </header>

      <ul className="border-accent bg-accent-surface flex flex-wrap items-center gap-x-3 gap-y-1.5 border-l-2 px-4 py-2.5">
        {[
          "Spécifique · Mesurable · Atteignable · Réaliste · Temporel",
          "Un verbe d’action à l’infinitif",
          "Un critère chiffré, avec son horizon",
        ].map((r, i) => (
          <li key={r} className="text-caption text-secondary flex items-center gap-3">
            {i > 0 && <span aria-hidden className="bg-border-subtle inline-block h-3 w-px" />}
            {r}
          </li>
        ))}
      </ul>

      <ListeEntrees
        titre="Objectifs SMART"
        prefixe="O"
        items={state.objectives}
        vide={{ title: "", criteria: "" }}
        onChange={(v) => set({ ...state, objectives: v })}
        ajouterLabel="Ajouter un objectif"
        videTexte="Aucun objectif pour l’instant. Ajoutez-en un, ou demandez une proposition à l’assistant."
        labelGenerer="Proposer des objectifs"
        gabarits={GABARITS_OBJECTIF}
        enCours={nôtre}
        occupeAilleurs={ailleurs}
        onArreter={assistant.interrompre}
        erreur={erreur}
        desactive={!state.tdrId}
        desactiveRaison="Disponible une fois le brouillon ouvert."
        onGenerer={() => void proposer()}
        onOuvrirAssistant={() => {
          assistant.setChampCourant("Objectifs SMART");
          assistant.ouvrir();
        }}
        champs={[
          {
            cle: "title",
            libelle: "Énoncé de l’objectif",
            placeholder: "Doter [l’institution] de [capacité]",
            long: true,
            requis: true,
          },
          {
            cle: "criteria",
            libelle: "Constaté par",
            placeholder: "[Grandeur mesurée] atteinte à [horizon]",
            long: true,
          },
        ]}
      />

    </div>
  );
}
