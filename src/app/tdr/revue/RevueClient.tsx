"use client";

/**
 * Instruction des dossiers transmis — la revue de l'UGP.
 *
 * L'ÉCRAN QUI MANQUAIT, ET SANS LEQUEL LA CHAÎNE S'ARRÊTAIT. Les six actes
 * de la passation existaient côté serveur — ouvrir la revue, retourner,
 * valider, demander l'ANO, décider, publier — et AUCUN écran ne les
 * appelait. Un TDR pouvait être transmis, et plus rien après : les onglets
 * « Transmis », « En revue » et « Retournés » du registre restaient vides
 * non par défaut d'affichage, mais parce que rien ne pouvait y arriver.
 *
 * Cet écran porte les CINQ actes de l'UGP sur un dossier transmis :
 * prendre en revue, retourner à l'auteur, valider — puis, une fois le
 * marché né, demander la non-objection et publier l'avis. Le sixième acte,
 * la décision elle-même, n'appartient pas à l'UGP : il se rend sur
 * `/ano`, et par le bailleur seul.
 *
 * Un dossier ne quitte donc la file qu'une fois son avis publié. Il en
 * sortait auparavant à l'obtention de la non-objection — c'est-à-dire au
 * moment précis où quelqu'un devait agir dessus.
 *
 * CE QU'IL NE FAIT PAS. Il n'instruit pas : il enregistre une décision déjà
 * prise. Le dossier se lit sur `/tdr/[id]`, et le lien y mène depuis chaque
 * ligne. Un tableau qui prétendrait suffire à juger un TDR de huit millions
 * mentirait sur ce qu'est une revue.
 */

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Modal, NumberInput, TextArea } from "@carbon/react";
import { Shell } from "@/components/shell/Shell";
import { PageHeader } from "@/components/ui/PageHeader";
import { useAuth } from "@/components/auth/AuthContext";
import { passationApi, type DossierAInstruire, type TdrStatusApi } from "@/lib/api";
import {
  ArrowRight,
  Undo,
  CheckmarkOutline,
  Send,
  Bullhorn,
  View,
  WarningAltFilled,
} from "@carbon/icons-react";
import styles from "@/styles/ugp-shared.module.scss";
import vue from "./revue.module.scss";

/**
 * Ce que chaque statut attend, dit du point de vue de l'instructeur.
 *
 * « Transmis » ne dit rien à celui qui doit agir : il dit d'où vient le
 * dossier, pas ce qu'on en attend. La colonne porte donc l'attente.
 */
const ATTENTE: Partial<Record<TdrStatusApi, { label: string; ton: string }>> = {
  SOUMIS_UGP: { label: "À prendre en revue", ton: vue.tonAttente },
  REVUE_UGP: { label: "En revue — à trancher", ton: vue.tonAttente },
  VALIDE_UGP: { label: "Validé · ANO à demander", ton: vue.tonAttente },
  ANO_EN_COURS: { label: "Chez le bailleur", ton: vue.tonNeutre },
  ANO_OBTENU: { label: "Non-objection obtenue · avis à publier", ton: vue.tonOk },
  ANO_REFUSE: { label: "Non-objection refusée", ton: vue.tonAlerte },
};

const money = (usd: number | null) => (usd === null ? "—" : `${(usd / 1e6).toFixed(2)} M`);

const jour = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })
    : "—";

export function RevueClient() {
  const { can, loading: authLoading } = useAuth();

  const [lignes, setLignes] = useState<DossierAInstruire[] | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  /** L'acte en cours, et le dossier qu'il vise. */
  const [aRetourner, setARetourner] = useState<DossierAInstruire | null>(null);
  const [aValider, setAValider] = useState<DossierAInstruire | null>(null);
  const [aDemanderAno, setADemanderAno] = useState<DossierAInstruire | null>(null);
  const [aPublier, setAPublier] = useState<DossierAInstruire | null>(null);
  const [motif, setMotif] = useState("");

  /** L'avis, tel qu'un candidat le lira. Le reste vient du marché. */
  const [resume, setResume] = useState("");
  const [jours, setJours] = useState(30);
  const [occupe, setOccupe] = useState<string | null>(null);
  const [refus, setRefus] = useState<string | null>(null);

  const charger = useCallback(async () => {
    try {
      setLignes(await passationApi.aInstruire());
      setErreur(null);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "File d’instruction indisponible.");
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;
    // L'appel passe par une fonction asynchrone : `void charger()` place le
    // premier `setState` dans le corps de l'effet, ce qui déclenche des
    // rendus en cascade et échoue au lint.
    void (async () => {
      await charger();
    })();
  }, [authLoading, charger]);

  /**
   * Un acte, et le rechargement qui suit.
   *
   * La file est rechargée depuis le serveur plutôt que corrigée en place :
   * la validation fait naître un marché, et l'état d'après n'est pas
   * déductible de l'état d'avant.
   */
  const agir = async (id: string, acte: () => Promise<unknown>) => {
    setOccupe(id);
    setRefus(null);
    try {
      await acte();
      setARetourner(null);
      setAValider(null);
      setADemanderAno(null);
      setAPublier(null);
      setMotif("");
      setResume("");
      await charger();
    } catch (e) {
      setRefus(e instanceof Error ? e.message : "L’acte n’a pas abouti.");
    } finally {
      setOccupe(null);
    }
  };

  const peutInstruire = can("tdr:review");
  const peutValider = can("tdr:validate");
  const peutDemanderAno = can("ano:submit");
  const peutPublier = can("dao:publish");

  return (
    <Shell crumbs={[{ label: "TDR", href: "/tdr" }, { label: "Instruction" }]}>
      <PageHeader
        eyebrow="PASSATION · INSTRUCTION DES DOSSIERS TRANSMIS"
        title="À instruire"
        subtitle="Les dossiers qui ont quitté la main de leur auteur et attendent une décision de l’UGP. Ouvrir le dossier avant de trancher : cette file enregistre une décision, elle ne la prépare pas."
        actions={
          <Link href="/tdr" className="demoBtnSecondary">
            <span>Le registre</span> <ArrowRight size={14} aria-hidden />
          </Link>
        }
      />

      {erreur && (
        <div className={vue.alerte} role="alert">
          <WarningAltFilled size={16} aria-hidden />
          <span>{erreur}</span>
        </div>
      )}

      {!authLoading && !peutInstruire && (
        <div className={vue.info}>
          L’instruction des dossiers relève du RPM, des chargés de passation et de la
          coordination. Vous pouvez suivre l’avancement depuis le registre, sans y prendre
          part.
        </div>
      )}

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Référence</th>
              <th>Objet</th>
              <th>Ligne du plan</th>
              <th>Budget (USD)</th>
              <th>Méthode</th>
              <th>Transmis le</th>
              <th>Attente</th>
              <th>Décision</th>
            </tr>
          </thead>
          <tbody>
            {lignes === null && !erreur ? (
              <tr>
                <td colSpan={8}>Chargement de la file…</td>
              </tr>
            ) : (lignes ?? []).length === 0 ? (
              <tr>
                <td colSpan={8}>
                  <div className={vue.vide}>
                    <p>Aucun dossier n’attend d’instruction.</p>
                    <p className={vue.videDetail}>
                      Un dossier arrive ici lorsque son auteur le transmet depuis le parcours
                      de rédaction. Tant qu’il est en brouillon, il n’appartient qu’à lui.
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              (lignes ?? []).map((d) => {
                const attente = ATTENTE[d.status];
                const enCours = occupe === d.id;

                return (
                  <tr key={d.id}>
                    <td>
                      <Link href={`/tdr/${d.id}`} className={styles.ref}>
                        {d.reference}
                      </Link>
                    </td>
                    <td>
                      <Link href={`/tdr/${d.id}`} className={vue.lien}>
                        {d.title}
                      </Link>
                      {d.organisation && <div className={vue.sousTitre}>{d.organisation}</div>}
                    </td>
                    <td className="ptn-mono">
                      {d.ptbaCode ?? "—"}
                      {d.componentCode && <div className={vue.sousTitre}>{d.componentCode}</div>}
                    </td>
                    <td className={styles.amount}>{money(d.budgetTotalUsd)}</td>
                    <td>
                      <span className={styles.tag}>{d.methodCode ?? "—"}</span>
                      {d.reviewType && (
                        <div className={vue.sousTitre}>
                          {d.reviewType === "PRIOR" ? "revue préalable" : "revue postérieure"}
                        </div>
                      )}
                    </td>
                    <td className={styles.date}>{jour(d.submittedAt)}</td>
                    <td>
                      {attente && (
                        <span className={`${vue.statut} ${attente.ton}`}>{attente.label}</span>
                      )}
                    </td>
                    <td>
                      <div className={vue.actions}>
                        {/* Prendre en revue n'est pas une décision : c'est
                            dire aux autres que le dossier est pris. Le geste
                            reste distinct pour que deux instructeurs ne
                            travaillent pas dessus en même temps. */}
                        {d.status === "SOUMIS_UGP" && peutInstruire && (
                          <button
                            type="button"
                            className={vue.action}
                            disabled={enCours}
                            onClick={() =>
                              void agir(d.id, () => passationApi.ouvrirRevue(d.id))
                            }
                          >
                            <View size={14} aria-hidden /> Prendre en revue
                          </button>
                        )}
                        {["SOUMIS_UGP", "REVUE_UGP"].includes(d.status) && peutInstruire && (
                          <button
                            type="button"
                            className={vue.action}
                            disabled={enCours}
                            onClick={() => {
                              setARetourner(d);
                              setMotif("");
                              setRefus(null);
                            }}
                          >
                            <Undo size={14} aria-hidden /> Retourner
                          </button>
                        )}
                        {["SOUMIS_UGP", "REVUE_UGP"].includes(d.status) && peutValider && (
                          <button
                            type="button"
                            className={vue.actionForte}
                            disabled={enCours}
                            onClick={() => {
                              setAValider(d);
                              setRefus(null);
                            }}
                          >
                            <CheckmarkOutline size={14} aria-hidden /> Valider
                          </button>
                        )}
                        {/* Une fois le marché né, deux actes restent à
                            l'UGP : demander la non-objection, puis publier
                            l'avis. Entre les deux, la décision appartient
                            au bailleur et rien ne s'offre ici. */}
                        {d.status === "VALIDE_UGP" && d.marche && peutDemanderAno && (
                          <button
                            type="button"
                            className={vue.actionForte}
                            disabled={enCours}
                            onClick={() => {
                              setADemanderAno(d);
                              setRefus(null);
                            }}
                          >
                            <Send size={14} aria-hidden /> Demander l’ANO
                          </button>
                        )}
                        {d.status === "ANO_EN_COURS" && (
                          <span className={vue.sousTitre}>
                            Décision attendue du bailleur — rien à faire ici
                          </span>
                        )}
                        {d.status === "ANO_OBTENU" && d.marche && peutPublier && (
                          <button
                            type="button"
                            className={vue.actionForte}
                            disabled={enCours}
                            onClick={() => {
                              setAPublier(d);
                              setResume("");
                              setJours(30);
                              setRefus(null);
                            }}
                          >
                            <Bullhorn size={14} aria-hidden /> Publier l’avis
                          </button>
                        )}
                        {d.status === "ANO_REFUSE" && (
                          <span className={vue.sousTitre}>
                            Refus motivé — le dossier se reprend avec l’auteur
                          </span>
                        )}
                        {d.marche && (
                          <span className={vue.sousTitre}>
                            Marché {d.marche.status.toLowerCase().replace(/_/g, " ")}
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ---------- Retour à l'auteur ---------- */}
      <Modal
        open={aRetourner !== null}
        modalHeading="Retourner ce dossier à son auteur ?"
        modalLabel={aRetourner?.reference}
        primaryButtonText={occupe ? "Retour…" : "Retourner à l’auteur"}
        secondaryButtonText="Annuler"
        primaryButtonDisabled={Boolean(occupe) || motif.trim().length < 5}
        onRequestClose={() => {
          setARetourner(null);
          setMotif("");
          setRefus(null);
        }}
        onRequestSubmit={() =>
          aRetourner &&
          void agir(aRetourner.id, () => passationApi.retourner(aRetourner.id, motif.trim()))
        }
      >
        <p className="text-body text-secondary mb-4">
          <strong>{aRetourner?.title}</strong> repart en rédaction. Son auteur le reprendra là
          où il l’a laissé, et le retransmettra. La ligne du plan lui reste réservée pendant
          ce temps.
        </p>
        <TextArea
          id="revue-motif"
          labelText="Motif du retour"
          helperText="Il dit à l’auteur quoi reprendre — sans lui, il recommence à l’aveugle. Cinq caractères au minimum."
          rows={4}
          value={motif}
          onChange={(e) => setMotif(e.target.value)}
        />
        {refus && (
          <p className={vue.refus} role="alert">
            {refus}
          </p>
        )}
      </Modal>

      {/* ---------- Validation ---------- */}
      <Modal
        open={aValider !== null}
        modalHeading="Valider ce dossier et ouvrir le marché ?"
        modalLabel={aValider?.reference}
        primaryButtonText={occupe ? "Validation…" : "Valider et ouvrir le marché"}
        secondaryButtonText="Annuler"
        primaryButtonDisabled={Boolean(occupe)}
        onRequestClose={() => {
          setAValider(null);
          setRefus(null);
        }}
        onRequestSubmit={() => aValider && void agir(aValider.id, () => passationApi.valider(aValider.id))}
      >
        <p className="text-body text-secondary mb-4">
          C’est ici, et nulle part ailleurs, qu’un marché naît. Il reprend la référence{" "}
          <span className="ptn-mono">{aValider?.reference}</span>, sa méthode{" "}
          <span className="ptn-mono">{aValider?.methodCode ?? "—"}</span> et son type de revue
          tels qu’ils ont été figés à la transmission — les seuils bougent, un marché en cours
          ne change pas de méthode en chemin.
        </p>
        <p className="text-body text-secondary">
          Le dossier ne revient plus en rédaction : après validation, une correction passe par
          le retrait du marché. La décision est inscrite au journal d’audit avec son auteur.
        </p>
        {refus && (
          <p className={vue.refus} role="alert">
            {refus}
          </p>
        )}
      </Modal>

      {/* ---------- Demande de non-objection ---------- */}
      <Modal
        open={aDemanderAno !== null}
        modalHeading="Soumettre ce dossier à non-objection ?"
        modalLabel={aDemanderAno?.reference}
        primaryButtonText={occupe ? "Envoi…" : "Déposer la demande"}
        secondaryButtonText="Annuler"
        primaryButtonDisabled={Boolean(occupe)}
        onRequestClose={() => {
          setADemanderAno(null);
          setRefus(null);
        }}
        onRequestSubmit={() =>
          aDemanderAno?.marche &&
          void agir(aDemanderAno.id, () =>
            passationApi.demanderAno(aDemanderAno.marche!.id),
          )
        }
      >
        <p className="text-body text-secondary mb-4">
          <strong>{aDemanderAno?.title}</strong> part au bailleur.{" "}
          <strong>L’UGPTN demande, elle ne décide pas</strong> : la non-objection est la
          prérogative du bailleur, et personne ici ne peut la rendre à sa place.
        </p>
        <p className="text-body text-secondary">
          Le bailleur saisi se déduit de la ventilation du financement inscrite au dossier —
          IDA, AFD, ou les deux en cofinancement. Le délai de service court à compter du dépôt :
          quatorze jours pour la Banque mondiale, vingt et un pour l’AFD.
        </p>
        {refus && (
          <p className={vue.refus} role="alert">
            {refus}
          </p>
        )}
      </Modal>

      {/* ---------- Publication de l'avis ---------- */}
      <Modal
        open={aPublier !== null}
        modalHeading="Publier l’avis d’appel d’offres ?"
        modalLabel={aPublier?.reference}
        primaryButtonText={occupe ? "Publication…" : "Publier l’avis"}
        secondaryButtonText="Annuler"
        primaryButtonDisabled={Boolean(occupe) || resume.trim().length < 20}
        onRequestClose={() => {
          setAPublier(null);
          setRefus(null);
        }}
        onRequestSubmit={() =>
          aPublier?.marche &&
          void agir(aPublier.id, () =>
            passationApi.publier(aPublier.marche!.id, {
              resume: resume.trim(),
              joursDeDepot: jours,
            }),
          )
        }
      >
        <p className="text-body text-secondary mb-4">
          L’avis paraît au marketplace, où les entreprises inscrites déposent leur offre.{" "}
          <strong>Un marché ne se publie qu’une fois</strong> : deux avis pour un même marché
          laisseraient un candidat sans savoir auquel répondre.
        </p>
        <TextArea
          id="avis-resume"
          labelText="Ce que le candidat lit en premier"
          helperText="L’objet du marché en quelques phrases, dans les termes d’une entreprise qui décide si elle concourt. Vingt caractères au minimum."
          rows={4}
          value={resume}
          onChange={(e) => setResume(e.target.value)}
        />
        <div className="mt-4">
          <NumberInput
            id="avis-jours"
            label="Délai de dépôt, en jours"
            helperText="Sept jours au minimum : en deçà, un dossier ne se constitue pas. Cent vingt au plus."
            min={7}
            max={120}
            value={jours}
            onChange={(_e, { value }) => setJours(Number(value) || 30)}
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
