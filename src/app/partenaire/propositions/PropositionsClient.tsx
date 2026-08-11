"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Add,
  Search,
  Download,
  OverflowMenuVertical,
  Filter,
  Document,
  TaskApproved,
  AiGenerate,
  Catalog,
} from "@carbon/icons-react";
import { Tag } from "@/components/ui/Tag";
import { EmptyState } from "@/components/ui/EmptyState";
import styles from "./propositions.module.scss";

interface Proposition {
  ref: string;
  title: string;
  subtitle: string;
  composante: { code: "C1" | "C2" | "C3" | "C4"; label: string; tone: "cyan" | "purple" | "magenta" | "blue" };
  amount: string;
  amountUsd: number;
  status: { label: string; tone: "blue" | "yellow" | "green" | "red" | "gray"; key: string };
  stage: number;
  stageLabel: string;
  lastAction: string;
  lastWho: string;
  createdAt: string;
}

interface FilterDef {
  id: string;
  label: string;
  /** clé(s) de statut acceptées */
  match: (p: Proposition) => boolean;
}

interface PropositionsClientProps {
  propositions: Proposition[];
}

const FILTERS: FilterDef[] = [
  { id: "all", label: "Toutes", match: () => true },
  { id: "draft", label: "Brouillon", match: (p) => p.status.key === "draft" },
  { id: "ugp", label: "Arbitrage UGP", match: (p) => p.status.key === "ugp" },
  { id: "ppm", label: "PPM", match: (p) => p.status.key === "ppm" },
  { id: "ano", label: "ANO bailleur", match: (p) => p.status.key === "ano" },
];

function MiniStepper({ stage, label }: { stage: number; label: string }) {
  const segs = Array.from({ length: 6 }, (_, i) => {
    if (i < stage - 1) return styles.segDone;
    if (i === stage - 1) return styles.segCurrent;
    return "";
  });
  return (
    <>
      <div className={styles.stage}>
        {segs.map((c, i) => (
          <div key={i} className={`${styles.seg} ${c}`} />
        ))}
      </div>
      <div className={styles.stageLabel}>
        {label} · {stage}/6
      </div>
    </>
  );
}

export function PropositionsClient({ propositions }: PropositionsClientProps) {
  const params = useSearchParams();
  const demoEmpty = params?.get("empty") === "1";
  const effectivePropositions = useMemo(
    () => (demoEmpty ? [] : propositions),
    [demoEmpty, propositions],
  );

  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [query, setQuery] = useState("");

  const counts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const f of FILTERS) {
      map[f.id] = effectivePropositions.filter(f.match).length;
    }
    return map;
  }, [effectivePropositions]);

  const filtered = useMemo(() => {
    const f = FILTERS.find((x) => x.id === activeFilter) ?? FILTERS[0];
    const q = query.trim().toLowerCase();
    return effectivePropositions
      .filter(f.match)
      .filter((p) => {
        if (!q) return true;
        return (
          p.ref.toLowerCase().includes(q) ||
          p.title.toLowerCase().includes(q) ||
          p.subtitle.toLowerCase().includes(q) ||
          p.composante.label.toLowerCase().includes(q)
        );
      });
  }, [effectivePropositions, activeFilter, query]);

  // Premier accueil — 0 proposition jamais créée
  if (effectivePropositions.length === 0) {
    return (
      <EmptyState
        tone="ai"
        icon={<Document size={28} aria-hidden />}
        title="Créez votre première proposition"
        description={
          <>
            Vous n&apos;avez encore soumis aucune proposition. L&apos;assistant TDR ✦ IA vous
            guide en 12 étapes : justification, objectifs, méthodologie, livrables, budget,
            sauvegardes E&S, indicateurs et risques. Génération automatique du document final.
          </>
        }
        hint="Délai moyen TDR → ANO : 9 j avec un modèle éprouvé · 38 j sans"
        tips={[
          {
            icon: <AiGenerate size={12} aria-hidden style={{ color: "var(--ptn-status-ai)" }} />,
            text: (
              <>
                <strong>Brouillon IA :</strong> jusqu&apos;à 64 % des sections pré-remplies à
                partir de TDR similaires validés.
              </>
            ),
          },
          {
            icon: <Catalog size={12} aria-hidden style={{ color: "var(--ptn-accent)" }} />,
            text: (
              <>
                <strong>Modèles éprouvés :</strong> 24 modèles avec délai ANO moyen 9,4 jours
                (vs 38 j hors modèle).
              </>
            ),
          },
          {
            icon: <TaskApproved size={12} aria-hidden style={{ color: "var(--ptn-status-success)" }} />,
            text: (
              <>
                <strong>Audit complet :</strong> chaque suggestion IA est journalisée HMAC ·
                conforme ISO/IEC 42001.
              </>
            ),
          },
        ]}
        actions={[
          {
            label: "Créer une proposition",
            href: "/partenaire/propositions/nouveau",
            primary: true,
            icon: <Add size={14} aria-hidden />,
          },
          {
            label: "Parcourir les modèles",
            href: "/partenaire/modeles",
            icon: <Catalog size={14} aria-hidden />,
          },
        ]}
        standalone
      />
    );
  }

  return (
    <>
      <div className={styles.toolbar}>
        <h3>
          Propositions <span className={styles.num}>({filtered.length})</span>
        </h3>
        <div className={styles.statusFilters}>
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              className={`${styles.filterChip} ${activeFilter === f.id ? styles.filterChipActive : ""}`}
              onClick={() => setActiveFilter(f.id)}
              aria-pressed={activeFilter === f.id}
            >
              {f.label} <span className="ptn-mono">{counts[f.id] ?? 0}</span>
            </button>
          ))}
        </div>
        <div className={styles.toolbarSpacer} />
        <div className={styles.search}>
          <Search size={14} aria-hidden />
          <input
            type="search"
            placeholder="Rechercher une proposition…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Rechercher une proposition"
          />
        </div>
        <button type="button" className={styles.kebab} aria-label="Filtres avancés">
          <Filter size={16} aria-hidden />
        </button>
        <button type="button" className={styles.kebab} aria-label="Exporter CSV">
          <Download size={16} aria-hidden />
        </button>
      </div>

      <div className={styles.tableWrap}>
        {filtered.length === 0 ? (
          <div className={styles.empty}>
            <div style={{ fontWeight: 500, color: "var(--cds-text-primary)", marginBottom: 4 }}>
              Aucune proposition ne correspond à votre filtre
            </div>
            {query ? (
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  setActiveFilter("all");
                }}
                style={{
                  marginTop: 8,
                  background: "transparent",
                  border: 0,
                  color: "var(--ptn-accent)",
                  cursor: "pointer",
                  fontSize: 12,
                }}
              >
                Réinitialiser la recherche
              </button>
            ) : (
              <Link
                href="/partenaire/propositions/nouveau"
                style={{
                  marginTop: 12,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  color: "var(--ptn-accent)",
                  textDecoration: "none",
                  fontSize: 13,
                }}
              >
                <Add size={14} aria-hidden /> Créer une proposition
              </Link>
            )}
          </div>
        ) : (
          <table className={styles.table}>
            <colgroup>
              <col style={{ width: "13%" }} />
              <col style={{ width: "32%" }} />
              <col style={{ width: "11%" }} />
              <col style={{ width: "12%" }} />
              <col style={{ width: "14%" }} />
              <col style={{ width: "14%" }} />
              <col style={{ width: "4%" }} />
            </colgroup>
            <thead>
              <tr>
                <th>Référence</th>
                <th>Proposition</th>
                <th>Composante</th>
                <th style={{ textAlign: "right" }}>Montant</th>
                <th>Statut</th>
                <th>Étape</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.ref}>
                  <td>
                    <Link
                      href={`/partenaire/propositions/${p.ref}`}
                      className={styles.ref}
                      style={{ textDecoration: "none", color: "var(--ptn-accent)" }}
                    >
                      {p.ref}
                    </Link>
                  </td>
                  <td>
                    <Link
                      href={`/partenaire/propositions/${p.ref}`}
                      style={{ textDecoration: "none", color: "inherit" }}
                    >
                      <div className={styles.title}>{p.title}</div>
                      <div className={styles.titleSub}>{p.subtitle}</div>
                    </Link>
                  </td>
                  <td>
                    <Tag tone={p.composante.tone} size="sm">
                      {p.composante.label}
                    </Tag>
                  </td>
                  <td className={styles.amount}>{p.amount}</td>
                  <td>
                    <Tag tone={p.status.tone} size="sm">
                      {p.status.label}
                    </Tag>
                  </td>
                  <td>
                    <MiniStepper stage={p.stage} label={p.stageLabel} />
                  </td>
                  <td>
                    <Link
                      href={`/partenaire/propositions/${p.ref}`}
                      className={styles.kebab}
                      aria-label="Ouvrir la proposition"
                    >
                      <OverflowMenuVertical size={16} aria-hidden />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}

export type { Proposition, PropositionsClientProps };
