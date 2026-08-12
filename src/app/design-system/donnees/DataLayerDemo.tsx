"use client";

/**
 * Démonstration de la couche de données.
 *
 * Prouve, sur un cas réel, que le contrat tient de bout en bout :
 * requête typée → validation Zod → cache → rendu → mutation → garde-fou →
 * invalidation croisée. Ce que cet écran fait, l'inbox ANO définitive le fera
 * de la même façon ; il sert de patron de référence.
 */

import { useState } from "react";
import {
  Button,
  DataTable,
  DataTableSkeleton,
  Dropdown,
  InlineNotification,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
  Tag,
  TextArea,
} from "@carbon/react";
import { Renew, WarningAltFilled } from "@carbon/icons-react";
import { useAnoDecision, useAnoInbox, useAnoStats } from "@/lib/api/hooks";
import { ApiError } from "@/lib/api/client";
import type { AnoStatus } from "@/lib/schemas/ano";
import { LABELS, daysUntil, formatDate, formatMoneyCompact } from "@/lib/format";
import { cn } from "@/lib/cn";

const HEADERS = [
  { key: "objectType", header: "Type" },
  { key: "title", header: "Objet" },
  { key: "donor", header: "Bailleur" },
  { key: "amount", header: "Montant" },
  { key: "dueOn", header: "Échéance" },
  { key: "status", header: "Statut" },
];

const STATUS_TONE: Record<AnoStatus, "blue" | "cyan" | "magenta" | "green" | "red" | "gray"> = {
  SOUMIS: "cyan",
  EN_INSTRUCTION: "blue",
  CLARIFICATION: "magenta",
  DELIVRE: "green",
  REJETE: "red",
  RETIRE: "gray",
};

export function DataLayerDemo() {
  const [profile, setProfile] = useState("BAILLEUR");
  const [selected, setSelected] = useState<string | null>(null);
  const [comment, setComment] = useState("");

  const inbox = useAnoInbox({ openOnly: true, sort: "dueOn", order: "asc" });
  const stats = useAnoStats();
  const decision = useAnoDecision(selected ?? "", profile);

  const error = decision.error instanceof ApiError ? decision.error : null;

  return (
    <main id="ptn-main" className="bg-background min-h-screen">
      <div className="mx-auto flex max-w-[1200px] flex-col gap-8 px-6 py-10">
        <header>
          <p className="text-caption text-accent font-medium tracking-wider uppercase">
            Fondations · couche de données
          </p>
          <h1 className="text-heading-05 text-primary mt-2">Contrat d&apos;API</h1>
          <p className="text-body-lg text-secondary mt-3 max-w-[68ch]">
            Cet écran consomme <code className="mono text-body">/api/v1/ano</code> à
            travers des schémas Zod. Les montants arrivent en nombres, les dates en
            ISO&nbsp;8601 : tout ce qui est lisible ci-dessous est mis en forme au rendu,
            selon la locale.
          </p>
        </header>

        {/* ---------- Compteurs ---------- */}
        <section className="border-subtle grid grid-cols-2 gap-px border md:grid-cols-4">
          {[
            { label: "Demandes ouvertes", value: stats.data?.open },
            { label: "Hors délai", value: stats.data?.overdue, alert: true },
            { label: "Banque mondiale", value: stats.data?.byDonor.IDA },
            { label: "AFD", value: stats.data?.byDonor.AFD },
          ].map((kpi) => (
            <div key={kpi.label} className="bg-layer flex flex-col gap-1 p-4">
              <span className="text-caption text-secondary">{kpi.label}</span>
              {stats.isPending ? (
                <span className="bg-layer-hover mt-1 h-8 w-12 animate-pulse" />
              ) : (
                <span
                  className={cn(
                    "text-heading-04 mono",
                    kpi.alert && (kpi.value ?? 0) > 0 ? "text-danger-text" : "text-primary",
                  )}
                >
                  {kpi.value ?? "—"}
                </span>
              )}
            </div>
          ))}
        </section>

        {/* ---------- Sélecteur de profil ---------- */}
        <section className="border-subtle bg-layer flex flex-wrap items-end gap-4 border p-4">
          <div className="min-w-[18rem]">
            <Dropdown
              id="demo-profile"
              titleText="Agir en tant que"
              label="Profil"
              selectedItem={profile}
              items={["BAILLEUR", "UGP", "AUDITEUR"]}
              onChange={({ selectedItem }) => setProfile(selectedItem ?? "BAILLEUR")}
            />
          </div>
          <p className="text-caption text-helper max-w-[46ch] pb-2">
            Le garde-fou est appliqué par le serveur, pas seulement en désactivant un
            bouton. Choisissez <strong>UGP</strong> puis décidez : la requête part et
            revient refusée.
          </p>
        </section>

        {/* ---------- Table ---------- */}
        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-heading-03 text-primary">Inbox ANO</h2>
            <Button
              size="sm"
              kind="ghost"
              renderIcon={Renew}
              onClick={() => void inbox.refetch()}
              disabled={inbox.isFetching}
            >
              {inbox.isFetching ? "Actualisation…" : "Actualiser"}
            </Button>
          </div>

          {inbox.isPending && (
            // Le squelette reproduit la forme finale : 6 colonnes, 5 lignes.
            // Un indicateur générique ferait sauter la mise en page à l'arrivée
            // des données.
            <DataTableSkeleton columnCount={6} rowCount={5} showHeader={false} showToolbar={false} />
          )}

          {inbox.isError && (
            <InlineNotification
              kind="error"
              lowContrast
              hideCloseButton
              title="Chargement impossible"
              subtitle={(inbox.error as Error).message}
              className="max-w-none"
            />
          )}

          {inbox.data && inbox.data.items.length === 0 && (
            <div className="border-subtle bg-layer border p-8 text-center">
              <p className="text-heading-02 text-primary">Aucune demande en attente</p>
              <p className="text-body text-secondary mt-1">
                Toutes les non-objections ont été traitées.
              </p>
            </div>
          )}

          {inbox.data && inbox.data.items.length > 0 && (
            <DataTable rows={inbox.data.items.map((i) => ({ ...i, id: i.id }))} headers={HEADERS}>
              {({ rows, headers, getHeaderProps, getTableProps }) => (
                <TableContainer
                  title={`${inbox.data.total} demande${inbox.data.total > 1 ? "s" : ""} ouverte${inbox.data.total > 1 ? "s" : ""}`}
                  description="Triées par échéance. Une demande cofinancée apparaît deux fois — un bailleur, une instruction."
                >
                  <Table {...getTableProps()} size="lg">
                    <TableHead>
                      <TableRow>
                        {headers.map((header) => {
                          const { key, ...rest } = getHeaderProps({ header });
                          return (
                            <TableHeader
                              key={key as string}
                              {...rest}
                              className={header.key === "amount" ? "text-right" : undefined}
                            >
                              {header.header}
                            </TableHeader>
                          );
                        })}
                        <TableHeader>Action</TableHeader>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {rows.map((row) => {
                        const item = inbox.data.items.find((i) => i.id === row.id)!;
                        const days = daysUntil(item.dueOn);
                        const late = days < 0;

                        return (
                          <TableRow key={row.id}>
                            {/* Pas de `mono` ici : c'est un libellé, pas une donnée.
                                Le chasse-fixe est réservé aux références, montants et
                                dates, où l'alignement vertical porte du sens. */}
                            <TableCell>{LABELS.objectType[item.objectType]}</TableCell>
                            <TableCell>
                              <span className="text-primary">{item.title}</span>
                              <span className="text-caption text-helper mono ml-2">
                                {item.initiativeRef}
                              </span>
                            </TableCell>
                            <TableCell>{LABELS.donor[item.donor]}</TableCell>
                            <TableCell className="mono text-right">
                              {formatMoneyCompact(item.amount)}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2 whitespace-nowrap">
                                {late && (
                                  <WarningAltFilled
                                    size={16}
                                    className="text-danger shrink-0"
                                    aria-hidden
                                  />
                                )}
                                <span className={cn("mono", late && "text-danger-text")}>
                                  {formatDate(item.dueOn)}
                                </span>
                                <span className="text-caption text-helper">
                                  {late
                                    ? `${Math.abs(days)} j de retard`
                                    : `dans ${days} j`}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Tag type={STATUS_TONE[item.status]}>
                                {LABELS.anoStatus[item.status]}
                              </Tag>
                            </TableCell>
                            <TableCell>
                              <Button
                                size="sm"
                                kind="tertiary"
                                onClick={() => {
                                  setSelected(item.id);
                                  setComment("");
                                  decision.reset();
                                }}
                              >
                                Décider
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </DataTable>
          )}
        </section>

        {/* ---------- Panneau de décision ---------- */}
        {selected && (
          <section className="border-accent bg-layer border-l-4 p-5">
            <h3 className="text-heading-02 text-primary">Décision · {selected}</h3>
            <p className="text-body text-secondary mt-1">
              Rendue en tant que <strong>{profile}</strong>.
            </p>

            {error?.isGuardrail && (
              <InlineNotification
                kind="error"
                lowContrast
                hideCloseButton
                title="Action refusée"
                className="mt-4 max-w-none"
                // La référence au MEP est concaténée au message : l'agent doit
                // pouvoir vérifier la règle qu'on lui oppose, pas seulement la subir.
                subtitle={error.blockers
                  .map((b) => (b.reference ? `${b.message} (${b.reference})` : b.message))
                  .join(" · ")}
              />
            )}

            {error && !error.isGuardrail && (
              <InlineNotification
                kind="error"
                lowContrast
                hideCloseButton
                title="Données invalides"
                subtitle={error.blockers.map((b) => b.message).join(" · ") || error.message}
                className="mt-4 max-w-none"
              />
            )}

            {decision.isSuccess && (
              <InlineNotification
                kind="success"
                lowContrast
                hideCloseButton
                title="Décision enregistrée"
                subtitle={`Statut : ${LABELS.anoStatus[decision.data.request.status]}. L'initiative liée a été mise à jour.`}
                className="mt-4 max-w-none"
              />
            )}

            <div className="mt-4 max-w-[56ch]">
              <TextArea
                id="demo-comment"
                labelText="Motif"
                helperText="Obligatoire (10 caractères minimum) pour un rejet ou une clarification."
                rows={3}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
              />
            </div>

            <div className="mt-4 flex flex-wrap gap-3">
              <Button
                size="md"
                disabled={decision.isPending}
                onClick={() => decision.mutate({ decision: "DELIVRE", comment })}
              >
                Délivrer la non-objection
              </Button>
              <Button
                size="md"
                kind="tertiary"
                disabled={decision.isPending}
                onClick={() => decision.mutate({ decision: "CLARIFICATION", comment })}
              >
                Demander une clarification
              </Button>
              <Button
                size="md"
                kind="danger--tertiary"
                disabled={decision.isPending}
                onClick={() => decision.mutate({ decision: "REJETE", comment })}
              >
                Rejeter
              </Button>
              <Button size="md" kind="ghost" onClick={() => setSelected(null)}>
                Fermer
              </Button>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
