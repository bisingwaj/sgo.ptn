"use client";

import { useState } from "react";
import { Shell } from "@/components/shell/Shell";
import { PageHeader } from "@/components/ui/PageHeader";
import { Tag } from "@/components/ui/Tag";
import { INITIATIVES } from "@/lib/mock-initiatives";
import {
  Document,
  Search,
  Add,
  Download,
  Folders,
  Filter,
} from "@carbon/icons-react";
import styles from "./documents.module.scss";

interface DocRow {
  name: string;
  type: string;
  size: string;
  date: string;
  status: "draft" | "signed" | "review";
  initiative: string;
  initRef: string;
  component: string;
}

// Construit la liste à partir des initiatives mock
const DOCS: DocRow[] = INITIATIVES.flatMap((i) =>
  i.documents.map((d) => ({
    ...d,
    initiative: i.title,
    initRef: i.ref,
    component: i.component.code,
  })),
);

export default function DocumentsPage() {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string[]>([]);

  const filtered = DOCS.filter((d) => {
    if (typeFilter.length > 0 && !typeFilter.includes(d.type)) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        d.name.toLowerCase().includes(q) ||
        d.initiative.toLowerCase().includes(q) ||
        d.initRef.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const types = Array.from(new Set(DOCS.map((d) => d.type)));

  return (
    <Shell crumbs={[{ label: "Accueil", href: "/dashboard" }, { label: "Documents partagés" }]}>
      <PageHeader
        eyebrow="MES DOCUMENTS PTN-RDC"
        title="Documents partagés"
        subtitle={`${DOCS.length} documents attachés à vos initiatives — TDR, DAO, EIES, PV, ANO.`}
        actions={
          <button type="button" className={styles.btnPrimary}>
            <Add size={16} aria-hidden /> Téléverser un document
          </button>
        }
      />

      <div className={styles.card}>
        <div className={styles.toolbar}>
          <h3 className={styles.toolTitle}>
            {filtered.length} document{filtered.length > 1 ? "s" : ""}
          </h3>
          <span className={styles.divider} aria-hidden />
          <div className={styles.filterPills}>
            <span className={styles.filterLabel}>
              <Filter size={12} aria-hidden /> Type
            </span>
            {types.map((t) => {
              const active = typeFilter.includes(t);
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() =>
                    setTypeFilter(active ? typeFilter.filter((x) => x !== t) : [...typeFilter, t])
                  }
                  className={`${styles.pill} ${active ? styles.pillActive : ""}`}
                >
                  {t}
                </button>
              );
            })}
          </div>
          <div className={styles.spacer} />
          <div className={styles.searchWrap}>
            <Search size={14} aria-hidden />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher (nom, initiative, réf)"
              className={styles.searchInput}
            />
          </div>
        </div>

        <div className={styles.tableScroll}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th style={{ width: "5%" }}></th>
                <th style={{ width: "30%" }}>Nom du fichier</th>
                <th style={{ width: "10%" }}>Type</th>
                <th style={{ width: "20%" }}>Initiative</th>
                <th style={{ width: "8%" }}>Composante</th>
                <th style={{ width: "10%" }}>Statut</th>
                <th style={{ width: "12%" }}>Date</th>
                <th style={{ width: "5%" }}></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className={styles.emptyRow}>
                    Aucun document ne correspond aux critères.
                  </td>
                </tr>
              )}
              {filtered.map((d, i) => (
                <tr key={i}>
                  <td>
                    <span className={styles.fileIcon}>
                      <Document size={20} aria-hidden />
                    </span>
                  </td>
                  <td>
                    <strong className={styles.fileName}>{d.name}</strong>
                    <div className={styles.fileSize}>
                      <span className="ptn-mono">{d.size}</span>
                    </div>
                  </td>
                  <td>
                    <Tag tone="gray" size="sm">
                      {d.type}
                    </Tag>
                  </td>
                  <td>
                    <div className={styles.initiativeCell}>
                      <span className="ptn-mono">{d.initRef}</span>
                      <span className={styles.initTitle}>{d.initiative}</span>
                    </div>
                  </td>
                  <td>
                    <Tag tone="purple" size="sm">
                      {d.component}
                    </Tag>
                  </td>
                  <td>
                    <Tag
                      tone={
                        d.status === "signed"
                          ? "green"
                          : d.status === "review"
                            ? "yellow"
                            : "gray"
                      }
                      size="sm"
                    >
                      {d.status === "signed" ? "Signé" : d.status === "review" ? "En revue" : "Brouillon"}
                    </Tag>
                  </td>
                  <td className="ptn-mono">{d.date}</td>
                  <td>
                    <button type="button" className={styles.dlBtn} aria-label="Télécharger">
                      <Download size={14} aria-hidden />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className={styles.empty}>
          <Folders size={20} aria-hidden /> Astuce : organisez vos documents par initiative depuis la
          page <a href="/dashboard/initiatives">Mes initiatives</a>.
        </div>
      </div>
    </Shell>
  );
}
