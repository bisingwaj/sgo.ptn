"use client";

/**
 * Étape — les livrables attendus.
 *
 * Détachée des objectifs. Un livrable est une pièce qu'on reçoit et qu'on
 * réceptionne ; un objectif est une intention. Les tenir sur un même écran
 * faisait écrire l'un en pensant à l'autre.
 *
 * Les deux modalités de fin — forme de remise et rythme de reporting —
 * valent pour tout le marché, non livrable par livrable. Elles restent donc
 * ici, sous la liste, et non dans chaque entrée.
 */

import { useEffect, useState } from "react";
import { Select } from "@/components/wizard/WizardFields";
import { tdrApi, ApiError } from "@/lib/api";
import type { State } from "../etat";
import { messageDEchec, useAssistant } from "../assistant-contexte";
import { DELIVERABLE_FORMATS, GABARITS_LIVRABLE, REPORTING_RHYTHMS } from "../referentiel-ecran";
import { ListeEntrees } from "./ListeEntrees";

export function EtapeLivrables({
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
  const nôtre = travail?.origine === "champ" && travail.champ === "deliverables";
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
      champ: "deliverables",
      libelleChamp: "Livrables",
      phase: "envoi",
    });
    if (!signal) return;
    setErreur(null);
    assistant.ouvrirEnLigne("Proposer des livrables", "deliverables");
    try {
      const r = await tdrApi.assistDeliverables(state.tdrId);
      if (r.proposal.length === 0) {
        // Le service a répondu sans rien proposer. Le dire plutôt que de
        // laisser croire à une panne — le plus souvent, les objectifs
        // manquent, et un livrable qui ne sert aucun objectif ne se commande
        // pas.
        const rien =
          "L’assistant n’a rien proposé. Les livrables découlent des objectifs : vérifiez que l’étape précédente en porte au moins un.";
        setErreur(rien);
        assistant.majDerniere((b) => ({
          ...b,
          encours: false,
          actes: [...b.actes, { genre: "refus", libelle: rien }],
        }));
        return;
      }
      const suivant = {
        ...state,
        deliverables: [...state.deliverables, ...r.proposal],
        aiAssistedFields: state.aiAssistedFields.includes("deliverables")
          ? state.aiAssistedFields
          : [...state.aiAssistedFields, "deliverables"],
      };
      set(suivant);
      // Au serveur tout de suite : voir `persist`.
      void persist?.(suivant, {
        deliverables: suivant.deliverables,
        aiAssisted: suivant.aiAssistedFields,
      })?.catch(() => undefined);
      // La bulle a été ouverte AVANT l'appel : on ne fait que la clore.
      // Elle était créée après coup, si bien que le fil restait immobile
      // pendant toute l'attente puis tout apparaissait d'un bloc — on ne
      // pouvait donc pas savoir où une génération avait échoué.
      assistant.majDerniere((b) => ({
        ...b,
        encours: false,
        texte: r.proposal
          .map((d, i) => `L${i + 1} · ${d.title}${d.deadline ? ` — ${d.deadline}` : ""}`)
          .join("\n"),
        actes: [
          ...b.actes,
          {
            genre: "ecriture",
            libelle: `${r.proposal.length} livrables ajoutés à la liste`,
            champ: "deliverables",
          },
        ],
      }));
    } catch (e) {
      const brut =
        e instanceof ApiError && e.status === 503
          ? "L’assistance n’est pas configurée sur ce serveur. Les livrables restent à saisir à la main."
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
        <h3 className="text-heading-03 text-primary">Que le prestataire doit-il remettre ?</h3>
        <p className="text-body-lg text-secondary mt-3">
          Les pièces attendues, sous quelle forme, et à quelle échéance. Un livrable qui ne
          sert aucun objectif ne se commande pas.
        </p>
      </header>

      <ul className="border-accent bg-accent-surface flex flex-wrap items-center gap-x-3 gap-y-1.5 border-l-2 px-4 py-2.5">
        {[
          "Une pièce recevable, pas une activité",
          "Échéances en délai relatif : J+15, S+4, M+6",
          "Jamais de date ferme — le marché n’est pas attribué",
        ].map((r, i) => (
          <li key={r} className="text-caption text-secondary flex items-center gap-3">
            {i > 0 && <span aria-hidden className="bg-border-subtle inline-block h-3 w-px" />}
            {r}
          </li>
        ))}
      </ul>

      <ListeEntrees
        titre="Livrables"
        prefixe="L"
        items={state.deliverables}
        vide={{ title: "", format: "", deadline: "" }}
        onChange={(v) => set({ ...state, deliverables: v })}
        ajouterLabel="Ajouter un livrable"
        videTexte="Aucun livrable pour l’instant. Ajoutez-en un, ou demandez une proposition à l’assistant."
        labelGenerer="Proposer des livrables"
        gabarits={GABARITS_LIVRABLE}
        enCours={nôtre}
        occupeAilleurs={ailleurs}
        onArreter={assistant.interrompre}
        erreur={erreur}
        desactive={!state.tdrId}
        desactiveRaison="Disponible une fois le brouillon ouvert."
        onGenerer={() => void proposer()}
        onOuvrirAssistant={() => {
          assistant.setChampCourant("Livrables");
          assistant.ouvrir();
        }}
        champs={[
          {
            cle: "title",
            libelle: "Intitulé du livrable",
            placeholder: "[Ouvrage] réceptionné",
            long: true,
            requis: true,
          },
          { cle: "format", libelle: "Forme", placeholder: "Procès-verbal de réception" },
          { cle: "deadline", libelle: "Échéance", placeholder: "M+[n]" },
        ]}
      />


      {/* Modalités valant pour tout le marché, et non livrable par livrable. */}
      <div className="border-subtle grid gap-6 border-t pt-6 sm:grid-cols-2">
        <Select
          label="Format de remise"
          helper="Forme sous laquelle les pièces sont remises et validées."
          value={state.deliverableFormat}
          onChange={(v) => set({ ...state, deliverableFormat: v })}
          placeholder="Sélectionner le format"
          options={DELIVERABLE_FORMATS}
        />
        <Select
          label="Rythme de reporting"
          helper="Fréquence des points d’avancement avec l’UGP."
          value={state.reportingRhythm}
          onChange={(v) => set({ ...state, reportingRhythm: v })}
          placeholder="Sélectionner le rythme"
          options={REPORTING_RHYTHMS}
        />
      </div>
    </div>
  );
}
