"use client";

/**
 * L'accueil du soumissionnaire.
 *
 * Il portait quatre indicateurs écrits en dur — « 14 opportunités
 * ouvertes », « 6 soumissions actives », « 3 contrats · 6,4 M USD », « 1,8 M
 * USD encaissés · 78 % du cycle PTBA ». Il en existait respectivement 6 et
 * 2 en base, et ni contrat ni paiement n'existent nulle part.
 *
 * DEUX INDICATEURS, ET NON QUATRE. Les deux qui restent se lisent ; les
 * deux autres ne sont pas remplacés par un zéro, ils sont RETIRÉS. Un « 0
 * contrat » affirmerait qu'on sait compter les contrats et qu'il n'y en a
 * pas, quand la vérité est qu'aucun contrat n'existe encore dans ce
 * produit. Ils reviendront avec le modèle qui les portera.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Note } from "@/components/wizard/WizardFields";
import { Catalog, Document, ArrowRight } from "@carbon/icons-react";
import { marketplaceApi, type AvisApi, type MaSoumissionApi } from "@/lib/api";
import { formatUsdCompact, formatDate } from "@/lib/format";
import styles from "./accueil.module.scss";

export function AccueilClient() {
  const [avis, setAvis] = useState<AvisApi[] | null>(null);
  const [offres, setOffres] = useState<MaSoumissionApi[] | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const [a, o] = await Promise.all([
          marketplaceApi.avis(),
          marketplaceApi.mesSoumissions(),
        ]);
        setAvis(a);
        setOffres(o);
      } catch (e) {
        setErreur(e instanceof Error ? e.message : "Données indisponibles.");
      }
    })();
  }, []);

  // La plus proche échéance parmi les avis auxquels on n'a pas répondu :
  // c'est la seule qui appelle une décision.
  const prochaine = (avis ?? [])
    .filter((a) => !a.maSoumission)
    .map((a) => a.closingAt)
    .sort()[0];

  const enCours = (offres ?? []).filter((o) => o.status === "DEPOSEE" || o.status === "RECEVABLE");

  return (
    <>
      {erreur && (
        <Note tone="danger" title="Données indisponibles">
          {erreur}
        </Note>
      )}

      <div className={styles.kpis}>
        <Card>
          <span className={styles.kpiLabel}>
            <Catalog size={14} aria-hidden />
            Avis ouverts
          </span>
          <strong className={styles.kpiValue}>{avis === null ? "—" : avis.length}</strong>
          <span className={styles.kpiExtra}>
            {prochaine
              ? `Prochaine échéance le ${formatDate(prochaine)}`
              : avis && avis.length > 0
                ? "Vous avez répondu à tous"
                : "Aucun avis ouvert"}
          </span>
        </Card>

        <Card>
          <span className={styles.kpiLabel}>
            <Document size={14} aria-hidden />
            Mes offres en cours
          </span>
          <strong className={styles.kpiValue}>{offres === null ? "—" : enCours.length}</strong>
          <span className={styles.kpiExtra}>
            {enCours.length > 0
              ? `${formatUsdCompact(enCours.reduce((n, o) => n + (o.montantUsd ?? 0), 0))} proposés`
              : "Aucune offre déposée"}
          </span>
        </Card>
      </div>

      {/* Ce que la plateforme ne sait pas encore. Le dire vaut mieux que
          l'afficher à zéro : un zéro se lit comme un fait constaté. */}
      <p className={styles.absent}>
        Le suivi des contrats et des paiements n’est pas encore ouvert : la plateforme s’arrête
        aujourd’hui à l’attribution.
      </p>

      <div className={styles.actions}>
        <Link href="/soumissionnaire/marketplace" className={styles.action}>
          <span>
            <strong>Voir les avis ouverts</strong>
            <em>Les marchés publiés par l’UGPTN, avec leur date limite.</em>
          </span>
          <ArrowRight size={16} aria-hidden />
        </Link>
        <Link href="/soumissionnaire/soumissions" className={styles.action}>
          <span>
            <strong>Mes soumissions</strong>
            <em>Les offres déposées au nom de votre organisation, et leur suite.</em>
          </span>
          <ArrowRight size={16} aria-hidden />
        </Link>
      </div>
    </>
  );
}
