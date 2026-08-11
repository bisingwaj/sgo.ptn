"use client";

/**
 * MDA · Liste complète des initiatives.
 *
 * - DataTable avec filtres (Statut, Composante, Période, Recherche)
 * - Drawer latéral pour détails sans changer de page
 * - Pagination 10 / page
 */

import { useState, useMemo } from "react";
import Link from "next/link";
import { Shell } from "@/components/shell/Shell";
import { PageHeader } from "@/components/ui/PageHeader";
import { Tag } from "@/components/ui/Tag";
import { PipelineStepper } from "@/components/ui/PipelineStepper";
import { Drawer } from "@/components/ui/Drawer";
import { INITIATIVES, type Initiative } from "@/lib/mock-initiatives";
import {
  Add,
  Search,
  Filter,
  Download,
  ArrowRight,
  OverflowMenuVertical,
} from "@carbon/icons-react";
import styles from "./initiatives.module.scss";

export default function InitiativesPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [componentFilter, setComponentFilter] = useState<string[]>([]);
  const [selected, setSelected] = useState<Initiative | null>(null);

  const filtered = useMemo(() => {
    let list = INITIATIVES;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (i) =>
          i.title.toLowerCase().includes(q) ||
          i.ref.toLowerCase().includes(q) ||
          i.ptbaCode.toLowerCase().includes(q),
      );
    }
    if (statusFilter.length > 0) {
      list = list.filter((i) => statusFilter.includes(i.status.label));
    }
    if (componentFilter.length > 0) {
      list = list.filter((i) => componentFilter.includes(i.component.code));
    }
    return list;
  }, [search, statusFilter, componentFilter]);

  const allStatuses = Array.from(new Set(INITIATIVES.map((i) => i.status.label)));
  const allComponents = ["C1", "C2", "C3", "C4"];

  return (
    <Shell
      crumbs={[
        { label: "Accueil", href: "/dashboard" },
        { label: "Mes initiatives" },
      ]}
    >
      <PageHeader
        eyebrow="MES INITIATIVES PTN-RDC"
        title="Initiatives en cours"
        subtitle="Pipeline complet des 12 initiatives actives — du TDR à l'attribution."
        actions={
          <>
            <button type="button" className={styles.btnSecondary}>
              <Download size={16} aria-hidden /> Exporter (CSV)
            </button>
            <Link href="/dashboard/initiatives/nouveau" className={styles.btnPrimary}>
              <Add size={16} aria-hidden /> Proposer une initiative
            </Link>
          </>
        }
      />

      <div className={styles.tableCard}>
        {/* Toolbar */}
        <div className={styles.toolbar}>
          <h3 className={styles.toolTitle}>
            {filtered.length} initiative{filtered.length > 1 ? "s" : ""}
            {INITIATIVES.length !== filtered.length && (
              <span className={styles.toolMeta}>
                {" "}
                <span className="ptn-mono">/ {INITIATIVES.length}</span>
              </span>
            )}
          </h3>
          <span className={styles.divider} aria-hidden />
          <FilterPills
            label="Statut"
            options={allStatuses}
            selected={statusFilter}
            onChange={setStatusFilter}
          />
          <FilterPills
            label="Composante"
            options={allComponents}
            selected={componentFilter}
            onChange={setComponentFilter}
          />
          <div className={styles.spacer} />
          <div className={styles.searchWrap}>
            <Search size={14} aria-hidden />
            <input
              type="search"
              placeholder="Rechercher (titre, réf, PTBA)"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={styles.searchInput}
            />
          </div>
        </div>

        {/* Active filter chips */}
        {(statusFilter.length > 0 || componentFilter.length > 0) && (
          <div className={styles.chipsBar}>
            <Filter size={12} aria-hidden />
            <span className={styles.chipsLabel}>Filtres actifs</span>
            {statusFilter.map((s) => (
              <Chip key={s} onRemove={() => setStatusFilter(statusFilter.filter((x) => x !== s))}>
                Statut · {s}
              </Chip>
            ))}
            {componentFilter.map((c) => (
              <Chip key={c} onRemove={() => setComponentFilter(componentFilter.filter((x) => x !== c))}>
                Composante · {c}
              </Chip>
            ))}
            <button
              type="button"
              className={styles.clearAll}
              onClick={() => {
                setStatusFilter([]);
                setComponentFilter([]);
              }}
            >
              Effacer tout
            </button>
          </div>
        )}

        {/* Table */}
        <div className={styles.tableScroll}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th style={{ width: "11%" }}>Réf</th>
                <th style={{ width: "30%" }}>Intitulé</th>
                <th style={{ width: "10%" }}>Composante</th>
                <th style={{ width: "8%" }}>PTBA</th>
                <th style={{ width: "13%" }}>Statut</th>
                <th style={{ width: "16%" }}>Étape pipeline</th>
                <th style={{ width: "8%" }}>Montant</th>
                <th style={{ width: "4%" }}></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((init) => (
                <tr
                  key={init.ref}
                  onClick={() => setSelected(init)}
                  className={styles.row}
                >
                  <td className="ptn-mono">{init.ref}</td>
                  <td>
                    <div className={styles.titleCell}>
                      <span className={styles.titleText}>{init.title}</span>
                      {init.ai && (
                        <Tag tone="purple" size="sm">
                          IA
                        </Tag>
                      )}
                    </div>
                  </td>
                  <td>
                    <Tag tone={init.component.tone} size="sm">
                      {init.component.code} · {init.component.short}
                    </Tag>
                  </td>
                  <td className="ptn-mono">{init.ptbaCode}</td>
                  <td>
                    <Tag tone={init.status.tone} size="sm">
                      {init.status.label}
                    </Tag>
                  </td>
                  <td>
                    <PipelineStepper
                      current={init.pipeline.current}
                      total={init.pipeline.total}
                      label={init.pipeline.label}
                    />
                  </td>
                  <td className="ptn-mono">{init.amount}</td>
                  <td>
                    <button
                      type="button"
                      className={styles.kebab}
                      onClick={(e) => e.stopPropagation()}
                      aria-label="Actions"
                    >
                      <OverflowMenuVertical size={16} aria-hidden />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className={styles.pagination}>
          <span className={styles.pagInfo}>
            <select className={styles.pagSelect}>
              <option>10</option>
              <option>25</option>
              <option>50</option>
            </select>
            <span>/ page</span>
          </span>
          <span className={styles.divider} aria-hidden />
          <span className="ptn-mono">
            1–{filtered.length} de {filtered.length}
          </span>
          <div className={styles.spacer} />
          <button type="button" className={styles.pagBtn} disabled>
            ‹
          </button>
          <span className="ptn-mono">1 / 1</span>
          <button type="button" className={styles.pagBtn} disabled>
            ›
          </button>
        </div>
      </div>

      {/* Drawer détail */}
      <Drawer
        open={selected !== null}
        onClose={() => setSelected(null)}
        title={selected?.title ?? ""}
        subtitle={
          selected && (
            <span style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
              <span className="ptn-mono">{selected.ref}</span>
              <span>·</span>
              <Tag tone={selected.component.tone} size="sm">
                {selected.component.code}
              </Tag>
              <Tag tone={selected.status.tone} size="sm">
                {selected.status.label}
              </Tag>
            </span>
          )
        }
        footer={
          selected && (
            <>
              <button type="button" className={styles.btnSecondary}>
                Voir le registre
              </button>
              <Link
                href={`/dashboard/initiatives/${selected.ref}`}
                className={styles.btnPrimary}
              >
                Ouvrir le dossier complet <ArrowRight size={14} aria-hidden />
              </Link>
            </>
          )
        }
      >
        {selected && <DrawerContent init={selected} />}
      </Drawer>
    </Shell>
  );
}

function DrawerContent({ init }: { init: Initiative }) {
  return (
    <div className={styles.drawerContent}>
      <p className={styles.drawerDesc}>{init.description}</p>

      <div className={styles.drawerGrid}>
        <DrawerKv label="Référence" value={init.ref} mono />
        <DrawerKv label="Activité PTBA" value={init.ptbaCode} mono />
        <DrawerKv label="Composante" value={`${init.component.code} · ${init.component.short}`} />
        <DrawerKv label="Province" value={init.province ?? "Multi-provinces"} />
        <DrawerKv label="Bailleur" value={init.donor} />
        <DrawerKv label="Risque E&S" value={init.riskES} />
        <DrawerKv label="Montant total" value={init.amount} mono />
        <DrawerKv
          label="Décomposition"
          value={
            <span style={{ display: "inline-flex", gap: 8 }}>
              {init.donors.ida && (
                <span className="ptn-mono">IDA {init.donors.ida}</span>
              )}
              {init.donors.afd && (
                <span className="ptn-mono">AFD {init.donors.afd}</span>
              )}
            </span>
          }
        />
      </div>

      <div className={styles.drawerSection}>
        <h4 className={styles.drawerSectionTitle}>Étape pipeline</h4>
        <PipelineStepper
          current={init.pipeline.current}
          total={init.pipeline.total}
          label={init.pipeline.label}
        />
      </div>

      <div className={styles.drawerSection}>
        <h4 className={styles.drawerSectionTitle}>Équipe ({init.team.length})</h4>
        <ul className={styles.teamList}>
          {init.team.map((m, i) => (
            <li key={i} className={styles.teamItem}>
              <span className={styles.teamAvatar}>
                {m.name
                  .split(/\s+/)
                  .map((w) => w[0])
                  .slice(0, 2)
                  .join("")}
              </span>
              <div>
                <div className={styles.teamName}>{m.name}</div>
                <div className={styles.teamRole}>
                  {m.role} · <span className="ptn-mono">{m.org}</span>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className={styles.drawerSection}>
        <h4 className={styles.drawerSectionTitle}>
          Documents ({init.documents.length})
        </h4>
        {init.documents.length === 0 ? (
          <p className={styles.drawerEmpty}>Aucun document encore attaché.</p>
        ) : (
          <ul className={styles.docList}>
            {init.documents.map((d, i) => (
              <li key={i} className={styles.docItem}>
                <div>
                  <strong>{d.name}</strong>
                  <span className="ptn-mono">
                    {d.type} · {d.size} · {d.date}
                  </span>
                </div>
                <Tag
                  tone={d.status === "signed" ? "green" : d.status === "review" ? "yellow" : "gray"}
                  size="sm"
                >
                  {d.status === "signed" ? "Signé" : d.status === "review" ? "En revue" : "Brouillon"}
                </Tag>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className={styles.drawerSection}>
        <h4 className={styles.drawerSectionTitle}>Activité récente</h4>
        <p className={styles.drawerEmpty}>
          Dernière action : <strong>{init.lastAction}</strong> par <strong>{init.lastActor}</strong>
        </p>
      </div>
    </div>
  );
}

function DrawerKv({
  label,
  value,
  mono,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div className={styles.kv}>
      <span className={styles.kvLabel}>{label}</span>
      <strong className={`${styles.kvValue} ${mono ? "ptn-mono" : ""}`}>{value}</strong>
    </div>
  );
}

interface FilterPillsProps {
  label: string;
  options: string[];
  selected: string[];
  onChange: (s: string[]) => void;
}

function FilterPills({ label, options, selected, onChange }: FilterPillsProps) {
  return (
    <div className={styles.filterPills}>
      <span className={styles.filterLabel}>{label}</span>
      {options.map((o) => {
        const active = selected.includes(o);
        return (
          <button
            key={o}
            type="button"
            onClick={() =>
              onChange(active ? selected.filter((x) => x !== o) : [...selected, o])
            }
            className={`${styles.pill} ${active ? styles.pillActive : ""}`}
          >
            {o}
          </button>
        );
      })}
    </div>
  );
}

function Chip({ children, onRemove }: { children: React.ReactNode; onRemove: () => void }) {
  return (
    <span className={styles.chip}>
      {children}
      <button
        type="button"
        onClick={onRemove}
        className={styles.chipX}
        aria-label="Retirer ce filtre"
      >
        ×
      </button>
    </span>
  );
}
