"use client";

/**
 * Les offres de l'organisation, et d'elle seule.
 *
 * Le bornage est fait par le serveur sur `organisationId` — jamais sur
 * l'utilisateur. Dans une entreprise, celui qui prépare l'offre et celui
 * qui la signe sont deux personnes, et le second doit pouvoir relire le
 * travail du premier. Les offres concurrentes, elles, ne sortent jamais.
 *
 * L'écran n'existait pas : le marketplace pointait vers une route absente.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Tag } from "@/components/ui/Tag";
import { Note } from "@/components/wizard/WizardFields";
import { ArrowRight, Time } from "@carbon/icons-react";
import { marketplaceApi, type MaSoumissionApi, type SoumissionStatusApi } from "@/lib/api";
import { formatUsdCompact, formatDate } from "@/lib/format";
import styles from "./soumissions.module.scss";

/**
 * Ce que chaque suite veut dire pour le candidat.
 *
 * Les codes du serveur ne se montrent pas : « IRRECEVABLE » n'apprend rien
 * à qui vient de perdre un marché, et la raison compte plus que le mot.
 */
const SUITES: Record<
  SoumissionStatusApi,
  { label: string; tone: "gray" | "blue" | "green" | "red" | "yellow"; sens: string }
> = {
  BROUILLON: {
    label: "Brouillon",
    tone: "gray",
    sens: "Non déposée. Elle ne sera pas ouverte tant que vous ne l’aurez pas déposée.",
  },
  DEPOSEE: {
    label: "Déposée",
    tone: "blue",
    sens: "Reçue avant l’heure limite. Elle sera ouverte en séance publique à la clôture.",
  },
  RECEVABLE: {
    label: "Recevable",
    tone: "blue",
    sens: "Admise à l’évaluation technique après la préqualification administrative.",
  },
  IRRECEVABLE: {
    label: "Écartée à la préqualification",
    tone: "red",
    sens: "Une pièce administrative manquait ou ne satisfaisait pas aux exigences du dossier.",
  },
  ATTRIBUTAIRE: {
    label: "Retenue",
    tone: "green",
    sens: "Votre offre a été retenue. L’attribution vous sera notifiée par l’UGPTN.",
  },
  ECARTEE: {
    label: "Non retenue",
    tone: "gray",
    sens: "Une autre offre a été retenue à l’issue de l’évaluation.",
  },
};

export function SoumissionsClient() {
  const [lignes, setLignes] = useState<MaSoumissionApi[] | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  // L'effet ne fait que lancer : les états se posent après l'attente, et
  // non dans son corps, où ils déclencheraient un rendu en cascade.
  useEffect(() => {
    void (async () => {
      try {
        setLignes(await marketplaceApi.mesSoumissions());
      } catch (e) {
        setErreur(e instanceof Error ? e.message : "Offres indisponibles.");
      }
    })();
  }, []);

  const total = lignes?.reduce((n, s) => n + (s.montantUsd ?? 0), 0) ?? 0;

  return (
    <>
      <PageHeader
        eyebrow="ESPACE SOUMISSIONNAIRE · MES OFFRES"
        title={
          lignes === null
            ? "Mes soumissions"
            : `${lignes.length} offre${lignes.length > 1 ? "s" : ""}`
        }
        subtitle="Les offres déposées au nom de votre organisation. Les offres des autres candidats ne vous sont jamais montrées."
        actions={
          <Link href="/soumissionnaire/marketplace" className={styles.btnSecondary}>
            Voir les avis ouverts
          </Link>
        }
      />

      {erreur && (
        <Note tone="danger" title="Offres indisponibles">
          {erreur}
        </Note>
      )}

      <Card noPadding>
        {lignes === null && !erreur ? (
          <p className={styles.etat}>Chargement de vos offres…</p>
        ) : lignes && lignes.length === 0 ? (
          <p className={styles.etat}>
            Aucune offre déposée. Les avis ouverts se consultent depuis le marketplace.
          </p>
        ) : (
          <ul className={styles.list}>
            {(lignes ?? []).map((s) => {
              const suite = SUITES[s.status];
              return (
                <li key={s.id} className={styles.item}>
                  <div className={styles.left}>
                    <div className={styles.head}>
                      <span className="ptn-mono">{s.reference}</span>
                      <Tag tone={suite.tone} size="sm">
                        {suite.label}
                      </Tag>
                      <Tag tone="gray" size="sm">
                        {s.avis.methodCode}
                      </Tag>
                    </div>
                    <strong>{s.avis.objet}</strong>
                    {/* Ce que la suite veut dire, et non son code. */}
                    <p>{suite.sens}</p>
                    <span className={styles.avis}>
                      Avis <span className="ptn-mono">{s.avis.reference}</span> · clôture le{" "}
                      {formatDate(s.avis.closingAt)}
                    </span>
                  </div>

                  <div className={styles.right}>
                    <div className={`${styles.montant} ptn-mono`}>
                      {s.montantUsd !== null ? formatUsdCompact(s.montantUsd) : "—"}
                    </div>
                    {s.submittedAt && (
                      <span className={styles.depose}>
                        <Time size={12} aria-hidden />
                        déposée le {formatDate(s.submittedAt)}
                      </span>
                    )}
                    <Link
                      href={`/soumissionnaire/marketplace?avis=${s.avis.id}`}
                      className={styles.lien}
                      aria-label={`Ouvrir l’avis ${s.avis.reference}`}
                    >
                      L’avis <ArrowRight size={14} aria-hidden />
                    </Link>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      {lignes && lignes.length > 0 && (
        <p className={styles.pied}>
          {/* Une somme d'offres n'est pas un chiffre d'affaires : la dire
              engagée serait faux tant qu'aucune n'est attribuée. */}
          {formatUsdCompact(total)} proposés au total, toutes offres confondues. Ce montant
          n’engage rien tant qu’aucune attribution n’est prononcée.
        </p>
      )}
    </>
  );
}
