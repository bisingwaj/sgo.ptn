"use client";

/**
 * Les avis de non-objection — la file, et la décision.
 *
 * CE QUI ÉTAIT LÀ. Un écran de démonstration : quarante-cinq lignes de
 * données écrites en dur, des délais qui ne s'écoulaient pas, des boutons
 * sans effet. Il montrait à quoi ressemblerait une inbox ANO ; il n'en
 * était pas une. Le point d'entrée serveur existait pourtant, et la
 * décision aussi.
 *
 * DEUX PUBLICS, UN SEUL ÉCRAN. Le bailleur décide ; l'UGPTN suit. La
 * différence ne tient qu'à une habilitation — `ano:decide`, que l'UGPTN
 * ne porte pas et ne portera pas. Fabriquer deux écrans aurait fait
 * diverger deux lectures du même dossier.
 *
 * LE DÉLAI DE SERVICE EST LA CLÉ DE LECTURE. Quatorze jours pour la
 * Banque mondiale, vingt et un pour l'AFD, comptés depuis le dépôt. La
 * file se range par échéance, la plus proche en tête : c'est ainsi qu'on
 * décide quoi traiter, et non par ordre d'arrivée.
 *
 * CE QUE L'ÉCRAN NE FAIT PAS. Il ne juge pas le dossier. La décision se
 * prend sur pièces — le TDR s'ouvre depuis chaque ligne. Un tableau qui
 * prétendrait suffire à accorder une non-objection sur huit millions de
 * dollars mentirait sur ce qu'est une revue de bailleur.
 */

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Modal, TextArea } from "@carbon/react";
import { Shell } from "@/components/shell/Shell";
import { PageHeader } from "@/components/ui/PageHeader";
import { useAuth } from "@/components/auth/AuthContext";
import { passationApi, type AnoDecisionApi, type AnoEnCours } from "@/lib/api";
import {
  CheckmarkOutline,
  Close,
  Edit,
  Time,
  WarningAltFilled,
} from "@carbon/icons-react";
import styles from "@/styles/ugp-shared.module.scss";
import vue from "./ano.module.scss";

const money = (usd: number | null) => (usd === null ? "—" : `${(usd / 1e6).toFixed(2)} M`);

const jourCourt = (iso: string) =>
  new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });

/**
 * Ce qu'il reste avant l'échéance, en jours entiers.
 *
 * Comptés sur les dates civiles et non sur l'écart d'horodatages : « il
 * reste 0 jour » doit vouloir dire « c'est aujourd'hui », pas « il reste
 * onze heures ».
 */
function joursRestants(dueAt: string): number {
  const minuit = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  return Math.round((minuit(new Date(dueAt)) - minuit(new Date())) / 86_400_000);
}

/** Les trois suites que le corpus nomme, et ce qu'elles engagent. */
const DECISIONS: Array<{
  code: AnoDecisionApi;
  libelle: string;
  effet: string;
  motifRequis: boolean;
  danger: boolean;
}> = [
  {
    code: "NON_OBJECTION",
    libelle: "Accorder la non-objection",
    effet:
      "Le dossier est réputé conforme. L’UGPTN pourra publier l’avis d’appel d’offres, et le marché suivra son cours.",
    motifRequis: false,
    danger: false,
  },
  {
    code: "DEMANDE_MODIFICATION",
    libelle: "Demander une modification",
    effet:
      "Le dossier repart à l’UGPTN pour correction, sans être refusé. Dites ce qui doit changer : sans cela, la correction se fait à l’aveugle.",
    motifRequis: true,
    danger: false,
  },
  {
    code: "REFUS",
    libelle: "Refuser la non-objection",
    effet:
      "Le marché ne peut pas être lancé en l’état, et l’enveloppe de la ligne du plan est libérée. Le motif est consigné au journal.",
    motifRequis: true,
    danger: true,
  },
];

export function AnoClient() {
  const { can, loading: authLoading } = useAuth();

  const [lignes, setLignes] = useState<AnoEnCours[] | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  /** La demande sur laquelle on statue, et la suite choisie. */
  const [aDecider, setADecider] = useState<AnoEnCours | null>(null);
  const [suite, setSuite] = useState<AnoDecisionApi>("NON_OBJECTION");
  const [motif, setMotif] = useState("");
  const [occupe, setOccupe] = useState(false);
  const [refus, setRefus] = useState<string | null>(null);

  const charger = useCallback(async () => {
    try {
      setLignes(await passationApi.anosEnCours());
      setErreur(null);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "File des non-objections indisponible.");
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;
    void (async () => {
      await charger();
    })();
  }, [authLoading, charger]);

  const peutDecider = can("ano:decide");
  const choisie = DECISIONS.find((d) => d.code === suite)!;
  const motifManquant = choisie.motifRequis && motif.trim().length < 5;

  const decider = async () => {
    if (!aDecider) return;
    setOccupe(true);
    setRefus(null);
    try {
      await passationApi.deciderAno(aDecider.id, suite, motif.trim() || undefined);
      setADecider(null);
      setMotif("");
      setSuite("NON_OBJECTION");
      await charger();
    } catch (e) {
      setRefus(e instanceof Error ? e.message : "La décision n’a pas été enregistrée.");
    } finally {
      setOccupe(false);
    }
  };

  const enRetard = (lignes ?? []).filter((l) => joursRestants(l.dueAt) < 0).length;

  return (
    <Shell crumbs={[{ label: "Non-objections" }]}>
      <PageHeader
        eyebrow="PASSATION · AVIS DE NON-OBJECTION"
        title="Demandes en attente"
        subtitle={
          peutDecider
            ? "Les dossiers déposés par l’UGPTN et qui attendent votre décision. La file se range par échéance de délai de service, la plus proche en tête."
            : "Les dossiers déposés auprès des bailleurs et qui attendent leur décision. L’UGPTN demande la non-objection ; elle ne la rend pas."
        }
      />

      {erreur && (
        <div className={vue.alerte} role="alert">
          <WarningAltFilled size={16} aria-hidden />
          <span>{erreur}</span>
        </div>
      )}

      {enRetard > 0 && (
        <div className={vue.alerte} role="status">
          <Time size={16} aria-hidden />
          <span>
            {enRetard} demande{enRetard > 1 ? "s" : ""} au-delà du délai de service.
          </span>
        </div>
      )}

      {!authLoading && !peutDecider && (
        <div className={vue.info}>
          La décision appartient au bailleur, et à lui seul — Banque mondiale ou AFD selon la
          source de financement. Vous suivez ici l’avancement de vos dépôts.
        </div>
      )}

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Demande</th>
              <th>Objet</th>
              <th>Marché</th>
              <th>Montant (USD)</th>
              <th>Financement</th>
              <th>Bailleur saisi</th>
              <th>Déposé le</th>
              <th>Délai de service</th>
              {peutDecider && <th>Décision</th>}
            </tr>
          </thead>
          <tbody>
            {lignes === null && !erreur ? (
              <tr>
                <td colSpan={peutDecider ? 9 : 8}>Chargement de la file…</td>
              </tr>
            ) : (lignes ?? []).length === 0 ? (
              <tr>
                <td colSpan={peutDecider ? 9 : 8}>
                  <div className={vue.vide}>
                    <p>Aucune demande de non-objection en attente.</p>
                    <p className={vue.videDetail}>
                      Une demande arrive ici quand l’UGPTN soumet un dossier d’appel d’offres,
                      depuis la file d’instruction des TDR.
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              (lignes ?? []).map((a) => {
                const reste = joursRestants(a.dueAt);
                const ton =
                  reste < 0 ? vue.tonAlerte : reste <= 3 ? vue.tonAttente : vue.tonNeutre;

                return (
                  <tr key={a.id}>
                    <td>
                      <span className={styles.ref}>{a.reference}</span>
                      <div className={vue.sousTitre}>{a.objet}</div>
                    </td>
                    <td>
                      {a.tdrId ? (
                        <Link href={`/tdr/${a.tdrId}`} className={vue.lien}>
                          {a.title ?? "—"}
                        </Link>
                      ) : (
                        (a.title ?? "—")
                      )}
                      {a.organisation && <div className={vue.sousTitre}>{a.organisation}</div>}
                    </td>
                    <td className="ptn-mono">
                      {a.objetRef}
                      <div className={vue.sousTitre}>
                        {a.methodCode ?? "—"}
                        {a.reviewType &&
                          ` · ${a.reviewType === "PRIOR" ? "revue préalable" : "revue postérieure"}`}
                      </div>
                    </td>
                    <td className={styles.amount}>{money(a.budgetTotalUsd)}</td>
                    <td className={vue.financement}>
                      {a.budgetIdaUsd ? <span>IDA {money(a.budgetIdaUsd)}</span> : null}
                      {a.budgetAfdUsd ? <span>AFD {money(a.budgetAfdUsd)}</span> : null}
                      {!a.budgetIdaUsd && !a.budgetAfdUsd ? "—" : null}
                      {a.ptbaCode && <span className={vue.sousTitre}>{a.ptbaCode}</span>}
                    </td>
                    <td>{a.donor}</td>
                    <td className={styles.date}>{jourCourt(a.submittedAt)}</td>
                    <td>
                      {/* Le nombre de jours, pas seulement la date : « échéance
                          le 6 sept. » demande un calcul de tête que personne
                          ne fait en parcourant vingt lignes. */}
                      <span className={`${vue.delai} ${ton}`}>
                        {reste < 0
                          ? `${-reste} j de retard`
                          : reste === 0
                            ? "échoit aujourd’hui"
                            : `${reste} j restants`}
                      </span>
                      <div className={vue.sousTitre}>
                        {a.delaiJours} j · échéance {jourCourt(a.dueAt)}
                      </div>
                    </td>
                    {peutDecider && (
                      <td>
                        <button
                          type="button"
                          className={vue.actionForte}
                          onClick={() => {
                            setADecider(a);
                            setSuite("NON_OBJECTION");
                            setMotif("");
                            setRefus(null);
                          }}
                        >
                          Statuer
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <p className={vue.pied}>
        Délais de service inscrits au corpus : quatorze jours pour la Banque mondiale, vingt et
        un pour l’AFD, comptés depuis le dépôt. Chaque décision est inscrite au journal d’audit
        avec son auteur.
      </p>

      {/* ---------- La décision ---------- */}
      <Modal
        open={aDecider !== null}
        danger={choisie.danger}
        modalHeading="Statuer sur cette demande"
        modalLabel={aDecider?.reference}
        primaryButtonText={occupe ? "Enregistrement…" : choisie.libelle}
        secondaryButtonText="Annuler"
        primaryButtonDisabled={occupe || motifManquant}
        onRequestClose={() => {
          setADecider(null);
          setMotif("");
          setRefus(null);
        }}
        onRequestSubmit={() => void decider()}
      >
        <p className="text-body text-secondary mb-4">
          <strong>{aDecider?.title}</strong> — {money(aDecider?.budgetTotalUsd ?? null)} USD,{" "}
          {aDecider?.methodCode ?? "méthode non précisée"}, déposé le{" "}
          {aDecider ? jourCourt(aDecider.submittedAt) : ""}.
        </p>

        {/* Trois suites, chacune avec son effet écrit. Un menu déroulant
            les mettrait sur le même plan et cacherait ce qu'elles font. */}
        <div className={vue.suites} role="radiogroup" aria-label="Suite donnée à la demande">
          {DECISIONS.map((d) => (
            <label
              key={d.code}
              className={`${vue.suite} ${suite === d.code ? vue.suiteRetenue : ""}`}
            >
              <input
                type="radio"
                name="suite-ano"
                value={d.code}
                checked={suite === d.code}
                onChange={() => {
                  setSuite(d.code);
                  setRefus(null);
                }}
                className={vue.suiteInput}
              />
              <span className={vue.suiteTitre}>
                {d.code === "NON_OBJECTION" && <CheckmarkOutline size={16} aria-hidden />}
                {d.code === "DEMANDE_MODIFICATION" && <Edit size={16} aria-hidden />}
                {d.code === "REFUS" && <Close size={16} aria-hidden />}
                {d.libelle}
              </span>
              <span className={vue.suiteEffet}>{d.effet}</span>
            </label>
          ))}
        </div>

        <div className="mt-4">
          <TextArea
            id="ano-motif"
            labelText={choisie.motifRequis ? "Motif de la décision" : "Observation (facultative)"}
            helperText={
              choisie.motifRequis
                ? "Il dit à l’UGPTN ce qu’elle doit reprendre. Cinq caractères au minimum."
                : "Consignée au dossier si vous en portez une."
            }
            rows={3}
            value={motif}
            onChange={(e) => setMotif(e.target.value)}
          />
        </div>

        {refus && (
          <p className={vue.refus} role="alert">
            {refus}
          </p>
        )}
      </Modal>
    </Shell>
  );
}
