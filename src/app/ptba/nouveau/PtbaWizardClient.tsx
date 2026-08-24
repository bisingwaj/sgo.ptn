"use client";

/**
 * Inscription d'une activité au plan — assistant pas à pas.
 *
 * Un écran, une question. Le formulaire d'un seul bloc demandait quinze
 * champs et cinq listes d'un coup ; le public visé — agents publics
 * seniors, à 125–150 % de zoom — décroche sur cette densité, et une erreur
 * de saisie budgétaire coûte cher.
 *
 * L'ordre n'est pas cosmétique : la composante vient en premier parce
 * qu'elle fixe le plafond de tout ce qui suit, et l'enveloppe après la
 * couverture parce qu'on ne chiffre bien qu'un périmètre déjà arrêté.
 *
 * Rien n'est écrit avant le récapitulatif. L'assistant tient un état, pas
 * un brouillon serveur — d'où l'absence de puce « brouillon enregistré »,
 * qui promettrait une reprise qui n'existe pas.
 */

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Button,
  InlineNotification,
  NumberInput,
  RadioTile,
  Select,
  SelectItem,
  Tag,
  TextInput,
  TileGroup,
} from "@carbon/react";
import { Add, TrashCan } from "@carbon/icons-react";
import { Wizard, type WizardStep } from "@/components/wizard/Wizard";
import { MultiDropdownPicker } from "@/components/ui/MultiDropdownPicker";
import { usePtbaExercice, useProvinces } from "@/components/ptba/use-ptba-exercice";
import { useAuth } from "@/components/auth/AuthContext";
import { ptbaApi, ApiError, type ProvinceApi, type PtbaAllocationRowApi } from "@/lib/api";
import { formatUsdCompact } from "@/lib/format";

/* ------------------------------------------------------------------ */
/* État                                                                */
/* ------------------------------------------------------------------ */

export interface EtatAssistant {
  componentCode: string;
  code: string;
  title: string;
  subComponent: string;
  provinceCodes: string[];
  envelopeUsd: string;
  idaUsd: string;
  afdUsd: string;
  /** Réponse à la porte du contenu. `null` = pas encore répondu. */
  avecContenu: boolean | null;
  objectives: Array<{ title: string; criteria: string }>;
  deliverables: Array<{ title: string; format: string; deadline: string }>;
  indicators: Array<{ label: string; measure: string; target: string }>;
  risks: Array<{ label: string; description: string; mitigation: string; level: string }>;
  clauses: Array<{ label: string; text: string }>;
}

const ETAT_INITIAL: EtatAssistant = {
  componentCode: "",
  code: "",
  title: "",
  subComponent: "",
  provinceCodes: [],
  envelopeUsd: "",
  idaUsd: "",
  afdUsd: "",
  avecContenu: null,
  objectives: [],
  deliverables: [],
  indicators: [],
  risks: [],
  clauses: [],
};

const NIVEAUX = [
  { value: "", label: "— Non qualifié —" },
  { value: "FAIBLE", label: "Faible" },
  { value: "MODERE", label: "Modéré" },
  { value: "SUBSTANTIEL", label: "Substantiel" },
  { value: "ELEVE", label: "Élevé" },
];

/**
 * Modèles de formulation.
 *
 * Des GABARITS, pas des données. Les crochets marquent ce qui reste à
 * renseigner : c'est la convention déjà tenue par l'assistance
 * rédactionnelle des TDR, qui laisse « [à fixer] » plutôt que d'inventer
 * une valeur. Une suggestion complète et plausible se retrouverait
 * enregistrée telle quelle, et le plan porterait alors un objectif que
 * personne n'a arrêté.
 *
 * Rien n'est puisé dans les bibliothèques versionnées du référentiel TDR :
 * celles-ci décrivent la FORME d'un marché, alors qu'une activité décrit
 * l'OBJET d'une ligne du plan. Les mélanger contredirait la séparation que
 * le modèle pose explicitement.
 */
const SUGGESTIONS = {
  objectifs: [
    {
      libelle: "Doter d’une capacité",
      valeur: { title: "Doter [l’institution] de [capacité]", criteria: "[Ce qui sera constaté], vérifié par [source]" },
    },
    {
      libelle: "Raccorder / desservir",
      valeur: { title: "Raccorder [nombre] [sites] à [service]", criteria: "[Nombre] raccordements constatés" },
    },
    {
      libelle: "Renforcer une compétence",
      valeur: { title: "Former [nombre] agents à [compétence]", criteria: "Attestations délivrées, évaluation des acquis" },
    },
  ],
  livrables: [
    {
      libelle: "Ouvrage réceptionné",
      valeur: { title: "[Ouvrage] réceptionné", format: "Procès-verbal de réception", deadline: "M+[n]" },
    },
    {
      libelle: "Étude livrée",
      valeur: { title: "[Étude] livrée", format: "Rapport final validé", deadline: "M+[n]" },
    },
    {
      libelle: "Équipement mis en service",
      valeur: { title: "[Équipement] installé et mis en service", format: "Certificat de conformité", deadline: "M+[n]" },
    },
  ],
  indicateurs: [
    {
      libelle: "Service opérationnel",
      valeur: { label: "[Service] opérationnel", measure: "Constat de mise en service", target: "1" },
    },
    {
      libelle: "Nombre de bénéficiaires",
      valeur: { label: "Nombre de [bénéficiaires] desservis", measure: "Registre du projet", target: "[cible]" },
    },
    {
      libelle: "Taux",
      valeur: { label: "Taux de [dimension mesurée]", measure: "Enquête annuelle", target: "[cible] %" },
    },
  ],
  risques: [
    {
      libelle: "Retard d’une dépendance",
      valeur: { label: "Retard de [dépendance]", description: "", mitigation: "[Parade prévue]", level: "" },
    },
    {
      libelle: "Ressource indisponible",
      valeur: { label: "Indisponibilité de [ressource]", description: "", mitigation: "[Parade prévue]", level: "" },
    },
    {
      libelle: "Capacité insuffisante",
      valeur: { label: "Capacité insuffisante de [acteur]", description: "", mitigation: "[Renforcement prévu]", level: "" },
    },
  ],
  normes: [
    { libelle: "ISO 27001", valeur: { label: "ISO 27001", text: "Portée : [périmètre couvert]" } },
    { libelle: "ICAO 9303", valeur: { label: "ICAO 9303", text: "Portée : [périmètre couvert]" } },
    {
      libelle: "Norme E&S",
      valeur: { label: "NES [n] — [intitulé]", text: "Portée : [périmètre couvert]" },
    },
  ],
};

/* ------------------------------------------------------------------ */
/* Blocs réutilisés par les étapes                                     */
/* ------------------------------------------------------------------ */

/**
 * Enveloppe une question : un intitulé, une aide, un champ.
 *
 * Mesure bornée par défaut — un champ de saisie ne se lit pas sur 1000 px.
 * Les étapes de contenu passent en `large` : leur grille de cartes a besoin
 * de la largeur, et c'est ce qui évite d'avoir à faire défiler.
 */
function Question({
  titre,
  aide,
  large,
  children,
}: {
  titre: string;
  aide?: string;
  large?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`mx-auto flex w-full flex-col gap-6 ${large ? "max-w-[68rem]" : "max-w-[46rem]"}`}
    >
      <div>
        <h3 className="text-heading-03 text-primary">{titre}</h3>
        {aide && <p className="text-body text-secondary mt-2 max-w-[68ch]">{aide}</p>}
      </div>
      {children}
    </div>
  );
}

interface Champ {
  cle: string;
  libelle: string;
  placeholder?: string;
  large?: boolean;
  options?: Array<{ value: string; label: string }>;
}

/** Un modèle de formulation proposé sous la grille. */
interface Suggestion<T> {
  libelle: string;
  valeur: T;
}

/**
 * Grille de cartes d'une étape de contenu.
 *
 * Des lignes empilées sur toute la largeur obligeaient à descendre dès le
 * deuxième objectif : le bouton d'ajout s'éloignait à chaque saisie, et
 * l'étape cessait de tenir dans un écran. Ici les entrées restent des
 * cartes compactes, trois par rangée, et une seule se déploie à la fois —
 * sur toute la largeur de la grille, à la place qu'elle occupe déjà.
 *
 * La hauteur n'est pas animée : un déploiement qui anime `height` relaie un
 * recalcul de mise en page à chaque image, ce que la fondation Motion de
 * Carbon proscrit. C'est le contenu déployé qui entre en fondu — le
 * mouvement dit que quelque chose s'est ouvert, sans coûter un reflow animé.
 */
function GrilleCartes<T extends Record<string, string>>({
  items,
  vide,
  onChange,
  champs,
  prefix,
  idBase,
  ajouterLabel,
  videTexte,
  resume,
  suggestions,
}: {
  items: T[];
  vide: T;
  onChange: (v: T[]) => void;
  champs: Champ[];
  prefix?: string;
  idBase: string;
  ajouterLabel: string;
  videTexte: string;
  /** Ce qu'affiche la carte repliée. */
  resume: (item: T) => { titre: string; sous?: string };
  suggestions?: Array<Suggestion<T>>;
}) {
  // Une seule carte ouverte : c'est ce qui garde l'étape à hauteur d'écran.
  const [ouvert, setOuvert] = useState<number | null>(null);

  const ajouter = (valeur: T) => {
    onChange([...items, { ...valeur }]);
    setOuvert(items.length);
  };

  const retirer = (i: number) => {
    onChange(items.filter((_, x) => x !== i));
    setOuvert(null);
  };

  return (
    <div className="flex flex-col gap-5">
      {items.length === 0 && (
        <p className="border-subtle text-body text-helper border border-dashed p-6 text-center">
          {videTexte}
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {items.map((item, i) => {
          const { titre, sous } = resume(item);
          const estOuvert = ouvert === i;

          if (!estOuvert) {
            return (
              <button
                key={i}
                type="button"
                onClick={() => setOuvert(i)}
                className="ptn-carte-liste border-subtle bg-layer hover:bg-layer-hover flex min-h-[5.5rem] flex-col items-start gap-1 border p-3 text-left"
                aria-expanded={false}
              >
                <span className="flex w-full items-baseline gap-2">
                  {prefix && (
                    <span className="text-caption text-helper mono shrink-0" aria-hidden>
                      {prefix}
                      {i + 1}
                    </span>
                  )}
                  <span className="text-body text-primary line-clamp-2 min-w-0 flex-1">
                    {titre || <span className="text-helper italic">À renseigner</span>}
                  </span>
                </span>
                {sous && <span className="text-caption text-helper line-clamp-1">{sous}</span>}
              </button>
            );
          }

          return (
            <div
              key={i}
              className="border-strong bg-layer col-span-full border p-4"
              // La bordure renforcée dit lequel est ouvert sans couleur :
              // la teinte reste réservée aux composantes et aux statuts.
            >
              <div className="ptn-entree-ligne flex flex-col gap-4">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-caption text-secondary font-semibold tracking-wider uppercase">
                    {prefix ? `${prefix}${i + 1}` : `Entrée ${i + 1}`}
                  </span>
                  <Button
                    kind="ghost"
                    size="sm"
                    hasIconOnly
                    renderIcon={TrashCan}
                    iconDescription="Retirer cette entrée"
                    tooltipPosition="left"
                    onClick={() => retirer(i)}
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
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

                <div className="flex justify-end">
                  <Button kind="ghost" size="sm" onClick={() => setOuvert(null)}>
                    Replier
                  </Button>
                </div>
              </div>
            </div>
          );
        })}

        {/* Tuile d'ajout, au même gabarit que les cartes : le bouton reste
            là où l'œil vient de finir de lire, sans défilement. */}
        <button
          type="button"
          onClick={() => ajouter(vide)}
          className="ptn-carte-liste border-strong text-secondary hover:bg-layer-hover flex min-h-[5.5rem] flex-col items-center justify-center gap-1 border border-dashed p-3"
        >
          <Add size={20} aria-hidden />
          <span className="text-caption">{ajouterLabel}</span>
        </button>
      </div>

      {suggestions && suggestions.length > 0 && (
        <div className="border-subtle border-t pt-4">
          <p className="text-caption text-secondary mb-2">
            Modèles de formulation — <span className="text-helper">à adapter, jamais à reprendre tels quels.
            Les crochets marquent ce qui reste à renseigner.</span>
          </p>
          <div className="flex flex-wrap gap-2">
            {suggestions.map((sug) => (
              <button
                key={sug.libelle}
                type="button"
                onClick={() => ajouter(sug.valeur)}
                className="ptn-carte-liste border-subtle bg-layer hover:bg-layer-hover text-caption text-primary border px-3 py-1.5"
              >
                <Add size={14} aria-hidden className="mr-1 inline-block align-text-bottom" />
                {sug.libelle}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/** Une ligne du récapitulatif. */
function Recap({ cle, valeur }: { cle: string; valeur: React.ReactNode }) {
  return (
    <div className="border-subtle flex flex-wrap items-baseline justify-between gap-3 border-b py-3 last:border-b-0">
      <dt className="text-caption text-secondary">{cle}</dt>
      <dd className="text-body text-primary text-right">{valeur}</dd>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function soldeDe(alloc: PtbaAllocationRowApi | undefined): number | null {
  if (!alloc || alloc.allocationUsd === null) return null;
  return alloc.allocationUsd - alloc.plannedUsd;
}

export function PtbaWizardClient() {
  const router = useRouter();
  const { can, loading: authLoading } = useAuth();
  /**
   * L'exercice visé vient de l'URL.
   *
   * L'assistant retenait toujours le plus récent : depuis les allocations
   * de 2026, « Inscrire une activité » ouvrait un dossier sur 2027 sans
   * que rien ne le dise, et l'activité partait dans le mauvais budget.
   * Sans paramètre, le comportement d'avant est conservé.
   */
  const parametres = useSearchParams();
  const anneeDemandee = /^\d{4}$/.test(parametres.get("annee") ?? "")
    ? Number(parametres.get("annee"))
    : undefined;
  const { year, allocations, chargement, avertissement } = usePtbaExercice({
    annee: anneeDemandee,
  });
  const provinces = useProvinces();
  const [erreurFinale, setErreurFinale] = useState<string | null>(null);

  const peutEcrire = can("ptba:write");
  const editable = year?.status === "BROUILLON";

  const optionsProvinces = useMemo(
    () =>
      [...provinces]
        // Prioritaires CPF en tête : ce sont celles que le projet cible, et
        // les faire remonter épargne un défilement à chaque saisie.
        .sort((a, b) =>
          a.isPriorityCpf === b.isPriorityCpf
            ? a.label.localeCompare(b.label, "fr")
            : a.isPriorityCpf
              ? -1
              : 1,
        )
        .map((p: ProvinceApi) => ({
          value: p.code,
          label: p.label,
          sub: p.isPriorityCpf ? "Prioritaire CPF" : undefined,
        })),
    [provinces],
  );

  const steps = useMemo<WizardStep<EtatAssistant>[]>(() => {
    const alloc = (s: EtatAssistant) =>
      allocations.find((r) => r.componentCode === s.componentCode);

    return [
      /* ===== 01 · Composante ===== */
      {
        num: "01",
        label: "Composante",
        sub: "Elle fixe le plafond de tout ce qui suit",
        validate: (s) =>
          s.componentCode ? null : "Choisissez la composante à laquelle l’activité se rattache.",
        render: (s, set) => (
          <Question
            titre="À quelle composante du projet cette activité se rattache-t-elle ?"
            aide="Le solde indiqué est ce qui reste de l’allocation de l’exercice, une fois retirées les activités déjà inscrites."
          >
            <TileGroup
              name="composante"
              legend="Composante"
              valueSelected={s.componentCode || undefined}
              onChange={(v) => set({ ...s, componentCode: String(v ?? "") })}
            >
              {allocations.map((r) => {
                const solde = soldeDe(r);
                const ferme = solde === null || solde <= 0;
                return (
                  <div key={r.componentCode} data-composante={r.componentCode.toLowerCase()}>
                    <RadioTile
                      id={`composante-${r.componentCode}`}
                      value={r.componentCode}
                      disabled={ferme}
                    >
                      <div className="flex flex-col gap-1">
                        <span className="flex items-center gap-2">
                          <i
                            aria-hidden
                            className="inline-block h-3 w-3 shrink-0"
                            style={{ background: `var(--ptn-composante-${r.componentCode.toLowerCase()})` }}
                          />
                          <span className="mono text-body text-primary">{r.componentCode}</span>
                          <span className="text-body text-primary">{r.shortLabel}</span>
                        </span>
                        <span className="text-caption text-secondary">
                          {r.allocationUsd === null
                            ? "Aucune allocation arrêtée sur cet exercice"
                            : solde !== null && solde <= 0
                              ? `Solde épuisé — ${formatUsdCompact(r.allocationUsd)} entièrement engagés`
                              : `${formatUsdCompact(solde ?? 0)} disponibles sur ${formatUsdCompact(r.allocationUsd)}`}
                        </span>
                      </div>
                    </RadioTile>
                  </div>
                );
              })}
            </TileGroup>

            {/* Les composantes fermées restent visibles, désactivées : en
                masquer une laisserait croire qu'il n'y en a que quatre. */}
            <p className="text-caption text-helper">
              Une composante sans allocation, ou dont le solde est épuisé, n’accepte aucune
              activité tant que son allocation n’a pas été arrêtée.
            </p>

            {/* L'IMPASSE, ET SON ISSUE.

                Quand AUCUNE composante n'est dotée — le cas d'une base
                neuve — les cinq tuiles sont désactivées et l'écran n'offre
                rien. Chaque tuile disait bien « aucune allocation arrêtée »,
                mais personne ne savait où l'arrêter : l'écran d'allocation
                n'existait pas, et le point d'entrée serveur n'était appelé
                par rien. */}
            {allocations.length > 0 && allocations.every((r) => r.allocationUsd === null) && (
              <InlineNotification
                kind="warning"
                lowContrast
                hideCloseButton
                className="mt-4 max-w-none"
                title="Aucune composante n’est dotée sur cet exercice"
                subtitle="Une activité ne s’inscrit au plan que dans la limite de l’allocation de sa composante. Tant qu’aucune n’est arrêtée, ce parcours ne peut pas aboutir."
              />
            )}

            {allocations.length > 0 && allocations.every((r) => r.allocationUsd === null) && (
              /* Le lien vit hors de la notification : `subtitle` n'accepte
                 qu'une chaîne dans cette version de Carbon, et une issue
                 qu'on ne peut pas cliquer n'en est pas une. */
              <Link
                href={year ? `/ptba/exercices/${year.year}` : "/ptba/exercices"}
                className="text-body text-link underline"
              >
                Arrêter les allocations de l’exercice
              </Link>
            )}
          </Question>
        ),
      },

      /* ===== 02 · Identification ===== */
      {
        num: "02",
        label: "Identification",
        sub: "Le code et l’intitulé de l’activité",
        validate: (s) => {
          if (!/^A\d+(\.\d+)*$/.test(s.code.trim()))
            return "Le code doit suivre la forme A2.3.1 — la lettre A, puis les niveaux séparés par des points.";
          if (s.title.trim().length < 5) return "L’intitulé doit faire au moins cinq caractères.";
          return null;
        },
        render: (s, set) => (
          <Question
            titre="Comment cette activité s’identifie-t-elle au plan ?"
            aide="Le code sert de référence dans tous les documents qui découleront de cette ligne — TDR, dossiers d’appel d’offres, rapports."
          >
            <TextInput
              id="etape-code"
              labelText="Code de l’activité"
              placeholder="A2.3.1"
              helperText="La lettre A, puis les niveaux séparés par des points."
              value={s.code}
              onChange={(e) => set({ ...s, code: e.target.value })}
            />
            <TextInput
              id="etape-title"
              labelText="Intitulé de l’activité"
              placeholder="Plateforme nationale d’identité numérique"
              helperText="Ce que l’activité produit, en une phrase."
              value={s.title}
              onChange={(e) => set({ ...s, title: e.target.value })}
            />
            <TextInput
              id="etape-sous"
              labelText="Sous-composante"
              placeholder="2.3"
              helperText="Facultatif — la subdivision du MEP, si elle est connue."
              value={s.subComponent}
              onChange={(e) => set({ ...s, subComponent: e.target.value })}
            />
          </Question>
        ),
      },

      /* ===== 03 · Couverture ===== */
      {
        num: "03",
        label: "Couverture",
        sub: "Une, plusieurs, ou tout le pays",
        render: (s, set) => (
          <Question
            titre="Où cette activité se déploie-t-elle ?"
            aide="Une activité en traverse souvent plusieurs — un backbone Goma–Bukavu en concerne trois. Ne rien choisir vaut couverture nationale, et c’est une réponse en soi."
          >
            <MultiDropdownPicker
              options={optionsProvinces}
              values={s.provinceCodes}
              onChange={(v) => set({ ...s, provinceCodes: v })}
              placeholder="Couverture nationale"
              searchable
              ariaLabel="Provinces couvertes par l’activité"
              resume={(choisis) => {
                const prio = choisis.filter((c) => c.sub).length;
                return `${choisis.length} province${choisis.length > 1 ? "s" : ""}${prio > 0 ? ` · dont ${prio} prioritaire${prio > 1 ? "s" : ""} CPF` : ""}`;
              }}
            />

            {s.provinceCodes.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {s.provinceCodes.map((code) => {
                  const p = provinces.find((x) => x.code === code);
                  return (
                    <Tag
                      key={code}
                      type={p?.isPriorityCpf ? "blue" : "gray"}
                      filter
                      onClose={() =>
                        set({ ...s, provinceCodes: s.provinceCodes.filter((c) => c !== code) })
                      }
                    >
                      {p?.label ?? code}
                    </Tag>
                  );
                })}
              </div>
            )}

            {s.provinceCodes.length === 0 && (
              <p className="border-subtle text-body text-secondary border-l-2 py-1 pl-4">
                Aucune province retenue : l’activité sera enregistrée comme de{" "}
                <strong>couverture nationale</strong>.
              </p>
            )}
          </Question>
        ),
      },

      /* ===== 04 · Enveloppe ===== */
      {
        num: "04",
        label: "Enveloppe",
        sub: "Le montant, et sa ventilation",
        validate: (s) => {
          const montant = Number(s.envelopeUsd);
          if (!montant || montant <= 0) return "Renseignez l’enveloppe de l’activité, en USD.";
          const solde = soldeDe(alloc(s));
          if (solde !== null && montant > solde) {
            return `L’enveloppe dépasse le solde de ${s.componentCode} : ${formatUsdCompact(solde)} disponibles.`;
          }
          const ida = Number(s.idaUsd) || 0;
          const afd = Number(s.afdUsd) || 0;
          if ((ida > 0 || afd > 0) && Math.abs(ida + afd - montant) > 1) {
            return "La ventilation IDA + AFD doit totaliser l’enveloppe.";
          }
          return null;
        },
        render: (s, set) => {
          const solde = soldeDe(alloc(s));
          const montant = Number(s.envelopeUsd) || 0;
          const restant = solde !== null ? solde - montant : null;

          return (
            <Question
              titre="Quelle enveloppe cette activité mobilise-t-elle ?"
              aide="Un montant entier, en dollars. La ventilation par bailleur est facultative — renseignée, elle doit totaliser l’enveloppe."
            >
              <NumberInput
                id="etape-envelope"
                label="Enveloppe en USD"
                min={0}
                step={100000}
                hideSteppers
                allowEmpty
                value={s.envelopeUsd === "" ? "" : Number(s.envelopeUsd)}
                onChange={(_, { value }) =>
                  set({ ...s, envelopeUsd: value === "" ? "" : String(value) })
                }
              />

              {solde !== null && (
                // Le solde reste sous les yeux pendant la frappe : le refus
                // se lit avant la soumission, pas après.
                <div className="border-subtle bg-layer border p-4">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-caption text-secondary">
                      Solde de {s.componentCode} après cette activité
                    </span>
                    <span
                      className="mono text-body tabular-nums"
                      style={{
                        color:
                          restant !== null && restant < 0
                            ? "var(--ptn-status-danger)"
                            : "var(--cds-text-primary)",
                      }}
                    >
                      {formatUsdCompact(restant ?? 0)}
                    </span>
                  </div>
                  <div className="bg-border-subtle mt-2 h-1 w-full overflow-hidden">
                    <i
                      className="block h-full"
                      style={{
                        width: `${Math.min((montant / (solde || 1)) * 100, 100)}%`,
                        background:
                          restant !== null && restant < 0
                            ? "var(--ptn-status-danger)"
                            : `var(--ptn-composante-${s.componentCode.toLowerCase()})`,
                      }}
                    />
                  </div>
                </div>
              )}

              <div className="grid gap-5 sm:grid-cols-2">
                <NumberInput
                  id="etape-ida"
                  label="Part IDA"
                  min={0}
                  step={100000}
                  hideSteppers
                  allowEmpty
                  value={s.idaUsd === "" ? "" : Number(s.idaUsd)}
                  onChange={(_, { value }) =>
                    set({ ...s, idaUsd: value === "" ? "" : String(value) })
                  }
                />
                <NumberInput
                  id="etape-afd"
                  label="Part AFD"
                  min={0}
                  step={100000}
                  hideSteppers
                  allowEmpty
                  value={s.afdUsd === "" ? "" : Number(s.afdUsd)}
                  onChange={(_, { value }) =>
                    set({ ...s, afdUsd: value === "" ? "" : String(value) })
                  }
                />
              </div>
            </Question>
          );
        },
      },

      /* ===== 05 · Porte du contenu ===== */
      {
        num: "05",
        label: "Contenu",
        sub: "Avez-vous de quoi le renseigner ?",
        validate: (s) =>
          s.avecContenu === null ? "Répondez par oui ou par non pour continuer." : null,
        render: (s, set) => (
          <Question
            titre="Souhaitez-vous renseigner le contenu de l’activité maintenant ?"
            aide="Objectifs, livrables attendus, indicateurs, risques et normes. C’est ce dans quoi les futurs TDR viendront puiser — mais rien n’oblige à l’arrêter aujourd’hui."
          >
            <TileGroup
              name="porte-contenu"
              legend="Contenu de l’activité"
              valueSelected={s.avecContenu === null ? undefined : s.avecContenu ? "oui" : "non"}
              onChange={(v) => set({ ...s, avecContenu: v === "oui" })}
            >
              <RadioTile id="contenu-oui" value="oui">
                <div className="flex flex-col gap-1">
                  <span className="text-body text-primary font-medium">
                    Oui, renseignons-le maintenant
                  </span>
                  <span className="text-caption text-secondary">
                    Cinq écrans supplémentaires. Chaque liste reste facultative.
                  </span>
                </div>
              </RadioTile>
              <RadioTile id="contenu-non" value="non">
                <div className="flex flex-col gap-1">
                  <span className="text-body text-primary font-medium">
                    Non, l’inscrire au plan d’abord
                  </span>
                  <span className="text-caption text-secondary">
                    L’activité rejoint le plan sans contenu. Il se complétera plus tard, depuis
                    sa fiche.
                  </span>
                </div>
              </RadioTile>
            </TileGroup>

            {s.avecContenu === false && (
              <InlineNotification
                kind="info"
                lowContrast
                hideCloseButton
                title="Conséquence"
                subtitle="Un TDR qui se rattachera à cette activité n’aura rien à y puiser tant que son contenu n’est pas renseigné."
                className="max-w-none"
              />
            )}
          </Question>
        ),
      },

      /* ===== 06 · Objectifs ===== */
      {
        num: "06",
        label: "Objectifs",
        sub: "Ce que l’activité doit atteindre",
        visibleIf: (s) => s.avecContenu === true,
        render: (s, set) => (
          <Question
            large
            titre="Quels objectifs cette activité doit-elle atteindre ?"
            aide="Ce que l’activité doit atteindre, non ce qu’un marché exécute pour y concourir. Un TDR rattachera les siens sans en hériter."
          >
            <GrilleCartes
              idBase="obj"
              items={s.objectives}
              vide={{ title: "", criteria: "" }}
              onChange={(v) => set({ ...s, objectives: v })}
              prefix="O"
              ajouterLabel="Ajouter un objectif"
              videTexte="Aucun objectif pour l’instant. Ajoutez-en un, ou passez à l’étape suivante."
              resume={(o) => ({ titre: o.title, sous: o.criteria })}
              suggestions={SUGGESTIONS.objectifs}
              champs={[
                {
                  cle: "title",
                  libelle: "Objectif",
                  placeholder: "Doter [l’institution] de [capacité]",
                  large: true,
                },
                {
                  cle: "criteria",
                  libelle: "Comment on le constatera",
                  placeholder: "[Ce qui sera constaté], vérifié par [source]",
                  large: true,
                },
              ]}
            />
          </Question>
        ),
      },

      /* ===== 07 · Livrables ===== */
      {
        num: "07",
        label: "Livrables",
        sub: "Ce que l’activité produit",
        visibleIf: (s) => s.avecContenu === true,
        render: (s, set) => (
          <Question
            large
            titre="Quels livrables l’activité doit-elle produire ?"
            aide="La réserve dans laquelle les TDR viendront puiser : un marché commande le local, un autre les équipements."
          >
            <GrilleCartes
              idBase="liv"
              items={s.deliverables}
              vide={{ title: "", format: "", deadline: "" }}
              onChange={(v) => set({ ...s, deliverables: v })}
              prefix="L"
              ajouterLabel="Ajouter un livrable"
              videTexte="Aucun livrable pour l’instant."
              resume={(d) => ({
                titre: d.title,
                sous: [d.format, d.deadline].filter(Boolean).join(" · "),
              })}
              suggestions={SUGGESTIONS.livrables}
              champs={[
                { cle: "title", libelle: "Livrable", placeholder: "[Ouvrage] réceptionné", large: true },
                { cle: "format", libelle: "Sous quelle forme", placeholder: "Procès-verbal de réception" },
                { cle: "deadline", libelle: "À quelle échéance", placeholder: "M+[n]" },
              ]}
            />
          </Question>
        ),
      },

      /* ===== 08 · Indicateurs ===== */
      {
        num: "08",
        label: "Indicateurs",
        sub: "Ce qui remonte au cadre de résultats",
        visibleIf: (s) => s.avecContenu === true,
        render: (s, set) => (
          <Question
            large
            titre="À quels indicateurs mesure-t-on le résultat ?"
            aide="Seuls éléments de l’activité qui remontent : ils alimentent le cadre de résultats de la composante."
          >
            <GrilleCartes
              idBase="ind"
              items={s.indicators}
              vide={{ label: "", measure: "", target: "" }}
              onChange={(v) => set({ ...s, indicators: v })}
              ajouterLabel="Ajouter un indicateur"
              videTexte="Aucun indicateur pour l’instant. Sans lui, rien de cette activité ne remonte au cadre de résultats."
              resume={(n) => ({
                titre: n.label,
                sous: [n.target && `cible ${n.target}`, n.measure].filter(Boolean).join(" · "),
              })}
              suggestions={SUGGESTIONS.indicateurs}
              champs={[
                { cle: "label", libelle: "Indicateur", placeholder: "[Service] opérationnel", large: true },
                { cle: "measure", libelle: "Unité ou méthode de mesure", placeholder: "Source de vérification" },
                { cle: "target", libelle: "Cible", placeholder: "[cible]" },
              ]}
            />
          </Question>
        ),
      },

      /* ===== 09 · Risques ===== */
      {
        num: "09",
        label: "Risques",
        sub: "Ce qui peut l’empêcher, et la parade",
        visibleIf: (s) => s.avecContenu === true,
        render: (s, set) => (
          <Question
            large
            titre="Quels risques pèsent sur cette activité ?"
            aide="Les risques propres à son objet. Ceux qui tiennent à la forme du marché — retard de chantier, défaillance d’attributaire — restent au référentiel du type de TDR."
          >
            <GrilleCartes
              idBase="ris"
              items={s.risks}
              vide={{ label: "", description: "", mitigation: "", level: "" }}
              onChange={(v) => set({ ...s, risks: v })}
              ajouterLabel="Ajouter un risque"
              videTexte="Aucun risque consigné pour l’instant."
              resume={(r) => ({
                titre: r.label,
                sous: [r.level && NIVEAUX.find((n) => n.value === r.level)?.label, r.mitigation]
                  .filter(Boolean)
                  .join(" · "),
              })}
              suggestions={SUGGESTIONS.risques}
              champs={[
                { cle: "label", libelle: "Risque", placeholder: "Retard de [dépendance]", large: true },
                { cle: "mitigation", libelle: "Atténuation prévue", placeholder: "[Parade prévue]", large: true },
                { cle: "level", libelle: "Niveau", options: NIVEAUX },
              ]}
            />
          </Question>
        ),
      },

      /* ===== 10 · Normes ===== */
      {
        num: "10",
        label: "Normes",
        sub: "Ce à quoi l’activité doit se conformer",
        visibleIf: (s) => s.avecContenu === true,
        render: (s, set) => (
          <Question
            large
            titre="Quelles normes s’imposent à cette activité ?"
            aide="ISO 27001, ICAO 9303… Les clauses contractuelles, elles, suivent la forme du marché et restent au référentiel du type de TDR."
          >
            <GrilleCartes
              idBase="cla"
              items={s.clauses}
              vide={{ label: "", text: "" }}
              onChange={(v) => set({ ...s, clauses: v })}
              ajouterLabel="Ajouter une norme"
              videTexte="Aucune norme rattachée pour l’instant."
              resume={(c) => ({ titre: c.label, sous: c.text })}
              suggestions={SUGGESTIONS.normes}
              champs={[
                { cle: "label", libelle: "Norme", placeholder: "ISO 27001" },
                { cle: "text", libelle: "Sa portée ici", placeholder: "Portée : [périmètre couvert]", large: true },
              ]}
            />
          </Question>
        ),
      },

      /* ===== 11 · Récapitulatif ===== */
      {
        num: "11",
        label: "Récapitulatif",
        sub: "Rien n’est écrit avant cet écran",
        render: (s) => {
          const r = alloc(s);
          const solde = soldeDe(r);
          const montant = Number(s.envelopeUsd) || 0;
          const nbContenu =
            s.objectives.filter((o) => o.title.trim()).length +
            s.deliverables.filter((d) => d.title.trim()).length +
            s.indicators.filter((i) => i.label.trim()).length +
            s.risks.filter((x) => x.label.trim()).length +
            s.clauses.filter((c) => c.label.trim()).length;

          return (
            <Question
              titre="Tout est-il exact ?"
              aide="L’inscription ouvre une enveloppe au plan de l’exercice. L’activité devient aussitôt un rattachement possible pour un TDR."
            >
              <dl className="border-subtle border px-4">
                <Recap
                  cle="Composante"
                  valeur={
                    <span className="inline-flex items-center gap-2">
                      <i
                        aria-hidden
                        className="inline-block h-2.5 w-2.5"
                        style={{ background: `var(--ptn-composante-${s.componentCode.toLowerCase()})` }}
                      />
                      {s.componentCode} · {r?.shortLabel}
                    </span>
                  }
                />
                <Recap cle="Code" valeur={<span className="mono">{s.code}</span>} />
                <Recap cle="Intitulé" valeur={s.title} />
                {s.subComponent && (
                  <Recap cle="Sous-composante" valeur={<span className="mono">{s.subComponent}</span>} />
                )}
                <Recap
                  cle="Couverture"
                  valeur={
                    s.provinceCodes.length === 0
                      ? "Nationale"
                      : s.provinceCodes
                          .map((c) => provinces.find((p) => p.code === c)?.label ?? c)
                          .join(", ")
                  }
                />
                <Recap
                  cle="Enveloppe"
                  valeur={<span className="mono">{formatUsdCompact(montant)}</span>}
                />
                {(s.idaUsd || s.afdUsd) && (
                  <Recap
                    cle="Ventilation"
                    valeur={
                      <span className="mono">
                        IDA {formatUsdCompact(Number(s.idaUsd) || 0)} · AFD{" "}
                        {formatUsdCompact(Number(s.afdUsd) || 0)}
                      </span>
                    }
                  />
                )}
                {solde !== null && (
                  <Recap
                    cle={`Solde de ${s.componentCode} après inscription`}
                    valeur={<span className="mono">{formatUsdCompact(solde - montant)}</span>}
                  />
                )}
                <Recap
                  cle="Contenu"
                  valeur={
                    // L'étape sautée est dite, jamais tue : un écran qu'on
                    // n'a pas vu ne doit pas disparaître du compte rendu.
                    s.avecContenu
                      ? `${nbContenu} élément${nbContenu > 1 ? "s" : ""} renseigné${nbContenu > 1 ? "s" : ""}`
                      : "Non renseigné — à compléter depuis la fiche de l’activité"
                  }
                />
              </dl>

              {s.avecContenu === false && (
                <InlineNotification
                  kind="info"
                  lowContrast
                  hideCloseButton
                  title="Contenu non renseigné"
                  subtitle="Les cinq écrans de contenu ont été passés. Un TDR rattaché à cette activité n’aura rien à y puiser tant qu’elle reste vide."
                  className="max-w-none"
                />
              )}

              {erreurFinale && (
                <InlineNotification
                  kind="error"
                  lowContrast
                  hideCloseButton
                  title="Inscription refusée"
                  subtitle={erreurFinale}
                  className="max-w-none"
                />
              )}
            </Question>
          );
        },
      },
    ];
  }, [allocations, provinces, optionsProvinces, erreurFinale, year]);

  /* ---------------- Garde-fous d'accès ---------------- */

  if (!authLoading && !peutEcrire) {
    return (
      <div className="mx-auto max-w-[46rem] p-10">
        <InlineNotification
          kind="info"
          lowContrast
          hideCloseButton
          title="Lecture seule"
          subtitle="Votre habilitation ne permet pas d’écrire au plan annuel."
          className="max-w-none"
        />
      </div>
    );
  }

  if (chargement) {
    return (
      <div className="mx-auto max-w-[46rem] p-10">
        <p className="text-body text-secondary">Chargement de l’exercice…</p>
      </div>
    );
  }

  if (!year || !editable) {
    return (
      <div className="mx-auto flex max-w-[46rem] flex-col gap-4 p-10">
        <InlineNotification
          kind="warning"
          lowContrast
          hideCloseButton
          title={year ? `L’exercice ${year.year} n’est plus ouvert à l’écriture` : "Aucun exercice ouvert"}
          subtitle={
            year
              ? "Un plan validé est opposable : il ne se modifie plus. Une correction suppose une révision de l’exercice."
              : "Un plan se saisit sur un exercice : il faut d’abord en ouvrir un."
          }
          className="max-w-none"
        />
        <div>
          <Button kind="secondary" onClick={() => router.push("/ptba")}>
            Retour au registre
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      {avertissement && (
        <div className="p-4">
          <InlineNotification
            kind="warning"
            lowContrast
            hideCloseButton
            title="Cadrage budgétaire indisponible"
            subtitle={avertissement}
            className="max-w-none"
          />
        </div>
      )}

      <Wizard<EtatAssistant>
        eyebrow={`UGP · PTBA ${year.year}`}
        title="Inscrire une activité au plan"
        subtitle="Un écran, une question. Rien n’est enregistré avant le récapitulatif."
        steps={steps}
        initialState={ETAT_INITIAL}
        cancelHref="/ptba"
        finishLabel="Inscrire au plan"
        // Aucun brouillon serveur : la puce le promettrait à tort.
        draftChip={false}
        onFinish={async (s) => {
          setErreurFinale(null);
          try {
            const cree = await ptbaApi.createActivity(year.year, {
              code: s.code.trim(),
              title: s.title.trim(),
              componentCode: s.componentCode,
              subComponent: s.subComponent.trim() || undefined,
              envelopeUsd: Number(s.envelopeUsd),
              idaUsd: s.idaUsd ? Number(s.idaUsd) : undefined,
              afdUsd: s.afdUsd ? Number(s.afdUsd) : undefined,
              provinceCodes: s.provinceCodes,
              objectives: s.avecContenu ? s.objectives : [],
              deliverables: s.avecContenu ? s.deliverables : [],
              indicators: s.avecContenu ? s.indicators : [],
              risks: s.avecContenu ? s.risks : [],
              clauses: s.avecContenu ? s.clauses : [],
            });
            router.push(`/ptba/${cree.id}`);
          } catch (e) {
            const message =
              e instanceof ApiError || e instanceof Error
                ? e.message
                : "Inscription impossible.";
            setErreurFinale(message);
            // Relancé pour que le Wizard reste sur le récapitulatif.
            throw new Error(message);
          }
        }}
      />
    </>
  );
}
