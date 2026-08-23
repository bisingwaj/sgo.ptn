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
 * Cet écran couvre les trois premiers actes, ceux de l'UGP. La suite —
 * demande d'ANO, décision du bailleur, publication — reste à ouvrir.
 *
 * CE QU'IL NE FAIT PAS. Il n'instruit pas : il enregistre une décision déjà
 * prise. Le dossier se lit sur `/tdr/[id]`, et le lien y mène depuis chaque
 * ligne. Un tableau qui prétendrait suffire à juger un TDR de huit millions
 * mentirait sur ce qu'est une revue.
 */

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Modal, TextArea } from "@carbon/react";
import { Shell } from "@/components/shell/Shell";
import { PageHeader } from "@/components/ui/PageHeader";
import { useAuth } from "@/components/auth/AuthContext";
import { passationApi, type DossierAInstruire, type TdrStatusApi } from "@/lib/api";
import { ArrowRight, Undo, CheckmarkOutline, View, WarningAltFilled } from "@carbon/icons-react";
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
  VALIDE_UGP: { label: "Validé · marché ouvert", ton: vue.tonOk },
  ANO_EN_COURS: { label: "ANO demandé au bailleur", ton: vue.tonNeutre },
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
  const [motif, setMotif] = useState("");
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
      setMotif("");
      await charger();
    } catch (e) {
      setRefus(e instanceof Error ? e.message : "L’acte n’a pas abouti.");
    } finally {
      setOccupe(null);
    }
  };

  const peutInstruire = can("tdr:review");
  const peutValider = can("tdr:validate");

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
                        {d.marche && (
                          <span className={vue.sousTitre}>
                            Marché ouvert · {d.marche.status}
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
    </Shell>
  );
}
