"use client";

/**
 * Étape 02 — rattacher le marché au plan annuel.
 *
 * Un seul choix à cet écran : la ligne du PTBA. C'est elle qui commande
 * tout ce qui suit — son enveloppe plafonne le budget, et la composante
 * s'en déduit.
 *
 * La composante n'est plus demandée. Elle l'était sous forme de filtre, ce
 * qui laissait croire à un second choix : deux champs pour une seule
 * décision, et la possibilité d'une divergence entre la composante retenue
 * et celle que porte réellement l'activité. Elle se lit désormais sur
 * l'activité, et le filtre n'est plus qu'un filtre — pré-réglé sur la
 * composante de l'utilisateur quand son habilitation en désigne une.
 */

import { useMemo } from "react";
import { Note } from "@/components/wizard/WizardFields";
import type { ComponentApi, PtbaActivityApi, TdrTypeApi } from "@/lib/api";
import { withComposedTitle, type State } from "../etat";
import { ListeSelection, Repere } from "./LigneSelection";
import styles from "../tdr-creation.module.scss";

const TEINTE: Record<string, string> = {
  C1: "var(--ptn-composante-c1)",
  C2: "var(--ptn-composante-c2)",
  C3: "var(--ptn-composante-c3)",
  C4: "var(--ptn-composante-c4)",
  C5: "var(--ptn-composante-c5)",
};

const money = (usd: string) =>
  new Intl.NumberFormat("fr", {
    style: "currency",
    currency: "USD",
    currencyDisplay: "code",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(Number(usd));

export function EtapeRattachement({
  state,
  set,
  types,
  activities,
  components,
}: {
  state: State;
  set: (s: State) => void;
  types: TdrTypeApi[];
  activities: PtbaActivityApi[];
  components: ComponentApi[];
}) {
  const recompose = (next: State) => withComposedTitle(next, types, activities);

  const parComposante = useMemo(() => {
    const n: Record<string, number> = {};
    for (const a of activities) n[a.componentCode] = (n[a.componentCode] ?? 0) + 1;
    return n;
  }, [activities]);

  const visibles = state.componentFilter
    ? activities.filter((a) => a.componentCode === state.componentFilter)
    : activities;

  const choisie = activities.find((a) => a.id === state.ptbaActivityId);
  const composanteDeduite = choisie
    ? components.find((c) => c.code === choisie.componentCode)
    : undefined;

  // Les composantes sans activité restent affichées, désactivées : en
  // masquer une laisserait croire qu'elle n'existe pas au projet.
  const filtres = [
    { code: "", label: "Toutes", nb: activities.length },
    ...components.map((c) => ({
      code: c.code,
      label: `${c.code} · ${c.shortLabel}`,
      nb: parComposante[c.code] ?? 0,
    })),
  ];

  return (
    <div className={styles.stack}>
      {state.reference && (
        <Note tone="info" title={`Brouillon ${state.reference}`}>
          Vos saisies sont enregistrées à chaque étape.
        </Note>
      )}

      {activities.length === 0 ? (
        <Note tone="warning" title="Aucune activité au plan de l’exercice">
          Un TDR se rattache obligatoirement à une ligne du PTBA : sans elle, il n’y a pas
          d’enveloppe, donc pas de marché possible. L’activité doit être inscrite au plan
          avant que ce dossier puisse avancer.
        </Note>
      ) : (
        <>
          {/* Pas de `Field` ici non plus : un groupe de boutons dans un
              `<label>` s'active au clic sur n'importe quel vide. */}
          <div className="flex w-full flex-col gap-2">
            <span className="text-caption text-secondary">Filtrer par composante</span>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrer par composante">
              {filtres.map((f) => (
                <button
                  key={f.code || "toutes"}
                  type="button"
                  disabled={f.nb === 0 && f.code !== ""}
                  aria-pressed={state.componentFilter === f.code}
                  className={[
                    "ptn-carte-liste text-caption inline-flex items-center gap-2 border px-3 py-1.5",
                    "disabled:cursor-not-allowed disabled:opacity-40",
                    state.componentFilter === f.code
                      ? "border-strong bg-layer-hover text-primary"
                      : "border-subtle text-secondary hover:bg-layer",
                  ].join(" ")}
                  onClick={() =>
                    // Changer de filtre invalide l'activité si elle n'en relève
                    // plus : sans cela le dossier garderait une ligne devenue
                    // invisible à l'écran.
                    set(
                      recompose({
                        ...state,
                        componentFilter: f.code,
                        ptbaActivityId: activities.some(
                          (a) =>
                            a.id === state.ptbaActivityId &&
                            (f.code === "" || a.componentCode === f.code),
                        )
                          ? state.ptbaActivityId
                          : "",
                      }),
                    )
                  }
                >
                  {f.code && (
                    <i
                      aria-hidden
                      className="inline-block h-2 w-2 shrink-0"
                      style={{ background: TEINTE[f.code] }}
                    />
                  )}
                  {f.label}
                  <span className="text-helper mono tabular-nums">{f.nb}</span>
                </button>
              ))}
            </div>
            <span className="text-caption text-helper">
              Un filtre d’affichage seulement. La composante du dossier est celle de
              l’activité retenue.
            </span>
          </div>

          <ListeSelection
              titre="Activité du plan annuel"
              requis
              aide={
                visibles.length === 0
                  ? "Aucune activité sur cette composante. Élargissez le filtre."
                  : "L’enveloppe de cette activité plafonne le budget du TDR."
              }
              ariaLabel="Activité du plan annuel"
              valeur={state.ptbaActivityId}
              onChange={(id) => set(recompose({ ...state, ptbaActivityId: id }))}
              vide="Aucune activité sur cette composante."
              options={visibles.map((a) => ({
                valeur: a.id,
                code: a.code,
                titre: a.title,
                description: a.subComponent ? `Sous-composante ${a.subComponent}` : undefined,
                teinte: TEINTE[a.componentCode],
                reperes: <Repere>{a.componentCode}</Repere>,
                valeurCle: money(a.envelopeUsd),
              }))}
            />

          {composanteDeduite && (
            // Déduite, donc annoncée — jamais demandée une seconde fois.
            <Note tone="info" title="Composante du dossier">
              <span
                className="mr-2 inline-block h-2.5 w-2.5 align-baseline"
                style={{ background: TEINTE[composanteDeduite.code] }}
                aria-hidden
              />
              <strong>
                {composanteDeduite.code} · {composanteDeduite.label}
              </strong>{" "}
              — déduite de l’activité retenue. Elle commande les seuils de passation et le
              cadre de résultats auquel ce marché contribue.
            </Note>
          )}
        </>
      )}
    </div>
  );
}
