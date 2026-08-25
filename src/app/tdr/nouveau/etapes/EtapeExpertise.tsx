"use client";

/**
 * Étape 14 — l'expertise exigée, et les postes qu'elle arme.
 *
 * Détachée du calendrier. Le champ `expertise` était le seul des huit
 * champs rédigés du dossier à n'avoir ni écran propre ni assistance : sa
 * fiche existait pourtant déjà — question, repères, consigne serveur — et
 * n'attendait que d'être branchée. Une rédaction longue coincée entre une
 * date et un compteur de jours ne se traite pas comme une rédaction.
 *
 * Deux objets distincts, et l'écran doit tenir la distinction, sinon les
 * deux se recopient :
 *
 *   — le TEXTE dit ce que chaque profil doit démontrer. Il part au document
 *     en liste, un profil par ligne ;
 *   — les CASES désignent les postes que l'offre devra pourvoir. Ce sont
 *     eux que les critères de notation évaluent ; ils ne se rédigent pas.
 *
 * Trois postes au minimum — règle de conformité, tenue par le contrôle de
 * complétude côté serveur et non ici : bloquer l'étape enfermerait un auteur
 * qui remonte au calendrier après avoir coché deux postes.
 */

import type { State } from "../etat";
import { CheckRow } from "@/components/wizard/WizardFields";
import { PROFIL_KEYS } from "../referentiel-ecran";
import { AjoutLibre } from "@/components/wizard/AjoutLibre";
import { CHAMPS_TEXTE } from "./champs-texte";
import { EtapeTexte } from "./EtapeTexte";

export function EtapeExpertise({
  state,
  set,
}: {
  state: State;
  set: (s: State) => void;
}) {
  const retenus = state.keyProfiles.length;

  /**
   * Un poste retenu est soit une CLÉ du catalogue, soit un intitulé écrit
   * à la main. La distinction ne tient qu'à l'appartenance au catalogue :
   * `keyProfiles` est un tableau de chaînes, et c'est déjà ainsi que le
   * récapitulatif les rend — la clé si elle est connue, la chaîne sinon.
   */
  const libres = state.keyProfiles.filter((k) => !PROFIL_KEYS.some((p) => p.id === k));
  const intitule = (k: string) => PROFIL_KEYS.find((p) => p.id === k)?.label ?? k;

  return (
    <EtapeTexte
      champ={CHAMPS_TEXTE.expertise}
      state={state}
      set={set}
      complement={
        <section className="flex flex-col gap-3">
          <header>
            <h4 className="text-heading-02 text-primary">
              Quels postes l’offre devra-t-elle pourvoir ?
            </h4>
            <p className="text-body text-secondary mt-1 max-w-[68ch]">
              Le texte ci-dessus dit ce qu’il faut démontrer ; ces postes disent ce qu’il
              faut nommer. Ce sont eux que les critères de notation des offres évaluent —
              sans eux, il n’y a rien à évaluer.
            </p>
          </header>

          <p
            className={`text-caption ${retenus >= 3 ? "text-secondary" : "text-warning-text"}`}
          >
            {retenus === 0
              ? "Trois postes au minimum. Aucun désigné à ce jour."
              : `Trois postes au minimum. ${retenus} désigné${retenus > 1 ? "s" : ""} à ce jour.`}
          </p>

          {/* Un filet d'un pixel, non une gouttière : les cases forment une
              liste continue, comme partout ailleurs dans le parcours. */}
          <div className="flex flex-col gap-px">
            {PROFIL_KEYS.map((p) => (
              <CheckRow
                key={p.id}
                checked={state.keyProfiles.includes(p.id)}
                onChange={(next) =>
                  set({
                    ...state,
                    keyProfiles: next
                      ? [...state.keyProfiles, p.id]
                      : state.keyProfiles.filter((k) => k !== p.id),
                  })
                }
                title={p.label}
                description={p.description}
              />
            ))}

            {/* Les postes ajoutés à la main. Ils se cochent et se décochent
                comme les autres — décoché, un poste libre disparaît, car
                rien d'autre ne le retient : il n'existe que par ce dossier. */}
            {libres.map((poste) => (
              <CheckRow
                key={poste}
                checked
                onChange={() =>
                  set({ ...state, keyProfiles: state.keyProfiles.filter((k) => k !== poste) })
                }
                title={poste}
                description="Poste propre à ce dossier"
              />
            ))}
          </div>

          <AjoutLibre
            quoi="un poste"
            placeholder="Ex. Expert en cybersécurité industrielle"
            aide="Le poste tel qu'il devra être nommé dans l'offre."
            refuser={(t) =>
              state.keyProfiles.some((k) => intitule(k).toLowerCase() === t.toLowerCase()) ||
              PROFIL_KEYS.some((p) => p.label.toLowerCase() === t.toLowerCase())
                ? "Ce poste figure déjà dans la liste."
                : null
            }
            onAjouter={(t) => set({ ...state, keyProfiles: [...state.keyProfiles, t] })}
          />
        </section>
      }
    />
  );
}
