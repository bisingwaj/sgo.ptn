"use client";

/**
 * Fiche d'une activité du plan.
 *
 * Écran qui manquait : une ligne du plan ne se consultait qu'en dépliant
 * une rangée du tableau, sans URL, donc sans pouvoir être transmise à un
 * collègue. Elle porte en outre la seule réponse qu'on vient y chercher —
 * combien de marchés en découlent, et où ils en sont — que le schéma
 * connaissait sans qu'aucun écran ne l'expose.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Button,
  DefinitionTooltip,
  InlineNotification,
  SkeletonPlaceholder,
  SkeletonText,
  Tag,
} from "@carbon/react";
import { ArrowLeft, Edit } from "@carbon/icons-react";
import { Shell } from "@/components/shell/Shell";
import { PageHeader } from "@/components/ui/PageHeader";
import { useAuth } from "@/components/auth/AuthContext";
import { ptbaApi, type PtbaActivityDetailApi, type TdrStatusApi } from "@/lib/api";
import { formatDate, formatUsdCompact } from "@/lib/format";

const TEINTE: Record<string, string> = {
  C1: "var(--ptn-composante-c1)",
  C2: "var(--ptn-composante-c2)",
  C3: "var(--ptn-composante-c3)",
  C4: "var(--ptn-composante-c4)",
  C5: "var(--ptn-composante-c5)",
};

const TDR_STATUT: Record<TdrStatusApi, { label: string; tone: "gray" | "blue" | "green" | "red" | "cyan" }> = {
  BROUILLON: { label: "Brouillon", tone: "gray" },
  SOUMIS_UGP: { label: "Transmis à l’UGP", tone: "cyan" },
  REVUE_UGP: { label: "En revue UGP", tone: "blue" },
  RETOURNE: { label: "Retourné", tone: "red" },
  VALIDE_UGP: { label: "Validé UGP", tone: "green" },
  ANO_EN_COURS: { label: "ANO en cours", tone: "blue" },
  ANO_OBTENU: { label: "ANO obtenu", tone: "green" },
  ANO_REFUSE: { label: "ANO refusé", tone: "red" },
  ARCHIVE: { label: "Archivé", tone: "gray" },
};

const NIVEAU: Record<string, string> = {
  FAIBLE: "Faible",
  MODERE: "Modéré",
  SUBSTANTIEL: "Substantiel",
  ELEVE: "Élevé",
};

/** Un bloc de contenu. Une liste vide est dite vide, non masquée. */
function Bloc({
  titre,
  aide,
  vide,
  children,
  compte,
}: {
  titre: string;
  aide?: string;
  vide: string;
  compte: number;
  children: React.ReactNode;
}) {
  return (
    <section className="border-subtle border">
      <header className="border-subtle flex items-baseline justify-between gap-3 border-b px-4 py-3">
        <h2 className="text-caption text-secondary font-semibold tracking-wider uppercase">
          {aide ? <DefinitionTooltip definition={aide}>{titre}</DefinitionTooltip> : titre}
        </h2>
        <span className="text-caption text-helper mono">{compte || "aucun"}</span>
      </header>
      <div className="p-4">
        {compte === 0 ? <p className="text-body text-helper">{vide}</p> : children}
      </div>
    </section>
  );
}

export function PtbaActivityClient({ activityId }: { activityId: string }) {
  const { can, loading: authLoading } = useAuth();

  const [activite, setActivite] = useState<PtbaActivityDetailApi | null>(null);
  const [chargement, setChargement] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    let annule = false;

    void (async () => {
      try {
        const a = await ptbaApi.activity(activityId);
        if (!annule) setActivite(a);
      } catch (e) {
        if (!annule) setError(e instanceof Error ? e.message : "Activité introuvable.");
      } finally {
        if (!annule) setChargement(false);
      }
    })();

    return () => {
      annule = true;
    };
  }, [activityId, authLoading]);

  const editable = activite?.ptbaYear.status === "BROUILLON";
  const peutEcrire = can("ptba:write");

  const crumbs = [
    { label: "Cockpit UGP", href: "/cockpit" },
    { label: "PTBA", href: "/ptba" },
    { label: activite?.code ?? "Activité" },
  ];

  if (chargement) {
    return (
      <Shell crumbs={crumbs}>
        <div className="flex flex-col gap-6">
          <SkeletonText heading width="50%" />
          <SkeletonText paragraph lineCount={2} width="70%" />
          <SkeletonPlaceholder className="!h-48 !w-full" />
        </div>
      </Shell>
    );
  }

  if (error || !activite) {
    return (
      <Shell crumbs={crumbs}>
        <PageHeader eyebrow="UGP · PTBA" title="Activité introuvable" />
        <InlineNotification
          kind="error"
          lowContrast
          hideCloseButton
          title="Lecture impossible"
          subtitle={error ?? "Cette activité n’existe pas ou a été retirée du plan."}
          className="max-w-none"
        />
        <div className="mt-6">
          <Button as={Link} href="/ptba" kind="secondary" renderIcon={ArrowLeft}>
            Retour au registre
          </Button>
        </div>
      </Shell>
    );
  }

  return (
    <Shell crumbs={crumbs}>
      <PageHeader
        eyebrow={`UGP · PTBA ${activite.ptbaYear.year}`}
        title={activite.title}
        subtitle={
          activite.provinces && activite.provinces.length > 0
            ? `Couverture : ${activite.provinces.map((c) => c.province.label).join(", ")}.`
            : "Couverture nationale."
        }
        meta={
          <>
            <span className="mono">{activite.code}</span>
            <span>·</span>
            <span
              className="inline-flex items-center gap-1.5"
              style={{ color: TEINTE[activite.componentCode] }}
            >
              <i
                aria-hidden
                className="inline-block h-2 w-2"
                style={{ background: TEINTE[activite.componentCode] }}
              />
              {activite.componentCode} · {activite.component?.shortLabel}
              {activite.subComponent ? ` — ${activite.subComponent}` : ""}
            </span>
            <span>·</span>
            <span className="mono">{formatUsdCompact(Number(activite.envelopeUsd))}</span>
          </>
        }
        actions={
          peutEcrire && editable ? (
            <Button as={Link} href={`/ptba/${activite.id}/modifier`} renderIcon={Edit} size="md">
              Modifier
            </Button>
          ) : undefined
        }
      />

      {!editable && (
        <InlineNotification
          kind="info"
          lowContrast
          hideCloseButton
          title={`Exercice ${activite.ptbaYear.status === "VALIDE" ? "validé" : "clos"}`}
          subtitle="Le plan est opposable : cette activité ne se modifie plus. Une correction suppose une révision de l’exercice."
          className="mb-6 max-w-none"
        />
      )}

      <div className="flex flex-col gap-6 xl:flex-row xl:items-start">
        <div className="flex min-w-0 flex-1 flex-col gap-6">
          <Bloc
            titre="Objectifs"
            aide="Ce que l’activité doit atteindre — non ce qu’un marché exécute."
            compte={activite.objectives?.length ?? 0}
            vide="Aucun objectif. Un TDR qui s’y rattache n’aura rien à y puiser."
          >
            <ol className="flex flex-col gap-3">
              {(activite.objectives ?? []).map((o, i) => (
                <li key={i} className="flex gap-3">
                  <span className="text-caption text-helper mono w-6 shrink-0 pt-0.5">
                    O{i + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="text-body text-primary">{o.title}</p>
                    {o.criteria && (
                      <p className="text-caption text-helper mt-0.5">Constaté par : {o.criteria}</p>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          </Bloc>

          <Bloc
            titre="Livrables attendus"
            aide="La réserve dans laquelle les TDR puisent : un marché commande le local, un autre les équipements."
            compte={activite.deliverables?.length ?? 0}
            vide="Aucun livrable défini."
          >
            <ol className="flex flex-col gap-3">
              {(activite.deliverables ?? []).map((d, i) => (
                <li key={i} className="flex gap-3">
                  <span className="text-caption text-helper mono w-6 shrink-0 pt-0.5">
                    L{i + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="text-body text-primary">{d.title}</p>
                    <p className="text-caption text-helper mt-0.5">
                      {[d.format, d.deadline].filter(Boolean).join(" · ") || "Forme non précisée"}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </Bloc>

          <Bloc
            titre="Indicateurs clés"
            aide="Seuls éléments de l’activité qui remontent : ils alimentent le cadre de résultats de la composante."
            compte={activite.indicators?.length ?? 0}
            vide="Aucun indicateur. Rien ne remonte au cadre de résultats de la composante."
          >
            <ul className="flex flex-col gap-3">
              {(activite.indicators ?? []).map((n, i) => (
                <li key={i}>
                  <p className="text-body text-primary">{n.label}</p>
                  <p className="text-caption text-helper mt-0.5">
                    {[n.target && `cible ${n.target}`, n.measure].filter(Boolean).join(" · ") ||
                      "Cible non fixée"}
                  </p>
                </li>
              ))}
            </ul>
          </Bloc>

          <Bloc
            titre="Risques et atténuation"
            aide="Risques propres à l’objet de l’activité. Ceux qui tiennent à la forme du marché restent au référentiel du type de TDR."
            compte={activite.risks?.length ?? 0}
            vide="Aucun risque consigné."
          >
            <ul className="flex flex-col gap-4">
              {(activite.risks ?? []).map((r, i) => (
                <li key={i}>
                  <div className="flex flex-wrap items-baseline gap-2">
                    <p className="text-body text-primary">{r.label}</p>
                    {r.level && (
                      <Tag size="sm" type="outline">
                        {NIVEAU[r.level] ?? r.level}
                      </Tag>
                    )}
                  </div>
                  {r.description && (
                    <p className="text-caption text-secondary mt-1">{r.description}</p>
                  )}
                  {r.mitigation && (
                    <p className="text-caption text-helper mt-1">Atténuation : {r.mitigation}</p>
                  )}
                </li>
              ))}
            </ul>
          </Bloc>

          <Bloc
            titre="Normes propres à l’activité"
            aide="ISO 27001, ICAO 9303… Les clauses contractuelles suivent la forme du marché et restent au référentiel."
            compte={activite.clauses?.length ?? 0}
            vide="Aucune norme rattachée."
          >
            <ul className="flex flex-col gap-3">
              {(activite.clauses ?? []).map((c, i) => (
                <li key={i}>
                  <p className="text-body text-primary">{c.label}</p>
                  {c.text && <p className="text-caption text-helper mt-0.5">{c.text}</p>}
                </li>
              ))}
            </ul>
          </Bloc>
        </div>

        {/* ---------- Rail ---------- */}
        <aside className="flex w-full shrink-0 flex-col gap-6 xl:w-80">
          <section className="border-subtle border">
            <h2 className="border-subtle text-caption text-secondary border-b px-4 py-3 font-semibold tracking-wider uppercase">
              Marchés découlant de cette activité
            </h2>
            <div className="p-4">
              {activite.tdrs.length === 0 ? (
                <p className="text-body text-helper">
                  Aucun TDR ne se rattache encore à cette ligne du plan.
                </p>
              ) : (
                <ul className="flex flex-col gap-3">
                  {activite.tdrs.map((t) => (
                    <li key={t.id} className="border-subtle border-b pb-3 last:border-b-0 last:pb-0">
                      <Link href={`/tdr/${t.id}`} className="text-accent mono text-caption hover:underline">
                        {t.reference}
                      </Link>
                      <p className="text-body text-primary mt-0.5">{t.title}</p>
                      <div className="mt-1.5 flex items-center gap-2">
                        <Tag size="sm" type={TDR_STATUT[t.status]?.tone ?? "gray"}>
                          {TDR_STATUT[t.status]?.label ?? t.status}
                        </Tag>
                        <span className="text-caption text-helper mono">
                          {formatDate(t.updatedAt)}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>

          <section className="border-subtle border">
            <h2 className="border-subtle text-caption text-secondary border-b px-4 py-3 font-semibold tracking-wider uppercase">
              Enveloppe
            </h2>
            <dl className="flex flex-col">
              {[
                { k: "Enveloppe", v: formatUsdCompact(Number(activite.envelopeUsd)) },
                {
                  k: "Part IDA",
                  v: activite.idaUsd ? formatUsdCompact(Number(activite.idaUsd)) : "Non ventilée",
                },
                {
                  k: "Part AFD",
                  v: activite.afdUsd ? formatUsdCompact(Number(activite.afdUsd)) : "Non ventilée",
                },
                { k: "Exercice", v: String(activite.ptbaYear.year) },
                {
                  k: "Décaissé",
                  v: "non suivi",
                },
              ].map((l) => (
                <div
                  key={l.k}
                  className="border-subtle flex items-baseline justify-between gap-3 border-b px-4 py-2.5 last:border-b-0"
                >
                  <dt className="text-caption text-secondary">{l.k}</dt>
                  <dd className="text-body text-primary mono tabular-nums">{l.v}</dd>
                </div>
              ))}
            </dl>
          </section>
        </aside>
      </div>

      <div className="mt-8">
        <Button as={Link} href="/ptba" kind="ghost" renderIcon={ArrowLeft}>
          Retour au registre
        </Button>
      </div>
    </Shell>
  );
}
