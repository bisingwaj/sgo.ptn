"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { OverflowMenuVertical, Filter, Search } from "@carbon/icons-react";
import styles from "./mgp.module.scss";

interface Plainte {
  ref: string;
  title: string;
  category: string;
  status: { label: string; tone: "info" | "warn" | "ok" | "err" };
  province: string;
  date: string;
  delay: string;
}

interface MgpListClientProps {
  plaintes: Plainte[];
}

interface FilterDef {
  id: string;
  label: string;
  match: (p: Plainte) => boolean;
}

const FILTERS: FilterDef[] = [
  { id: "all", label: "Toutes", match: () => true },
  { id: "open", label: "Ouvertes", match: (p) => p.status.tone === "warn" || p.status.tone === "info" },
  { id: "resolved", label: "Résolues", match: (p) => p.status.tone === "ok" },
  { id: "escalated", label: "Escaladées", match: (p) => p.status.tone === "err" },
];

function statusColor(tone: Plainte["status"]["tone"]) {
  switch (tone) {
    case "info":
      return { bg: "var(--ptn-accent)", cls: "tagInfo" as const };
    case "warn":
      return { bg: "var(--ptn-status-warning)", cls: "tagWarn" as const };
    case "ok":
      return { bg: "var(--ptn-status-success)", cls: "tagOk" as const };
    case "err":
      return { bg: "var(--ptn-status-danger)", cls: "tagErr" as const };
  }
}

export function MgpListClient({ plaintes }: MgpListClientProps) {
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [query, setQuery] = useState("");

  const counts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const f of FILTERS) {
      map[f.id] = plaintes.filter(f.match).length;
    }
    return map;
  }, [plaintes]);

  const filtered = useMemo(() => {
    const f = FILTERS.find((x) => x.id === activeFilter) ?? FILTERS[0];
    const q = query.trim().toLowerCase();
    return plaintes
      .filter(f.match)
      .filter((p) => {
        if (!q) return true;
        return (
          p.ref.toLowerCase().includes(q) ||
          p.title.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q) ||
          p.province.toLowerCase().includes(q)
        );
      });
  }, [plaintes, activeFilter, query]);

  return (
    <div>
      <div className={styles.toolbar}>
        <h3>
          Plaintes & suggestions <span className={styles.num}>({filtered.length})</span>
        </h3>
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setActiveFilter(f.id)}
              aria-pressed={activeFilter === f.id}
              style={{
                background: activeFilter === f.id ? "var(--ptn-accent)" : "transparent",
                color: activeFilter === f.id ? "#fff" : "var(--cds-text-secondary)",
                border: `1px solid ${activeFilter === f.id ? "var(--ptn-accent)" : "var(--cds-border-subtle)"}`,
                padding: "4px 10px",
                fontSize: 12,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                font: "inherit",
                fontFamily: "inherit",
              }}
            >
              {f.label}{" "}
              <span
                className="ptn-mono"
                style={{
                  fontSize: 10,
                  background:
                    activeFilter === f.id
                      ? "rgba(255,255,255,0.25)"
                      : "var(--cds-layer-accent-01)",
                  padding: "1px 5px",
                  color: activeFilter === f.id ? "#fff" : "var(--cds-text-helper)",
                }}
              >
                {counts[f.id] ?? 0}
              </span>
            </button>
          ))}
        </div>
        <div className={styles.spacer} />
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            background: "var(--cds-background)",
            padding: "6px 12px",
            width: 240,
            flex: "0 1 240px",
            minWidth: 160,
            borderBottom: "1px solid var(--cds-border-strong)",
            color: "var(--cds-text-helper)",
          }}
        >
          <Search size={14} aria-hidden />
          <input
            type="search"
            placeholder="Rechercher une plainte…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Rechercher une plainte"
            style={{
              border: 0,
              background: "transparent",
              fontSize: 13,
              flex: 1,
              outline: "none",
              color: "var(--cds-text-primary)",
              fontFamily: "inherit",
            }}
          />
        </div>
        <button
          type="button"
          style={{
            background: "var(--cds-layer)",
            border: "1px solid var(--cds-border-subtle)",
            padding: "6px 12px",
            fontSize: 12,
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <Filter size={14} aria-hidden /> Filtres
        </button>
      </div>

      <div className={styles.tableWrap}>
        {filtered.length === 0 ? (
          <div
            style={{
              padding: "48px 24px",
              textAlign: "center",
              color: "var(--cds-text-helper)",
              fontSize: 13,
            }}
          >
            <div style={{ fontWeight: 500, color: "var(--cds-text-primary)", marginBottom: 4 }}>
              Aucune plainte ne correspond à votre filtre
            </div>
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
              Réinitialiser les filtres
            </button>
          </div>
        ) : (
          <table className={styles.table}>
            <colgroup>
              <col style={{ width: "13%" }} />
              <col style={{ width: "33%" }} />
              <col style={{ width: "13%" }} />
              <col style={{ width: "13%" }} />
              <col style={{ width: "12%" }} />
              <col style={{ width: "10%" }} />
              <col style={{ width: "6%" }} />
            </colgroup>
            <thead>
              <tr>
                <th>Référence</th>
                <th>Objet</th>
                <th>Catégorie</th>
                <th>Statut</th>
                <th>Province</th>
                <th>Date</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => {
                const sc = statusColor(p.status.tone);
                return (
                  <tr key={p.ref}>
                    <td>
                      <Link
                        href={`/partenaire/mgp/${p.ref}`}
                        className={styles.ref}
                        style={{
                          textDecoration: "none",
                          color: "var(--ptn-accent)",
                        }}
                      >
                        {p.ref}
                      </Link>
                    </td>
                    <td>
                      <Link
                        href={`/partenaire/mgp/${p.ref}`}
                        style={{ textDecoration: "none", color: "inherit" }}
                      >
                        <div className={styles.title}>{p.title}</div>
                        <div className={styles.titleSub}>Délai depuis dépôt · {p.delay}</div>
                      </Link>
                    </td>
                    <td>{p.category}</td>
                    <td>
                      <span className={`${styles.tag} ${styles[sc.cls]}`}>
                        <span className={styles.dot} style={{ background: sc.bg }} />
                        {p.status.label}
                      </span>
                    </td>
                    <td>{p.province}</td>
                    <td className={styles.date}>{p.date}</td>
                    <td>
                      <Link
                        href={`/partenaire/mgp/${p.ref}`}
                        className={styles.kebab}
                        aria-label="Ouvrir la plainte"
                      >
                        <OverflowMenuVertical size={16} aria-hidden />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export type { Plainte };
