"use client";

/**
 * Un exercice budgétaire : son état, son arrêté, ses allocations.
 *
 * POURQUOI LES ALLOCATIONS SONT ICI. Elles avaient leur propre route,
 * `/ptba/allocations`, qui déduisait seule de quel exercice elle parlait —
 * le plus récent non clos — pendant que le registre en retenait un autre —
 * le plus récent, même clos. Deux définitions de « l'exercice courant »
 * dans un même module, qui divergent dès que le plus récent est clos. Et
 * aucun moyen de revoir les allocations d'une année passée.
 *
 * L'année est maintenant dans l'URL : plus de déduction, donc plus de
 * divergence possible, et les exercices passés redeviennent lisibles.
 *
 * L'ÉCRITURE SUIT L'ÉTAT DE L'EXERCICE. `assertContentEditable` refuse
 * côté serveur toute allocation sur un exercice validé ou clos. L'écran
 * s'aligne : au-delà de BROUILLON il n'offre plus de bouton d'arrêté —
 * l'ancien en proposait un, qui ne pouvait que revenir en refus.
 *
 * DEUX PLAFONDS, ET UN PLANCHER. Ils viennent du serveur, qui les tient
 * seul ; l'écran les rappelle pour qu'on ne les découvre pas au refus.
 *
 *  · l'allocation ne peut dépasser la DOTATION DE PROJET de la composante
 *    (MEP Tableau 2), déduction faite de ce que les AUTRES exercices ont
 *    déjà pris ;
 *  · elle ne peut descendre sous ce que le plan de l'exercice ENGAGE DÉJÀ —
 *    retirer une enveloppe à des activités inscrites les laisserait sans
 *    couverture budgétaire.
 *
 * UNE ALLOCATION N'EST PAS UNE SAISIE. C'est un acte du COPIL : elle ouvre
 * un droit de dépense. On en arrête une, on la relit, on passe à la
 * suivante — d'où la boîte de dialogue, et non cinq champs dans un
 * formulaire qui ferait passer pour une saisie ce qui est une décision.
 */

import { useState } from "react";
import Link from "next/link";
import {
  Button,
  DataTableSkeleton,
  InlineNotification,
  Modal,
  NumberInput,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
  Tag,
} from "@carbon/react";
import { Add, CheckmarkOutline } from "@carbon/icons-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { useAuth } from "@/components/auth/AuthContext";
import { usePtbaExercice } from "@/components/ptba/use-ptba-exercice";
import { ptbaApi, type PtbaAllocationRowApi } from "@/lib/api";
import { formatUsd, formatUsdCompact, formatDate } from "@/lib/format";
import { ETAT } from "../ExercicesClient";

/** Teintes de composante. Jetons universels — voir tokens.scss. */
const TEINTE: Record<string, string> = {
  C1: "var(--ptn-composante-c1)",
  C2: "var(--ptn-composante-c2)",
  C3: "var(--ptn-composante-c3)",
  C4: "var(--ptn-composante-c4)",
  C5: "var(--ptn-composante-c5)",
};

/**
 * Le plafond réel d'une allocation, tel que le serveur le calcule.
 *
 * La dotation de projet moins ce que les AUTRES exercices ont pris — donc
 * en réintégrant l'allocation courante, qui va être remplacée et non
 * ajoutée. L'oublier interdirait de relever une allocation existante.
 */
function plafondDe(r: PtbaAllocationRowApi): number {
  const prisAilleurs = r.allocatedAllYearsUsd - (r.allocationUsd ?? 0);
  return r.projectCeilingUsd - prisAilleurs;
}

export function ExerciceClient({ annee }: { annee: number }) {
  const { can, loading: authLoading } = useAuth();
  const { year, exercices, allocations, chargement, error, avertissement, relire } =
    usePtbaExercice({ annee });

  const [enEdition, setEnEdition] = useState<PtbaAllocationRowApi | null>(null);
  const [montant, setMontant] = useState<string>("");
  const [aValider, setAValider] = useState(false);
  const [occupe, setOccupe] = useState(false);
  const [refus, setRefus] = useState<string | null>(null);

  // L'entrée de la liste porte le compte d'activités ; la réponse des
  // allocations porte l'exercice à jour. On prend les deux.
  const dansListe = exercices.find((e) => e.year === annee) ?? null;
  const exercice = dansListe ?? year;
  const nbActivites = dansListe?._count?.activities ?? 0;

  // L'exercice n'existe pas : le dire, plutôt que d'afficher un cadre vide
  // qu'on prendrait pour un exercice sans allocation.
  const introuvable = !chargement && exercices.length > 0 && dansListe === null;

  const peutEcrire = can("ptba:write");
  const peutValider = can("ptba:validate");
  /** Au-delà de BROUILLON, le serveur refuse toute écriture dans le plan. */
  const modifiable = exercice?.status === "BROUILLON";

  const alloueTotal = allocations.reduce((s, r) => s + (r.allocationUsd ?? 0), 0);
  const engageTotal = allocations.reduce((s, r) => s + r.plannedUsd, 0);
  const aucuneAllocation =
    allocations.length > 0 && allocations.every((r) => r.allocationUsd === null);

  const valeur = montant === "" ? null : Number(montant);
  const plafond = enEdition ? plafondDe(enEdition) : 0;
  const plancher = enEdition?.plannedUsd ?? 0;
  const saisieInvalide = (() => {
    if (!enEdition || valeur === null) return "Indiquez le montant de l’allocation, en USD.";
    if (!Number.isFinite(valeur) || valeur < 0) return "Le montant doit être positif.";
    if (valeur < plancher)
      return `Le plan ${annee} engage déjà ${formatUsd(plancher)} sur ${enEdition.componentCode}. Retirez des activités d’abord.`;
    if (valeur > plafond)
      return `Il ne reste que ${formatUsd(plafond)} sur la dotation de projet de ${enEdition.componentCode}.`;
    return null;
  })();

  const arreter = async () => {
    if (!enEdition || valeur === null) return;
    setOccupe(true);
    setRefus(null);
    try {
      await ptbaApi.setAllocation(annee, {
        componentCode: enEdition.componentCode,
        allocationUsd: valeur,
      });
      setEnEdition(null);
      setMontant("");
      await relire();
    } catch (e) {
      setRefus(e instanceof Error ? e.message : "L’allocation n’a pas été arrêtée.");
    } finally {
      setOccupe(false);
    }
  };

  const arreterLePlan = async () => {
    setOccupe(true);
    setRefus(null);
    try {
      await ptbaApi.validateYear(annee);
      setAValider(false);
      await relire();
    } catch (e) {
      setRefus(e instanceof Error ? e.message : "L’arrêté n’a pas abouti.");
    } finally {
      setOccupe(false);
    }
  };

  const etat = exercice ? ETAT[exercice.status] : null;

  return (
    <>
      <PageHeader
        eyebrow="PTBA · EXERCICE BUDGÉTAIRE"
        title={`Exercice ${annee}`}
        subtitle={
          exercice?.label ??
          "Ce qu’une composante peut engager sur l’exercice. Une activité ne s’inscrit au plan que dans la limite de l’allocation de sa composante."
        }
        meta={
          etat && (
            <>
              <Tag type={etat.tone} size="sm">
                {etat.label}
              </Tag>
              <span>{etat.sens}</span>
              {exercice?.validatedAt && (
                <>
                  <span>·</span>
                  <span>Arrêté le {formatDate(exercice.validatedAt)}</span>
                </>
              )}
              <span>·</span>
              <span>
                {nbActivites === 0
                  ? "Aucune activité inscrite"
                  : `${nbActivites} activité${nbActivites > 1 ? "s" : ""} inscrite${nbActivites > 1 ? "s" : ""}`}
              </span>
              {allocations.length > 0 && (
                <>
                  <span>·</span>
                  <span>
                    <span className="mono">{formatUsdCompact(engageTotal)}</span> engagés sur{" "}
                    <span className="mono">{formatUsdCompact(alloueTotal)}</span> alloués
                  </span>
                </>
              )}
            </>
          )
        }
        actions={
          <>
            <Button as={Link} href="/ptba/exercices" kind="ghost" size="md">
              Les exercices
            </Button>
            <Button as={Link} href="/ptba" kind="tertiary" size="md">
              Le registre
            </Button>
            {modifiable && peutValider && (
              <Button
                renderIcon={CheckmarkOutline}
                size="md"
                onClick={() => {
                  setAValider(true);
                  setRefus(null);
                }}
              >
                Arrêter le plan
              </Button>
            )}
          </>
        }
      />

      {error && (
        <InlineNotification
          kind="error"
          lowContrast
          hideCloseButton
          title="Chargement impossible"
          subtitle={error}
          className="mb-6 max-w-none"
        />
      )}
      {avertissement && (
        <InlineNotification
          kind="warning"
          lowContrast
          hideCloseButton
          title="Cadrage budgétaire indisponible"
          subtitle={avertissement}
          className="mb-6 max-w-none"
        />
      )}

      {introuvable && (
        <InlineNotification
          kind="error"
          lowContrast
          hideCloseButton
          title={`Aucun exercice ${annee}`}
          subtitle="Cet exercice n’a pas été ouvert. Il ne peut ni être doté ni recevoir d’activité."
          className="mb-6 max-w-none"
        />
      )}

      {!authLoading && !peutEcrire && !introuvable && (
        <InlineNotification
          kind="info"
          lowContrast
          hideCloseButton
          title="Consultation seule"
          subtitle="Arrêter une allocation relève de la coordination et du RAF. Vous pouvez consulter ce qui a été arrêté, sans le modifier."
          className="mb-6 max-w-none"
        />
      )}

      {aucuneAllocation && peutEcrire && modifiable && (
        <InlineNotification
          kind="warning"
          lowContrast
          hideCloseButton
          title="Aucune allocation arrêtée sur cet exercice"
          subtitle="Tant qu’aucune composante n’est dotée, aucune activité ne peut être inscrite au plan : les composantes paraissent alors désactivées à la création. Arrêtez ici la première allocation."
          className="mb-6 max-w-none"
        />
      )}

      {peutEcrire && !modifiable && exercice && !introuvable && (
        <InlineNotification
          kind="info"
          lowContrast
          hideCloseButton
          title={
            exercice.status === "VALIDE"
              ? "Plan opposable — plus modifiable"
              : "Exercice clos"
          }
          subtitle={
            exercice.status === "VALIDE"
              ? "Le plan a été arrêté : il est opposable devant le bailleur et ne se modifie plus. Une correction suppose une révision de l’exercice."
              : "L’exercice est terminé. Ni allocation ni activité ne s’y inscrivent plus."
          }
          className="mb-6 max-w-none"
        />
      )}

      {/* ---------- Allocations ---------- */}
      {chargement ? (
        <DataTableSkeleton columnCount={5} rowCount={5} showHeader={false} showToolbar={false} />
      ) : (
        !introuvable && (
          <TableContainer
            title="Allocation annuelle par composante"
            description="Une ligne par composante du MEP, y compris celles qui n’ont pas encore d’allocation — c’est ce qui reste à arrêter avant que le plan puisse s’écrire."
          >
            <Table size="lg">
              <TableHead>
                <TableRow>
                  <TableHeader>Composante</TableHeader>
                  <TableHeader className="text-right">Allocation {annee}</TableHeader>
                  <TableHeader className="text-right">Engagé au plan</TableHeader>
                  <TableHeader className="text-right">Disponible</TableHeader>
                  <TableHeader className="text-right">Reste de dotation</TableHeader>
                  <TableHeader>
                    <span className="sr-only">Actions</span>
                  </TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                {allocations.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6}>
                      <div className="py-8 text-center">
                        <p className="text-heading-02 text-primary">
                          Cadrage budgétaire indisponible
                        </p>
                        <p className="text-body text-secondary mx-auto mt-2 max-w-[52ch]">
                          Les allocations de l’exercice n’ont pas pu être lues. Sans elles,
                          aucune activité ne peut être inscrite au plan.
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}

                {allocations.map((r) => {
                  const solde = r.allocationUsd === null ? null : r.allocationUsd - r.plannedUsd;
                  const resteDotation = r.projectCeilingUsd - r.allocatedAllYearsUsd;

                  return (
                    <TableRow key={r.componentCode}>
                      <TableCell>
                        <span
                          className="text-body-compact inline-flex items-center gap-2 whitespace-nowrap"
                          style={{ color: TEINTE[r.componentCode] }}
                        >
                          <i
                            aria-hidden
                            className="inline-block h-2 w-2 shrink-0"
                            style={{ background: TEINTE[r.componentCode] }}
                          />
                          <span className="mono">{r.componentCode}</span>
                        </span>
                        <span className="text-primary mt-1 block">{r.shortLabel}</span>
                        <span className="text-caption text-helper">
                          Dotation de projet {formatUsdCompact(r.projectCeilingUsd)} · MEP
                          Tableau 2
                        </span>
                      </TableCell>

                      <TableCell className="mono text-right tabular-nums">
                        {r.allocationUsd === null ? (
                          <span className="text-helper">non arrêtée</span>
                        ) : (
                          formatUsdCompact(r.allocationUsd)
                        )}
                      </TableCell>

                      <TableCell className="mono text-right tabular-nums">
                        {formatUsdCompact(r.plannedUsd)}
                        {r.activityCount > 0 && (
                          <span className="text-caption text-helper mt-1 block">
                            {r.activityCount} activité{r.activityCount > 1 ? "s" : ""}
                          </span>
                        )}
                      </TableCell>

                      <TableCell className="mono text-right tabular-nums">
                        {solde === null ? (
                          <span className="text-helper">—</span>
                        ) : (
                          <strong
                            style={{
                              /* Zéro n'est une alerte que sur une composante
                                 DOTÉE : la CERC porte une dotation de 0 par
                                 construction (MEP Tableau 2), et la peindre
                                 en jaune signalerait un problème là où il n'y
                                 a qu'un état normal. */
                              color:
                                solde < 0 || (solde === 0 && (r.allocationUsd ?? 0) > 0)
                                  ? "var(--ptn-status-warning)"
                                  : "var(--cds-text-primary)",
                            }}
                          >
                            {formatUsdCompact(solde)}
                          </strong>
                        )}
                      </TableCell>

                      <TableCell className="mono text-right tabular-nums">
                        {formatUsdCompact(resteDotation)}
                        <span className="text-caption text-helper mt-1 block">
                          tous exercices
                        </span>
                      </TableCell>

                      <TableCell className="w-40">
                        {peutEcrire && modifiable && (
                          <Button
                            kind="ghost"
                            size="sm"
                            onClick={() => {
                              setEnEdition(r);
                              setMontant(r.allocationUsd === null ? "" : String(r.allocationUsd));
                              setRefus(null);
                            }}
                          >
                            {r.allocationUsd === null ? "Arrêter l’allocation" : "Modifier"}
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )
      )}

      {!introuvable && modifiable && peutEcrire && !aucuneAllocation && (
        <div className="mt-6">
          <Button as={Link} href="/ptba/nouveau" renderIcon={Add} size="md" kind="tertiary">
            Inscrire une activité
          </Button>
        </div>
      )}

      <p className="text-caption text-helper mt-4">
        Une allocation ouvre un droit de dépense : elle relève du COPIL, et chaque arrêté est
        journalisé avec son auteur.
      </p>

      {/* ---------- Arrêté d'une allocation ---------- */}
      <Modal
        open={enEdition !== null}
        modalHeading={
          enEdition
            ? `Allocation ${annee} — ${enEdition.componentCode} · ${enEdition.shortLabel}`
            : ""
        }
        modalLabel="Décision du COPIL"
        primaryButtonText={occupe ? "Enregistrement…" : "Arrêter l’allocation"}
        secondaryButtonText="Annuler"
        primaryButtonDisabled={occupe || saisieInvalide !== null}
        onRequestClose={() => {
          setEnEdition(null);
          setRefus(null);
        }}
        onRequestSubmit={() => void arreter()}
      >
        <p className="text-body text-secondary mb-4">
          Ce que cette composante pourra engager sur l’exercice {annee}. Une activité ne
          s’inscrit au plan que dans cette limite.
        </p>

        <NumberInput
          id="allocation-montant"
          label={`Allocation ${annee}, en USD`}
          min={0}
          step={100000}
          hideSteppers
          allowEmpty
          value={montant === "" ? "" : Number(montant)}
          invalid={montant !== "" && saisieInvalide !== null}
          invalidText={saisieInvalide ?? undefined}
          onChange={(_, { value }) => setMontant(value === "" ? "" : String(value))}
        />

        {/* Les deux bornes du serveur, dites AVANT la saisie. Les découvrir
            au refus fait recommencer, et donne le sentiment que la règle
            est arbitraire. */}
        {enEdition && (
          <div className="border-subtle bg-layer mt-4 border p-4">
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-caption text-secondary">
                Plancher — déjà engagé par le plan {annee}
              </span>
              <span className="mono text-body-compact tabular-nums">{formatUsd(plancher)}</span>
            </div>
            <div className="mt-2 flex items-baseline justify-between gap-3">
              <span className="text-caption text-secondary">
                Plafond — reste de la dotation de projet
              </span>
              <span className="mono text-body-compact tabular-nums">{formatUsd(plafond)}</span>
            </div>
            <p className="text-caption text-helper mt-3">
              La dotation de {enEdition.componentCode} vaut{" "}
              {formatUsd(enEdition.projectCeilingUsd)} sur 2025-2029, dont{" "}
              {formatUsd(enEdition.allocatedAllYearsUsd - (enEdition.allocationUsd ?? 0))} déjà
              alloués à d’autres exercices.
            </p>
          </div>
        )}

        {refus && (
          <InlineNotification
            kind="error"
            lowContrast
            hideCloseButton
            title="Allocation refusée"
            subtitle={refus}
            className="mt-4 max-w-none"
          />
        )}
      </Modal>

      {/* ---------- Arrêté du plan ---------- */}
      <Modal
        open={aValider}
        modalHeading="Arrêter le plan de cet exercice ?"
        modalLabel={`Exercice ${annee}`}
        primaryButtonText={occupe ? "Enregistrement…" : "Arrêter le plan"}
        secondaryButtonText="Annuler"
        /* Le serveur refuse un exercice sans activité. Le bouton reste
           visible sur la page — le masquer laisserait chercher où il est
           passé — mais l'acte s'éteint ici, où la raison est sous les yeux. */
        primaryButtonDisabled={occupe || nbActivites === 0}
        danger
        onRequestClose={() => {
          setAValider(false);
          setRefus(null);
        }}
        onRequestSubmit={() => void arreterLePlan()}
      >
        <p className="text-body text-secondary mb-4">
          Le plan devient <strong>opposable</strong> : c’est la validation du COPIL. Il ne se
          modifiera plus — ni allocation, ni activité. Une correction supposerait une révision
          de l’exercice.
        </p>
        <p className="text-body text-secondary mb-4">
          L’exercice porte aujourd’hui{" "}
          <strong>
            {nbActivites} activité{nbActivites > 1 ? "s" : ""}
          </strong>
          , pour <strong>{formatUsd(engageTotal)}</strong> engagés sur{" "}
          <strong>{formatUsd(alloueTotal)}</strong> alloués.
        </p>
        <p className="text-body text-secondary">
          L’arrêté est inscrit au journal d’audit avec son auteur et la date.
        </p>
        {nbActivites === 0 && (
          <InlineNotification
            kind="warning"
            lowContrast
            hideCloseButton
            title="Exercice vide"
            subtitle="Un exercice sans activité ne peut pas être arrêté : il n’y aurait rien à rendre opposable. Inscrivez d’abord au moins une activité au plan."
            className="mt-4 max-w-none"
          />
        )}
        {refus && (
          <InlineNotification
            kind="error"
            lowContrast
            hideCloseButton
            title="Arrêté refusé"
            subtitle={refus}
            className="mt-4 max-w-none"
          />
        )}
      </Modal>
    </>
  );
}
