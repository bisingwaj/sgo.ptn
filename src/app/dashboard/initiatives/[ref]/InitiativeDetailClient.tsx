"use client";

import Link from "next/link";
import { Shell } from "@/components/shell/Shell";
import { PageHeader } from "@/components/ui/PageHeader";
import { Tag } from "@/components/ui/Tag";
import { Card } from "@/components/ui/Card";
import { Tabs } from "@/components/ui/Tabs";
import type { Initiative } from "@/lib/mock-initiatives";
import {
  CheckmarkFilled,
  CheckmarkOutline,
  Document,
  Idea,
  Send,
  Time,
  WatsonHealthMagnify,
  Edit,
  Download,
  Share,
} from "@carbon/icons-react";
import styles from "./detail.module.scss";

interface Props {
  init: Initiative;
}

export function InitiativeDetailClient({ init }: Props) {
  return (
    <Shell
      crumbs={[
        { label: "Accueil", href: "/dashboard" },
        { label: "Mes initiatives", href: "/dashboard/initiatives" },
        { label: init.ref },
      ]}
    >
      <PageHeader
        eyebrow={
          <span style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
            <span className="ptn-mono">{init.ref}</span>
            <span>·</span>
            <Tag tone={init.component.tone} size="sm">
              {init.component.code} · {init.component.short}
            </Tag>
            <span>·</span>
            <span className="ptn-mono">PTBA {init.ptbaCode}</span>
          </span>
        }
        title={init.title}
        subtitle={init.description}
        meta={
          <>
            <Tag tone={init.status.tone}>{init.status.label}</Tag>
            <span>·</span>
            <span className="ptn-mono">{init.amount}</span>
            <span>·</span>
            <span>
              Risque E&S :{" "}
              <strong style={{ color: init.riskES === "Substantiel" ? "var(--ptn-status-danger)" : "var(--cds-text-primary)" }}>
                {init.riskES}
              </strong>
            </span>
          </>
        }
        actions={
          <>
            <button type="button" className={styles.btnSecondary}>
              <Share size={16} aria-hidden /> Partager
            </button>
            <button type="button" className={styles.btnSecondary}>
              <Download size={16} aria-hidden /> Exporter
            </button>
            <button type="button" className={styles.btnPrimary}>
              <Edit size={16} aria-hidden /> Modifier
            </button>
          </>
        }
      />

      <Tabs
        tabs={[
          {
            key: "overview",
            label: "Vue d'ensemble",
            content: <OverviewTab init={init} />,
          },
          {
            key: "documents",
            label: "Documents",
            count: init.documents.length,
            content: <DocumentsTab init={init} />,
          },
          {
            key: "pipeline",
            label: "Pipeline",
            content: <PipelineTab init={init} />,
          },
          {
            key: "comments",
            label: "Commentaires",
            count: 4,
            content: <CommentsTab init={init} />,
          },
          {
            key: "audit",
            label: "Audit trail",
            count: 12,
            content: <AuditTab init={init} />,
          },
        ]}
      />
    </Shell>
  );
}

function OverviewTab({ init }: { init: Initiative }) {
  return (
    <div className={styles.overviewGrid}>
      {/* Timeline (large) */}
      <Card title="Pipeline · 7 étapes" badge={`Étape ${init.pipeline.current} / ${init.pipeline.total}`}>
        <ol className={styles.timeline}>
          {init.timeline.map((stage, i) => (
            <li
              key={i}
              className={`${styles.timelineItem} ${styles[`timeline_${stage.status}`]}`}
            >
              <span className={styles.timelineDot}>
                {stage.status === "done" ? (
                  <CheckmarkFilled size={14} aria-hidden />
                ) : stage.status === "current" ? (
                  <span className={styles.timelinePulse} />
                ) : (
                  <CheckmarkOutline size={14} aria-hidden />
                )}
              </span>
              <div className={styles.timelineContent}>
                <div className={styles.timelineStage}>{stage.stage}</div>
                {stage.date && (
                  <div className={styles.timelineMeta}>
                    <span className="ptn-mono">{stage.date}</span>
                    {stage.actor && <> · {stage.actor}</>}
                  </div>
                )}
              </div>
            </li>
          ))}
        </ol>
      </Card>

      {/* Side info */}
      <div className={styles.sideStack}>
        <Card title="Action requise">
          <div className={styles.actionRequired}>
            <div className={styles.actionIcon}>
              <Time size={28} aria-hidden />
            </div>
            <div>
              <strong>{init.timeline.find((s) => s.status === "current")?.stage}</strong>
              <p>
                Délai SLA : <strong>14 jours</strong> · Délai écoulé :{" "}
                <span className="ptn-mono">J−4</span>
              </p>
              <button type="button" className={styles.actionBtn}>
                <Send size={14} aria-hidden /> Relancer le bailleur
              </button>
            </div>
          </div>
        </Card>

        <Card title="Acteurs impliqués" badge={String(init.team.length)}>
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
                    {m.role} ·{" "}
                    <span className="ptn-mono" style={{ color: "var(--cds-text-helper)" }}>
                      {m.org}
                    </span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </Card>

        <Card title="Indicateurs clés">
          <dl className={styles.kpiList}>
            <div>
              <dt>Montant total</dt>
              <dd className="ptn-mono">{init.amount}</dd>
            </div>
            <div>
              <dt>IDA</dt>
              <dd className="ptn-mono">{init.donors.ida ?? 0} M USD</dd>
            </div>
            <div>
              <dt>AFD</dt>
              <dd className="ptn-mono">{init.donors.afd ?? 0} M USD</dd>
            </div>
            <div>
              <dt>Province</dt>
              <dd>{init.province ?? "Multi-provinces"}</dd>
            </div>
            <div>
              <dt>Risque E&S</dt>
              <dd>{init.riskES}</dd>
            </div>
          </dl>
        </Card>
      </div>
    </div>
  );
}

function DocumentsTab({ init }: { init: Initiative }) {
  return (
    <Card title="Documents attachés" badge={String(init.documents.length)} noPadding>
      <ul className={styles.docList}>
        {init.documents.length === 0 && (
          <li className={styles.emptyRow}>
            Aucun document attaché. <Link href="#">Ajouter le premier document</Link>
          </li>
        )}
        {init.documents.map((d, i) => (
          <li key={i} className={styles.docItem}>
            <span className={styles.docIcon}>
              <Document size={20} aria-hidden />
            </span>
            <div className={styles.docMeta}>
              <strong>{d.name}</strong>
              <span className="ptn-mono">
                {d.type} · {d.size} · {d.date}
              </span>
            </div>
            <Tag
              tone={
                d.status === "signed" ? "green" : d.status === "review" ? "yellow" : "gray"
              }
              size="sm"
            >
              {d.status === "signed" ? "Signé" : d.status === "review" ? "En revue" : "Brouillon"}
            </Tag>
            <button type="button" className={styles.docAction}>
              <Download size={14} aria-hidden />
            </button>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function PipelineTab({ init }: { init: Initiative }) {
  return (
    <Card title="Pipeline détaillé">
      <p style={{ fontSize: 13, color: "var(--cds-text-secondary)", lineHeight: 1.55 }}>
        Vue Kanban des 7 étapes du cycle. Chaque étape liste les acteurs, livrables et SLA.
        Vue détaillée à enrichir en Vague 3 (UGP).
      </p>
      <div className={styles.kanban}>
        {init.timeline.map((stage, i) => (
          <div
            key={i}
            className={`${styles.kanbanCol} ${styles[`kanban_${stage.status}`]}`}
          >
            <header>
              <span className={`${styles.kanbanNum} ptn-mono`}>{String(i + 1).padStart(2, "0")}</span>
              <strong>{stage.stage}</strong>
            </header>
            <div className={styles.kanbanBody}>
              {stage.date && <div className="ptn-mono">{stage.date}</div>}
              {stage.actor && <div>{stage.actor}</div>}
              {stage.status === "future" && <div>—</div>}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function CommentsTab({ init }: { init: Initiative }) {
  const comments = [
    {
      who: "S. Mbuyi",
      org: "UGP-PTN",
      tone: "blue" as const,
      time: "il y a 2h",
      text: "Le TDR est globalement aligné. Préciser SVP les profils-clés à l'étape 3 et confirmer la grille SFQC 80/20.",
    },
    {
      who: "L. Walker",
      org: "BM",
      tone: "purple" as const,
      time: "hier 14:30",
      text: "Demande de clarification sur le périmètre de l'AMOA — préciser exclusion des activités d'enrôlement de masse (relèvent de l'identité civile, pas du projet PTN).",
    },
    {
      who: "J. Mukendi",
      org: "ANIE",
      tone: "teal" as const,
      time: "hier 11:00",
      text: "Profils-clés ajoutés : Chef de mission, Architecte ID, Juriste protection données, Expert E&S, Expert formation. Validez SVP.",
    },
    {
      who: "M. Kabongo",
      org: "ANIE",
      tone: "teal" as const,
      time: "il y a 2 jours",
      text: "TDR initial soumis pour arbitrage UGP. Budget 8,7 M USD aligné sur les barèmes UGP.",
    },
  ];

  void init;

  return (
    <div className={styles.commentsWrap}>
      <Card title="Fil de discussion" badge={String(comments.length)}>
        <div className={styles.commentsList}>
          {comments.map((c, i) => (
            <div key={i} className={styles.comment}>
              <div className={styles.commentHead}>
                <span className={styles.teamAvatar}>
                  {c.who.split(/\s+/).map((w) => w[0]).slice(0, 2).join("")}
                </span>
                <div className={styles.commentMeta}>
                  <strong>{c.who}</strong>
                  <Tag tone={c.tone} size="sm">
                    {c.org}
                  </Tag>
                  <span className={`${styles.commentTime} ptn-mono`}>{c.time}</span>
                </div>
              </div>
              <p className={styles.commentText}>{c.text}</p>
            </div>
          ))}
        </div>
        <div className={styles.commentInput}>
          <textarea
            placeholder="Écrire un commentaire (utilisez @ pour mentionner)…"
            rows={3}
            className={styles.commentTextarea}
          />
          <div className={styles.commentActions}>
            <label className={styles.commentToggle}>
              <input type="checkbox" />
              <span>Visible Banque mondiale</span>
            </label>
            <button type="button" className={styles.commentSend}>
              <Send size={14} aria-hidden /> Publier
            </button>
          </div>
        </div>
      </Card>
    </div>
  );
}

function AuditTab({ init }: { init: Initiative }) {
  void init;
  const events = [
    { ts: "2026-05-08T09:42:00Z", actor: "S. Mbuyi", action: "Initiative consultée", target: init.ref, hash: "0xa12c4f…b893" },
    { ts: "2026-05-08T09:30:14Z", actor: "L. Walker", action: "ANO mis en attente clarif.", target: init.ref, hash: "0xb44d20…2a91" },
    { ts: "2026-05-07T17:23:08Z", actor: "Système (IA)", action: "Brouillon TDR généré", target: "TDR_v2.pdf", hash: "0xc9ff10…7e02" },
    { ts: "2026-05-07T14:08:00Z", actor: "J. Mukendi", action: "Profils-clés ajoutés", target: "TDR_v2.pdf", hash: "0xd4a8e2…1f33" },
    { ts: "2026-04-21T11:00:00Z", actor: "M. Kabongo", action: "TDR soumis à UGP", target: "TDR_v1.pdf", hash: "0xe112ab…9c7d" },
  ];
  return (
    <Card title="Audit trail · registre immuable" badge="100 % intègre" noPadding>
      <table className={styles.auditTable}>
        <thead>
          <tr>
            <th>Timestamp UTC</th>
            <th>Acteur</th>
            <th>Action</th>
            <th>Cible</th>
            <th>Hash</th>
          </tr>
        </thead>
        <tbody>
          {events.map((e, i) => (
            <tr key={i}>
              <td className="ptn-mono">{e.ts.replace("T", " ").replace("Z", "")}</td>
              <td>{e.actor}</td>
              <td>{e.action}</td>
              <td className="ptn-mono">{e.target}</td>
              <td className="ptn-mono">
                <WatsonHealthMagnify size={12} aria-hidden style={{ verticalAlign: "middle", marginRight: 4 }} />
                {e.hash}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}
