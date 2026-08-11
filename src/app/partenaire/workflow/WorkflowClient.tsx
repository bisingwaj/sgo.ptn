"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  CheckmarkFilled,
  CheckmarkOutline,
  WarningAltFilled,
  ArrowRight,
  Search,
  Network_3,
  Time,
} from "@carbon/icons-react";
import styles from "./workflow.module.scss";

export interface WorkflowStage {
  num: string;
  label: string;
  actor: string;
  actorOrg: "Partenaire" | "UGP" | "Bailleur";
  state: "done" | "current" | "future" | "warn";
  date?: string;
  description: string;
}

export interface WorkflowProposition {
  ref: string;
  title: string;
  budget: string;
  status: { label: string; tone: "blue" | "yellow" | "green" | "gray" };
  currentStage: number;
  stageLabel: string;
  delay: string;
  stages: WorkflowStage[];
}

interface WorkflowClientProps {
  propositions: WorkflowProposition[];
}

function MiniStepper({ current }: { current: number }) {
  return (
    <div className={styles.miniSteps}>
      {Array.from({ length: 6 }).map((_, i) => {
        const cls =
          i < current - 1
            ? styles.miniSegDone
            : i === current - 1
              ? styles.miniSegCurrent
              : "";
        return <div key={i} className={`${styles.miniSeg} ${cls}`} />;
      })}
    </div>
  );
}

function ActorTag({ actor }: { actor: WorkflowStage["actorOrg"] }) {
  const cls =
    actor === "Partenaire"
      ? styles.actorPart
      : actor === "UGP"
        ? styles.actorUgp
        : styles.actorBailleur;
  return <span className={`${styles.actorTag} ${cls}`}>{actor}</span>;
}

export function WorkflowClient({ propositions }: WorkflowClientProps) {
  const [activeRef, setActiveRef] = useState<string>(propositions[0]?.ref ?? "");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return propositions;
    return propositions.filter(
      (p) =>
        p.ref.toLowerCase().includes(q) ||
        p.title.toLowerCase().includes(q),
    );
  }, [propositions, query]);

  const active = propositions.find((p) => p.ref === activeRef) ?? propositions[0];

  return (
    <div className={styles.layout}>
      {/* ============ Liste des propositions ============ */}
      <div className={styles.listCol}>
        <div className={styles.listHead}>
          <h2 className={styles.listH}>
            <Network_3 size={14} aria-hidden /> Mes propositions
            <span className={styles.listCount}>({filtered.length})</span>
          </h2>
        </div>
        <div className={styles.listSearch}>
          <Search size={12} aria-hidden />
          <input
            type="search"
            placeholder="Rechercher une proposition…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Rechercher une proposition"
          />
        </div>
        <div className={styles.listScroll}>
          {filtered.length === 0 ? (
            <div className={styles.empty}>Aucune proposition trouvée</div>
          ) : (
            filtered.map((p) => {
              const tagCls =
                p.status.tone === "blue"
                  ? styles.statusBlue
                  : p.status.tone === "yellow"
                    ? styles.statusYellow
                    : p.status.tone === "green"
                      ? styles.statusGreen
                      : styles.statusGray;
              return (
                <button
                  key={p.ref}
                  type="button"
                  className={`${styles.itemBtn} ${activeRef === p.ref ? styles.itemActive : ""}`}
                  onClick={() => setActiveRef(p.ref)}
                  aria-pressed={activeRef === p.ref}
                >
                  <div className={styles.itemHead}>
                    <span className={styles.itemRef}>{p.ref}</span>
                    <span className={styles.itemBudget}>{p.budget}</span>
                  </div>
                  <div className={styles.itemTitle}>{p.title}</div>
                  <MiniStepper current={p.currentStage} />
                  <div className={styles.miniMeta}>
                    <span className={styles.miniLabel}>
                      {p.stageLabel} · {p.currentStage}/6
                    </span>
                    <span className={`${styles.statusTag} ${tagCls}`}>{p.status.label}</span>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* ============ Détail workflow ============ */}
      <div className={styles.detailCol}>
        {active && (
          <>
            <div className={styles.detailHead}>
              <div className={styles.detailMeta}>
                <div className={styles.detailEyebrow}>WORKFLOW MULTI-ACTEURS</div>
                <h3 className={styles.detailTitle}>{active.title}</h3>
                <div className={styles.detailSubtitle}>
                  {active.ref} · {active.budget} · étape {active.currentStage}/6
                </div>
              </div>
              <Link
                href={`/partenaire/propositions/${active.ref}`}
                className={styles.btnPrimary}
              >
                Ouvrir le dossier <ArrowRight size={14} aria-hidden />
              </Link>
            </div>

            <div className={styles.kpiStrip}>
              <div className={styles.kpi}>
                <div className={styles.kpiK}>Étape actuelle</div>
                <div className={styles.kpiV}>{active.stageLabel}</div>
              </div>
              <div className={styles.kpi}>
                <div className={styles.kpiK}>Délai indicatif</div>
                <div className={`${styles.kpiV} ${styles.kpiVWarn}`}>
                  <Time size={14} aria-hidden style={{ verticalAlign: "middle", marginRight: 4 }} />
                  {active.delay}
                </div>
              </div>
              <div className={styles.kpi}>
                <div className={styles.kpiK}>Étapes franchies</div>
                <div className={`${styles.kpiV} ${styles.kpiVOk}`}>
                  {active.stages.filter((s) => s.state === "done").length} / {active.stages.length}
                </div>
              </div>
            </div>

            <ol className={styles.timeline}>
              {active.stages.map((s) => (
                <li
                  key={s.num}
                  className={`${styles.stage} ${s.state === "done" ? styles.stageDone : ""}`}
                >
                  <span
                    className={`${styles.dot} ${
                      s.state === "done"
                        ? styles.dotDone
                        : s.state === "current"
                          ? styles.dotCurrent
                          : s.state === "warn"
                            ? styles.dotWarn
                            : ""
                    }`}
                    aria-hidden
                  >
                    {s.state === "done" ? (
                      <CheckmarkFilled size={14} />
                    ) : s.state === "warn" ? (
                      <WarningAltFilled size={14} />
                    ) : s.state === "current" ? (
                      <span
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: "50%",
                          background: "var(--ptn-accent)",
                        }}
                      />
                    ) : (
                      <CheckmarkOutline size={14} />
                    )}
                  </span>
                  <div className={styles.body}>
                    <div className={styles.head}>
                      <span className={styles.num}>{s.num}</span>
                      <span className={styles.label}>{s.label}</span>
                      <ActorTag actor={s.actorOrg} />
                      {s.date && <span className={styles.date}>{s.date}</span>}
                    </div>
                    <p className={styles.description}>{s.description}</p>
                    <div className={styles.actor}>Acteur · {s.actor}</div>
                  </div>
                </li>
              ))}
            </ol>
          </>
        )}
      </div>
    </div>
  );
}
