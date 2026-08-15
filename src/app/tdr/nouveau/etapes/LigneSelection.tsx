"use client";

/**
 * Sélecteur en lignes.
 *
 * Remplace les grilles de tuiles des premières étapes. Une tuile occupe la
 * hauteur d'un paragraphe pour porter quatre informations : onze types
 * demandaient de faire défiler, et cinq activités aussi. En ligne, la même
 * information — et davantage — tient sur une hauteur de rangée, et la liste
 * entière se compare d'un seul regard.
 *
 * Il porte son propre intitulé plutôt que d'être posé dans `Field`. Ce
 * dernier rend un `<label>` dont l'enveloppe est en `display: flex`, avec
 * `:hover` et `:focus-within` : un groupe radio s'y trouvait réduit à la
 * largeur de son contenu, grisé au survol de la zone vide, et cerné d'un
 * liseré au premier clic. Cette enveloppe est faite pour un champ unique,
 * pas pour un ensemble de contrôles.
 *
 * Vraie sémantique de groupe radio : `radiogroup` + `radio` + `aria-checked`,
 * navigation aux flèches. Un lecteur d'écran annonce l'exclusivité du choix ;
 * une grille de boutons n'en disait rien.
 */

import { useId, useRef, type ReactNode } from "react";
import { CheckmarkFilled } from "@carbon/icons-react";
import type { IconeCarbon } from "../referentiel-ecran";

export interface OptionLigne {
  valeur: string;
  /** Repère de référence, en chasse fixe — code de type, code d'activité. */
  code?: string;
  titre: string;
  /** Précision d'une ligne, effacée sous 640 px. */
  description?: string;
  /** Filet de couleur en tête de ligne — composante. */
  teinte?: string;
  icone?: IconeCarbon;
  /** Valeur saillante de fin de ligne : enveloppe, durée. */
  valeurCle?: ReactNode;
  /** Repères secondaires, plus discrets. */
  reperes?: ReactNode;
  desactivee?: boolean;
}

export function ListeSelection({
  titre,
  requis,
  aide,
  options,
  valeur,
  onChange,
  ariaLabel,
  vide,
}: {
  titre?: string;
  requis?: boolean;
  aide?: ReactNode;
  options: OptionLigne[];
  valeur: string;
  onChange: (v: string) => void;
  ariaLabel: string;
  vide?: ReactNode;
}) {
  const conteneur = useRef<HTMLDivElement>(null);
  const idTitre = useId();

  /** Flèches et Début/Fin, comme l'attend un groupe radio. */
  const auClavier = (e: React.KeyboardEvent, index: number) => {
    const actives = options.filter((o) => !o.desactivee);
    if (actives.length === 0) return;
    const position = actives.findIndex((o) => o.valeur === options[index].valeur);

    let cible: number | null = null;
    if (e.key === "ArrowDown" || e.key === "ArrowRight") cible = (position + 1) % actives.length;
    else if (e.key === "ArrowUp" || e.key === "ArrowLeft")
      cible = (position - 1 + actives.length) % actives.length;
    else if (e.key === "Home") cible = 0;
    else if (e.key === "End") cible = actives.length - 1;
    if (cible === null) return;

    e.preventDefault();
    const suivante = actives[cible];
    onChange(suivante.valeur);
    conteneur.current
      ?.querySelector<HTMLButtonElement>(`[data-valeur="${CSS.escape(suivante.valeur)}"]`)
      ?.focus();
  };

  return (
    // Un `div`, jamais un `label` : envelopper un groupe radio dans un label
    // fait activer le premier contrôle au clic sur n'importe quel vide.
    <div className="flex w-full flex-col gap-2">
      {titre && (
        <span id={idTitre} className="text-caption text-secondary">
          {titre}
          {requis && <span className="text-danger ml-0.5">*</span>}
        </span>
      )}

      {options.length === 0 && vide ? (
        <div className="border-subtle text-body text-helper border border-dashed p-6">{vide}</div>
      ) : (
        <div
          ref={conteneur}
          role="radiogroup"
          aria-label={titre ? undefined : ariaLabel}
          aria-labelledby={titre ? idTitre : undefined}
          className="border-subtle w-full border"
        >
          {options.map((o, i) => {
            const choisie = valeur === o.valeur;
            const Icone = o.icone;

            return (
              <button
                key={o.valeur}
                type="button"
                role="radio"
                data-valeur={o.valeur}
                aria-checked={choisie}
                disabled={o.desactivee}
                // Un seul arrêt de tabulation pour le groupe : il se parcourt
                // ensuite aux flèches, sans onze pressions sur Tab.
                tabIndex={
                  choisie || (!options.some((x) => x.valeur === valeur) && i === 0) ? 0 : -1
                }
                onKeyDown={(e) => auClavier(e, i)}
                onClick={() => onChange(o.valeur)}
                className={[
                  "ptn-carte-liste border-subtle flex w-full items-center gap-4 border-b px-4 py-3 text-left last:border-b-0",
                  "disabled:cursor-not-allowed disabled:opacity-40",
                  choisie ? "bg-layer-hover" : "hover:bg-layer",
                ].join(" ")}
              >
                <span
                  aria-hidden
                  className={[
                    "flex h-5 w-5 shrink-0 items-center justify-center",
                    choisie ? "text-accent" : "border-strong border",
                  ].join(" ")}
                >
                  {choisie && <CheckmarkFilled size={20} />}
                </span>

                {o.teinte && (
                  <i
                    aria-hidden
                    className="inline-block h-6 w-1 shrink-0"
                    style={{ background: o.teinte }}
                  />
                )}

                {Icone && <Icone size={20} className="text-helper shrink-0" aria-hidden />}

                {o.code && (
                  <span className="text-caption text-helper mono w-20 shrink-0 tabular-nums">
                    {o.code}
                  </span>
                )}

                {/* Hiérarchie : l'intitulé est ce qu'on choisit, il domine.
                    Le code est une référence, la précision un appui — ni l'un
                    ni l'autre ne doit rivaliser avec lui. */}
                <span className="min-w-0 flex-1">
                  <span className="text-body-lg text-primary block truncate font-medium">
                    {o.titre}
                  </span>
                  {o.description && (
                    <span className="text-caption text-secondary mt-0.5 hidden truncate sm:block">
                      {o.description}
                    </span>
                  )}
                </span>

                {o.reperes && (
                  <span className="ml-auto flex shrink-0 items-center gap-2">{o.reperes}</span>
                )}

                {o.valeurCle && (
                  <span className="text-body text-primary mono shrink-0 tabular-nums">
                    {o.valeurCle}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {aide && <span className="text-caption text-helper">{aide}</span>}
    </div>
  );
}

/** Repère discret de fin de ligne. */
export function Repere({
  children,
  ton = "neutre",
}: {
  children: ReactNode;
  ton?: "neutre" | "alerte" | "ouvert";
}) {
  const tons = {
    neutre: "border-subtle text-helper",
    alerte: "border-warning text-warning-text",
    ouvert: "border-subtle text-secondary",
  };
  return (
    <span
      className={`text-caption hidden whitespace-nowrap border px-2 py-0.5 md:inline-block ${tons[ton]}`}
    >
      {children}
    </span>
  );
}
