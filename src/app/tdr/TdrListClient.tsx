"use client";

/**
 * Registre des termes de référence.
 *
 * Cet écran manquait : les TDR s'enregistraient bien en base, l'endpoint
 * les servait, et aucune page ne les montrait. On rédigeait sans pouvoir
 * relire.
 *
 * La portée dépend du profil, et c'est le service qui la décide : l'UGP et
 * les bailleurs voient tout, les autres ne voient que les dossiers de leur
 * organisation. La règle n'est pas dupliquée ici, où elle dériverait.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Shell } from "@/components/shell/Shell";
import { PageHeader } from "@/components/ui/PageHeader";
import { useAuth } from "@/components/auth/AuthContext";
import { tdrApi, type TdrListItem, type TdrStatusApi } from "@/lib/api";
import { Modal } from "@carbon/react";
import { Add, Document, Edit, TrashCan, View, WarningAltFilled } from "@carbon/icons-react";
import styles from "@/styles/ugp-shared.module.scss";
import liste from "./tdr-liste.module.scss";

/**
 * Statuts du cycle. Le libellé dit où en est le dossier, la teinte dit s'il
 * attend quelque chose de vous.
 */
const STATUT: Record<TdrStatusApi, { label: string; ton: string }> = {
  BROUILLON: { label: "Brouillon", ton: liste.tonNeutre },
  SOUMIS_UGP: { label: "Transmis à l’UGP", ton: liste.tonAttente },
  REVUE_UGP: { label: "En revue UGP", ton: liste.tonAttente },
  RETOURNE: { label: "Retourné pour reprise", ton: liste.tonAlerte },
  VALIDE_UGP: { label: "Validé par l’UGP", ton: liste.tonOk },
  ANO_EN_COURS: { label: "ANO en cours", ton: liste.tonAttente },
  ANO_OBTENU: { label: "ANO obtenu", ton: liste.tonOk },
  ANO_REFUSE: { label: "ANO refusé", ton: liste.tonAlerte },
  ARCHIVE: { label: "Archivé", ton: liste.tonNeutre },
};

const FILTRES: Array<{ cle: TdrStatusApi | "tous"; label: string }> = [
  { cle: "tous", label: "Tous" },
  { cle: "BROUILLON", label: "Brouillons" },
  { cle: "SOUMIS_UGP", label: "Transmis" },
  { cle: "REVUE_UGP", label: "En revue" },
  { cle: "RETOURNE", label: "Retournés" },
  { cle: "VALIDE_UGP", label: "Validés" },
];

const money = (usd: string | null) =>
  usd ? `${(Number(usd) / 1e6).toFixed(2)} M` : "—";

const jour = (iso: string) =>
  new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });

export function TdrListClient() {
  const { can, user, loading: authLoading } = useAuth();

  const [items, setItems] = useState<TdrListItem[]>([]);
  const [filtre, setFiltre] = useState<TdrStatusApi | "tous">("tous");
  const [recherche, setRecherche] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Le brouillon dont on demande la suppression.
   *
   * La suppression existait, mais seulement sur l'écran de détail : il
   * fallait ouvrir le dossier pour s'en défaire. C'est ici qu'on voit ses
   * brouillons, donc ici qu'on trie.
   */
  const [aSupprimer, setASupprimer] = useState<TdrListItem | null>(null);
  const [suppressionEnCours, setSuppressionEnCours] = useState(false);
  const [refusSuppression, setRefusSuppression] = useState<string | null>(null);

  const charger = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setItems(await tdrApi.list());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Chargement impossible.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;
    void charger();
  }, [authLoading, charger]);

  const supprimer = async () => {
    if (!aSupprimer) return;
    setSuppressionEnCours(true);
    setRefusSuppression(null);
    try {
      await tdrApi.remove(aSupprimer.id);
      setASupprimer(null);
      await charger();
    } catch (e) {
      setRefusSuppression(e instanceof Error ? e.message : "Suppression impossible.");
    } finally {
      setSuppressionEnCours(false);
    }
  };

  /**
   * Qui peut effacer ce brouillon.
   *
   * Le serveur réserve la suppression à l'AUTEUR, et à lui seul — pas au
   * responsable de composante, pas à la coordination : un dossier qu'on
   * n'a pas écrit se retourne à son auteur, il ne s'efface pas dans son
   * dos. La condition est reproduite ici pour ne pas afficher un bouton
   * qui finirait en 403.
   */
  const effacable = (t: TdrListItem) =>
    t.status === "BROUILLON" && can("tdr:author") && t.authorId === user?.userId;

  // Le filtre par statut et la recherche s'appliquent côté écran : la liste
  // d'un exercice tient en mémoire, et un aller-retour réseau par frappe
  // n'apporterait rien.
  const visibles = useMemo(() => {
    const q = recherche.trim().toLowerCase();
    return items.filter((t) => {
      if (filtre !== "tous" && t.status !== filtre) return false;
      if (!q) return true;
      return (
        t.reference.toLowerCase().includes(q) ||
        t.title.toLowerCase().includes(q) ||
        (t.ptbaActivity?.code ?? "").toLowerCase().includes(q)
      );
    });
  }, [items, filtre, recherche]);

  const comptes = useMemo(() => {
    const n: Partial<Record<TdrStatusApi | "tous", number>> = { tous: items.length };
    for (const t of items) n[t.status] = (n[t.status] ?? 0) + 1;
    return n;
  }, [items]);

  const brouillons = comptes.BROUILLON ?? 0;
  const transmis = (comptes.SOUMIS_UGP ?? 0) + (comptes.REVUE_UGP ?? 0);

  return (
    <Shell crumbs={[{ label: "Cockpit UGP", href: "/cockpit" }, { label: "TDR" }]}>
      <PageHeader
        eyebrow="TERMES DE RÉFÉRENCE"
        title="Registre des TDR"
        subtitle="Tout dossier rédigé sur la plateforme, du brouillon à l’avis de non-objection. Un TDR transmis n’est plus modifiable : il faut qu’il soit retourné à son auteur."
        meta={
          <>
            <span>
              <strong>{items.length}</strong> dossier{items.length > 1 ? "s" : ""}
            </span>
            <span>·</span>
            <span>{brouillons} en rédaction</span>
            <span>·</span>
            <span>{transmis} en attente de l’UGP</span>
          </>
        }
        actions={
          can("tdr:author") ? (
            <Link href="/tdr/nouveau" className="demoBtnPrimary">
              <Add size={14} aria-hidden />
              <span>Rédiger un TDR</span>
            </Link>
          ) : undefined
        }
      />

      {error && (
        <div className={liste.alert}>
          <WarningAltFilled size={16} aria-hidden /> {error}
        </div>
      )}

      <div className={liste.barre}>
        <div className={liste.filtres} role="tablist" aria-label="Filtrer par statut">
          {FILTRES.map((f) => (
            <button
              key={f.cle}
              type="button"
              role="tab"
              aria-selected={filtre === f.cle}
              className={`${liste.filtre} ${filtre === f.cle ? liste.filtreOn : ""}`}
              onClick={() => setFiltre(f.cle)}
            >
              {f.label}
              <span className={liste.compte}>{comptes[f.cle] ?? 0}</span>
            </button>
          ))}
        </div>
        <input
          className={liste.recherche}
          value={recherche}
          onChange={(e) => setRecherche(e.target.value)}
          placeholder="Référence, intitulé ou code d’activité"
          aria-label="Rechercher un TDR"
        />
      </div>

      <div className={styles.tableCard}>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <colgroup>
              <col style={{ width: "13%" }} />
              <col style={{ width: "30%" }} />
              <col style={{ width: "10%" }} />
              <col style={{ width: "11%" }} />
              <col style={{ width: "11%" }} />
              <col style={{ width: "14%" }} />
              <col style={{ width: "11%" }} />
              <col style={{ width: "9%" }} />
            </colgroup>
            <thead>
              <tr>
                <th>Référence</th>
                <th>Intitulé</th>
                <th>Type</th>
                <th>Activité PTBA</th>
                <th style={{ textAlign: "right" }}>Budget</th>
                <th>Statut</th>
                <th>Mise à jour</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className={liste.vide}>
                    Chargement…
                  </td>
                </tr>
              ) : visibles.length === 0 ? (
                <tr>
                  <td colSpan={8} className={liste.vide}>
                    <Document size={24} aria-hidden />
                    <p>
                      {items.length === 0
                        ? "Aucun TDR à ce jour. La rédaction commence par le choix d’un type et d’une activité du plan annuel."
                        : "Aucun dossier ne correspond à ce filtre."}
                    </p>
                    {items.length === 0 && can("tdr:author") && (
                      <Link href="/tdr/nouveau" className="demoBtnSecondary">
                        <Add size={14} aria-hidden />
                        <span>Rédiger le premier</span>
                      </Link>
                    )}
                  </td>
                </tr>
              ) : (
                visibles.map((t) => (
                  <tr key={t.id}>
                    <td>
                      <Link href={`/tdr/${t.id}`} className={styles.ref}>
                        {t.reference}
                      </Link>
                    </td>
                    <td>
                      <Link href={`/tdr/${t.id}`} className={liste.lien}>
                        {t.title}
                      </Link>
                      <div className={liste.sousTitre}>{t.organisation.name}</div>
                    </td>
                    <td>
                      <span className={styles.tag}>{t.tdrTypeCode}</span>
                    </td>
                    <td className="ptn-mono">{t.ptbaActivity?.code ?? "—"}</td>
                    <td className={styles.amount}>{money(t.budgetTotalUsd)}</td>
                    <td>
                      <span className={`${liste.statut} ${STATUT[t.status].ton}`}>
                        {STATUT[t.status].label}
                      </span>
                      {t.procurementMethodCode && (
                        <div className={liste.sousTitre}>
                          {t.procurementMethodCode} ·{" "}
                          {t.reviewType === "PRIOR" ? "revue préalable" : "revue postérieure"}
                        </div>
                      )}
                    </td>
                    <td className={styles.date}>{jour(t.updatedAt)}</td>
                    <td>
                      {/* Un brouillon se reprend là où il s'est arrêté ; un
                          dossier transmis ne se consulte plus qu'en lecture.
                          Le libellé dit lequel des deux, pour qu'on ne
                          découvre pas la différence après le clic. */}
                      <div className={liste.actions}>
                        {["BROUILLON", "RETOURNE"].includes(t.status) && can("tdr:author") ? (
                          <Link href={`/tdr/nouveau?id=${t.id}`} className={liste.action}>
                            <Edit size={14} aria-hidden /> Reprendre
                          </Link>
                        ) : (
                          <Link href={`/tdr/${t.id}`} className={liste.action}>
                            <View size={14} aria-hidden /> Ouvrir
                          </Link>
                        )}
                        {effacable(t) && (
                          <button
                            type="button"
                            className={liste.actionDanger}
                            onClick={() => {
                              setASupprimer(t);
                              setRefusSuppression(null);
                            }}
                          >
                            <TrashCan size={14} aria-hidden />
                            <span className="sr-only">
                              Supprimer le brouillon {t.reference}
                            </span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ---------- Suppression d’un brouillon ---------- */}
      <Modal
        open={aSupprimer !== null}
        danger
        modalHeading="Supprimer définitivement ce brouillon ?"
        modalLabel={aSupprimer?.reference}
        primaryButtonText={suppressionEnCours ? "Suppression…" : "Supprimer le brouillon"}
        secondaryButtonText="Conserver"
        primaryButtonDisabled={suppressionEnCours}
        onRequestClose={() => {
          setASupprimer(null);
          setRefusSuppression(null);
        }}
        onRequestSubmit={() => void supprimer()}
      >
        <p className="text-body text-secondary mb-4">
          <strong>{aSupprimer?.title}</strong> et tout ce qu’il porte — objectifs,
          livrables, clauses, pièces versées — sont perdus. Il n’y a pas de corbeille.
        </p>
        <p className="text-body text-secondary">
          La référence <span className="ptn-mono">{aSupprimer?.reference}</span> reste
          consommée : une séquence ne se rembobine pas, et le prochain dossier prendra
          le numéro suivant. La suppression est inscrite au journal d’audit.
        </p>
        {refusSuppression && (
          <p className={liste.refus} role="alert">
            {refusSuppression}
          </p>
        )}
      </Modal>
    </Shell>
  );
}
