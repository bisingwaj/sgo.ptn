"use client";

/**
 * Consultation d'un TDR.
 *
 * Lecture seule, quel que soit le statut. Un brouillon se reprend par le
 * parcours de rédaction, un dossier transmis ne se modifie plus : cet écran
 * ne propose donc jamais de champ de saisie, seulement de quoi relire et,
 * pour son auteur, de quoi reprendre ou supprimer un brouillon.
 *
 * Le cloisonnement est décidé par le service — hors UGP et bailleurs, on ne
 * voit que les dossiers de son organisation. La règle n'est pas répétée
 * ici, où elle finirait par diverger.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Shell } from "@/components/shell/Shell";
import { PageHeader } from "@/components/ui/PageHeader";
import { useAuth } from "@/components/auth/AuthContext";
import { tdrApi, ApiError, type TdrApi, type TdrStatusApi } from "@/lib/api";
import { Document, Edit, TrashCan, WarningAltFilled } from "@carbon/icons-react";
import styles from "@/styles/ugp-shared.module.scss";
import vue from "./detail.module.scss";

const STATUT: Record<TdrStatusApi, string> = {
  BROUILLON: "Brouillon",
  SOUMIS_UGP: "Transmis à l’UGP",
  REVUE_UGP: "En revue UGP",
  RETOURNE: "Retourné pour reprise",
  VALIDE_UGP: "Validé par l’UGP",
  ANO_EN_COURS: "ANO en cours",
  ANO_OBTENU: "ANO obtenu",
  ANO_REFUSE: "ANO refusé",
  ARCHIVE: "Archivé",
};

const usd = (v: string | null) => (v ? `${(Number(v) / 1e6).toFixed(2)} M USD` : "—");

export function TdrDetailClient({ id }: { id: string }) {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [tdr, setTdr] = useState<TdrApi | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // L'état s'écrit dans les rappels de la promesse, jamais dans le corps de
  // l'effet — appeler une fonction qui écrit revient au même pour la règle,
  // et provoque les rendus en cascade qu'elle vise. Le drapeau d'annulation
  // évite en outre d'afficher un dossier dont on a quitté l'écran.
  useEffect(() => {
    if (authLoading) return;
    let annule = false;
    tdrApi
      .get(id)
      .then((t) => {
        if (!annule) setTdr(t);
      })
      .catch((e: unknown) => {
        if (!annule) {
          setError(e instanceof ApiError ? e.message : "Dossier introuvable.");
        }
      });
    return () => {
      annule = true;
    };
  }, [authLoading, id]);

  const supprimer = async () => {
    setDeleting(true);
    try {
      await tdrApi.remove(id);
      router.push("/tdr");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Suppression impossible.");
      setDeleting(false);
    }
  };

  if (error) {
    return (
      <Shell crumbs={[{ label: "TDR", href: "/tdr" }]}>
        <div className={vue.gate}>
          <WarningAltFilled size={32} aria-hidden />
          <p>{error}</p>
          <Link href="/tdr" className="demoBtnSecondary">
            <span>Retour au registre</span>
          </Link>
        </div>
      </Shell>
    );
  }

  if (!tdr) {
    return (
      <Shell crumbs={[{ label: "TDR", href: "/tdr" }]}>
        <div className={vue.gate}>Chargement…</div>
      </Shell>
    );
  }

  // Être connecté ne fait pas de vous l'auteur. La comparaison portait sur
  // la seule présence d'une session : « Supprimer » s'affichait à tous les
  // lecteurs du dossier, et le serveur répondait « Seul l'auteur d'un
  // brouillon peut le supprimer » après la confirmation. Un bouton qui
  // promet ce qu'il n'obtient pas use la confiance à chaque usage.
  const estAuteur = Boolean(user) && user?.userId === tdr.authorId;
  const reprenable = ["BROUILLON", "RETOURNE"].includes(tdr.status);

  return (
    <Shell
      crumbs={[
        { label: "TDR", href: "/tdr" },
        { label: tdr.reference },
      ]}
    >
      <PageHeader
        eyebrow={`${tdr.tdrTypeCode} · ${tdr.tdrType?.name ?? ""}`}
        title={tdr.title}
        subtitle={tdr.reference}
        meta={
          <>
            <span>
              Statut : <strong>{STATUT[tdr.status]}</strong>
            </span>
            {tdr.ptbaActivity && (
              <>
                <span>·</span>
                <span>
                  Activité <span className="ptn-mono">{tdr.ptbaActivity.code}</span>
                </span>
              </>
            )}
            {tdr.procurementMethodCode && (
              <>
                <span>·</span>
                <span>
                  {tdr.procurementMethodCode} ·{" "}
                  {tdr.reviewType === "PRIOR" ? "revue préalable" : "revue postérieure"}
                </span>
              </>
            )}
          </>
        }
        actions={
          <>
            {/* Le document existait sans qu'aucun écran n'y mène : on le
                déclenchait depuis Swagger. Offert à tout statut, brouillon
                compris — relire son dossier tel qu'il partira est
                précisément ce qu'on veut faire avant de le transmettre. */}
            <Link href={`/tdr/${tdr.id}/document`} className="demoBtnSecondary">
              <Document size={14} aria-hidden />
              <span>Voir le document</span>
            </Link>
            {reprenable && estAuteur && (
              <>
                <Link href={`/tdr/nouveau?id=${tdr.id}`} className="demoBtnPrimary">
                  <Edit size={14} aria-hidden />
                  <span>Reprendre la rédaction</span>
                </Link>
                {tdr.status === "BROUILLON" && (
                  <button
                    type="button"
                    className="demoBtnSecondary"
                    onClick={() => setConfirmDelete(true)}
                  >
                    <TrashCan size={14} aria-hidden />
                    <span>Supprimer</span>
                  </button>
                )}
              </>
            )}
          </>
        }
      />

      {confirmDelete && (
        <div className={vue.confirm}>
          <p>
            Supprimer définitivement <strong>{tdr.reference}</strong> ? Le contenu du brouillon est
            perdu. La référence reste consommée — une séquence ne se rembobine pas — et la
            suppression est inscrite au journal d’audit.
          </p>
          <div className={vue.confirmActions}>
            <button
              type="button"
              className="demoBtnSecondary"
              onClick={() => setConfirmDelete(false)}
              disabled={deleting}
            >
              <span>Conserver</span>
            </button>
            <button
              type="button"
              className={vue.btnDanger}
              onClick={() => void supprimer()}
              disabled={deleting}
            >
              <TrashCan size={14} aria-hidden />
              <span>{deleting ? "Suppression…" : "Supprimer le brouillon"}</span>
            </button>
          </div>
        </div>
      )}

      <div className={vue.doc}>
        <Bloc titre="Rattachement">
          <Ligne cle="Type" val={`${tdr.tdrTypeCode} · ${tdr.tdrType?.name ?? "—"}`} />
          <Ligne
            cle="Activité PTBA"
            val={tdr.ptbaActivity ? `${tdr.ptbaActivity.code} · ${tdr.ptbaActivity.title}` : "—"}
          />
          <Ligne
            cle="Enveloppe de l’activité"
            val={tdr.ptbaActivity ? usd(tdr.ptbaActivity.envelopeUsd) : "—"}
          />
          <Ligne
            cle="Maîtrise d’ouvrage bénéficiaire"
            val={tdr.beneficiaryOrganisation?.fullName ?? "Aucune désignée"}
          />
        </Bloc>

        <Bloc titre="Cadrage">
          <Prose cle="Contexte" val={tdr.context} />
          <Prose cle="Justification" val={tdr.justification} />
          <Prose cle="Bénéficiaires visés" val={tdr.beneficiaries} />
        </Bloc>

        <Bloc titre="Objectifs & livrables">
          <Liste
            cle="Objectifs SMART"
            items={tdr.objectives.map(
              (o, i) => `O${i + 1} · ${o.title}${o.criteria ? ` — ${o.criteria}` : ""}`,
            )}
          />
          <Prose cle="Résultats attendus" val={tdr.expectedResults} />
          <Liste
            cle="Livrables"
            items={tdr.deliverables.map(
              (d, i) =>
                `L${i + 1} · ${d.title}${d.format ? ` — ${d.format}` : ""}${d.deadline ? ` · ${d.deadline}` : ""}`,
            )}
          />
        </Bloc>

        <Bloc titre="Méthodologie">
          <Prose cle="Approche" val={tdr.approach} />
          <Prose cle="Méthodes et outils" val={tdr.methodology} />
          <Prose cle="Contraintes" val={tdr.constraints} />
        </Bloc>

        <Bloc titre="Calendrier & expertise">
          <Ligne
            cle="Démarrage souhaité"
            val={tdr.startDate ? new Date(tdr.startDate).toLocaleDateString("fr-FR") : "—"}
          />
          <Ligne cle="Durée" val={tdr.durationMonths ? `${tdr.durationMonths} mois` : "—"} />
          <Ligne
            cle="Volume d’effort"
            val={tdr.effortDays ? `${tdr.effortDays} jours-homme` : "—"}
          />
          <Ligne
            cle="Couverture"
            val={
              tdr.provinces.length
                ? tdr.provinces.map((c) => c.province.label).join(", ")
                : "Nationale"
            }
          />
          <Prose cle="Expertise requise" val={tdr.expertise} />
          <Liste cle="Profils-clés" items={tdr.keyProfiles} />
        </Bloc>

        <Bloc titre="Budget">
          <Ligne cle="Budget total" val={usd(tdr.budgetTotalUsd)} />
          <Ligne cle="Part IDA" val={usd(tdr.budgetIdaUsd)} />
          <Ligne cle="Part AFD" val={usd(tdr.budgetAfdUsd)} />
          <Ligne cle="Part Gouvernement" val={usd(tdr.budgetGovUsd)} />
        </Bloc>

        <Bloc titre="Cadre & risques">
          <Liste cle="Clauses" items={tdr.clauses.map((c) => c.label)} />
          <Liste
            cle="Indicateurs"
            items={tdr.indicators.map((i) => `${i.label} — ${i.measure}, cible ${i.target}`)}
          />
          <Liste
            cle="Risques"
            items={tdr.risks.map((r) => `${r.label} — atténuation : ${r.mitigation}`)}
          />
        </Bloc>

        <Bloc titre="Sauvegardes E&S">
          <Ligne cle="Catégorie de risque" val={tdr.esCategory ?? "—"} />
          <Liste cle="Risques identifiés" items={tdr.esRisks} />
        </Bloc>
      </div>
    </Shell>
  );
}

function Bloc({ titre, children }: { titre: string; children: React.ReactNode }) {
  return (
    <section className={styles.tableCard}>
      <div className={styles.toolbar}>
        <h3>{titre}</h3>
      </div>
      <dl className={vue.liste}>{children}</dl>
    </section>
  );
}

function Ligne({ cle, val }: { cle: string; val: string }) {
  return (
    <div className={vue.row}>
      <dt>{cle}</dt>
      <dd>{val}</dd>
    </div>
  );
}

function Prose({ cle, val }: { cle: string; val: string | null }) {
  return (
    <div className={vue.row}>
      <dt>{cle}</dt>
      <dd className={val?.trim() ? vue.prose : vue.absent}>
        {val?.trim() || "Non renseigné"}
      </dd>
    </div>
  );
}

function Liste({ cle, items }: { cle: string; items: string[] }) {
  return (
    <div className={vue.row}>
      <dt>{cle}</dt>
      <dd>
        {items.length === 0 ? (
          <span className={vue.absent}>Aucun</span>
        ) : (
          <ul className={vue.items}>
            {items.map((t, i) => (
              <li key={`${t}-${i}`}>{t}</li>
            ))}
          </ul>
        )}
      </dd>
    </div>
  );
}
