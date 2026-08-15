"use client";

/**
 * Saisie d'une activité PTBA.
 *
 * Partagé par l'inscription et la reprise : le formulaire est le même, seuls
 * l'intitulé de l'action et le verbe changent. Dupliquer ces deux cents
 * lignes aurait garanti qu'un champ ajouté d'un côté manque de l'autre.
 *
 * Ce que l'activité porte en propre — objectifs, livrables, indicateurs,
 * risques, normes — reste replié. Une ligne peut s'inscrire au plan avant
 * que son contenu soit arrêté, et une inscription rapide doit rester rapide.
 */

import {
  Accordion,
  AccordionItem,
  Button,
  Dropdown,
  InlineNotification,
  NumberInput,
  Select,
  SelectItem,
  TextInput,
} from "@carbon/react";
import { Add, TrashCan } from "@carbon/icons-react";
import { MultiDropdownPicker } from "@/components/ui/MultiDropdownPicker";
import type { ProvinceApi, PtbaAllocationRowApi } from "@/lib/api";
import { formatUsdCompact } from "@/lib/format";

/* ------------------------------------------------------------------ */

export interface ActivityFormState {
  code: string;
  title: string;
  componentCode: string;
  subComponent: string;
  envelopeUsd: string;
  idaUsd: string;
  afdUsd: string;
  provinceCodes: string[];
  objectives: Array<{ title: string; criteria: string }>;
  deliverables: Array<{ title: string; format: string; deadline: string }>;
  indicators: Array<{ label: string; measure: string; target: string }>;
  risks: Array<{ label: string; description: string; mitigation: string; level: string }>;
  clauses: Array<{ label: string; text: string }>;
}

export const ACTIVITY_FORM_VIDE: ActivityFormState = {
  code: "",
  title: "",
  componentCode: "",
  subComponent: "",
  envelopeUsd: "",
  idaUsd: "",
  afdUsd: "",
  provinceCodes: [],
  objectives: [],
  deliverables: [],
  indicators: [],
  risks: [],
  clauses: [],
};

/** Niveaux de risque. La valeur vide est un choix, pas un défaut manquant. */
const NIVEAUX = [
  { value: "", label: "— Non qualifié —" },
  { value: "FAIBLE", label: "Faible" },
  { value: "MODERE", label: "Modéré" },
  { value: "SUBSTANTIEL", label: "Substantiel" },
  { value: "ELEVE", label: "Élevé" },
];

/** Le formulaire est complet quand le service l'accepterait. */
export function activityFormComplet(f: ActivityFormState): boolean {
  return (
    /^A\d+(\.\d+)*$/.test(f.code.trim()) &&
    f.title.trim().length >= 5 &&
    f.componentCode !== "" &&
    Number(f.envelopeUsd) > 0
  );
}

/** Traduit l'état d'écran en charge utile d'API. */
export function activityFormPayload(f: ActivityFormState): Record<string, unknown> {
  return {
    code: f.code.trim(),
    title: f.title.trim(),
    componentCode: f.componentCode,
    subComponent: f.subComponent.trim() || undefined,
    envelopeUsd: Number(f.envelopeUsd),
    idaUsd: f.idaUsd ? Number(f.idaUsd) : undefined,
    afdUsd: f.afdUsd ? Number(f.afdUsd) : undefined,
    provinceCodes: f.provinceCodes,
    objectives: f.objectives,
    deliverables: f.deliverables,
    indicators: f.indicators,
    risks: f.risks,
    clauses: f.clauses,
  };
}

/* ------------------------------------------------------------------ */

interface Champ {
  cle: string;
  libelle: string;
  placeholder?: string;
  large?: boolean;
  options?: Array<{ value: string; label: string }>;
}

/**
 * Éditeur de liste répétable.
 *
 * Carbon n'a pas de composant de répétition ; celui-ci en tient lieu, bâti
 * sur ses champs. Le repère O1/L1 n'apparaît que là où l'ordre compte —
 * c'est ainsi que le document produit y renverra.
 */
function ListeRepetable<T extends Record<string, string>>({
  items,
  vide,
  onChange,
  champs,
  prefix,
  idBase,
}: {
  items: T[];
  vide: T;
  onChange: (v: T[]) => void;
  champs: Champ[];
  prefix?: string;
  idBase: string;
}) {
  return (
    <div className="flex flex-col gap-4">
      {items.map((item, i) => (
        <div key={i} className="border-subtle flex items-start gap-3 border-l-2 pl-3">
          {prefix && (
            <span className="text-caption text-helper mono w-8 shrink-0 pt-6" aria-hidden>
              {prefix}
              {i + 1}
            </span>
          )}
          <div className="grid min-w-0 flex-1 gap-3 sm:grid-cols-2">
            {champs.map((c) => {
              const id = `${idBase}-${i}-${c.cle}`;
              const valeur = item[c.cle] ?? "";
              const set = (v: string) => {
                const n = [...items];
                n[i] = { ...item, [c.cle]: v };
                onChange(n);
              };

              if (c.options) {
                return (
                  <Select
                    key={c.cle}
                    id={id}
                    labelText={c.libelle}
                    value={valeur}
                    onChange={(e) => set(e.target.value)}
                  >
                    {c.options.map((o) => (
                      <SelectItem key={o.value} value={o.value} text={o.label} />
                    ))}
                  </Select>
                );
              }

              return (
                <TextInput
                  key={c.cle}
                  id={id}
                  labelText={c.libelle}
                  placeholder={c.placeholder}
                  value={valeur}
                  className={c.large ? "sm:col-span-2" : undefined}
                  onChange={(e) => set(e.target.value)}
                />
              );
            })}
          </div>
          <div className="pt-6">
            <Button
              kind="ghost"
              size="sm"
              hasIconOnly
              renderIcon={TrashCan}
              iconDescription="Retirer cette ligne"
              tooltipPosition="left"
              onClick={() => onChange(items.filter((_, x) => x !== i))}
            />
          </div>
        </div>
      ))}
      <div>
        <Button kind="ghost" size="sm" renderIcon={Add} onClick={() => onChange([...items, { ...vide }])}>
          Ajouter une ligne
        </Button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

interface ActivityFormProps {
  value: ActivityFormState;
  onChange: (v: ActivityFormState) => void;
  allocations: PtbaAllocationRowApi[];
  provinces: ProvinceApi[];
  /** Message de refus renvoyé par le service. */
  error?: string | null;
  /** En modification, la composante d'origine reste proposée même à saturation. */
  componentCodeInitial?: string;
}

export function ActivityForm({
  value,
  onChange,
  allocations,
  provinces,
  error,
  componentCodeInitial,
}: ActivityFormProps) {
  const set = <K extends keyof ActivityFormState>(cle: K, v: ActivityFormState[K]) =>
    onChange({ ...value, [cle]: v });

  // Une composante sans allocation, ou allouée à zéro, ne peut rien recevoir :
  // le service refuse. La proposer ferait découvrir le refus après la saisie.
  const composantesOuvertes = allocations.filter(
    (r) => (r.allocationUsd ?? 0) > 0 || r.componentCode === componentCodeInitial,
  );
  const nonAllouees = allocations.filter((r) => r.allocationUsd === null);

  const choisie = allocations.find((r) => r.componentCode === value.componentCode) ?? null;
  const reste = choisie ? (choisie.allocationUsd ?? 0) - choisie.plannedUsd : null;

  const enveloppe = Number(value.envelopeUsd) || 0;
  // Avertissement, non blocage : le service tranche, et lui seul connaît
  // l'état réel du plan au moment de l'écriture.
  const depasse = reste !== null && enveloppe > reste;

  return (
    <div className="flex flex-col gap-8">
      {/* ---------- Identification ---------- */}
      <section className="flex flex-col gap-5">
        <h2 className="text-heading-03 text-primary">Identification</h2>

        <div className="grid gap-5 md:grid-cols-3">
          <TextInput
            id="ptba-code"
            labelText="Code d’activité"
            placeholder="A2.3.1"
            helperText="Forme A2.3.1 — la lettre A puis les niveaux, séparés par des points."
            value={value.code}
            invalid={value.code.trim() !== "" && !/^A\d+(\.\d+)*$/.test(value.code.trim())}
            invalidText="Le code doit suivre la forme A2.3.1."
            onChange={(e) => set("code", e.target.value)}
            required
          />
          <TextInput
            id="ptba-title"
            labelText="Intitulé de l’activité"
            placeholder="Plateforme nationale d’identité numérique"
            className="md:col-span-2"
            value={value.title}
            invalid={value.title.trim() !== "" && value.title.trim().length < 5}
            invalidText="Cinq caractères au minimum."
            onChange={(e) => set("title", e.target.value)}
            required
          />
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          <Dropdown
            id="ptba-composante"
            titleText="Composante"
            label="— Sélectionner —"
            helperText={
              nonAllouees.length > 0
                ? `Sans allocation à ce jour : ${nonAllouees.map((r) => r.componentCode).join(", ")}. Une composante n’accepte d’activité qu’une fois son allocation arrêtée.`
                : "Le solde indiqué est ce qui reste de l’allocation de l’exercice."
            }
            items={composantesOuvertes.map((r) => r.componentCode)}
            selectedItem={value.componentCode || null}
            itemToString={(code) => {
              const r = allocations.find((x) => x.componentCode === code);
              if (!r) return code ?? "";
              const solde = (r.allocationUsd ?? 0) - r.plannedUsd;
              return `${r.componentCode} · ${r.shortLabel} — reste ${formatUsdCompact(solde)}`;
            }}
            onChange={({ selectedItem }) => set("componentCode", selectedItem ?? "")}
          />
          <TextInput
            id="ptba-sous-composante"
            labelText="Sous-composante"
            placeholder="2.3"
            helperText="Facultatif — la subdivision du MEP."
            value={value.subComponent}
            onChange={(e) => set("subComponent", e.target.value)}
          />
          <div>
            <span className="text-caption text-secondary mb-2 block">Couverture géographique</span>
            {/* Une activité en traverse souvent plusieurs. Aucune retenue
                vaut couverture nationale, et c'est une valeur. */}
            <MultiDropdownPicker
              options={[...provinces]
                .sort((a, b) =>
                  a.isPriorityCpf === b.isPriorityCpf
                    ? a.label.localeCompare(b.label, "fr")
                    : a.isPriorityCpf
                      ? -1
                      : 1,
                )
                .map((p) => ({
                  value: p.code,
                  label: p.label,
                  sub: p.isPriorityCpf ? "Prioritaire CPF" : undefined,
                }))}
              values={value.provinceCodes}
              onChange={(v) => set("provinceCodes", v)}
              placeholder="Couverture nationale"
              searchable
              ariaLabel="Provinces couvertes"
              resume={(choisis) => `${choisis.length} province${choisis.length > 1 ? "s" : ""}`}
            />
            <span className="text-caption text-helper mt-2 block">
              Laissé vide, l’activité est réputée de couverture nationale.
            </span>
          </div>
        </div>
      </section>

      {/* ---------- Enveloppe ---------- */}
      <section className="flex flex-col gap-5">
        <h2 className="text-heading-03 text-primary">Enveloppe</h2>

        <div className="grid gap-5 md:grid-cols-3">
          <NumberInput
            id="ptba-envelope"
            label="Enveloppe en USD"
            min={0}
            step={100000}
            hideSteppers
            allowEmpty
            value={value.envelopeUsd === "" ? "" : Number(value.envelopeUsd)}
            invalid={depasse}
            invalidText={
              reste !== null
                ? `Il ne reste que ${formatUsdCompact(reste)} sur l’allocation de ${value.componentCode}.`
                : undefined
            }
            helperText="Montant entier, en dollars."
            onChange={(_, { value: v }) => set("envelopeUsd", v === "" ? "" : String(v))}
          />
          <NumberInput
            id="ptba-ida"
            label="Part IDA"
            min={0}
            step={100000}
            hideSteppers
            allowEmpty
            value={value.idaUsd === "" ? "" : Number(value.idaUsd)}
            helperText="Facultatif."
            onChange={(_, { value: v }) => set("idaUsd", v === "" ? "" : String(v))}
          />
          <NumberInput
            id="ptba-afd"
            label="Part AFD"
            min={0}
            step={100000}
            hideSteppers
            allowEmpty
            value={value.afdUsd === "" ? "" : Number(value.afdUsd)}
            helperText="Facultatif."
            onChange={(_, { value: v }) => set("afdUsd", v === "" ? "" : String(v))}
          />
        </div>

        <p className="text-body text-secondary max-w-[68ch]">
          La ventilation par bailleur est facultative ; renseignée, IDA et AFD doivent
          totaliser l’enveloppe. Le cumul des activités d’une composante ne peut excéder
          son allocation sur cet exercice.
        </p>
      </section>

      {/* ---------- Ce que l'activité porte en propre ---------- */}
      <section className="flex flex-col gap-4">
        <div>
          <h2 className="text-heading-03 text-primary">Contenu de l’activité</h2>
          <p className="text-body text-secondary mt-2 max-w-[68ch]">
            Facultatif à l’inscription : une ligne peut rejoindre le plan avant que son
            contenu soit arrêté. Les TDR y puiseront — une activité porte souvent
            plusieurs marchés, et chacun ne reprend que ce qui le concerne.
          </p>
        </div>

        <Accordion>
          <AccordionItem
            title={`Objectifs de l’activité — ${value.objectives.length || "aucun"}`}
          >
            <p className="text-body text-secondary mb-4 max-w-[68ch]">
              Ce que l’activité doit atteindre, non ce qu’un marché exécute. Un TDR y
              rattachera les siens sans en hériter.
            </p>
            <ListeRepetable
              idBase="obj"
              items={value.objectives}
              vide={{ title: "", criteria: "" }}
              onChange={(v) => set("objectives", v)}
              prefix="O"
              champs={[
                {
                  cle: "title",
                  libelle: "Objectif",
                  placeholder: "Doter le pays d’un centre de supervision opérationnel",
                  large: true,
                },
                { cle: "criteria", libelle: "Critère de constatation", placeholder: "Comment on le constatera" },
              ]}
            />
          </AccordionItem>

          <AccordionItem
            title={`Livrables attendus — ${value.deliverables.length || "aucun"}`}
          >
            <ListeRepetable
              idBase="liv"
              items={value.deliverables}
              vide={{ title: "", format: "", deadline: "" }}
              onChange={(v) => set("deliverables", v)}
              prefix="L"
              champs={[
                { cle: "title", libelle: "Livrable", placeholder: "Local technique aménagé", large: true },
                { cle: "format", libelle: "Forme", placeholder: "Procès-verbal de réception" },
                { cle: "deadline", libelle: "Échéance", placeholder: "M+8" },
              ]}
            />
          </AccordionItem>

          <AccordionItem title={`Indicateurs clés — ${value.indicators.length || "aucun"}`}>
            <p className="text-body text-secondary mb-4 max-w-[68ch]">
              Indicateurs de résultat propres à cette activité. Ils remontent au cadre de
              résultats de la composante.
            </p>
            <ListeRepetable
              idBase="ind"
              items={value.indicators}
              vide={{ label: "", measure: "", target: "" }}
              onChange={(v) => set("indicators", v)}
              champs={[
                { cle: "label", libelle: "Indicateur", placeholder: "CSIRT opérationnel", large: true },
                { cle: "measure", libelle: "Mesure", placeholder: "Unité ou méthode" },
                { cle: "target", libelle: "Cible", placeholder: "1" },
              ]}
            />
          </AccordionItem>

          <AccordionItem title={`Risques et atténuation — ${value.risks.length || "aucun"}`}>
            <p className="text-body text-secondary mb-4 max-w-[68ch]">
              Risques propres à cette activité. Ceux qui tiennent à la forme du marché —
              retard de chantier, défaillance d’attributaire — restent au référentiel du
              type de TDR.
            </p>
            <ListeRepetable
              idBase="ris"
              items={value.risks}
              vide={{ label: "", description: "", mitigation: "", level: "" }}
              onChange={(v) => set("risks", v)}
              champs={[
                { cle: "label", libelle: "Risque", placeholder: "Retard de raccordement électrique", large: true },
                { cle: "mitigation", libelle: "Atténuation prévue", placeholder: "Ce qui est prévu pour le contenir", large: true },
                { cle: "level", libelle: "Niveau", options: NIVEAUX },
              ]}
            />
          </AccordionItem>

          <AccordionItem title={`Normes propres à l’activité — ${value.clauses.length || "aucune"}`}>
            <p className="text-body text-secondary mb-4 max-w-[68ch]">
              ISO 27001, ICAO 9303… Les clauses contractuelles, elles, suivent la forme du
              marché et restent au référentiel du type de TDR.
            </p>
            <ListeRepetable
              idBase="cla"
              items={value.clauses}
              vide={{ label: "", text: "" }}
              onChange={(v) => set("clauses", v)}
              champs={[
                { cle: "label", libelle: "Norme", placeholder: "ISO 27001" },
                { cle: "text", libelle: "Portée pour cette activité", placeholder: "Ce que la norme couvre ici", large: true },
              ]}
            />
          </AccordionItem>
        </Accordion>
      </section>

      {error && (
        <InlineNotification
          kind="error"
          lowContrast
          hideCloseButton
          title="Enregistrement refusé"
          subtitle={error}
          className="max-w-none"
        />
      )}
    </div>
  );
}
