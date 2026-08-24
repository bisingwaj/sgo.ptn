"use client";

/**
 * Les exercices budgétaires — la liste, et l'ouverture d'un exercice.
 *
 * L'ACTE QUI N'AVAIT AUCUN ÉCRAN. Le PTBA savait lire ses exercices, y
 * allouer, y inscrire des activités et les valider — mais rien ne
 * permettait d'en OUVRIR un. Celui de 2026 venait du peuplement de la base,
 * et l'arrivée de 2027 aurait demandé une intervention en base de données.
 *
 * CET ÉCRAN NE FAIT PLUS QUE LISTER ET OUVRIR. Il portait aussi l'arrêté du
 * plan et un lien « Allocations ». Ce lien était faux : il pointait
 * `/ptba/allocations` sans année, alors que la cible choisissait elle-même
 * son exercice. Cliquer sur la ligne 2026 menait aux allocations de 2027
 * sans que rien ne le dise. Le défaut restait invisible tant qu'un seul
 * exercice existait — c'est-à-dire jusqu'au premier usage du bouton que cet
 * écran venait précisément d'ajouter.
 *
 * L'arrêté et les allocations vivent désormais dans `[year]/`. Une
 * allocation n'est pas un écran, c'est une propriété d'un exercice : la
 * question « quelle année ? » ne se pose plus, elle est dans l'URL.
 *
 * L'EXERCICE NAÎT VIDE. Ni allocation ni activité : une dotation est une
 * décision du COPIL, et recopier celles de l'année précédente les ferait
 * passer pour reconduites alors que personne ne les a arrêtées.
 */

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Button,
  DataTableSkeleton,
  InlineNotification,
  Modal,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
  Tag,
  TextInput,
} from "@carbon/react";
import { Add } from "@carbon/icons-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { useAuth } from "@/components/auth/AuthContext";
import { ptbaApi, type PtbaYearApi } from "@/lib/api";

/** Ce qu'un état veut dire pour qui lit, et non pour la base. */
export const ETAT: Record<
  PtbaYearApi["status"],
  { label: string; tone: "gray" | "green" | "cool-gray"; sens: string }
> = {
  BROUILLON: {
    label: "En préparation",
    tone: "gray",
    sens: "Le plan se construit. Il n’est pas encore opposable.",
  },
  VALIDE: {
    label: "Validé — opposable",
    tone: "green",
    sens: "Le plan est arrêté et opposable devant le bailleur.",
  },
  CLOS: {
    label: "Clos",
    tone: "cool-gray",
    sens: "L’exercice est terminé. Plus rien ne s’y inscrit.",
  },
};

/** Bornes du projet — MEP du 23 juin 2025. */
const PREMIER_EXERCICE = 2025;
const DERNIER_EXERCICE = 2029;

export function ExercicesClient() {
  const { can, loading: authLoading } = useAuth();

  const [exercices, setExercices] = useState<PtbaYearApi[] | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  const [ouvrir, setOuvrir] = useState(false);
  const [annee, setAnnee] = useState("");
  const [intitule, setIntitule] = useState("");
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
    let annule = false;
    // L'appel est enveloppé plutôt que direct : tout `setState` doit tomber
    // après un `await`, jamais dans le corps synchrone de l'effet.
    void (async () => {
      if (!annule) await charger();
    })();
    return () => {
      annule = true;
    };
  }, [authLoading, charger]);

  const peutOuvrir = can("ptba:write");

  const ouvrirExercice = async () => {
    setOccupe(true);
    setRefus(null);
    try {
      await ptbaApi.openYear(Number(annee.trim()), intitule.trim() || undefined);
      setOuvrir(false);
      setAnnee("");
      setIntitule("");
      await charger();
    } catch (e) {
      setRefus(e instanceof Error ? e.message : "L’exercice n’a pas été ouvert.");
    } finally {
      setOccupe(false);
    }
  };

  // L'année suivant le plus récent exercice : c'est celle qu'on vient ouvrir
  // neuf fois sur dix, et la proposer évite une frappe.
  const proposee =
    exercices && exercices.length > 0
      ? String(Math.max(...exercices.map((e) => e.year)) + 1)
      : String(PREMIER_EXERCICE);

  const saisie = Number(annee.trim());
  const anneeValide =
    /^\d{4}$/.test(annee.trim()) &&
    saisie >= PREMIER_EXERCICE &&
    saisie <= DERNIER_EXERCICE &&
    !(exercices ?? []).some((e) => e.year === saisie);

  // Dire pourquoi le bouton est éteint, plutôt que de le laisser inerte :
  // les bornes du projet sont opposées côté serveur, les découvrir au refus
  // fait recommencer la saisie.
  const motifRefusSaisie = (() => {
    if (annee.trim() === "") return null;
    if (!/^\d{4}$/.test(annee.trim())) return "Une année s’écrit en quatre chiffres.";
    if (saisie < PREMIER_EXERCICE || saisie > DERNIER_EXERCICE)
      return `Le projet couvre ${PREMIER_EXERCICE} à ${DERNIER_EXERCICE} (MEP du 23 juin 2025).`;
    if ((exercices ?? []).some((e) => e.year === saisie))
      return `L’exercice ${saisie} est déjà ouvert.`;
    return null;
  })();

  return (
    <>
      <PageHeader
        eyebrow="PTBA · EXERCICES BUDGÉTAIRES"
        title="Les exercices"
        subtitle="La vie du plan annuel : ouvrir l’exercice, le doter, l’arrêter. Un exercice neuf ne porte ni allocation ni activité — les dotations relèvent du COPIL et ne se reconduisent pas d’elles-mêmes."
        actions={
          <>
            <Button as={Link} href="/ptba" kind="ghost" size="md">
              Le registre
            </Button>
            {peutOuvrir && (
              <Button
                renderIcon={Add}
                size="md"
                onClick={() => {
                  setAnnee(proposee);
                  setIntitule("");
                  setRefus(null);
                  setOuvrir(true);
                }}
              >
                Ouvrir un exercice
              </Button>
            )}
          </>
        }
      />

      {erreur && (
        <InlineNotification
          kind="error"
          lowContrast
          hideCloseButton
          title="Chargement impossible"
          subtitle={erreur}
          className="mb-6 max-w-none"
        />
      )}

      {!authLoading && !peutOuvrir && (
        <InlineNotification
          kind="info"
          lowContrast
          hideCloseButton
          title="Consultation seule"
          subtitle="Ouvrir un exercice relève de la coordination, des responsables de composante et du RAF. L’arrêter relève du seul Coordonnateur."
          className="mb-6 max-w-none"
        />
      )}

      {exercices === null && !erreur ? (
        <DataTableSkeleton columnCount={4} rowCount={3} showHeader={false} showToolbar={false} />
      ) : (
        <TableContainer
          title="Exercices budgétaires"
          description="Le PTN-RDC couvre 2025 à 2029. Du plus récent au plus ancien."
        >
          <Table size="lg">
            <TableHead>
              <TableRow>
                <TableHeader>Exercice</TableHeader>
                <TableHeader>Intitulé</TableHeader>
                <TableHeader>État</TableHeader>
                <TableHeader className="text-right">Activités</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {(exercices ?? []).length === 0 && (
                <TableRow>
                  <TableCell colSpan={4}>
                    <div className="py-8 text-center">
                      <p className="text-heading-02 text-primary">
                        Aucun exercice budgétaire n’est ouvert
                      </p>
                      <p className="text-body text-secondary mx-auto mt-2 max-w-[52ch]">
                        Sans exercice, le plan n’a pas de cadre : ni allocation, ni activité, ni
                        TDR possible. Tout le cycle de passation commence ici.
                      </p>
                      {peutOuvrir && (
                        <div className="mt-4">
                          <Button
                            renderIcon={Add}
                            size="sm"
                            onClick={() => {
                              setAnnee(proposee);
                              setIntitule("");
                              setRefus(null);
                              setOuvrir(true);
                            }}
                          >
                            Ouvrir le premier exercice
                          </Button>
                        </div>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              )}

              {(exercices ?? []).map((e) => {
                const etat = ETAT[e.status];
                const activites = e._count?.activities ?? 0;

                return (
                  <TableRow key={e.id}>
                    <TableCell>
                      <Link
                        href={`/ptba/exercices/${e.year}`}
                        className="text-accent mono hover:underline"
                      >
                        {e.year}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/ptba/exercices/${e.year}`}
                        className="text-primary hover:underline"
                      >
                        {e.label}
                      </Link>
                      <span className="text-caption text-helper mt-1 block">{etat.sens}</span>
                    </TableCell>
                    <TableCell>
                      <Tag type={etat.tone} size="sm">
                        {etat.label}
                      </Tag>
                    </TableCell>
                    <TableCell className="mono text-right tabular-nums">
                      {activites === 0 ? (
                        <span className="text-helper">aucune</span>
                      ) : (
                        activites
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <p className="text-caption text-helper mt-4">
        Entrée en vigueur le 31 octobre 2025, achèvement technique le 31 décembre 2029 (MEP du
        23 juin 2025). Chaque ouverture et chaque arrêté sont inscrits au journal d’audit.
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
        onRequestSubmit={() => void ouvrirExercice()}
      >
        <p className="text-body text-secondary mb-4">
          L’exercice naît <strong>en préparation et vide</strong> : ni allocation, ni activité.
          Les dotations par composante s’arrêtent ensuite, une à une — ce sont des décisions du
          COPIL, elles ne se reconduisent pas d’une année sur l’autre.
        </p>
        <TextInput
          id="exercice-annee"
          labelText="Année de l’exercice"
          helperText={`Quatre chiffres, entre ${PREMIER_EXERCICE} et ${DERNIER_EXERCICE}.`}
          value={annee}
          invalid={motifRefusSaisie !== null}
          invalidText={motifRefusSaisie ?? undefined}
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
          <InlineNotification
            kind="error"
            lowContrast
            hideCloseButton
            title="Ouverture refusée"
            subtitle={refus}
            className="mt-4 max-w-none"
          />
        )}
      </Modal>
    </>
  );
}
