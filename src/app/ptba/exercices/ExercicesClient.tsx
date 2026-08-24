"use client";

/**
 * Les exercices budgétaires — les ouvrir, les arrêter.
 *
 * DEUX ACTES QUI N'AVAIENT AUCUN ÉCRAN.
 *
 * OUVRIR. Le PTBA savait lire ses exercices, y allouer, y inscrire des
 * activités et les valider — mais rien ne permettait d'en ouvrir un. Celui
 * de 2026 venait du peuplement de la base, et l'arrivée de 2027 aurait
 * demandé une intervention en base de données.
 *
 * ARRÊTER. `POST /ptba/exercices/:year/valider` existait, réservé au
 * Coordonnateur, et le client d'API l'exposait déjà : aucun bouton ne
 * l'appelait. Le plan restait donc indéfiniment en préparation, et rien
 * n'était jamais opposable.
 *
 * L'EXERCICE NAÎT VIDE. Ni allocation ni activité : une dotation est une
 * décision du COPIL, et recopier celles de l'année précédente les ferait
 * passer pour reconduites alors que personne ne les a arrêtées. L'écran le
 * dit, et renvoie vers les allocations — sans elles, l'exercice neuf
 * n'accepte aucune activité.
 */

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Modal, TextInput } from "@carbon/react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Note } from "@/components/wizard/WizardFields";
import { useAuth } from "@/components/auth/AuthContext";
import { ptbaApi, type PtbaYearApi } from "@/lib/api";
import { Add, ArrowRight, CheckmarkOutline } from "@carbon/icons-react";
import styles from "./exercices.module.scss";

/** Ce qu'un état veut dire pour qui lit, et non pour la base. */
const ETAT: Record<PtbaYearApi["status"], { label: string; ton: string; sens: string }> = {
  BROUILLON: {
    label: "En préparation",
    ton: styles.tonAttente,
    sens: "Le plan se construit. Il n’est pas encore opposable.",
  },
  VALIDE: {
    label: "Validé par le COPIL",
    ton: styles.tonOk,
    sens: "Le plan est arrêté et opposable.",
  },
  CLOS: {
    label: "Clos",
    ton: styles.tonNeutre,
    sens: "L’exercice est terminé. Plus rien ne s’y inscrit.",
  },
};

export function ExercicesClient() {
  const { can, loading: authLoading } = useAuth();

  const [exercices, setExercices] = useState<PtbaYearApi[] | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  const [ouvrir, setOuvrir] = useState(false);
  const [annee, setAnnee] = useState("");
  const [intitule, setIntitule] = useState("");
  const [aValider, setAValider] = useState<PtbaYearApi | null>(null);
  const [occupe, setOccupe] = useState(false);
  const [refus, setRefus] = useState<string | null>(null);

  const charger = useCallback(async () => {
    try {
      setExercices(await ptbaApi.years());
      setErreur(null);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Exercices indisponibles.");
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;
    void (async () => {
      await charger();
    })();
  }, [authLoading, charger]);

  const peutOuvrir = can("ptba:write");
  const peutValider = can("ptba:validate");

  const agir = async (acte: () => Promise<unknown>) => {
    setOccupe(true);
    setRefus(null);
    try {
      await acte();
      setOuvrir(false);
      setAValider(null);
      setAnnee("");
      setIntitule("");
      await charger();
    } catch (e) {
      setRefus(e instanceof Error ? e.message : "L’opération n’a pas abouti.");
    } finally {
      setOccupe(false);
    }
  };

  // L'année suivante du plus récent exercice : c'est celle qu'on vient
  // ouvrir neuf fois sur dix, et la proposer évite une frappe.
  const proposee =
    exercices && exercices.length > 0
      ? String(Math.max(...exercices.map((e) => e.year)) + 1)
      : "";

  const anneeValide = /^\d{4}$/.test(annee.trim());

  return (
    <>
      <PageHeader
        eyebrow="PTBA · EXERCICES BUDGÉTAIRES"
        title="Les exercices"
        subtitle="La vie du plan annuel : ouvrir l’exercice, le doter, l’arrêter. Un exercice neuf ne porte ni allocation ni activité — les dotations relèvent du COPIL et ne se reconduisent pas d’elles-mêmes."
        actions={
          peutOuvrir ? (
            <button
              type="button"
              className="demoBtnPrimary"
              onClick={() => {
                setAnnee(proposee);
                setIntitule("");
                setRefus(null);
                setOuvrir(true);
              }}
            >
              <Add size={14} aria-hidden />
              <span>Ouvrir un exercice</span>
            </button>
          ) : undefined
        }
      />

      {erreur && (
        <Note tone="danger" title="Chargement impossible">
          {erreur}
        </Note>
      )}

      {!authLoading && !peutOuvrir && (
        <Note tone="info" title="Consultation seule">
          Ouvrir un exercice relève de la coordination, des responsables de composante et du
          RAF. L’arrêter relève du seul Coordonnateur.
        </Note>
      )}

      <Card noPadding>
        {exercices === null && !erreur ? (
          <p className={styles.etat}>Chargement des exercices…</p>
        ) : (exercices ?? []).length === 0 ? (
          <div className={styles.vide}>
            <p>Aucun exercice budgétaire n’est ouvert.</p>
            <p className={styles.videDetail}>
              Sans exercice, le plan n’a pas de cadre : ni allocation, ni activité, ni TDR
              possible. Ouvrez le premier.
            </p>
          </div>
        ) : (
          <ul className={styles.liste}>
            {(exercices ?? []).map((e) => {
              const etat = ETAT[e.status];
              const activites = e._count?.activities ?? 0;

              return (
                <li key={e.id} className={styles.ligne}>
                  <div className={styles.gauche}>
                    <span className={styles.tete}>
                      <span className={`ptn-mono ${styles.annee}`}>{e.year}</span>
                      <span className={`${styles.statut} ${etat.ton}`}>{etat.label}</span>
                    </span>
                    <span className={styles.intitule}>{e.label}</span>
                    <span className={styles.detail}>
                      {etat.sens}{" "}
                      {activites === 0
                        ? "Aucune activité inscrite."
                        : `${activites} activité${activites > 1 ? "s" : ""} inscrite${activites > 1 ? "s" : ""}.`}
                    </span>
                  </div>

                  <div className={styles.droite}>
                    <Link href="/ptba/allocations" className={styles.lien}>
                      Allocations <ArrowRight size={14} aria-hidden />
                    </Link>
                    {/* L'arrêté est refusé sur un exercice sans activité :
                        le bouton reste, le refus explique. Le masquer
                        laisserait chercher où il est passé. */}
                    {e.status === "BROUILLON" && peutValider && (
                      <button
                        type="button"
                        className={styles.btnValider}
                        disabled={occupe}
                        onClick={() => {
                          setAValider(e);
                          setRefus(null);
                        }}
                      >
                        <CheckmarkOutline size={14} aria-hidden /> Arrêter le plan
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <p className={styles.pied}>
        Le PTN-RDC couvre les exercices 2025 à 2029 — entrée en vigueur le 31 octobre 2025,
        achèvement technique le 31 décembre 2029 (MEP du 23 juin 2025). Chaque ouverture et
        chaque arrêté sont inscrits au journal d’audit.
      </p>

      {/* ---------- Ouverture ---------- */}
      <Modal
        open={ouvrir}
        modalHeading="Ouvrir un exercice budgétaire"
        primaryButtonText={occupe ? "Ouverture…" : "Ouvrir l’exercice"}
        secondaryButtonText="Annuler"
        primaryButtonDisabled={occupe || !anneeValide}
        onRequestClose={() => {
          setOuvrir(false);
          setRefus(null);
        }}
        onRequestSubmit={() =>
          void agir(() => ptbaApi.openYear(Number(annee.trim()), intitule.trim() || undefined))
        }
      >
        <p className="text-body text-secondary mb-4">
          L’exercice naît <strong>en préparation et vide</strong> : ni allocation, ni activité.
          Les dotations par composante s’arrêtent ensuite, une à une — ce sont des décisions du
          COPIL, elles ne se reconduisent pas d’une année sur l’autre.
        </p>
        <TextInput
          id="exercice-annee"
          labelText="Année de l’exercice"
          helperText="Quatre chiffres. Le projet couvre 2025 à 2029."
          value={annee}
          onChange={(e) => setAnnee(e.target.value)}
        />
        <div className="mt-4">
          <TextInput
            id="exercice-intitule"
            labelText="Intitulé (facultatif)"
            helperText="Sans intitulé, il portera « Plan de Travail et Budget Annuel » suivi de l’année."
            value={intitule}
            onChange={(e) => setIntitule(e.target.value)}
          />
        </div>
        {refus && (
          <p className={styles.refus} role="alert">
            {refus}
          </p>
        )}
      </Modal>

      {/* ---------- Arrêté du plan ---------- */}
      <Modal
        open={aValider !== null}
        modalHeading="Arrêter le plan de cet exercice ?"
        modalLabel={aValider ? `Exercice ${aValider.year}` : undefined}
        primaryButtonText={occupe ? "Enregistrement…" : "Arrêter le plan"}
        secondaryButtonText="Annuler"
        primaryButtonDisabled={occupe}
        onRequestClose={() => {
          setAValider(null);
          setRefus(null);
        }}
        onRequestSubmit={() =>
          aValider && void agir(() => ptbaApi.validateYear(aValider.year))
        }
      >
        <p className="text-body text-secondary mb-4">
          Le plan devient <strong>opposable</strong> : c’est la validation du COPIL. L’exercice
          porte aujourd’hui{" "}
          <strong>
            {aValider?._count?.activities ?? 0} activité
            {(aValider?._count?.activities ?? 0) > 1 ? "s" : ""}
          </strong>
          .
        </p>
        <p className="text-body text-secondary">
          Un exercice sans activité ne peut pas être arrêté. L’arrêté est inscrit au journal
          d’audit avec son auteur et la date.
        </p>
        {refus && (
          <p className={styles.refus} role="alert">
            {refus}
          </p>
        )}
      </Modal>
    </>
  );
}
