"use client";

/**
 * Le marketplace — les avis d'appel d'offres ouverts.
 *
 * Il listait cinq appels d'offres écrits en dur, avec deux actions mortes.
 * Il lit désormais `/marketplace/avis` : des marchés nés de vrais TDR,
 * rattachés à de vraies activités du PTBA, dont l'enveloppe et la méthode
 * viennent du référentiel.
 *
 * CE QUI A DISPARU, ET POURQUOI. Le « Match IA 92 % », annoncé comme
 * calculé depuis le KYC, les certifications et l'historique du candidat.
 * Aucun des trois n'existe. Un score fabriqué à cet endroit oriente une
 * décision commerciale — engager des frais de dossier — et c'est la
 * dernière place où l'on peut se permettre d'inventer un nombre. Ce qui le
 * remplace se calcule vraiment : le temps qu'il reste pour répondre.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Tag } from "@/components/ui/Tag";
import { Note } from "@/components/wizard/WizardFields";
import { Drawer } from "@/components/ui/Drawer";
import { Time, Search, ArrowRight, CheckmarkFilled } from "@carbon/icons-react";
import { marketplaceApi, type AvisApi, type AvisDetailApi } from "@/lib/api";
import { formatUsdCompact, formatDate } from "@/lib/format";
import styles from "./marketplace.module.scss";

/** La teinte d'une composante, telle que le reste du produit la porte. */
const TEINTES: Record<string, "blue" | "purple" | "teal" | "green"> = {
  C1: "blue",
  C2: "purple",
  C3: "teal",
  C4: "green",
};

/**
 * Les jours restants, comptés à la journée.
 *
 * Sur la date seule et non sur l'heure : « J−1 » doit rester « J−1 » toute
 * la journée, sinon deux personnes qui regardent le même écran à deux
 * heures d'intervalle ne lisent pas la même échéance.
 */
function joursRestants(iso: string): number {
  const jour = (d: Date) => Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  return Math.round((jour(new Date(iso)) - jour(new Date())) / 86_400_000);
}

export function MarketplaceClient() {
  const [avis, setAvis] = useState<AvisApi[] | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [methodes, setMethodes] = useState<string[]>([]);
  const [ouvert, setOuvert] = useState<AvisDetailApi | null>(null);

  const charger = useCallback(async () => {
    try {
      setAvis(await marketplaceApi.avis());
      setErreur(null);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Avis indisponibles.");
    }
  }, []);

  // La fonction est appelée depuis une closure asynchrone, et non pas
  // rendue directement à l'effet : un état posé dans le corps d'un effet
  // déclenche un rendu en cascade, et la règle du dépôt l'interdit.
  useEffect(() => {
    void (async () => {
      await charger();
    })();
  }, [charger]);

  // Les méthodes proposées au filtre sont celles réellement présentes : un
  // filtre qui ne ramène jamais rien fait douter de la liste entière.
  const methodesOffertes = useMemo(
    () => [...new Set((avis ?? []).map((a) => a.methodCode))].sort(),
    [avis],
  );

  const filtres = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (avis ?? []).filter((a) => {
      if (methodes.length > 0 && !methodes.includes(a.methodCode)) return false;
      if (!q) return true;
      return (
        a.objet.toLowerCase().includes(q) ||
        a.reference.toLowerCase().includes(q) ||
        a.marcheReference.toLowerCase().includes(q)
      );
    });
  }, [avis, methodes, search]);

  const ouvrir = (id: string) => {
    marketplaceApi
      .detail(id)
      .then(setOuvert)
      .catch((e) => setErreur(e instanceof Error ? e.message : "Avis indisponible."));
  };

  return (
    <>
      <PageHeader
        eyebrow="MARKETPLACE · APPELS D’OFFRES PTN-RDC"
        title={
          avis === null
            ? "Avis d’appel d’offres"
            : `${avis.length} avis ouvert${avis.length > 1 ? "s" : ""}`
        }
        subtitle="Marchés publiés par l’UGPTN. Le montant indiqué est l’estimation portée au dossier ; l’offre reste à votre appréciation."
        actions={
          <Link href="/soumissionnaire/soumissions" className={styles.btnSecondary}>
            Mes soumissions
          </Link>
        }
      />

      {erreur && (
        <Note tone="danger" title="Avis indisponibles">
          {erreur}
        </Note>
      )}

      <div className={styles.toolbar}>
        <div className={styles.searchWrap}>
          <Search size={14} aria-hidden />
          <input
            type="search"
            placeholder="Rechercher (objet, référence)"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={styles.searchInput}
            aria-label="Rechercher un avis"
          />
        </div>
        {methodesOffertes.length > 1 && (
          <div className={styles.filters}>
            <span className={styles.filterLabel}>Méthode</span>
            {methodesOffertes.map((m) => {
              const actif = methodes.includes(m);
              return (
                <button
                  key={m}
                  type="button"
                  aria-pressed={actif}
                  onClick={() =>
                    setMethodes(actif ? methodes.filter((x) => x !== m) : [...methodes, m])
                  }
                  className={`${styles.pill} ${actif ? styles.pillActive : ""}`}
                >
                  {m}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <Card noPadding>
        {avis === null && !erreur ? (
          <p className={styles.etat}>Chargement des avis…</p>
        ) : filtres.length === 0 ? (
          <p className={styles.etat}>
            {avis && avis.length === 0
              ? "Aucun avis n’est ouvert pour le moment. Les marchés paraissent ici dès leur publication par l’UGPTN."
              : "Aucun avis ne correspond à cette recherche."}
          </p>
        ) : (
          <ul className={styles.list}>
            {filtres.map((a) => {
              const restant = joursRestants(a.closingAt);
              return (
                <li key={a.id}>
                  {/* Un bouton, et non une <li> munie d'un gestionnaire : la
                      seconde ne se prend pas au clavier, et l'assistance
                      vocale ne l'annonce pas comme actionnable. */}
                  <button
                    type="button"
                    className={styles.item}
                    onClick={() => ouvrir(a.id)}
                    aria-label={`Ouvrir l’avis ${a.reference} — ${a.objet}`}
                  >
                  <div className={styles.left}>
                    <div className={styles.head}>
                      <span className="ptn-mono">{a.reference}</span>
                      {a.componentCode && (
                        <Tag tone={TEINTES[a.componentCode] ?? "gray"} size="sm">
                          {a.componentCode}
                        </Tag>
                      )}
                      <Tag tone="gray" size="sm">
                        {a.methodCode}
                      </Tag>
                      {a.maSoumission && (
                        <Tag tone="green" size="sm">
                          Offre déposée
                        </Tag>
                      )}
                    </div>
                    <strong>{a.objet}</strong>
                    <p>{a.resume}</p>
                    {a.qualifications.length > 0 && (
                      <div className={styles.qualifs}>
                        {a.qualifications.map((q) => (
                          <span key={q} className={styles.qualif}>
                            {q}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className={styles.right}>
                    <div className={`${styles.budget} ptn-mono`}>
                      {formatUsdCompact(a.estimatedUsd)}
                    </div>
                    <div
                      className={`${styles.deadline} ${restant <= 10 ? styles.deadlineUrgent : ""}`}
                    >
                      <Time size={12} aria-hidden />
                      <span className="ptn-mono">
                        {restant > 0 ? `J−${restant}` : restant === 0 ? "Dernier jour" : "Clos"}
                      </span>
                    </div>
                    <span className={styles.echeance}>{formatDate(a.closingAt)}</span>
                    <ArrowRight size={14} aria-hidden className={styles.arrow} />
                  </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      {/* La clé remonte le tiroir à chaque avis : la saisie repart vide
          sans qu'un effet ait à la vider, et un montant frappé pour un
          marché ne se retrouve jamais proposé pour le suivant. */}
      <DetailAvis
        key={ouvert?.id ?? "aucun"}
        avis={ouvert}
        onClose={() => setOuvert(null)}
        onDepose={() => void charger()}
      />
    </>
  );
}

/**
 * Le détail d'un avis, et le dépôt.
 *
 * Le formulaire n'apparaît que si l'avis est encore ouvert ET qu'aucune
 * offre n'a été déposée au nom de l'organisation : un candidat ne dépose
 * qu'une offre par marché, et proposer un geste que le serveur refusera
 * n'apprend rien à personne.
 */
function DetailAvis({
  avis,
  onClose,
  onDepose,
}: {
  avis: AvisDetailApi | null;
  onClose: () => void;
  onDepose: () => void;
}) {
  const [montant, setMontant] = useState("");
  const [note, setNote] = useState("");
  const [occupe, setOccupe] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [depose, setDepose] = useState<string | null>(null);

  if (!avis) return null;

  const restant = joursRestants(avis.closingAt);
  const clos = restant < 0;
  const dejaDepose = avis.maSoumission !== null || depose !== null;

  const deposer = async () => {
    const valeur = Number(montant.replace(/[\s,]/g, ""));
    if (!(valeur > 0)) {
      setErreur("Indiquez le montant de votre offre, en USD.");
      return;
    }
    setOccupe(true);
    setErreur(null);
    try {
      const s = await marketplaceApi.deposer(avis.id, { montantUsd: valeur, note: note.trim() });
      setDepose(s.reference);
      onDepose();
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Le dépôt n’a pas abouti.");
    } finally {
      setOccupe(false);
    }
  };

  return (
    <Drawer
      open
      onClose={onClose}
      title={avis.objet}
      subtitle={
        <span style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
          <span className="ptn-mono">{avis.reference}</span>
          {avis.componentCode && (
            <Tag tone={TEINTES[avis.componentCode] ?? "gray"} size="sm">
              {avis.componentCode}
            </Tag>
          )}
          <Tag tone="gray" size="sm">
            {avis.methodCode}
          </Tag>
        </span>
      }
    >
      <div className={styles.drawerContent}>
        <p>{avis.resume}</p>

        <div className={styles.kvGrid}>
          <Kv label="Montant estimatif" value={formatUsdCompact(avis.estimatedUsd)} mono />
          <Kv label="Méthode" value={avis.methodLabel} />
          <Kv label="Date limite" value={formatDate(avis.closingAt)} />
          <Kv label="Publié le" value={formatDate(avis.publishedAt)} />
          {avis.componentLabel && <Kv label="Composante" value={avis.componentLabel} />}
          {avis.ptbaCode && <Kv label="Activité du plan" value={avis.ptbaCode} mono />}
          {avis.esCategory && <Kv label="Risque E&S" value={avis.esCategory} />}
          <Kv label="Marché" value={avis.marcheReference} mono />
        </div>

        {avis.qualifications.length > 0 && (
          <div>
            <h4>Qualifications attendues</h4>
            <div className={styles.qualifs}>
              {avis.qualifications.map((q) => (
                <span key={q} className={styles.qualif}>
                  {q}
                </span>
              ))}
            </div>
          </div>
        )}

        {avis.openingNote && (
          <div>
            <h4>Ouverture des plis</h4>
            <p>{avis.openingNote}</p>
          </div>
        )}

        <div>
          <h4>Votre offre</h4>

          {depose && (
            <Note tone="info" title="Offre déposée">
              Votre offre <span className="ptn-mono">{depose}</span> a été enregistrée. Elle sera
              ouverte en séance publique à la date limite.
            </Note>
          )}

          {!depose && avis.maSoumission && (
            <Note tone="info" title="Offre déjà déposée">
              <span className="ptn-mono">{avis.maSoumission.reference}</span>
              {avis.maSoumission.montantUsd !== null &&
                ` · ${formatUsdCompact(avis.maSoumission.montantUsd)}`}
              {avis.maSoumission.submittedAt && ` · le ${formatDate(avis.maSoumission.submittedAt)}`}
              . Un candidat ne dépose qu’une offre par marché.
            </Note>
          )}

          {!dejaDepose && clos && (
            <Note tone="warning" title="Date limite passée">
              Une offre reçue après l’heure limite n’est pas recevable.
            </Note>
          )}

          {!dejaDepose && !clos && (
            <div className={styles.depot}>
              <label className={styles.champ}>
                <span>Montant de votre offre, en USD</span>
                <input
                  inputMode="numeric"
                  value={montant}
                  onChange={(e) => setMontant(e.target.value)}
                  placeholder="Ex. 17 250 000"
                  disabled={occupe}
                />
              </label>
              <label className={styles.champ}>
                <span>Note d’accompagnement (facultative)</span>
                <textarea
                  rows={3}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  disabled={occupe}
                />
              </label>

              {erreur && (
                <Note tone="danger" title="Dépôt refusé">
                  {erreur}
                </Note>
              )}

              <p className={styles.avertissement}>
                Le dépôt est un acte : il est horodaté et journalisé, et engage votre organisation.
              </p>
              <button
                type="button"
                className={styles.btnPrimary}
                onClick={() => void deposer()}
                disabled={occupe}
              >
                {occupe ? "Dépôt en cours…" : "Déposer mon offre"}
                {!occupe && <CheckmarkFilled size={14} />}
              </button>
            </div>
          )}
        </div>
      </div>
    </Drawer>
  );
}

function Kv({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className={styles.kvRow}>
      <span>{label}</span>
      <strong className={mono ? "ptn-mono" : ""}>{value}</strong>
    </div>
  );
}
