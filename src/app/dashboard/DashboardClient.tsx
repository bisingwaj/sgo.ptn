"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Add,
  ArrowRight,
  Document,
  Download,
  Time,
  TaskApproved,
  Money,
  ChartLineSmooth,
  Close,
  ChevronLeft,
  ChevronRight,
  Search,
  OverflowMenuVertical,
  Settings,
} from "@carbon/icons-react";
import { Dropdown, MultiSelect } from "@carbon/react";
import type { Initiative } from "@/lib/mock-initiatives";
import styles from "./dashboard.module.scss";

export interface DashboardKpi {
  label: string;
  icon: ReactNode;
  value: ReactNode;
  /** Bloc bas optionnel : delta, progress bar, sparkline */
  extra?: ReactNode;
}

export interface DashboardProfileConfig {
  greeting: string;
  cycleLabel?: string;
  syncLabel?: string;
  primaryAction?: { label: string; href: string };
  kpis?: DashboardKpi[];
  tableTitle?: string;
}

const DEFAULT_KPIS: DashboardKpi[] = [
  {
    label: "Initiatives actives",
    icon: <Document size={14} aria-hidden />,
    value: "12",
    extra: (
      <div className={`${styles.kpiDelta} ${styles.kpiUp}`}>
        <ChartLineSmooth size={12} aria-hidden /> +2 vs avr. 2026
      </div>
    ),
  },
  {
    label: "En attente d'ANO",
    icon: <TaskApproved size={14} aria-hidden />,
    value: "3",
    extra: (
      <div className={`${styles.kpiDelta} ${styles.kpiNeutral}`} style={{ whiteSpace: "nowrap" }}>
        Délai moyen{" "}
        <span className="ptn-mono" style={{ color: "var(--cds-text-primary)" }}>
          14,2 j
        </span>{" "}
        · cible 12 j
      </div>
    ),
  },
  {
    label: "Budget mobilisé",
    icon: <Money size={14} aria-hidden />,
    value: (
      <span className={`${styles.kpiV} ${styles.kpiVStack}`}>
        <span>42,8 M</span>
        <span className={styles.kpiU}>sur 69,0 M USD</span>
      </span>
    ),
    extra: (
      <>
        <div className={styles.pbar}>
          <i style={{ width: "62%" }} />
        </div>
        <div className={styles.pbarMeta}>
          <span>62 %</span>
          <span>Restant 26,2 M</span>
        </div>
      </>
    ),
  },
  {
    label: "Délai moyen TDR → ANO",
    icon: <Time size={14} aria-hidden />,
    value: (
      <>
        38 <span className={styles.kpiU}>jours</span>
      </>
    ),
    extra: (
      <div className={`${styles.kpiDelta} ${styles.kpiDown}`}>
        <ChartLineSmooth size={12} aria-hidden /> −6 j vs S1 2026
      </div>
    ),
  },
];

const PIPELINE_STAGES = ["TDR", "Revue UGP", "ANO BM", "DAO", "Évaluation", "Attribution"];

const COMP_LABEL: Record<"C1" | "C2" | "C3" | "C4", string> = {
  C1: "C1 · Accès",
  C2: "C2 · Fond.",
  C3: "C3 · Compét.",
  C4: "C4 · Coord.",
};

const COMP_FULL: Record<"C1" | "C2" | "C3" | "C4", string> = {
  C1: "C1 · Accès & Inclusion",
  C2: "C2 · Fondations Numériques",
  C3: "C3 · Compétences & Innovation",
  C4: "C4 · Coordination & Gestion",
};

type StatusKey = "info" | "warn" | "ok" | "err" | "ai" | "neutral";

interface FilterItem { id: string; text: string }

const STATUT_ITEMS: FilterItem[] = [
  { id: "encours", text: "En cours" },
  { id: "ano-attente", text: "ANO en attente" },
  { id: "ano-obtenu", text: "ANO obtenu" },
  { id: "clarif", text: "Clarifications" },
  { id: "brouillon-ia", text: "Brouillon IA" },
  { id: "init", text: "Initialisé" },
];

const COMP_ITEMS: FilterItem[] = [
  { id: "C1", text: "C1 · Accès & Inclusion" },
  { id: "C2", text: "C2 · Fondations Numériques" },
  { id: "C3", text: "C3 · Compétences & Innovation" },
  { id: "C4", text: "C4 · Coordination & Gestion" },
];

const PERIODE_ITEMS: FilterItem[] = [
  { id: "2026-q1", text: "2026-Q1" },
  { id: "2026-q2", text: "2026-Q2" },
  { id: "2026-y", text: "2026 (annuel)" },
  { id: "all", text: "Tout l'historique" },
];

const PAGE_SIZE_ITEMS: FilterItem[] = [
  { id: "10", text: "10" },
  { id: "25", text: "25" },
  { id: "50", text: "50" },
];

interface Row {
  ref: string;
  title: string;
  comp: "C1" | "C2" | "C3" | "C4";
  ptba: string;
  status: StatusKey;
  statusLabel: string;
  /** Index 0..5 du jalon courant (TDR, Revue UGP, ANO BM, DAO, Évaluation, Attribution) */
  stage: number;
  stageState?: "current" | "warn" | "err";
  lastWho: string;
  lastAct: string;
  when: string;
  ai?: boolean;
  amount: string;
  description: string;
}

function statusFromInitiative(it: Initiative): { key: StatusKey; label: string; stageState?: "current" | "warn" | "err" } {
  const label = it.status.label;
  if (it.ai) return { key: "ai", label, stageState: "current" };
  if (label.toLowerCase().includes("clarif")) return { key: "err", label, stageState: "warn" };
  if (label.toLowerCase().includes("attente") || label.toLowerCase().includes("revue")) {
    return { key: "warn", label, stageState: "current" };
  }
  if (label.toLowerCase().includes("obtenu") || label.toLowerCase().includes("attribu")) {
    return { key: "ok", label };
  }
  if (label.toLowerCase().includes("brouillon") || label.toLowerCase().includes("init")) {
    return { key: "neutral", label };
  }
  return { key: "info", label, stageState: "current" };
}

function buildRows(initiatives: Initiative[]): Row[] {
  return initiatives.map((it) => {
    const s = statusFromInitiative(it);
    const stage = Math.max(0, Math.min(5, it.pipeline.current - 1));
    return {
      ref: it.ref,
      title: it.title,
      comp: it.component.code,
      ptba: it.ptbaCode,
      status: s.key,
      statusLabel: s.label,
      stage,
      stageState: s.stageState,
      lastWho: it.lastActor,
      lastAct: "a publié une mise à jour",
      when: it.lastAction,
      ai: it.ai,
      amount: it.amount,
      description: it.description,
    };
  });
}

interface DashboardClientProps {
  initiatives: Initiative[];
  config?: DashboardProfileConfig;
}

const DEFAULT_CONFIG: DashboardProfileConfig = {
  greeting: "Bonjour Marie — Ministère du Numérique",
  cycleLabel: "2026-Q2",
  syncLabel: "08 mai 2026 · 09:42 UTC+1",
  primaryAction: { label: "Proposer une initiative", href: "/tdr" },
  tableTitle: "Initiatives en cours",
};

export function DashboardClient({ initiatives, config }: DashboardClientProps) {
  const cfg = { ...DEFAULT_CONFIG, ...(config ?? {}) };
  const kpis = config?.kpis ?? DEFAULT_KPIS;
  const rows = useMemo(() => buildRows(initiatives), [initiatives]);
  const [activeFilters, setActiveFilters] = useState<string[]>([
    "Statut : En cours",
    "Statut : ANO en attente",
    "Période : 2026-Q2",
  ]);
  const [drawerRef, setDrawerRef] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDrawerRef(null);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const drawerRow = drawerRef ? rows.find((r) => r.ref === drawerRef) : null;
  const drawerInit = drawerRef ? initiatives.find((i) => i.ref === drawerRef) : null;

  const removeFilter = (label: string) => {
    setActiveFilters((cur) => cur.filter((f) => f !== label));
  };

  return (
    <>
      {/* Page header */}
      <div className={styles.ph}>
        <div className={styles.phLeft}>
          <h1>{cfg.greeting}</h1>
          <div className={styles.phMeta}>
            <span className={styles.phDot} aria-hidden />
            <span>
              Synchronisé · <span className="ptn-mono">{cfg.syncLabel}</span>
            </span>
            <span>·</span>
            <span>
              Cycle PTBA en cours : <span className="ptn-mono">{cfg.cycleLabel}</span>
            </span>
          </div>
        </div>
        <div className={styles.phActions}>
          <button type="button" className={styles.btnSecondary}>
            <Download size={16} aria-hidden />
            Exporter
          </button>
          {cfg.primaryAction && (
            <Link href={cfg.primaryAction.href} className={styles.btnPrimary}>
              <Add size={16} aria-hidden />
              <span>{cfg.primaryAction.label}</span>
              <ArrowRight size={16} aria-hidden />
            </Link>
          )}
        </div>
      </div>

      {/* KPIs */}
      <div className={styles.kpis}>
        {kpis.map((k, i) => (
          <div key={i} className={styles.kpi}>
            <div className={styles.kpiK}>
              {k.icon}
              {k.label}
            </div>
            <div className={styles.kpiV}>{k.value}</div>
            <div className={styles.kpiExtra}>{k.extra}</div>
          </div>
        ))}
      </div>

      {/* DataTable */}
      <section className={styles.tableWrap}>
        <div className={styles.tbar}>
          <h3>
            {cfg.tableTitle} <span className={`${styles.num} ptn-mono`}>({rows.length})</span>
          </h3>
          <div className={styles.tbarSep} />

          <div className={styles.cdsFilter}>
            <MultiSelect
              id="dd-statut"
              titleText=""
              label="Statut"
              size="sm"
              hideLabel
              items={STATUT_ITEMS}
              itemToString={(i) => (i ? i.text : "")}
              initialSelectedItems={STATUT_ITEMS.filter((i) => i.id === "encours" || i.id === "ano-attente")}
            />
          </div>

          <div className={styles.cdsFilter}>
            <MultiSelect
              id="dd-comp"
              titleText=""
              label="Composante"
              size="sm"
              hideLabel
              items={COMP_ITEMS}
              itemToString={(i) => (i ? i.text : "")}
            />
          </div>

          <div className={styles.cdsFilter}>
            <Dropdown
              id="dd-per"
              titleText=""
              label="Période"
              size="sm"
              hideLabel
              items={PERIODE_ITEMS}
              itemToString={(i) => (i ? i.text : "")}
              initialSelectedItem={PERIODE_ITEMS[1]}
            />
          </div>

          <div className={styles.tbarSpacer} />

          <div className={styles.tbarSearch}>
            <Search size={14} aria-hidden />
            <input type="search" placeholder="Rechercher dans les initiatives…" />
          </div>
          <button type="button" className={styles.icBtn} aria-label="Paramètres colonnes">
            <Settings size={16} aria-hidden />
          </button>
          <button type="button" className={styles.icBtn} aria-label="Télécharger CSV">
            <Download size={16} aria-hidden />
          </button>
        </div>

        {activeFilters.length > 0 && (
          <div className={styles.chipsRow}>
            <span className={styles.chipsLabel}>Filtres actifs</span>
            {activeFilters.map((f) => (
              <span key={f} className={styles.chip}>
                {f}
                <button type="button" className={styles.chipX} onClick={() => removeFilter(f)} aria-label={`Retirer ${f}`}>
                  ×
                </button>
              </span>
            ))}
            <button type="button" className={styles.chipClear} onClick={() => setActiveFilters([])}>
              Effacer tout
            </button>
          </div>
        )}

        <div className={styles.tableScroll}>
          <table className={styles.dt} role="table">
            <colgroup>
              <col style={{ width: "11%" }} />
              <col style={{ width: "24%" }} />
              <col style={{ width: "10%" }} />
              <col style={{ width: "8%" }} />
              <col style={{ width: "14%" }} />
              <col style={{ width: "11%" }} />
              <col style={{ width: "18%" }} />
              <col style={{ width: "4%" }} />
            </colgroup>
            <thead>
              <tr>
                <th>Réf <span className={styles.sort}>↕</span></th>
                <th>Intitulé</th>
                <th>Composante</th>
                <th>Activité PTBA</th>
                <th>Statut</th>
                <th>Étape pipeline</th>
                <th>Dernière action</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr
                  key={r.ref}
                  className={drawerRef === r.ref ? styles.rowSelected : undefined}
                  onClick={() => setDrawerRef(r.ref)}
                >
                  <td><span className={styles.cellRef}>{r.ref}</span></td>
                  <td>
                    <div className={styles.titleCell} title={r.title}>
                      {r.ai && <span className={styles.aiBadge}>✦ IA</span>}
                      {r.title}
                    </div>
                  </td>
                  <td><CompTag code={r.comp} /></td>
                  <td><span className={styles.ptbaCell}>{r.ptba}</span></td>
                  <td><StatusPill k={r.status} label={r.statusLabel} /></td>
                  <td><MiniStepper stage={r.stage} state={r.stageState} /></td>
                  <td>
                    <div className={styles.lastAction} title={`${r.lastWho} ${r.lastAct} · ${r.when}`}>
                      <span className={styles.lastWho}>{r.lastWho}</span> {r.lastAct}
                      <span className={styles.lastWhen}>{r.when}</span>
                    </div>
                  </td>
                  <td>
                    <button
                      type="button"
                      className={styles.kebab}
                      aria-label="Actions"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <OverflowMenuVertical size={16} aria-hidden />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className={styles.pag}>
          <div className={styles.pl}>
            <span>Lignes par page :</span>
            <div className={styles.cdsPageSize}>
              <Dropdown
                id="page-size"
                titleText=""
                label="10"
                size="sm"
                hideLabel
                items={PAGE_SIZE_ITEMS}
                itemToString={(i) => (i ? i.text : "")}
                initialSelectedItem={PAGE_SIZE_ITEMS[0]}
              />
            </div>
            <span className="ptn-mono" style={{ color: "var(--cds-text-helper)" }}>
              | 1–{Math.min(10, rows.length)} sur {rows.length}
            </span>
          </div>
          <div className={styles.pr}>
            <button type="button" className={styles.pbtn} disabled aria-label="Page précédente">
              <ChevronLeft size={14} aria-hidden />
            </button>
            <span className="ptn-mono" style={{ color: "var(--cds-text-secondary)" }}>Page</span>
            <input className={styles.pageInput} defaultValue="1" />
            <span className="ptn-mono" style={{ color: "var(--cds-text-helper)" }}>/ {Math.max(1, Math.ceil(rows.length / 10))}</span>
            <button type="button" className={styles.pbtn} aria-label="Page suivante">
              <ChevronRight size={14} aria-hidden />
            </button>
          </div>
        </div>
      </section>

      {/* Drawer */}
      <div
        className={`${styles.drawerBackdrop} ${drawerRef ? styles.drawerBackdropOpen : ""}`}
        onClick={() => setDrawerRef(null)}
      />
      <aside className={`${styles.drawer} ${drawerRef ? styles.drawerOpen : ""}`} aria-label="Aperçu initiative">
        <div className={styles.drawerHead}>
          <div className={styles.drawerMeta}>
            <div className={styles.drawerRef}>{drawerRow?.ref ?? "PTN-2026-XXX"}</div>
            <h2 className={styles.drawerTitle}>{drawerRow?.title ?? "—"}</h2>
          </div>
          <button type="button" className={styles.drawerClose} onClick={() => setDrawerRef(null)} aria-label="Fermer">
            <Close size={16} aria-hidden />
          </button>
        </div>
        <div className={styles.drawerBody}>
          <div className={styles.drawerRow}>
            <div className={styles.drawerK}>Composante</div>
            <div className={styles.drawerV}>{drawerRow ? COMP_FULL[drawerRow.comp] : "—"}</div>
          </div>
          <div className={styles.drawerRow}>
            <div className={styles.drawerK}>Activité PTBA</div>
            <div className={`${styles.drawerV} ptn-mono`}>{drawerRow?.ptba ?? "—"}</div>
          </div>
          <div className={styles.drawerRow}>
            <div className={styles.drawerK}>Statut</div>
            <div className={styles.drawerV}>
              {drawerRow && <StatusPill k={drawerRow.status} label={drawerRow.statusLabel} />}
            </div>
          </div>
          <div className={styles.drawerRow}>
            <div className={styles.drawerK}>Étape pipeline</div>
            <div className={styles.drawerV}>
              {drawerRow ? `${PIPELINE_STAGES[drawerRow.stage]} · ${drawerRow.stage + 1}/6` : "—"}
            </div>
          </div>
          <div className={styles.drawerRow}>
            <div className={styles.drawerK}>Budget</div>
            <div className={`${styles.drawerV} ptn-mono`}>{drawerRow?.amount ?? "—"}</div>
          </div>
          <div className={styles.drawerRow}>
            <div className={styles.drawerK}>Bailleur</div>
            <div className={styles.drawerV}>{drawerInit?.donor === "AFD" ? "AFD" : drawerInit?.donor === "BM+AFD" ? "BM + AFD" : "Banque mondiale (IDA)"}</div>
          </div>
          <div className={styles.drawerRow}>
            <div className={styles.drawerK}>Référent</div>
            <div className={styles.drawerV}>{drawerInit?.team[0]?.name ?? "M. Tshibanda"} · {drawerInit?.team[0]?.org ?? "UGP"}</div>
          </div>
          <div className={styles.drawerRow}>
            <div className={styles.drawerK}>Description</div>
            <div className={styles.drawerV} style={{ lineHeight: 1.5 }}>{drawerRow?.description ?? "—"}</div>
          </div>
        </div>
        <div className={styles.drawerFoot}>
          <button type="button" onClick={() => setDrawerRef(null)}>Fermer</button>
          {drawerRef && (
            <Link href={`/dashboard/initiatives/${drawerRef}`}>Ouvrir le dossier</Link>
          )}
        </div>
      </aside>
    </>
  );
}

/* ============== Sub-components ============== */

function CompTag({ code }: { code: "C1" | "C2" | "C3" | "C4" }) {
  const cls = {
    C1: styles.tagC1,
    C2: styles.tagC2,
    C3: styles.tagC3,
    C4: styles.tagC4,
  }[code];
  return <span className={`${styles.tag} ${cls}`}>{COMP_LABEL[code]}</span>;
}

function StatusPill({ k, label }: { k: StatusKey; label: string }) {
  const cls = {
    info: styles.statusInfo,
    warn: styles.statusWarn,
    ok: styles.statusOk,
    err: styles.statusErr,
    neutral: styles.statusNeutral,
    ai: styles.statusAi,
  }[k];
  return (
    <span className={`${styles.status} ${cls}`}>
      <span className={styles.statusDot} />
      {label}
    </span>
  );
}

function MiniStepper({ stage, state }: { stage: number; state?: "current" | "warn" | "err" }) {
  const segs = Array.from({ length: 6 }, (_, i) => {
    if (i < stage) return styles.segDone;
    if (i === stage) {
      if (state === "warn") return styles.segWarn;
      if (state === "err") return styles.segErr;
      return styles.segCurrent;
    }
    return "";
  });
  return (
    <>
      <div className={styles.miniStepper}>
        {segs.map((c, i) => (
          <div key={i} className={`${styles.seg} ${c}`} />
        ))}
      </div>
      <div className={styles.miniStepperMeta}>
        {PIPELINE_STAGES[stage]} · {stage + 1}/6
      </div>
    </>
  );
}

