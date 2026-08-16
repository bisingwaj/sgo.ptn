"use client";

/**
 * Étape 13 — la période d'exécution et le territoire couvert.
 *
 * Scindée de l'expertise, qu'elle portait. L'écran demandait d'un même
 * souffle QUAND le marché s'exécute, OÙ, et QUI l'exécute : sept saisies de
 * trois natures, dont une rédaction longue coincée entre des champs
 * numériques. On y revenait sans savoir ce qu'on y avait déjà traité.
 * Ce sont deux décisions, elles ont maintenant deux écrans.
 *
 * Rien ici ne s'écrit par assistance, et c'est délibéré : une durée ou un
 * volume d'effort proposés par un modèle seraient une fabrication, que le
 * socle proscrit. Ce que l'écran peut faire — et que l'ancien ne faisait
 * pas — c'est rendre lisible ce que la saisie implique. L'achèvement
 * prévisionnel et l'intensité de mobilisation se DÉDUISENT des trois
 * nombres saisis ; ils ne s'inventent pas, et ils se corrigent à la volée.
 */

import { useMemo } from "react";
import { Close } from "@carbon/icons-react";
import { Field, Input } from "@/components/wizard/WizardFields";
import { MultiDropdownPicker } from "@/components/ui/MultiDropdownPicker";
import type { ProvinceApi } from "@/lib/api";
import type { State } from "../etat";

/** Base de conversion jours-homme → mois. Convention de gestion, énoncée à l'écran. */
const JOURS_OUVRES_PAR_MOIS = 21;

export function EtapeCalendrier({
  state,
  set,
  provinces,
}: {
  state: State;
  set: (s: State) => void;
  provinces: ProvinceApi[];
}) {
  const mois = Number(state.durationMonths);
  const jours = Number(state.effortDays);

  /**
   * Achèvement prévisionnel. Le premier du mois plutôt que le quantième de
   * départ : `setMonth` sur un 31 janvier retombe en mars, et l'écran
   * annonçait alors un mois de plus que la durée saisie.
   */
  const achevement = useMemo(() => {
    if (!state.startDate || !Number.isFinite(mois) || mois <= 0) return null;
    const debut = new Date(`${state.startDate}T00:00:00`);
    if (Number.isNaN(debut.getTime())) return null;
    return new Date(debut.getFullYear(), debut.getMonth() + mois, 1).toLocaleDateString(
      "fr-FR",
      { month: "long", year: "numeric" },
    );
  }, [state.startDate, mois]);

  /**
   * Intensité de mobilisation. C'est le seul rapprochement qui dise si les
   * deux nombres tiennent ensemble : 240 jours-homme sur neuf mois font une
   * personne et demie, sur un mois ils en font douze.
   */
  const intensite = useMemo(() => {
    if (!Number.isFinite(mois) || mois <= 0) return null;
    if (!Number.isFinite(jours) || jours <= 0) return null;
    return jours / (mois * JOURS_OUVRES_PAR_MOIS);
  }, [jours, mois]);

  return (
    <div className="mx-auto flex w-full max-w-[60rem] flex-col gap-6">
      <header className="max-w-[68ch]">
        <h3 className="text-heading-03 text-primary">
          Sur quelle période et sur quel territoire ce marché s’exécute-t-il ?
        </h3>
        <p className="text-body-lg text-secondary mt-3">
          La durée borne les échéances des livrables ; le volume d’effort borne la
          facturation. Les deux se saisissent, aucun ne se déduit de l’autre.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-x-6 gap-y-4 md:grid-cols-3">
        <Field label="Date de démarrage souhaitée">
          <Input
            type="date"
            value={state.startDate}
            onChange={(e) => set({ ...state, startDate: e.target.value })}
          />
        </Field>
        <Field label="Durée (mois)" helper="Borne les échéances des livrables.">
          <Input
            type="number"
            min={1}
            value={state.durationMonths}
            onChange={(e) => set({ ...state, durationMonths: e.target.value })}
          />
        </Field>
        <Field
          label="Volume d’effort (jours-homme)"
          helper="Unité de facturation d’un marché de prestation. La durée calendaire ne s’y substitue pas."
        >
          <Input
            type="number"
            min={1}
            value={state.effortDays}
            onChange={(e) => set({ ...state, effortDays: e.target.value })}
          />
        </Field>
      </div>

      {/* Lecture de ce qui vient d'être saisi, pas une donnée du dossier :
          rien de tout cela ne part en base. L'auteur voit ce que ses trois
          nombres disent ensemble, au moment où il peut encore les corriger. */}
      {(achevement || intensite !== null) && (
        <div className="border-accent bg-accent-surface flex flex-col gap-1 border-l-2 px-4 py-3">
          {achevement && (
            <p className="text-body text-primary">
              Achèvement prévisionnel : <strong>{achevement}</strong>
            </p>
          )}
          {intensite !== null && (
            <p className="text-body text-primary">
              Mobilisation :{" "}
              <strong>
                {intensite.toFixed(1).replace(".", ",")} personne
                {intensite >= 2 ? "s" : ""} à plein temps
              </strong>{" "}
              <span className="text-secondary">
                en moyenne, sur une base de {JOURS_OUVRES_PAR_MOIS} jours ouvrés par mois.
              </span>
            </p>
          )}
          <p className="text-caption text-secondary">
            Lecture indicative. Seules la date, la durée et le volume d’effort sont
            enregistrés.
          </p>
        </div>
      )}

      {/* Un marché porte souvent sur plusieurs provinces — un backbone en
          traverse trois, une formation en dessert dix. Le choix unique
          obligeait à n'en retenir qu'une, ou à déclarer « national » un
          marché qui ne l'était pas. */}
      <Couverture
        provinces={provinces}
        retenues={state.provinceCodes}
        onChange={(codes) => set({ ...state, provinceCodes: codes })}
      />
    </div>
  );
}

/**
 * Couverture géographique du marché.
 *
 * Liste déroulante à cases plutôt qu'une grille : vingt-six provinces
 * étalées occupaient tout l'écran. Le menu se replie, la recherche filtre,
 * et le déclencheur résume ce qui est retenu.
 *
 * Les dix provinces prioritaires du Cadre de Partenariat-Pays remontent en
 * tête et le disent : c'est ce qui oriente le choix.
 *
 * Aucune sélection vaut couverture nationale, et l'aide le dit — c'est un
 * cas fréquent, pas un oubli.
 */
function Couverture({
  provinces,
  retenues,
  onChange,
}: {
  provinces: ProvinceApi[];
  retenues: string[];
  onChange: (codes: string[]) => void;
}) {
  const options = useMemo(
    () =>
      [...provinces]
        .sort((a, b) => {
          if (a.isPriorityCpf !== b.isPriorityCpf) return a.isPriorityCpf ? -1 : 1;
          return a.label.localeCompare(b.label, "fr");
        })
        .map((p) => ({
          value: p.code,
          label: p.label,
          sub: p.isPriorityCpf
            ? "Province prioritaire du Cadre de Partenariat-Pays"
            : undefined,
        })),
    [provinces],
  );

  /**
   * Les provinces retenues, dans l'ordre du menu — prioritaires d'abord.
   *
   * Un code sans correspondance au référentiel se rend quand même : une
   * province retirée du référentiel après coup doit rester visible et
   * retirable, sinon elle reste au dossier sans que rien ne l'y montre.
   */
  const choisies = useMemo(
    () =>
      options
        .filter((o) => retenues.includes(o.value))
        .map((o) => ({ code: o.value, label: o.label, prioritaire: Boolean(o.sub) }))
        .concat(
          retenues
            .filter((c) => !options.some((o) => o.value === c))
            .map((c) => ({ code: c, label: c, prioritaire: false })),
        ),
    [options, retenues],
  );

  return (
    <div className="flex flex-col gap-3">
      <Field
        label="Couverture géographique"
        helper={
          retenues.length === 0
            ? "Sans province retenue, le marché est réputé de couverture nationale."
            : undefined
        }
      >
        <MultiDropdownPicker
          options={options}
          values={retenues}
          onChange={onChange}
          searchable
          placeholder="Couverture nationale"
          ariaLabel="Provinces couvertes par le marché"
          resume={(choisis) =>
            choisis.length <= 2
              ? choisis.map((o) => o.label).join(", ")
              : `${choisis.length} provinces`
          }
        />
      </Field>

      {/* Les provinces retenues, nommées.
          Le déclencheur du menu résume — « 7 provinces » — et l'aide comptait
          les prioritaires. Deux nombres, aucun nom : il fallait rouvrir le
          menu et faire défiler vingt-six lignes pour savoir ce qu'on avait
          coché. Un dossier qui part chez un bailleur se relit ; ce qu'il
          couvre doit se lire sans manipuler.

          Hors du `Field` : celui-ci est un `<label>`, et un bouton placé
          dedans déclencherait aussi le champ qu'il étiquette. */}
      {choisies.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {choisies.map((p) => (
            <li
              key={p.code}
              className="border-subtle bg-layer flex items-center gap-2 border py-1 pr-1 pl-3"
            >
              <span className="text-body text-primary">{p.label}</span>
              {p.prioritaire && (
                // Statut du Cadre de Partenariat-Pays, non une alerte : ton
                // informatif, jamais l'accent — il n'y a rien à cliquer ici.
                <span
                  className="bg-info-surface text-info-text text-caption px-1.5 py-0.5"
                  title="Province prioritaire du Cadre de Partenariat-Pays"
                >
                  Prioritaire CPF
                </span>
              )}
              <button
                type="button"
                className="text-secondary hover:bg-layer-hover hover:text-primary flex items-center justify-center p-1"
                aria-label={`Retirer ${p.label} de la couverture`}
                onClick={() => onChange(retenues.filter((c) => c !== p.code))}
              >
                <Close size={16} aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
