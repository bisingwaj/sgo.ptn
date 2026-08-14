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
import { Add, Document, WarningAltFilled } from "@carbon/icons-react";
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
  const { can, loading: authLoading } = useAuth();

  const [items, setItems] = useState<TdrListItem[]>([]);
  const [filtre, setFiltre] = useState<TdrStatusApi | "tous">("tous");
  const [recherche, setRecherche] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className={liste.vide}>
                    Chargement…
                  </td>
                </tr>
              ) : visibles.length === 0 ? (
                <tr>
                  <td colSpan={7} className={liste.vide}>
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
                      <span className={styles.ref}>{t.reference}</span>
                    </td>
                    <td>
                      <div className={styles.title}>{t.title}</div>
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
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </Shell>
  );
}
