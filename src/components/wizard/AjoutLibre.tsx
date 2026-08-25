"use client";

/**
 * Ajouter une entrée qui n'est pas au catalogue.
 *
 * POURQUOI. Les listes proposées — postes-clés, clauses, indicateurs,
 * risques — viennent du référentiel et couvrent le cas courant. Elles ne
 * couvrent pas tout : un marché de cybersécurité demande un poste que le
 * catalogue ne porte pas, et l'auteur n'avait alors aucune issue. Une
 * liste fermée oblige à choisir à côté, ce qui vaut moins qu'un ajout
 * assumé.
 *
 * CE QUE L'ENTRÉE N'EST PAS. Elle n'entre PAS au référentiel. Elle
 * appartient à ce dossier et à lui seul — la base le permet déjà, les
 * entrées de TDR portant une origine facultative. Alimenter la
 * bibliothèque depuis un formulaire de saisie la ferait dériver sans que
 * personne n'arbitre, et les catalogues du MEP se comparent d'un dossier
 * à l'autre : c'est ce qui leur donne leur valeur.
 *
 * L'ajout se fait en DEUX temps — on ouvre, on écrit, on valide. Un champ
 * ouvert en permanence sous une liste se remplit par mégarde, et le
 * compteur compte alors des entrées que personne n'a voulues.
 */

import { useId, useRef, useState } from "react";
import { Add, Close } from "@carbon/icons-react";
import { Button, TextInput } from "@carbon/react";

interface Props {
  /** Ce que l'on ajoute, au singulier : « un poste », « une clause ». */
  quoi: string;
  placeholder?: string;
  /** Aide sous le champ — ce qui distingue une bonne entrée. */
  aide?: string;
  /** Rend `null` si l'entrée est acceptable, un motif de refus sinon. */
  refuser?: (texte: string) => string | null;
  onAjouter: (texte: string) => void;
  disabled?: boolean;
}

export function AjoutLibre({ quoi, placeholder, aide, refuser, onAjouter, disabled }: Props) {
  const [ouvert, setOuvert] = useState(false);
  const [texte, setTexte] = useState("");
  const [touche, setTouche] = useState(false);
  const champRef = useRef<HTMLInputElement>(null);
  const id = useId();

  const propre = texte.trim();
  const refus = propre === "" ? "Écrivez l’intitulé." : (refuser?.(propre) ?? null);

  const valider = () => {
    setTouche(true);
    if (refus) {
      champRef.current?.focus();
      return;
    }
    onAjouter(propre);
    setTexte("");
    setTouche(false);
    // Le champ reste ouvert : on en ajoute souvent deux ou trois d'affilée.
    champRef.current?.focus();
  };

  if (!ouvert) {
    return (
      <Button
        kind="ghost"
        size="sm"
        renderIcon={Add}
        disabled={disabled}
        onClick={() => {
          setOuvert(true);
          // Le focus après le rendu, sinon le champ n'existe pas encore.
          window.setTimeout(() => champRef.current?.focus(), 0);
        }}
      >
        Ajouter {quoi} absent de la liste
      </Button>
    );
  }

  return (
    <div className="border-subtle bg-layer flex flex-col gap-2 border p-3">
      {/* L'ÉTIQUETTE AU-DESSUS DE LA RANGÉE, L'AIDE EN DESSOUS.
          Carbon empile étiquette, champ et texte d'aide dans un même bloc.
          Aligner les boutons sur ce bloc — `items-end` — les faisait tomber
          sous la zone de saisie, à la hauteur de l'aide. Le champ est donc
          rendu SEUL sur sa rangée (`hideLabel`), et les deux textes sont
          posés autour : les trois éléments partagent la même ligne, quelle
          que soit la longueur de l'aide ou du refus. */}
      <label htmlFor={`ajout-${id}`} className="text-caption text-secondary">
        Intitulé — {quoi}
      </label>

      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <TextInput
            id={`ajout-${id}`}
            ref={champRef}
            labelText={`Intitulé — ${quoi}`}
            hideLabel
            placeholder={placeholder}
            invalid={touche && refus !== null}
            // Le refus se lit sous la rangée, avec l'aide : le laisser à
            // Carbon rallongerait le bloc du champ et décalerait à nouveau
            // les boutons, au moment précis où l'on veut recliquer.
            invalidText=""
            value={texte}
            onChange={(e) => setTexte(e.target.value)}
            onKeyDown={(e) => {
              // Entrée valide ; sans cela le formulaire du parcours
              // intercepterait la touche et changerait d'étape.
              if (e.key === "Enter") {
                e.preventDefault();
                valider();
              }
              if (e.key === "Escape") setOuvert(false);
            }}
          />
        </div>
        <Button size="md" onClick={valider} disabled={touche && refus !== null}>
          Ajouter
        </Button>
        <Button
          kind="ghost"
          size="md"
          hasIconOnly
          renderIcon={Close}
          iconDescription="Fermer sans ajouter"
          onClick={() => {
            setOuvert(false);
            setTexte("");
            setTouche(false);
          }}
        />
      </div>

      {touche && refus ? (
        <p className="text-caption text-danger-text" role="alert">
          {refus}
        </p>
      ) : (
        aide && <p className="text-caption text-helper">{aide}</p>
      )}

      <p className="text-caption text-helper">
        Cette entrée vaut pour ce dossier seulement. Elle n’est pas versée au référentiel.
      </p>
    </div>
  );
}
