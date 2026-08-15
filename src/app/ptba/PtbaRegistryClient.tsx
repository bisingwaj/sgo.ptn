"use client";

/**
 * Registre du Plan de Travail et Budget Annuel.
 *
 * L'écran d'origine faisait liste, saisie et consultation au même endroit,
 * sur un tableau écrit à la main. Ici il ne fait plus que lister : la
 * saisie a sa route, la fiche aussi, et le tableau est un DataTable Carbon
 * — ce qui apporte le tri, l'accessibilité du dépliement et le squelette
 * de chargement sans les réécrire.
 *
 * Trois colonnes restent sans source : décaissé, exécution, période. Elles
 * demeurent visibles à dessein — les retirer ferait oublier qu'elles sont
 * dues — mais elles disent « non suivi » plutôt qu'un tiret : un tiret se
 * lit comme une donnée manquante, ce qui serait faux.
 */

import { Fragment, useMemo, useState } from "react";
import Link from "next/link";
import {
  Button,
  DataTable,
  DataTableSkeleton,
  Dropdown,
  InlineNotification,
  Modal,
  MultiSelect,
  OverflowMenu,
  OverflowMenuItem,
  Pagination,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableExpandedRow,
  TableExpandHeader,
  TableExpandRow,
  TableHead,
  TableHeader,
  TableRow,
  TableToolbar,
  TableToolbarContent,
  TableToolbarSearch,
  Tag,
  TextArea,
} from "@carbon/react";
import { Add } from "@carbon/icons-react";
import { Shell } from "@/components/shell/Shell";
import { PageHeader } from "@/components/ui/PageHeader";
import { useAuth } from "@/components/auth/AuthContext";
import { usePtbaExercice } from "@/components/ptba/use-ptba-exercice";
import { ptbaApi, ApiError, type PtbaActivityApi } from "@/lib/api";
import { formatDate, formatUsdCompact, formatUsdCompactBare } from "@/lib/format";
import { cn } from "@/lib/cn";

const STATUT: Record<string, { label: string; tone: "gray" | "green" | "cool-gray" }> = {
  BROUILLON: { label: "En préparation", tone: "gray" },
  VALIDE: { label: "Validé — opposable", tone: "green" },
  CLOS: { label: "Clos", tone: "cool-gray" },
};

/** Teintes de composante. Jetons universels — voir tokens.scss. */
const TEINTE: Record<string, string> = {
  C1: "var(--ptn-composante-c1)",
  C2: "var(--ptn-composante-c2)",
  C3: "var(--ptn-composante-c3)",
  C4: "var(--ptn-composante-c4)",
  C5: "var(--ptn-composante-c5)",
};

const HEADERS = [
  { key: "code", header: "Code" },
  { key: "title", header: "Activité" },
  { key: "componentCode", header: "Composante" },
  { key: "envelopeUsd", header: "Enveloppe" },
  { key: "disbursed", header: "Décaissé" },
  { key: "execution", header: "Exécution" },
  { key: "period", header: "Période" },
];

const PAR_PAGE = [15, 25, 50, 100];

/** Cellule d'une colonne dont la source n'existe pas encore. */
function NonSuivi() {
  return (
    <span className="text-caption text-helper" title="Disponible avec le suivi d’exécution">
      non suivi
    </span>
  );
}

/** Ce qu'une activité porte en propre, en lecture. */
function Contenu({ activite }: { activite: PtbaActivityApi }) {
  const blocs = [
    {
      titre: "Objectifs",
      lignes: (activite.objectives ?? []).map(
        (o, i) => `O${i + 1} · ${o.title}${o.criteria ? ` — ${o.criteria}` : ""}`,
      ),
    },
    {
      titre: "Livrables attendus",
      lignes: (activite.deliverables ?? []).map(
        (d, i) =>
          `L${i + 1} · ${d.title}${d.format ? ` — ${d.format}` : ""}${d.deadline ? ` · ${d.deadline}` : ""}`,
      ),
    },
    {
      titre: "Indicateurs clés",
      lignes: (activite.indicators ?? []).map(
        (n) => `${n.label}${n.target ? ` — cible ${n.target}` : ""}${n.measure ? ` (${n.measure})` : ""}`,
      ),
    },
    {
      titre: "Risques et atténuation",
      lignes: (activite.risks ?? []).map(
        (r) =>
          `${r.label}${r.level ? ` [${r.level.toLowerCase()}]` : ""}${r.mitigation ? ` — ${r.mitigation}` : ""}`,
      ),
    },
    {
      titre: "Normes",
      lignes: (activite.clauses ?? []).map((c) => `${c.label}${c.text ? ` — ${c.text}` : ""}`),
    },
  ];

  if (blocs.every((b) => b.lignes.length === 0)) {
    return (
      <p className="text-body text-secondary max-w-[68ch] py-2">
        Cette activité ne porte encore ni objectif, ni livrable, ni indicateur. Un TDR qui
        s’y rattache n’aura rien à y puiser.{" "}
        <Link href={`/ptba/${activite.id}/modifier`} className="text-accent underline">
          La compléter
        </Link>
        .
      </p>
    );
  }

  return (
    <div className="grid gap-6 py-2 lg:grid-cols-2">
      {blocs.map((b) => (
        <div key={b.titre} className="min-w-0">
          <h4 className="text-caption text-helper font-semibold tracking-wider uppercase">
            {b.titre}
          </h4>
          {b.lignes.length === 0 ? (
            <p className="text-body text-helper mt-1">Aucun</p>
          ) : (
            <ul className="mt-2 flex flex-col gap-1">
              {b.lignes.map((l, i) => (
                <li key={i} className="text-body text-secondary">
                  {l}
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */

export function PtbaRegistryClient() {
  const { can } = useAuth();

  const [annee, setAnnee] = useState<number | undefined>(undefined);
  const exercice = usePtbaExercice({ avecActivites: true, annee });
  const { year, exercices, activities, allocations, chargement, error, avertissement, relire } =
    exercice;

  const [recherche, setRecherche] = useState("");
  const [composantes, setComposantes] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [parPage, setParPage] = useState(25);

  // Retrait : une confirmation et un motif. C'était jusqu'ici un clic sec,
  // sans retour possible, sur une ligne qu'un TDR peut déjà citer.
  const [aRetirer, setARetirer] = useState<PtbaActivityApi | null>(null);
  const [motif, setMotif] = useState("");
  const [retraitEnCours, setRetraitEnCours] = useState(false);
  const [retraitError, setRetraitError] = useState<string | null>(null);

  const peutEcrire = can("ptba:write");
  const editable = year?.status === "BROUILLON";

  const visibles = useMemo(() => {
    const q = recherche.trim().toLowerCase();
    return activities.filter((a) => {
      if (composantes.length > 0 && !composantes.includes(a.componentCode)) return false;
      if (!q) return true;
      return (
        a.code.toLowerCase().includes(q) ||
        a.title.toLowerCase().includes(q) ||
        (a.subComponent ?? "").toLowerCase().includes(q)
      );
    });
  }, [activities, recherche, composantes]);

  const engage = allocations.reduce((s, r) => s + r.plannedUsd, 0);
  const alloueTotal = allocations.reduce((s, r) => s + (r.allocationUsd ?? 0), 0);
  const nonAllouees = allocations.filter((r) => r.allocationUsd === null);

  const rows = visibles.map((a) => ({
    id: a.id,
    code: a.code,
    title: a.title,
    componentCode: a.componentCode,
    envelopeUsd: Number(a.envelopeUsd),
    disbursed: "",
    execution: "",
    period: "",
  }));

  const retirer = async () => {
    if (!aRetirer) return;
    setRetraitEnCours(true);
    setRetraitError(null);
    try {
      await ptbaApi.deactivate(aRetirer.id, motif.trim());
      await relire();
      setARetirer(null);
      setMotif("");
    } catch (e) {
      setRetraitError(
        e instanceof ApiError || e instanceof Error ? e.message : "Retrait impossible.",
      );
    } finally {
      setRetraitEnCours(false);
    }
  };

  return (
    <Shell crumbs={[{ label: "Cockpit UGP", href: "/cockpit" }, { label: "PTBA" }]}>
      <PageHeader
        eyebrow="UGP · PLAN DE TRAVAIL ET BUDGET ANNUEL"
        title={year ? `PTBA ${year.year}` : "PTBA"}
        subtitle={
          year
            ? "Toute activité du plan devient un rattachement possible pour un TDR. Sans ligne au plan, il n’y a pas d’enveloppe — donc pas de marché."
            : chargement
              ? "Chargement du plan…"
              : "Aucun exercice ouvert."
        }
        meta={
          year ? (
            <>
              <Tag type={STATUT[year.status]?.tone ?? "gray"} size="sm">
                {STATUT[year.status]?.label ?? year.status}
              </Tag>
              <span>
                <strong>{activities.length}</strong> activité
                {activities.length > 1 ? "s" : ""}
              </span>
              <span>·</span>
              <span>
                <span className="mono">{formatUsdCompact(engage)}</span> engagés sur{" "}
                <span className="mono">{formatUsdCompact(alloueTotal)}</span> alloués
              </span>
            </>
          ) : undefined
        }
        actions={
          peutEcrire && editable ? (
            <Button as={Link} href="/ptba/nouveau" renderIcon={Add} size="md">
              Ajouter une activité
            </Button>
          ) : undefined
        }
      />

      {error && (
        <InlineNotification
          kind="error"
          lowContrast
          hideCloseButton
          title="Chargement impossible"
          subtitle={error}
          className="mb-6 max-w-none"
        />
      )}
      {avertissement && (
        <InlineNotification
          kind="warning"
          lowContrast
          hideCloseButton
          title="Cadrage budgétaire indisponible"
          subtitle={avertissement}
          className="mb-6 max-w-none"
        />
      )}

      {/* ---------- Indicateurs ---------- */}
      <section className="border-subtle mb-6 grid grid-cols-2 gap-px border bg-[var(--cds-border-subtle)] lg:grid-cols-4">
        {[
          {
            k: "Activités",
            v: chargement ? "…" : String(activities.length),
            u:
              allocations
                .filter((r) => r.activityCount > 0)
                .map((r) => `${r.componentCode} · ${r.activityCount}`)
                .join(" / ") || "Aucune activité inscrite",
          },
          {
            k: "Alloué à l’exercice",
            v: allocations.length === 0 ? "—" : formatUsdCompactBare(alloueTotal),
            u:
              allocations.length === 0
                ? "Allocations indisponibles"
                : nonAllouees.length > 0
                  ? `USD · ${nonAllouees.length} composante${nonAllouees.length > 1 ? "s" : ""} sans allocation`
                  : "USD · toutes composantes allouées",
          },
          {
            k: "Engagé au plan",
            v: allocations.length === 0 ? "—" : formatUsdCompactBare(engage),
            u: alloueTotal
              ? `${((engage / alloueTotal) * 100).toFixed(1)} % de l’allocation`
              : "USD",
            barre: alloueTotal ? (engage / alloueTotal) * 100 : 0,
          },
          {
            k: "Décaissé",
            v: "—",
            u: "Non suivi à ce stade",
          },
        ].map((kpi) => (
          <div key={kpi.k} className="bg-layer flex flex-col gap-1 p-4">
            <span className="text-caption text-secondary">{kpi.k}</span>
            <span className="text-heading-04 mono text-primary tabular-nums">{kpi.v}</span>
            {kpi.barre !== undefined && (
              <div className="bg-border-subtle mt-1 h-1 w-full overflow-hidden">
                <i
                  className="bg-success block h-full"
                  style={{ width: `${Math.min(kpi.barre, 100)}%` }}
                />
              </div>
            )}
            <span className="text-caption text-helper">{kpi.u}</span>
          </div>
        ))}
      </section>

      <div className="flex flex-col gap-6 xl:flex-row xl:items-start">
        {/* ---------- Tableau ---------- */}
        <div className="min-w-0 flex-1">
          {chargement ? (
            <DataTableSkeleton columnCount={7} rowCount={8} showHeader showToolbar />
          ) : (
            <>
              <DataTable rows={rows} headers={HEADERS} isSortable>
                {({
                  rows: lignes,
                  headers,
                  getHeaderProps,
                  getRowProps,
                  getExpandedRowProps,
                  getTableProps,
                  getTableContainerProps,
                }) => {
                  const debut = (page - 1) * parPage;
                  const pageLignes = lignes.slice(debut, debut + parPage);

                  return (
                    <TableContainer
                      title={`Activités ${year?.year ?? ""}`}
                      description={
                        composantes.length > 0 || recherche
                          ? `${visibles.length} sur ${activities.length} activités`
                          : "Triées par composante puis par code."
                      }
                      {...getTableContainerProps()}
                    >
                      <TableToolbar>
                        <TableToolbarContent>
                          <TableToolbarSearch
                            placeholder="Code, intitulé ou sous-composante"
                            persistent
                            onChange={(e) => {
                              setRecherche(
                                typeof e === "string" ? e : (e?.target?.value ?? ""),
                              );
                              setPage(1);
                            }}
                          />
                          <div className="w-56">
                            <MultiSelect
                              id="ptba-filtre-composante"
                              label="Composante"
                              titleText=""
                              hideLabel
                              items={allocations.map((r) => r.componentCode)}
                              itemToString={(code) => {
                                const r = allocations.find((x) => x.componentCode === code);
                                return r ? `${r.componentCode} · ${r.shortLabel}` : (code ?? "");
                              }}
                              onChange={({ selectedItems }) => {
                                setComposantes(selectedItems ?? []);
                                setPage(1);
                              }}
                            />
                          </div>
                          {exercices.length > 1 && (
                            <div className="w-44">
                              <Dropdown
                                id="ptba-exercice"
                                label="Exercice"
                                titleText=""
                                hideLabel
                                items={exercices.map((e) => e.year)}
                                selectedItem={year?.year ?? null}
                                itemToString={(y) => `Exercice ${y}`}
                                onChange={({ selectedItem }) => {
                                  setAnnee(selectedItem ?? undefined);
                                  setPage(1);
                                }}
                              />
                            </div>
                          )}
                        </TableToolbarContent>
                      </TableToolbar>

                      <Table {...getTableProps()} size="lg">
                        <TableHead>
                          <TableRow>
                            <TableExpandHeader aria-label="Déplier le contenu" />
                            {headers.map((header) => {
                              const { key, ...rest } = getHeaderProps({ header });
                              return (
                                <TableHeader
                                  key={key as string}
                                  {...rest}
                                  className={header.key === "envelopeUsd" ? "text-right" : undefined}
                                >
                                  {header.header}
                                </TableHeader>
                              );
                            })}
                            <TableHeader>
                              <span className="sr-only">Actions</span>
                            </TableHeader>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {pageLignes.length === 0 && (
                            <TableRow>
                              <TableCell colSpan={9}>
                                <div className="py-8 text-center">
                                  <p className="text-heading-02 text-primary">
                                    {activities.length === 0
                                      ? "Aucune activité au plan"
                                      : "Aucune activité ne correspond"}
                                  </p>
                                  <p className="text-body text-secondary mx-auto mt-2 max-w-[52ch]">
                                    {activities.length === 0
                                      ? "Tant que le plan est vide, aucun TDR ne peut être ouvert : le rattachement à une ligne du plan est obligatoire."
                                      : "Modifiez la recherche ou le filtre par composante."}
                                  </p>
                                  {activities.length === 0 && peutEcrire && editable && (
                                    <div className="mt-4">
                                      <Button as={Link} href="/ptba/nouveau" renderIcon={Add} size="sm">
                                        Inscrire la première activité
                                      </Button>
                                    </div>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          )}

                          {pageLignes.map((row) => {
                            const a = activities.find((x) => x.id === row.id);
                            if (!a) return null;
                            const { key, ...rowProps } = getRowProps({ row });

                            return (
                              <Fragment key={key as string}>
                                <TableExpandRow {...rowProps}>
                                  <TableCell>
                                    <Link
                                      href={`/ptba/${a.id}`}
                                      className="text-accent mono hover:underline"
                                    >
                                      {a.code}
                                    </Link>
                                  </TableCell>
                                  <TableCell>
                                    <Link href={`/ptba/${a.id}`} className="text-primary hover:underline">
                                      {a.title}
                                    </Link>
                                    {a.subComponent && (
                                      <span className="text-caption text-helper mono ml-2">
                                        {a.subComponent}
                                      </span>
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    <span
                                      className="text-caption inline-flex items-center gap-1.5 whitespace-nowrap"
                                      style={{ color: TEINTE[a.componentCode] }}
                                    >
                                      <i
                                        aria-hidden
                                        className="inline-block h-2 w-2 shrink-0"
                                        style={{ background: TEINTE[a.componentCode] }}
                                      />
                                      {a.componentCode}
                                    </span>
                                  </TableCell>
                                  <TableCell className="mono text-right tabular-nums">
                                    {formatUsdCompact(Number(a.envelopeUsd))}
                                  </TableCell>
                                  <TableCell>
                                    <NonSuivi />
                                  </TableCell>
                                  <TableCell>
                                    <NonSuivi />
                                  </TableCell>
                                  <TableCell>
                                    <NonSuivi />
                                  </TableCell>
                                  <TableCell className="w-12">
                                    <OverflowMenu
                                      size="sm"
                                      flipped
                                      aria-label={`Actions sur ${a.code}`}
                                    >
                                      <OverflowMenuItem
                                        itemText="Ouvrir la fiche"
                                        href={`/ptba/${a.id}`}
                                      />
                                      {peutEcrire && editable && (
                                        <OverflowMenuItem
                                          itemText="Modifier"
                                          href={`/ptba/${a.id}/modifier`}
                                        />
                                      )}
                                      {peutEcrire && editable && (
                                        <OverflowMenuItem
                                          isDelete
                                          itemText="Retirer du plan"
                                          onClick={() => {
                                            setARetirer(a);
                                            setRetraitError(null);
                                            setMotif("");
                                          }}
                                        />
                                      )}
                                    </OverflowMenu>
                                  </TableCell>
                                </TableExpandRow>
                                <TableExpandedRow colSpan={9} {...getExpandedRowProps({ row })}>
                                  <Contenu activite={a} />
                                </TableExpandedRow>
                              </Fragment>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  );
                }}
              </DataTable>

              {visibles.length > PAR_PAGE[0] && (
                <Pagination
                  page={page}
                  pageSize={parPage}
                  pageSizes={PAR_PAGE}
                  totalItems={visibles.length}
                  itemsPerPageText="Activités par page"
                  onChange={({ page: p, pageSize }) => {
                    setPage(p);
                    setParPage(pageSize);
                  }}
                />
              )}
            </>
          )}
        </div>

        {/* ---------- Rail ---------- */}
        <aside className="flex w-full shrink-0 flex-col gap-6 xl:w-80">
          <section className="border-subtle border">
            <h3 className="border-subtle text-caption text-secondary border-b px-4 py-3 font-semibold tracking-wider uppercase">
              Allocations par composante
            </h3>
            <div className="flex flex-col gap-4 p-4">
              {allocations.length === 0 && (
                <p className="text-body text-helper">
                  {chargement ? "Chargement…" : "Allocations indisponibles."}
                </p>
              )}
              {allocations.map((r) => {
                const alloue = r.allocationUsd;
                const taux = alloue && alloue > 0 ? (r.plannedUsd / alloue) * 100 : 0;
                return (
                  <div key={r.componentCode}>
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="text-body text-primary">
                        <strong className="mono mr-1.5">{r.componentCode}</strong>
                        {r.shortLabel}
                      </span>
                      <span className="text-caption text-helper mono whitespace-nowrap tabular-nums">
                        {alloue === null
                          ? "non allouée"
                          : `${formatUsdCompactBare(r.plannedUsd)} / ${formatUsdCompactBare(alloue)}`}
                      </span>
                    </div>
                    <div className="bg-border-subtle mt-1.5 h-1 w-full overflow-hidden">
                      <i
                        className="block h-full"
                        style={{
                          width: `${Math.min(taux, 100)}%`,
                          background: TEINTE[r.componentCode],
                        }}
                      />
                    </div>
                    {r.reconciliation && (
                      <p className="text-caption text-helper mt-1.5 leading-snug">
                        {r.reconciliation}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          <section className="border-subtle border">
            <h3 className="border-subtle text-caption text-secondary border-b px-4 py-3 font-semibold tracking-wider uppercase">
              Cycle de l’exercice
            </h3>
            <dl className="flex flex-col">
              {[
                { k: "Exercice", v: year ? String(year.year) : "—", mono: true },
                { k: "Statut", v: year ? (STATUT[year.status]?.label ?? year.status) : "—" },
                {
                  k: "Validé le",
                  v: year?.validatedAt ? formatDate(year.validatedAt) : "—",
                  mono: true,
                },
                { k: "Activités inscrites", v: String(activities.length), mono: true },
              ].map((l) => (
                <div
                  key={l.k}
                  className="border-subtle flex items-baseline justify-between gap-3 border-b px-4 py-2.5 last:border-b-0"
                >
                  <dt className="text-caption text-secondary">{l.k}</dt>
                  <dd className={cn("text-body text-primary", l.mono && "mono tabular-nums")}>
                    {l.v}
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        </aside>
      </div>

      {/* ---------- Retrait ---------- */}
      <Modal
        open={aRetirer !== null}
        danger
        modalHeading="Retirer cette activité du plan ?"
        modalLabel={aRetirer?.code}
        primaryButtonText={retraitEnCours ? "Retrait…" : "Retirer du plan"}
        secondaryButtonText="Annuler"
        primaryButtonDisabled={retraitEnCours || motif.trim().length < 5}
        onRequestClose={() => {
          setARetirer(null);
          setMotif("");
          setRetraitError(null);
        }}
        onRequestSubmit={() => void retirer()}
      >
        <p className="text-body text-secondary mb-4">
          <strong>{aRetirer?.title}</strong> quitte le plan {year?.year}, et son enveloppe
          de{" "}
          <span className="mono">
            {aRetirer ? formatUsdCompact(Number(aRetirer.envelopeUsd)) : ""}
          </span>{" "}
          revient au solde de {aRetirer?.componentCode}. L’activité est conservée en base :
          un TDR peut déjà la citer.
        </p>
        <TextArea
          id="ptba-motif-retrait"
          labelText="Motif du retrait"
          helperText="Consigné au journal d’audit. Cinq caractères au minimum."
          rows={3}
          value={motif}
          onChange={(e) => setMotif(e.target.value)}
        />
        {retraitError && (
          <InlineNotification
            kind="error"
            lowContrast
            hideCloseButton
            title="Retrait refusé"
            subtitle={retraitError}
            className="mt-4 max-w-none"
          />
        )}
      </Modal>
    </Shell>
  );
}
