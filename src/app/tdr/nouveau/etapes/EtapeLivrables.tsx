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

import { useState } from "react";
import { WarningAltFilled } from "@carbon/icons-react";
import { Select } from "@/components/wizard/WizardFields";
import { tdrApi, ApiError } from "@/lib/api";
import type { State } from "../etat";
import { useAssistant } from "../assistant-contexte";
import { DELIVERABLE_FORMATS, REPORTING_RHYTHMS } from "../referentiel-ecran";
import { ListeEntrees } from "./ListeEntrees";

export function EtapeLivrables({
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
      const r = await tdrApi.assistDeliverables(state.tdrId);
      if (r.proposal.length === 0) {
        // Le service a répondu sans rien proposer. Le dire plutôt que de
        // laisser croire à une panne — le plus souvent, les objectifs
        // manquent, et un livrable qui ne sert aucun objectif ne se commande
        // pas.
        setErreur(
          "L’assistant n’a rien proposé. Les livrables découlent des objectifs : vérifiez que l’étape précédente en porte au moins un.",
        );
        return;
      }
      set({
        ...state,
        deliverables: [...state.deliverables, ...r.proposal],
        aiAssistedFields: state.aiAssistedFields.includes("deliverables")
          ? state.aiAssistedFields
          : [...state.aiAssistedFields, "deliverables"],
      });
      assistant.consignerEnLigne(
        "Proposer des livrables",
        r.proposal
          .map((d, i) => `L${i + 1} · ${d.title}${d.deadline ? ` — ${d.deadline}` : ""}`)
          .join("\n"),
        "deliverables",
      );
    } catch (e) {
      setErreur(
        e instanceof ApiError && e.status === 503
          ? "L’assistance n’est pas configurée sur ce serveur. Les livrables restent à saisir à la main."
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
        enCours={enCours}
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

      {erreur && (
        <p className="text-caption text-danger-text flex items-start gap-2">
          <WarningAltFilled size={16} className="mt-0.5 shrink-0" aria-hidden />
          {erreur}
        </p>
      )}

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
