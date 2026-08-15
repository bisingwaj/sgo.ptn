"use client";

import { Note } from "@/components/wizard/WizardFields";
import type { PtbaActivityApi, TdrTypeApi } from "@/lib/api";
import { withComposedTitle, type State } from "../etat";
import { TYPE_SIGNES } from "../referentiel-ecran";
import { ListeSelection, Repere, type OptionLigne } from "./LigneSelection";
import styles from "../tdr-creation.module.scss";

/**
 * Étape 01 — la nature du marché, et rien d'autre.
 *
 * Le type commande le parcours entier : bibliothèques chargées, exigence de
 * PGES, catégorie de passation, convention d'intitulé. Il mérite un écran où
 * l'on compare les onze sans rien d'autre à lire — et où on les compare
 * VRAIMENT : en tuiles, il fallait faire défiler pour voir les six derniers,
 * ce qui est l'inverse d'un choix éclairé.
 */
export function EtapeType({
  state,
  set,
  types,
  activities,
}: {
  state: State;
  set: (s: State) => void;
  types: TdrTypeApi[];
  activities: PtbaActivityApi[];
}) {
  const familles = [...new Set(types.map((t) => t.family))].sort();

  const fige = Boolean(state.tdrId);

  return (
    <div className={styles.stack}>
      {fige ? (
        // Le type ne se modifie pas : `updateDraft` ne l'accepte pas côté
        // serveur, et pour une raison de fond — il ne décrit pas le dossier,
        // il le constitue. Le dire vaut mieux que griser onze lignes sans
        // explication, ce qui se lit comme une panne.
        <Note tone="warning" title="Le type est arrêté pour ce brouillon">
          Il commande les bibliothèques chargées, la catégorie de passation, l’exigence de
          PGES et le parcours lui-même : en changer ne modifierait pas un champ, cela
          changerait de dossier. Pour un autre type, ouvrez un nouveau brouillon —
          celui-ci reste accessible depuis le registre.
        </Note>
      ) : (
        <p className={styles.hint}>Seuls les types ouverts à votre profil sont proposés.</p>
      )}

      {types.length === 0 ? (
        <p className={styles.hint}>Aucun type disponible.</p>
      ) : (
        familles.map((f) => {
          const options: OptionLigne[] = types
            .filter((t) => t.family === f)
            .map((t) => ({
              valeur: t.code,
              code: t.code,
              titre: t.name,
              description: TYPE_SIGNES[t.code]?.hint,
              icone: TYPE_SIGNES[t.code]?.icon,
              desactivee: fige,
              reperes: (
                <>
                  {t.allowedOrigins.length > 1 && <Repere ton="ouvert">Ouvert hors UGP</Repere>}
                  {t.requiresPges && <Repere ton="alerte">PGES</Repere>}
                  {t.defaultMethod && <Repere>{t.defaultMethod.code}</Repere>}
                </>
              ),
              // La seule valeur qu'on compare vraiment d'un type à l'autre.
              valeurCle: `${t.stepCount} étapes`,
            }));

          return (
            <div key={f} className={styles.familyBlock}>
              <span className={styles.familyLabel}>
                {types.find((t) => t.family === f)?.familyLabel}
              </span>
              <ListeSelection
                ariaLabel={`Types — ${types.find((t) => t.family === f)?.familyLabel ?? f}`}
                options={options}
                valeur={state.tdrTypeCode}
                onChange={(code) =>
                  set(withComposedTitle({ ...state, tdrTypeCode: code }, types, activities))
                }
              />
            </div>
          );
        })
      )}
    </div>
  );
}
