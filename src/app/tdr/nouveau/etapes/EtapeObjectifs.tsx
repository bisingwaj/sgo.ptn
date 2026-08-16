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

import { useState } from "react";
import { WarningAltFilled } from "@carbon/icons-react";
import { tdrApi, ApiError } from "@/lib/api";
import type { State } from "../etat";
import { useAssistant } from "../assistant-contexte";
import { ListeEntrees } from "./ListeEntrees";

export function EtapeObjectifs({
  state,
  set,
}: {
  state: State;
  set: (s: State) => void;
}) {
  const assistant = useAssistant();
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  const proposer = async () => {
    if (!state.tdrId) return;
    setEnCours(true);
    setErreur(null);
    try {
      const r = await tdrApi.assistObjectives(state.tdrId);
      // Les propositions s'ajoutent à ce qui est déjà là : l'auteur qui a
      // écrit deux objectifs et en demande d'autres ne veut pas voir les
      // siens disparaître.
      set({
        ...state,
        objectives: [...state.objectives, ...r.proposal],
        aiAssistedFields: state.aiAssistedFields.includes("objectives")
          ? state.aiAssistedFields
          : [...state.aiAssistedFields, "objectives"],
      });
      assistant.consignerEnLigne(
        "Proposer des objectifs SMART",
        r.proposal.map((o, i) => `O${i + 1} · ${o.title} — ${o.criteria}`).join("\n"),
        "objectives",
      );
    } catch (e) {
      setErreur(
        e instanceof ApiError && e.status === 503
          ? "L’assistance n’est pas configurée sur ce serveur. Les objectifs restent à saisir à la main."
          : e instanceof Error
            ? e.message
            : "La proposition n’a pas abouti.",
      );
    } finally {
      setEnCours(false);
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
        enCours={enCours}
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

      {erreur && (
        <p className="text-caption text-danger-text flex items-start gap-2">
          <WarningAltFilled size={16} className="mt-0.5 shrink-0" aria-hidden />
          {erreur}
        </p>
      )}
    </div>
  );
}
