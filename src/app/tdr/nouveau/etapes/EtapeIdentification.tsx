"use client";

/**
 * Étape 03 — nommer le marché, et dire pour qui il est conduit.
 *
 * Détachée du rattachement, qu'elle encombrait : l'intitulé se compose de
 * ce qui précède, il ne peut donc pas se demander en même temps. Le placer
 * sur l'écran du plan revenait à faire nommer un marché dont l'objet
 * n'était pas encore choisi.
 */

import { Field, Input, Note, Select } from "@/components/wizard/WizardFields";
import type { OrganisationApi, PtbaActivityApi, TdrTypeApi } from "@/lib/api";
import { composeTitle, type State } from "../etat";
import styles from "../tdr-creation.module.scss";

export function EtapeIdentification({
  state,
  set,
  types,
  activities,
  organisations,
}: {
  state: State;
  set: (s: State) => void;
  types: TdrTypeApi[];
  activities: PtbaActivityApi[];
  organisations: OrganisationApi[];
}) {
  const composed = composeTitle(state, types, activities);
  const activite = activities.find((a) => a.id === state.ptbaActivityId);

  // Un intitulé encore identique à la composition automatique n'a pas été
  // repris : il porte le libellé de l'activité, pas l'objet du marché.
  const stillGeneric = composed !== "" && state.title.trim() === composed;

  return (
    <div className={styles.stack}>
      {activite && (
        <p className={styles.hint}>
          Rattaché à <strong>{activite.code}</strong> · {activite.title}
        </p>
      )}

      <Field
        label="Intitulé du marché/Activité"
        required
        helper={
          composed
            ? "Composé depuis le type et l’activité. Remplacez le libellé de l’activité par l’objet précis du marché."
            : "Choisissez le type et l’activité : un intitulé conforme à la convention vous sera proposé."
        }
      >
        <Input
          value={state.title}
          onChange={(e) =>
            // Vider le champ rend la main à la composition : l'auteur qui
            // efface veut repartir de la proposition, pas d'un champ mort.
            set({
              ...state,
              title: e.target.value,
              titleTouched: e.target.value.trim().length > 0,
            })
          }
          placeholder="Travaux — aménagement du centre des opérations de sécurité"
        />
      </Field>

      {stillGeneric && (
        <Note tone="warning" title="Cet intitulé reprend le libellé de l’activité">
          Une activité du PTBA porte souvent plusieurs marchés — travaux, puis fournitures,
          puis supervision. S’ils partagent tous le même intitulé, ni le plan de passation
          ni les avis de la Banque ne les distinguent. Nommez ce que ce marché achète.
        </Note>
      )}

      {/* Maîtrise d'ouvrage bénéficiaire — distincte de l'organisation qui
          rédige, et distincte des bénéficiaires visés, qui sont des
          populations. Sans elle, l'assistance rédactionnelle devine. */}
      {/* Saisie filtrante : le référentiel compte une trentaine d'entités,
          et un menu déroulant de trente lignes se parcourt à l'aveugle. */}
      <Select
        searchable
        label="Maîtrise d’ouvrage bénéficiaire"
        helper="L’entité pour laquelle l’activité est conduite, si elle diffère de la vôtre. À ne pas confondre avec les bénéficiaires visés, qui sont les populations servies."
        value={state.beneficiaryOrganisationId}
        onChange={(v) => set({ ...state, beneficiaryOrganisationId: v })}
        placeholder="Aucune — l’activité est conduite pour votre propre compte"
        options={organisations.map((o) => ({
          value: o.id,
          label: `${o.code} — ${o.fullName}`,
        }))}
      />
    </div>
  );
}
