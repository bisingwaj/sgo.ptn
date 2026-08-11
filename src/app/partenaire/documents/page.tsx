import Link from "next/link";
import { Shell } from "@/components/shell/Shell";
import { PageHeader } from "@/components/ui/PageHeader";
import { Tag } from "@/components/ui/Tag";
import {
  Document,
  Folders,
  Search,
  Upload,
  Download,
  OverflowMenuVertical,
  Filter,
  CheckmarkFilled,
  Time,
  Locked,
} from "@carbon/icons-react";
import styles from "./documents.module.scss";

export const metadata = { title: "Documents partagés · Espace partenaire · PTN-RDC" };

interface DocItem {
  ref: string;
  name: string;
  type: "PDF" | "DOCX" | "XLSX";
  size: string;
  proposition: string;
  uploadedBy: string;
  uploadedAt: string;
  status: "signed" | "review" | "draft";
}

const FOLDERS = [
  { id: "all", label: "Tous les documents", icon: Folders, count: 24, active: true },
  { id: "tdr", label: "Termes de référence", icon: Document, count: 8 },
  { id: "pges", label: "Sauvegardes E&S", icon: Document, count: 4 },
  { id: "rapports", label: "Rapports & livrables", icon: Document, count: 6 },
  { id: "contrats", label: "Contrats & avenants", icon: Locked, count: 3 },
  { id: "correspondance", label: "Correspondance UGP", icon: Document, count: 3 },
];

const DOCS: DocItem[] = [
  {
    ref: "DOC-2026-087",
    name: "TDR AMOA Plateforme identité numérique — v3 finale",
    type: "DOCX",
    size: "1,2 Mo",
    proposition: "PROP-2026-019",
    uploadedBy: "ANIE — vous",
    uploadedAt: "08 mai 2026",
    status: "review",
  },
  {
    ref: "DOC-2026-082",
    name: "Plan de sauvegarde environnementale Datacenter Tier-3",
    type: "PDF",
    size: "4,8 Mo",
    proposition: "PROP-2026-014",
    uploadedBy: "Bureau d'études CEDEAO",
    uploadedAt: "06 mai 2026",
    status: "draft",
  },
  {
    ref: "DOC-2026-079",
    name: "Étude de marché actualisée — Hub formation",
    type: "XLSX",
    size: "780 Ko",
    proposition: "PROP-2026-024",
    uploadedBy: "ANIE — vous",
    uploadedAt: "05 mai 2026",
    status: "draft",
  },
  {
    ref: "DOC-2026-074",
    name: "Procès-verbal réunion d'arbitrage UGP — 28 avril",
    type: "PDF",
    size: "320 Ko",
    proposition: "PROP-2026-019",
    uploadedBy: "Coord. UGP",
    uploadedAt: "29 avr. 2026",
    status: "signed",
  },
  {
    ref: "DOC-2026-070",
    name: "Rapport semestriel S1 2026 — synthèse partenaires",
    type: "PDF",
    size: "2,4 Mo",
    proposition: "Suivi-évaluation",
    uploadedBy: "UGP M&E",
    uploadedAt: "25 avr. 2026",
    status: "signed",
  },
  {
    ref: "DOC-2026-065",
    name: "Annexe budgétaire AMOA Plateforme identité",
    type: "XLSX",
    size: "560 Ko",
    proposition: "PROP-2026-019",
    uploadedBy: "ANIE — vous",
    uploadedAt: "21 avr. 2026",
    status: "review",
  },
  {
    ref: "DOC-2026-061",
    name: "Convention de collaboration ANIE — UGP",
    type: "PDF",
    size: "1,8 Mo",
    proposition: "Cadre général",
    uploadedBy: "Coord. UGP",
    uploadedAt: "12 avr. 2026",
    status: "signed",
  },
];

function FileIcon({ type }: { type: "PDF" | "DOCX" | "XLSX" }) {
  const cls =
    type === "PDF" ? styles.fileIcoPdf : type === "XLSX" ? styles.fileIcoXls : styles.fileIcoDoc;
  return (
    <div className={`${styles.fileIco} ${cls}`}>
      <Document size={16} aria-hidden />
    </div>
  );
}

function StatusTag({ status }: { status: DocItem["status"] }) {
  if (status === "signed")
    return (
      <Tag tone="green" size="sm" icon={<CheckmarkFilled size={12} aria-hidden />}>
        Signé
      </Tag>
    );
  if (status === "review")
    return (
      <Tag tone="yellow" size="sm" icon={<Time size={12} aria-hidden />}>
        En revue
      </Tag>
    );
  return (
    <Tag tone="gray" size="sm">
      Brouillon
    </Tag>
  );
}

export default function DocumentsPage() {
  return (
    <Shell crumbs={[{ label: "Espace partenaire", href: "/partenaire" }, { label: "Documents partagés" }]}>
      <PageHeader
        eyebrow="ANIE · ESPACE DOCUMENTAIRE"
        title="Documents partagés"
        subtitle="Bibliothèque commune avec l'UGP — TDR, sauvegardes E&S, rapports et correspondance officielle."
        meta={
          <>
            <span>
              Stockage :{" "}
              <strong>
                <span className="ptn-mono">147 Mo</span> / 2 Go
              </strong>
            </span>
            <span>·</span>
            <span>Dernière sync. : <span className="ptn-mono">il y a 4 min</span></span>
          </>
        }
        actions={
          <Link href="/partenaire/documents/upload" className={styles.btnPrimary}>
            <Upload size={16} aria-hidden />
            Téléverser un document
          </Link>
        }
      />

      <div className={styles.kpiRow}>
        <div className={styles.kpi}>
          <div className={styles.kpiK}>
            <Document size={14} aria-hidden />
            Total documents
          </div>
          <div className={styles.kpiV}>24</div>
          <div className={styles.kpiU}>+3 cette semaine</div>
        </div>
        <div className={styles.kpi}>
          <div className={styles.kpiK}>
            <CheckmarkFilled size={14} aria-hidden />
            Signés
          </div>
          <div className={styles.kpiV}>11</div>
          <div className={styles.kpiU}>workflow complet</div>
        </div>
        <div className={styles.kpi}>
          <div className={styles.kpiK}>
            <Time size={14} aria-hidden />
            En revue UGP
          </div>
          <div className={styles.kpiV}>5</div>
          <div className={styles.kpiU}>délai moyen 3,2 j</div>
        </div>
        <div className={styles.kpi}>
          <div className={styles.kpiK}>
            <Document size={14} aria-hidden />
            Brouillons
          </div>
          <div className={styles.kpiV}>8</div>
          <div className={styles.kpiU}>à compléter</div>
        </div>
      </div>

      <div className={styles.layout}>
        <aside className={styles.sidebar}>
          <div className={styles.sideTitle}>Dossiers</div>
          {FOLDERS.map((f) => {
            const Icon = f.icon;
            return (
              <button
                key={f.id}
                type="button"
                className={`${styles.sideItem} ${f.active ? styles.sideItemActive : ""}`}
              >
                <Icon size={16} aria-hidden />
                {f.label}
                <span className={styles.sideCount}>{f.count}</span>
              </button>
            );
          })}
        </aside>

        <div>
          <div className={styles.toolbar}>
            <h3>
              Tous les documents <span className={styles.num}>(24)</span>
            </h3>
            <div className={styles.spacer} />
            <div className={styles.search}>
              <Search size={14} aria-hidden />
              <input type="search" placeholder="Rechercher un document…" />
            </div>
            <button type="button" className={styles.btnIcon} aria-label="Filtres">
              <Filter size={16} aria-hidden />
            </button>
            <button type="button" className={styles.btnIcon} aria-label="Télécharger ZIP">
              <Download size={16} aria-hidden />
            </button>
          </div>

          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <colgroup>
                <col style={{ width: "44%" }} />
                <col style={{ width: "16%" }} />
                <col style={{ width: "10%" }} />
                <col style={{ width: "11%" }} />
                <col style={{ width: "12%" }} />
                <col style={{ width: "7%" }} />
              </colgroup>
              <thead>
                <tr>
                  <th>Document</th>
                  <th>Proposition</th>
                  <th style={{ textAlign: "right" }}>Taille</th>
                  <th>Statut</th>
                  <th>Date</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {DOCS.map((d) => (
                  <tr key={d.ref}>
                    <td>
                      <div className={styles.fileCell}>
                        <FileIcon type={d.type} />
                        <div className={styles.fileText}>
                          <div className={styles.fileName} title={d.name}>
                            {d.name}
                          </div>
                          <div className={styles.fileMeta}>
                            {d.ref} · {d.type} · {d.uploadedBy}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={styles.ref}>{d.proposition}</span>
                    </td>
                    <td className={styles.size}>{d.size}</td>
                    <td>
                      <StatusTag status={d.status} />
                    </td>
                    <td className={styles.date}>{d.uploadedAt}</td>
                    <td>
                      <button type="button" className={styles.btnIcon} aria-label="Actions document">
                        <OverflowMenuVertical size={16} aria-hidden />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Shell>
  );
}
