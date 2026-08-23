"use client";

/**
 * Arrêter l'allocation annuelle d'une composante.
 *
 * L'ÉCRAN QUI MANQUAIT. Le point d'entrée serveur existait —
 * `PUT /ptba/exercices/:year/allocations` — et le client d'API aussi, mais
 * aucun écran ne les appelait. Conséquence : sur une base neuve, les cinq
 * composantes paraissaient désactivées à la création d'une activité, avec
 * la mention « Aucune allocation arrêtée sur cet exercice » et aucune issue.
 * Le PTBA était une impasse dès le premier usage.
 *
 * DEUX PLAFONDS, ET UN PLANCHER. Ils viennent du serveur, qui les tient
 * seul : l'écran les rappelle pour qu'on ne les découvre pas au refus.
 *
 *  · l'allocation ne peut dépasser la DOTATION DE PROJET de la composante,
 *    arrêtée au MEP et non modifiable ici ;
 *  · elle ne peut descendre sous ce que le plan de l'exercice ENGAGE DÉJÀ —
 *    retirer une enveloppe à des activités inscrites les laisserait sans
 *    couverture budgétaire.
 *
 * CE N'EST PAS UN ÉCRAN DE SAISIE ORDINAIRE. Une allocation est un acte du
 * COPIL : elle ouvre un droit de dépense. L'écran le dit, et n'enregistre
 * qu'une composante à la fois — un formulaire qui arrêterait les cinq d'un
 * coup ferait passer pour une saisie ce qui est une décision.
 */

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Note } from "@/components/wizard/WizardFields";
import { useAuth } from "@/components/auth/AuthContext";
import { ptbaApi, type PtbaAllocationRowApi, type PtbaYearApi } from "@/lib/api";
import { formatUsdCompact, digitsOnly } from "@/lib/format";
import { ArrowRight, Save } from "@carbon/icons-react";
import styles from "./allocations.module.scss";

export function AllocationsClient() {
  const { can, loading: authLoading } = useAuth();
  const [year, setYear] = useState<PtbaYearApi | null>(null);
  const [lignes, setLignes] = useState<PtbaAllocationRowApi[] | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  /** La composante en cours de saisie, et le montant frappé. */
  const [enSaisie, setEnSaisie] = useState<string | null>(null);
  const [montant, setMontant] = useState("");
  const [occupe, setOccupe] = useState(false);
  const [refus, setRefus] = useState<string | null>(null);

  const charger = useCallback(async () => {
    try {
      // L'exercice ouvert est celui qui n'est pas clos, le plus récent :
      // déduire l'année de l'horloge du poste donnerait un exercice
      // différent d'un ordinateur à l'autre au passage de janvier.
      const exercices = await ptbaApi.years();
      const courant =
        [...exercices].sort((a, b) => b.year - a.year).find((e) => e.status !== "CLOS") ??
        exercices[0];
      if (!courant) {
        setErreur("Aucun exercice budgétaire n’est ouvert.");
        return;
      }
      const d = await ptbaApi.allocations(courant.year);
      setYear(d.year);
      setLignes(d.rows);
      setErreur(null);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Allocations indisponibles.");
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;
    void (async () => {
      await charger();
    })();
  }, [authLoading, charger]);

  const peutEcrire = can("ptba:write");

  const enregistrer = async (ligne: PtbaAllocationRowApi) => {
    if (!year) return;
    const valeur = Number(digitsOnly(montant));
    if (!(valeur >= 0)) {
      setRefus("Indiquez le montant de l’allocation, en USD.");
      return;
    }
    setOccupe(true);
    setRefus(null);
    try {
      await ptbaApi.setAllocation(year.year, {
        componentCode: ligne.componentCode,
        allocationUsd: valeur,
      });
      setEnSaisie(null);
      setMontant("");
      await charger();
    } catch (e) {
      setRefus(e instanceof Error ? e.message : "L’allocation n’a pas été arrêtée.");
    } finally {
      setOccupe(false);
    }
  };

  const aucuneAllocation = lignes?.every((r) => r.allocationUsd === null) ?? false;

  return (
    <>
      <PageHeader
        eyebrow="PTBA · ALLOCATION ANNUELLE PAR COMPOSANTE"
        title={year ? `Exercice ${year.year}` : "Allocation annuelle"}
        subtitle="Ce qu’une composante peut engager sur l’exercice. Une activité ne s’inscrit au plan que dans la limite de l’allocation de sa composante."
        actions={
          <Link href="/ptba" className={styles.btnSecondary}>
            Le registre <ArrowRight size={14} aria-hidden />
          </Link>
        }
      />

      {erreur && (
        <Note tone="danger" title="Chargement impossible">
          {erreur}
        </Note>
      )}

      {!authLoading && !peutEcrire && (
        <Note tone="info" title="Consultation seule">
          Arrêter une allocation relève de la coordination et du RPM. Vous pouvez consulter ce
          qui a été arrêté, sans le modifier.
        </Note>
      )}

      {aucuneAllocation && peutEcrire && (
        <Note tone="warning" title="Aucune allocation arrêtée sur cet exercice">
          Tant qu’aucune composante n’est dotée, aucune activité ne peut être inscrite au plan :
          les composantes paraissent alors désactivées à la création. Arrêtez ici la première
          allocation.
        </Note>
      )}

      <Card noPadding>
        {lignes === null && !erreur ? (
          <p className={styles.etat}>Chargement des allocations…</p>
        ) : (
          <ul className={styles.liste}>
            {(lignes ?? []).map((r) => {
              const solde = r.allocationUsd === null ? null : r.allocationUsd - r.plannedUsd;
              const saisie = enSaisie === r.componentCode;

              return (
                <li key={r.componentCode} className={styles.ligne}>
                  <div className={styles.gauche}>
                    <span className={styles.tete}>
                      <i
                        aria-hidden
                        className={styles.pastille}
                        style={{
                          background: `var(--ptn-composante-${r.componentCode.toLowerCase()})`,
                        }}
                      />
                      <span className="ptn-mono">{r.componentCode}</span>
                      <span className={styles.intitule}>{r.shortLabel}</span>
                    </span>

                    <span className={styles.detail}>
                      {r.allocationUsd === null ? (
                        "Aucune allocation arrêtée"
                      ) : (
                        <>
                          {formatUsdCompact(r.allocationUsd)} alloués ·{" "}
                          {formatUsdCompact(r.plannedUsd)} engagés ·{" "}
                          <strong>{formatUsdCompact(solde ?? 0)} disponibles</strong>
                        </>
                      )}
                    </span>

                    {/* Les deux bornes, dites AVANT la saisie. Les découvrir
                        au refus fait recommencer, et donne le sentiment que
                        la règle est arbitraire. */}
                    <span className={styles.bornes}>
                      Dotation de projet : {formatUsdCompact(r.projectCeilingUsd)} · déjà
                      engagé sur l’exercice : {formatUsdCompact(r.plannedUsd)}
                    </span>
                  </div>

                  <div className={styles.droite}>
                    {saisie ? (
                      <div className={styles.saisie}>
                        <label>
                          <span>Allocation {year?.year}, en USD</span>
                          <input
                            inputMode="numeric"
                            autoFocus
                            value={montant}
                            onChange={(e) => setMontant(e.target.value)}
                            placeholder="Ex. 45 000 000"
                            disabled={occupe}
                          />
                        </label>
                        <div className={styles.boutons}>
                          <button
                            type="button"
                            className={styles.btnPrimary}
                            onClick={() => void enregistrer(r)}
                            disabled={occupe}
                          >
                            <Save size={14} aria-hidden />
                            {occupe ? "Enregistrement…" : "Arrêter l’allocation"}
                          </button>
                          <button
                            type="button"
                            className={styles.btnGhost}
                            onClick={() => {
                              setEnSaisie(null);
                              setRefus(null);
                            }}
                            disabled={occupe}
                          >
                            Annuler
                          </button>
                        </div>
                      </div>
                    ) : (
                      peutEcrire && (
                        <button
                          type="button"
                          className={styles.btnGhost}
                          onClick={() => {
                            setEnSaisie(r.componentCode);
                            setMontant(r.allocationUsd === null ? "" : String(r.allocationUsd));
                            setRefus(null);
                          }}
                        >
                          {r.allocationUsd === null ? "Arrêter l’allocation" : "Modifier"}
                        </button>
                      )
                    )}
                  </div>

                  {saisie && refus && (
                    <div className={styles.refus}>
                      <Note tone="danger" title="Allocation refusée">
                        {refus}
                      </Note>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <p className={styles.pied}>
        Une allocation ouvre un droit de dépense : elle relève du COPIL, et chaque arrêté est
        journalisé avec son auteur.
      </p>
    </>
  );
}
