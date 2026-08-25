"use client";

/**
 * Étape 15 — le budget du marché.
 *
 * L'écran demandait quatre nombres et n'en disait rien. Il annonçait
 * l'enveloppe de l'activité comme plafond — « le budget du TDR ne peut
 * l'excéder » — alors que d'autres dossiers l'entamaient déjà. Un auteur
 * saisissait un montant qui passait le contrôle local, et se le voyait
 * refuser cinq étapes plus loin, à la transmission, par un message qui lui
 * apprenait pour la première fois que la ligne portait onze autres dossiers.
 *
 * Trois choses manquaient, et ce sont elles qui font le nouvel écran :
 *
 *   — LA SITUATION. Ce que la ligne du plan porte déjà, ce qu'il y reste.
 *     Le cumul n'est connu que du serveur : la liste des TDR est restreinte
 *     à l'organisation de l'appelant, le calculer ici le sous-estimerait.
 *   — L'IMPACT. Le reste disponible se recalcule à la frappe, et la méthode
 *     de passation déduite du montant s'affiche pendant la saisie — deux
 *     conséquences qu'on découvrait après coup.
 *   — LES PARTS. La ventilation par source, rapportée à celle que le plan a
 *     déjà arrêtée pour cette ligne. Référence, jamais règle : la source de
 *     financement d'un marché est une décision fiduciaire, pas une règle de
 *     trois — aucun bouton ne la remplit d'office.
 *
 * Rien ici n'est ouvert à l'assistance. Les montants se dictent, ils ne se
 * proposent pas : « propose un budget » est une fabrication, et le socle la
 * proscrit.
 */

import { useEffect, useState } from "react";
import { WarningAltFilled } from "@carbon/icons-react";
import { Note } from "@/components/wizard/WizardFields";
import {
  tdrReferentielApi,
  type PtbaActivityApi,
  type TdrEnvelopeApi,
  type TdrTypeApi,
} from "@/lib/api";
import { formatUsd, formatUsdBare, formatUsdCompact } from "@/lib/format";
import type { State } from "../etat";
import { ChampMontant } from "./ChampMontant";

export function EtapeBudget({
  state,
  set,
  activity,
  type,
  enveloppe,
  enveloppeEnCours,
}: {
  state: State;
  set: (s: State) => void;
  activity?: PtbaActivityApi;
  type?: TdrTypeApi;
  /** Situation de la ligne, chargée par l'orchestrateur. `null` = pas encore connue. */
  enveloppe: TdrEnvelopeApi | null;
  enveloppeEnCours: boolean;
}) {
  const total = Number(state.budgetTotalUsd || 0);

  return (
    <div className="mx-auto flex w-full max-w-[60rem] flex-col gap-6">
      <header className="max-w-[68ch]">
        <h3 className="text-heading-03 text-primary">
          Quel budget ce marché engage-t-il ?
        </h3>
        <p className="text-body-lg text-secondary mt-3">
          {state.sansRattachement
            ? "Ce dossier ne relève d’aucune ligne du plan : aucune enveloppe ne le borne. Le montant commande la méthode de passation."
            : "Le montant se prend sur l’enveloppe de la ligne du plan, que d’autres marchés partagent. Il commande aussi la méthode de passation."}
        </p>
      </header>

      {/* SANS RATTACHEMENT, PAS DE SITUATION DE LIGNE À MONTRER.
          Le bloc afficherait un cadre vide là où l'on attend des chiffres,
          ce qui se lit comme une donnée manquante plutôt que comme une
          absence voulue. Un avertissement le dit à sa place. */}
      {state.sansRattachement ? (
        <div className="border-warning bg-warning-surface border-l-2 px-4 py-3">
          <p className="text-body text-primary">Aucun plafond opposable</p>
          <p className="text-body-compact text-secondary mt-1 max-w-[68ch]">
            Le montant n’est comparé à aucune enveloppe et n’entame celle d’aucune activité.
            C’est l’instruction qui appréciera.
          </p>
        </div>
      ) : (
        <SituationLigne
          enveloppe={enveloppe}
          enCours={enveloppeEnCours}
          activity={activity}
          demande={total}
        />
      )}

      <ChampTotal state={state} set={set} type={type} enveloppe={enveloppe} />

      <Ventilation state={state} set={set} enveloppe={enveloppe} />

      <Glossaire />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* La ligne du plan                                                    */
/* ------------------------------------------------------------------ */

/**
 * Ce que la ligne porte, et ce qu'il y reste.
 *
 * Trois états distincts, jamais confondus : en cours de chargement, aucune
 * ligne rattachée, situation connue. Annoncer « rien d'engagé » pendant le
 * chargement serait le pire des trois — c'est un chiffre sur lequel on
 * s'engage.
 */
function SituationLigne({
  enveloppe,
  enCours,
  activity,
  demande,
}: {
  enveloppe: TdrEnvelopeApi | null;
  enCours: boolean;
  activity?: PtbaActivityApi;
  demande: number;
}) {
  if (enCours) {
    return (
      <div className="border-subtle bg-layer text-body text-secondary border p-4">
        Lecture de la ligne du plan…
      </div>
    );
  }

  if (!enveloppe) {
    return (
      <Note tone="warning" title="Situation de l’enveloppe indisponible">
        {activity
          ? `L’activité ${activity.code} est rattachée, mais ce qu’elle porte déjà n’a pas pu être lu. Le contrôle final reste tenu par le serveur à la transmission.`
          : "Aucune ligne du plan n’est rattachée à ce dossier."}
      </Note>
    );
  }

  const { envelopeUsd, engagedUsd, otherCount, remainingUsd } = enveloppe;
  const resteApres = remainingUsd - demande;
  const depassement = Math.max(0, -resteApres);
  const dossierTenu = demande - depassement;

  // Échelle du ruban. Elle suit le dépassement quand il y en a un, sinon la
  // barre sortirait du cadre sans que rien ne le montre.
  const base = Math.max(envelopeUsd, engagedUsd + demande) || 1;
  const part = (v: number) => `${(v / base) * 100}%`;

  return (
    <section className="border-subtle bg-layer flex flex-col gap-3 border p-4">
      <header className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h4 className="text-heading-02 text-primary">
          Activité {enveloppe.activityCode}
        </h4>
        <span className="text-caption text-secondary">{enveloppe.activityTitle}</span>
      </header>

      {/* Ruban de l'enveloppe. `aria-hidden` : les chiffres qui suivent sont
          le contenu, la barre n'en est que la forme — une barre ne se lit
          pas à voix haute, et la doubler d'un libellé la ferait entendre
          deux fois. */}
      <div
        aria-hidden
        className="bg-layer-accent flex h-3 w-full overflow-hidden"
      >
        <div className="bg-strong h-full" style={{ width: part(engagedUsd) }} />
        <div className="bg-accent h-full" style={{ width: part(Math.max(0, dossierTenu)) }} />
        <div className="bg-danger h-full" style={{ width: part(depassement) }} />
      </div>

      <dl className="grid grid-cols-2 gap-x-6 gap-y-2 md:grid-cols-4">
        <Chiffre cle="Enveloppe de l’activité" valeur={formatUsd(envelopeUsd)} />
        {/* Le compte des dossiers ne va PAS dans ce libellé : une ligne peut
            porter un autre dossier qui n'a pas encore de montant, et
            « Déjà engagé · 1 autre dossier » affichant 0 USD se lit comme une
            contradiction. Le nombre est dit en toutes lettres plus bas. */}
        <Chiffre
          cle="Engagé par des dossiers transmis"
          valeur={formatUsd(engagedUsd)}
          repere={engagedUsd > 0 ? "bg-strong" : undefined}
        />
        <Chiffre
          cle="Ce dossier"
          valeur={demande > 0 ? formatUsd(demande) : "—"}
          repere={demande > 0 ? (depassement > 0 ? "bg-danger" : "bg-accent") : undefined}
        />
        <Chiffre
          cle={resteApres < 0 ? "Dépassement" : "Reste disponible"}
          valeur={formatUsd(Math.abs(resteApres))}
          ton={resteApres < 0 ? "danger" : resteApres === 0 ? "secondary" : "primary"}
        />
      </dl>

      <p className="text-caption text-secondary max-w-[68ch]">
        {otherCount === 0
          ? "Aucun autre dossier ne vise cette ligne du plan."
          : `${otherCount} autre${otherCount > 1 ? "s" : ""} dossier${otherCount > 1 ? "s" : ""} transmis vise${otherCount > 1 ? "nt" : ""} cette ligne. `}
        {"Seuls les dossiers TRANSMIS entament l’enveloppe. Les brouillons — le vôtre comme ceux des autres — n’y comptent pas : rien n’est engagé tant qu’un dossier n’a pas quitté la main de son auteur. Le contrôle se fait à la transmission. Les dossiers refusés et archivés libèrent ce qu’ils avaient pris."}
      </p>

      {resteApres < 0 && (
        <p className="text-caption text-danger-text flex items-start gap-2">
          <WarningAltFilled size={16} className="mt-0.5 shrink-0" aria-hidden />
          La ligne {enveloppe.activityCode} ne peut pas porter ce montant. Réduisez le
          budget, ou faites relever l’enveloppe au plan avant de transmettre.
        </p>
      )}
    </section>
  );
}

function Chiffre({
  cle,
  valeur,
  ton = "primary",
  repere,
}: {
  cle: string;
  valeur: string;
  ton?: "primary" | "secondary" | "danger";
  repere?: string;
}) {
  const couleur =
    ton === "danger" ? "text-danger-text" : ton === "secondary" ? "text-secondary" : "text-primary";
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-caption text-secondary flex items-center gap-1.5">
        {repere && <span aria-hidden className={`inline-block h-2 w-2 ${repere}`} />}
        {cle}
      </dt>
      {/* Chiffres en chasse fixe : c'est ce qui rend deux montants
          superposables d'un coup d'œil, donc comparables. */}
      <dd className={`ptn-mono text-body ${couleur}`}>{valeur}</dd>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Le montant, et ce qu'il déclenche                                   */
/* ------------------------------------------------------------------ */

function ChampTotal({
  state,
  set,
  type,
  enveloppe,
}: {
  state: State;
  set: (s: State) => void;
  type?: TdrTypeApi;
  enveloppe: TdrEnvelopeApi | null;
}) {
  const total = Number(state.budgetTotalUsd || 0);

  // La catégorie vient du référentiel, comme côté serveur. Elle était figée
  // sur SERVICES_CONSULTANTS : un TDR de travaux à 20 M USD annonçait SFQC
  // quand la transmission figeait AOI, et les types opérationnels — qui ne
  // relèvent d'aucune méthode — s'en voyaient attribuer une.
  const category = type?.procurementCategory ?? null;

  /**
   * Méthode déduite, estampillée du montant qui l'a produite.
   *
   * Le montant sert de jeton : sans lui, la méthode du montant précédent
   * restait affichée pendant la requête suivante, et un auteur qui corrigeait
   * 20 M en 200 000 lisait encore « AOI » une seconde de trop. C'est aussi ce
   * qui évite d'écrire dans un effet à chaque frappe.
   */
  const [methode, setMethode] = useState<{
    pourTotal: number;
    code: string;
    review: string;
  } | null>(null);

  useEffect(() => {
    if (!total || total <= 0 || !category) return;
    let annule = false;
    tdrReferentielApi
      .resolveMethod(category, total)
      .then((r) => {
        if (annule || !r) return;
        setMethode({ pourTotal: total, code: r.method.code, review: r.reviewType });
      })
      .catch(() => undefined);
    return () => {
      annule = true;
    };
  }, [total, category]);

  const affichee = methode && methode.pourTotal === total ? methode : null;
  const depasse = enveloppe ? total > enveloppe.remainingUsd : false;

  return (
    <div className="flex flex-col gap-3">
      <ChampMontantTotal
        state={state}
        set={set}
        depasse={depasse}
        reste={enveloppe?.remainingUsd ?? null}
      />

      {affichee && (
        <div className="border-accent bg-accent-surface flex flex-col gap-1 border-l-2 px-4 py-3">
          <p className="text-body text-primary">
            Méthode de passation déduite : <strong>{affichee.code}</strong> · revue{" "}
            <strong>{affichee.review === "PRIOR" ? "préalable" : "postérieure"}</strong>
          </p>
          <p className="text-caption text-secondary">
            Indicative. La méthode retenue est arrêtée à la transmission, depuis les seuils
            alors en vigueur et le montant alors saisi.
          </p>
        </div>
      )}
    </div>
  );
}

function ChampMontantTotal({
  state,
  set,
  depasse,
  reste,
}: {
  state: State;
  set: (s: State) => void;
  depasse: boolean;
  reste: number | null;
}) {
  const total = Number(state.budgetTotalUsd || 0);
  return (
    <ChampMontant
      label="Budget total du marché (USD)"
      required
      valeur={state.budgetTotalUsd}
      onChange={(v) => set({ ...state, budgetTotalUsd: v })}
      placeholder="0"
      error={
        depasse && reste !== null
          ? `Il ne reste que ${formatUsd(reste)} sur cette ligne du plan.`
          : null
      }
      helper={
        total > 0 ? (
          // L'abrégé sous le champ : la lecture en millions est celle des
          // comités, la lecture au dollar près celle de la saisie. Les deux
          // ensemble, on ne se trompe pas d'ordre de grandeur.
          <>Soit {formatUsdCompact(total)}</>
        ) : (
          "En dollars entiers. Les milliers se groupent à mesure."
        )
      }
    />
  );
}

/* ------------------------------------------------------------------ */
/* Les parts                                                           */
/* ------------------------------------------------------------------ */

/**
 * Ventilation par source de financement.
 *
 * Facultative — beaucoup de dossiers partent sans elle. Mais dès qu'une part
 * est saisie, le total doit se retrouver : IDA et AFD ne se consolident
 * jamais sans que la répartition reste visible, et une ventilation qui ne
 * tombe pas juste est un écart que le bailleur relèvera.
 *
 * La ligne du plan porte sa propre ventilation. Elle est rappelée ici pour
 * situer, non pour prescrire : aucun bouton ne recopie ces proportions, la
 * source de financement d'un marché ne se déduit pas d'une règle de trois.
 */
function Ventilation({
  state,
  set,
  enveloppe,
}: {
  state: State;
  set: (s: State) => void;
  enveloppe: TdrEnvelopeApi | null;
}) {
  const total = Number(state.budgetTotalUsd || 0);
  // Une teinte par guichet. Sourdes et distinctes — elles servent à
  // rapprocher un champ de sa barre, pas à hiérarchiser : aucun bailleur
  // n'est plus important qu'un autre.
  const parts = [
    {
      cle: "budgetIdaUsd" as const,
      label: "Part IDA (USD)",
      court: "IDA",
      teinte: "var(--ptn-bailleur-ida)",
    },
    {
      cle: "budgetAfdUsd" as const,
      label: "Part AFD (USD)",
      court: "AFD",
      teinte: "var(--ptn-bailleur-afd)",
    },
    {
      cle: "budgetGovUsd" as const,
      label: "Part Gouvernement (USD)",
      court: "Gouvernement",
      teinte: "var(--ptn-bailleur-gouv)",
    },
  ];

  const ventile = parts.reduce((s, p) => s + Number(state[p.cle] || 0), 0);
  const ecart = total - ventile;
  const saisie = parts.some((p) => Number(state[p.cle] || 0) > 0);

  // Ventilation de la ligne, quand le plan l'a arrêtée. Le reste — ce que ni
  // l'IDA ni l'AFD ne couvrent — n'est pas déduit : le plan ne le dit pas.
  const refIda = enveloppe?.idaUsd ?? null;
  const refAfd = enveloppe?.afdUsd ?? null;
  const refBase = enveloppe?.envelopeUsd ?? 0;
  const reference =
    refBase > 0 && (refIda !== null || refAfd !== null)
      ? [
          refIda !== null ? `IDA ${Math.round((refIda / refBase) * 100)} %` : null,
          refAfd !== null ? `AFD ${Math.round((refAfd / refBase) * 100)} %` : null,
        ]
          .filter(Boolean)
          .join(" · ")
      : null;

  return (
    <section className="flex flex-col gap-3">
      <header>
        <h4 className="text-heading-02 text-primary">Qui finance, et pour quelle part ?</h4>
        <p className="text-body text-secondary mt-1 max-w-[68ch]">
          Facultative. Renseignée, elle doit tomber juste : le cofinancement est à deux
          guichets, et IDA et AFD ne se consolident jamais sans que la répartition reste
          visible.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-x-6 gap-y-4 md:grid-cols-3">
        {parts.map((p) => (
          // Filet de teinte plutôt que champ coloré : c'est ce qui rattache
          // la saisie à sa barre plus bas, sans peindre un formulaire.
          <div
            key={p.cle}
            className="border-l-2 pl-3"
            style={{ borderColor: p.teinte }}
          >
            <ChampMontant
              label={p.label}
              valeur={state[p.cle]}
              onChange={(v) => set({ ...state, [p.cle]: v })}
              placeholder="0"
              helper={
                total > 0 && Number(state[p.cle] || 0) > 0
                  ? `${((Number(state[p.cle]) / total) * 100).toFixed(1).replace(".", ",")} % du budget`
                  : undefined
              }
            />
          </div>
        ))}
      </div>

      {saisie && (
        <div className="border-subtle bg-layer flex flex-col gap-2 border p-4">
          {/* Une barre par source, chacune dans la teinte de son champ.
              Les jetons `--ptn-bailleur-*` sont universels : un guichet ne
              change pas de couleur selon le profil connecté. Le libellé et
              le pourcentage restent le contenu — c'est ce qui tient à
              l'impression en noir et blanc, où la teinte disparaît. */}
          {parts
            .filter((p) => Number(state[p.cle] || 0) > 0)
            .map((p) => {
              const v = Number(state[p.cle]);
              const pct = total > 0 ? (v / total) * 100 : 0;
              return (
                <div key={p.cle} className="flex items-center gap-3">
                  <span className="text-caption text-secondary flex w-28 shrink-0 items-center gap-2">
                    <span
                      aria-hidden
                      className="inline-block h-2.5 w-2.5 shrink-0"
                      style={{ background: p.teinte }}
                    />
                    {p.court}
                  </span>
                  <span aria-hidden className="bg-layer-accent h-2 flex-1 overflow-hidden">
                    <span
                      className="block h-full"
                      style={{ width: `${Math.min(100, pct)}%`, background: p.teinte }}
                    />
                  </span>
                  <span className="ptn-mono text-caption text-primary w-40 shrink-0 text-right">
                    {formatUsdBare(v)}
                  </span>
                  <span className="ptn-mono text-caption text-secondary w-16 shrink-0 text-right">
                    {total > 0 ? `${pct.toFixed(1).replace(".", ",")} %` : "—"}
                  </span>
                </div>
              );
            })}

          <p
            className={`text-caption ${ecart === 0 ? "text-success-text" : "text-warning-text"}`}
          >
            {ecart === 0
              ? "La ventilation correspond au budget total."
              : ecart > 0
                ? `Il reste ${formatUsd(ecart)} à ventiler.`
                : `La ventilation dépasse le budget total de ${formatUsd(-ecart)}.`}
          </p>
        </div>
      )}

      {reference && (
        <p className="text-caption text-secondary max-w-[68ch]">
          Pour situer : la ligne {enveloppe?.activityCode} est inscrite au plan à{" "}
          {reference}. C’est la ventilation de l’enveloppe, pas une règle pour ce marché —
          la source de financement d’un marché relève de la décision fiduciaire.
        </p>
      )}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Glossaire                                                           */
/* ------------------------------------------------------------------ */

/**
 * Cinq sigles, à portée de main.
 *
 * Ouvert, et non replié derrière un panneau à déplier. Un glossaire replié
 * suppose qu'on sache qu'il est là : celui qui bute sur « IDA » ne cherche
 * pas un bouton, il cherche une définition. Le déplier coûtait un clic à
 * qui en avait besoin, et n'économisait rien à qui n'en avait pas — le
 * bloc se saute d'un regard.
 *
 * Détaché du formulaire par un filet et de la marge : ce n'est pas une
 * question de plus à remplir, et l'écran doit le dire avant qu'on le lise.
 *
 * Les chiffres viennent du MEP du 23 juin 2025 et de l'accord de
 * cofinancement. Ne rien y ajouter qui ne soit attesté.
 */
function Glossaire() {
  return (
    <section className="border-subtle mt-6 border-t pt-6">
      <h4 className="text-heading-02 text-primary">Glossaire</h4>
      <p className="text-caption text-secondary mt-1">
        MEP du 23 juin 2025 et accord de cofinancement.
      </p>
      <dl className="mt-4 flex flex-col gap-4">
        <Terme sigle="IDA">
          Association internationale de développement, guichet concessionnel du Groupe de
          la Banque mondiale. Chef de file du cofinancement : 400 M USD, soit 79 % des
          510 M du projet.
        </Terme>
        <Terme sigle="AFD">
          Agence Française de Développement, cofinancier : 110 M USD (100 M EUR), soit
          21 %.
        </Terme>
        <Terme sigle="Part Gouvernement">
          Part prise en charge par l’État sur ses ressources propres. Elle ne relève
          d’aucun des deux guichets du cofinancement.
        </Terme>
        <Terme sigle="Enveloppe de l’activité">
          Le montant inscrit au PTBA pour cette ligne du plan. Il borne l’ensemble des
          marchés qui s’y rattachent, cumulés — pas chacun pris à part.
        </Terme>
        <Terme sigle="Revue préalable · postérieure">
          Préalable : le bailleur donne son avis de non-objection avant que la passation
          se poursuive. Postérieure : il contrôle après coup, par échantillon. Le seuil
          de bascule dépend de la méthode et du montant.
        </Terme>
      </dl>
    </section>
  );
}

function Terme({ sigle, children }: { sigle: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-heading-01 text-primary">{sigle}</dt>
      <dd className="text-body text-secondary max-w-[68ch]">{children}</dd>
    </div>
  );
}
