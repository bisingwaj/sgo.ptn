"use client";

/**
 * Inbox ANO unifiée — UGP-PTN.
 *
 * Affiche tous les ANO en cours (BM + AFD), triés par délai SLA.
 * Permet de relancer le bailleur, voir les clarifications, valider.
 */

import { useState } from "react";
import { Shell } from "@/components/shell/Shell";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Tag } from "@/components/ui/Tag";
import { Drawer } from "@/components/ui/Drawer";
import {
  TaskApproved,
  Send,
  Time,
  WarningAltFilled,
  ArrowRight,
  Document,
  Filter,
} from "@carbon/icons-react";
import styles from "./ano.module.scss";

type AnoStatus = "submitted" | "review" | "clarif" | "delivered" | "rejected";
type Donor = "BM" | "AFD" | "BM+AFD";

interface AnoItem {
  ref: string;
  title: string;
  type: "TDR" | "DAO" | "PV éval." | "Contrat" | "Avenant";
  donor: Donor;
  status: AnoStatus;
  daysLeft: number;
  slaDays: number;
  amount: string;
  component: string;
  componentTone: "blue" | "purple" | "teal" | "green";
  submittedDate: string;
  description: string;
}

const ITEMS: AnoItem[] = [
  {
    ref: "PTN-2026-019",
    title: "TDR · Plateforme nationale d'identité numérique",
    type: "TDR",
    donor: "BM",
    status: "review",
    daysLeft: 4,
    slaDays: 14,
    amount: "8,7 M USD",
    component: "C2",
    componentTone: "purple",
    submittedDate: "2026-04-21",
    description: "AMOA — services consultants SFQC pour ANIE. Risque E&S Substantiel.",
  },
  {
    ref: "PTN-2026-021",
    title: "TDR · Backbone fibre Goma-Bukavu",
    type: "TDR",
    donor: "BM+AFD",
    status: "review",
    daysLeft: 9,
    slaDays: 21,
    amount: "12,4 M USD",
    component: "C1",
    componentTone: "blue",
    submittedDate: "2026-04-28",
    description: "Travaux 180 km fibre · zones partiellement minées.",
  },
  {
    ref: "PTN-2026-031",
    title: "TDR · Formation EESU 200 enseignants",
    type: "TDR",
    donor: "AFD",
    status: "clarif",
    daysLeft: 2,
    slaDays: 21,
    amount: "1,9 M USD",
    component: "C3",
    componentTone: "teal",
    submittedDate: "2026-04-12",
    description: "Demande clarif. AFD — préciser modalités SBP et critères d'éligibilité enseignants.",
  },
  {
    ref: "PTN-2026-009",
    title: "Contrat · SOC national cybersécurité",
    type: "Contrat",
    donor: "BM",
    status: "delivered",
    daysLeft: 0,
    slaDays: 14,
    amount: "14,2 M USD",
    component: "C2",
    componentTone: "purple",
    submittedDate: "2026-04-15",
    description: "ANO délivré — signature contrat à organiser.",
  },
  {
    ref: "PTN-2026-014",
    title: "TDR · Étude PGES Centre données Tier III",
    type: "TDR",
    donor: "AFD",
    status: "review",
    daysLeft: 18,
    slaDays: 21,
    amount: "3,2 M USD",
    component: "C2",
    componentTone: "purple",
    submittedDate: "2026-04-22",
    description: "EIES + PGES + études préalables.",
  },
  {
    ref: "PTN-2026-027",
    title: "TDR · Hubs technologiques Lubumbashi & Goma",
    type: "TDR",
    donor: "BM",
    status: "submitted",
    daysLeft: 12,
    slaDays: 14,
    amount: "5,6 M USD",
    component: "C3",
    componentTone: "teal",
    submittedDate: "2026-05-06",
    description: "Composante 3.2 · sous-projets innovation.",
  },
  {
    ref: "PTN-2026-018",
    title: "PV éval. · Marché direct géotech",
    type: "PV éval.",
    donor: "BM",
    status: "rejected",
    daysLeft: 0,
    slaDays: 14,
    amount: "0,4 M USD",
    component: "C1",
    componentTone: "blue",
    submittedDate: "2026-04-30",
    description: "Refus motivé — justification gré à gré insuffisante. Reprendre AOI.",
  },
  {
    ref: "PTN-2026-040",
    title: "DAO · Modernisation routes numériques",
    type: "DAO",
    donor: "BM",
    status: "review",
    daysLeft: 11,
    slaDays: 14,
    amount: "22,1 M USD",
    component: "C1",
    componentTone: "blue",
    submittedDate: "2026-05-04",
    description: "DAO complet · 4 lots techniques.",
  },
  {
    ref: "PTN-2026-033",
    title: "TDR · Atelier ID4Africa Abidjan",
    type: "TDR",
    donor: "BM",
    status: "submitted",
    daysLeft: 13,
    slaDays: 14,
    amount: "0,2 M USD",
    component: "C4",
    componentTone: "green",
    submittedDate: "2026-05-07",
    description: "Atelier de positionnement RDC en marge sommet ID4Africa.",
  },
];

const STATUS_LABELS: Record<AnoStatus, { label: string; tone: "blue" | "yellow" | "red" | "green" }> = {
  submitted: { label: "Soumis", tone: "blue" },
  review: { label: "En revue", tone: "yellow" },
  clarif: { label: "Clarifications", tone: "red" },
  delivered: { label: "ANO délivré", tone: "green" },
  rejected: { label: "Refusé motivé", tone: "red" },
};

export default function AnoPage() {
  const [filter, setFilter] = useState<AnoStatus | "all" | "urgent">("all");
  const [donorFilter, setDonorFilter] = useState<Donor | "all">("all");
  const [selected, setSelected] = useState<AnoItem | null>(null);

  const filtered = ITEMS.filter((it) => {
    if (filter === "urgent" && it.daysLeft > 7) return false;
    if (filter !== "all" && filter !== "urgent" && it.status !== filter) return false;
    if (donorFilter !== "all" && it.donor !== donorFilter) return false;
    return true;
  }).sort((a, b) => a.daysLeft - b.daysLeft);

  const stats = {
    total: ITEMS.length,
    urgent: ITEMS.filter((i) => i.daysLeft <= 7 && (i.status === "review" || i.status === "submitted" || i.status === "clarif")).length,
    delivered: ITEMS.filter((i) => i.status === "delivered").length,
    pending: ITEMS.filter((i) => i.status === "submitted" || i.status === "review").length,
  };

  return (
    <Shell crumbs={[{ label: "Accueil", href: "/cockpit" }, { label: "Inbox ANO" }]}>
      <PageHeader
        eyebrow="UGP · WORKFLOW ANO"
        title="Inbox ANO unifiée"
        subtitle={`${stats.total} dossiers — Banque mondiale (SLA 14 j) + AFD (SLA 21 j).`}
        meta={
          <>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <WarningAltFilled size={14} aria-hidden style={{ color: "var(--ptn-status-danger)" }} />
              <strong>{stats.urgent}</strong> urgents (≤ 7 jours)
            </span>
            <span>·</span>
            <span>
              <strong>{stats.pending}</strong> en attente · <strong>{stats.delivered}</strong> délivrés
            </span>
          </>
        }
      />

      <div className={styles.toolbar}>
        <div className={styles.pills}>
          <span className={styles.pillLabel}>
            <Filter size={12} aria-hidden /> Statut
          </span>
          {(["all", "urgent", "submitted", "review", "clarif", "delivered", "rejected"] as const).map((s) => {
            const label =
              s === "all"
                ? "Tous"
                : s === "urgent"
                  ? "Urgents"
                  : STATUS_LABELS[s as AnoStatus].label;
            return (
              <button
                key={s}
                type="button"
                onClick={() => setFilter(s)}
                className={`${styles.pill} ${filter === s ? styles.pillActive : ""}`}
              >
                {label}
              </button>
            );
          })}
        </div>
        <div className={styles.pills}>
          <span className={styles.pillLabel}>Bailleur</span>
          {(["all", "BM", "AFD", "BM+AFD"] as const).map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDonorFilter(d)}
              className={`${styles.pill} ${donorFilter === d ? styles.pillActive : ""}`}
            >
              {d === "all" ? "Tous" : d}
            </button>
          ))}
        </div>
      </div>

      <Card noPadding>
        <ul className={styles.list}>
          {filtered.map((it) => {
            const isUrgent = it.daysLeft <= 7 && (it.status === "review" || it.status === "submitted" || it.status === "clarif");
            const status = STATUS_LABELS[it.status];
            return (
              <li
                key={it.ref}
                className={`${styles.item} ${isUrgent ? styles.itemUrgent : ""} ${
                  it.status === "delivered" ? styles.itemDone : ""
                }`}
                onClick={() => setSelected(it)}
              >
                <div className={styles.itemMain}>
                  <div className={styles.itemHead}>
                    <span className="ptn-mono">{it.ref}</span>
                    <Tag tone={it.componentTone} size="sm">
                      {it.component}
                    </Tag>
                    <Tag tone="gray" size="sm">
                      {it.type}
                    </Tag>
                    <Tag
                      tone={it.donor === "BM" ? "blue" : it.donor === "AFD" ? "purple" : "outline"}
                      size="sm"
                    >
                      {it.donor}
                    </Tag>
                  </div>
                  <strong className={styles.itemTitle}>{it.title}</strong>
                  <span className={styles.itemDesc}>{it.description}</span>
                </div>
                <div className={styles.itemMeta}>
                  <Tag tone={status.tone}>{status.label}</Tag>
                  <span className={`${styles.itemAmount} ptn-mono`}>{it.amount}</span>
                  {it.status === "review" || it.status === "submitted" || it.status === "clarif" ? (
                    <span className={`${styles.itemDelay} ${isUrgent ? styles.itemDelayUrgent : ""}`}>
                      <Time size={12} aria-hidden />
                      <span className="ptn-mono">J−{it.daysLeft}</span>
                      <span className={styles.itemSla}>/ SLA {it.slaDays}j</span>
                    </span>
                  ) : (
                    <span className={`${styles.itemDelay} ptn-mono`}>—</span>
                  )}
                  <ArrowRight size={14} aria-hidden className={styles.itemArrow} />
                </div>
              </li>
            );
          })}
        </ul>
      </Card>

      {/* Drawer détail ANO */}
      <Drawer
        open={selected !== null}
        onClose={() => setSelected(null)}
        title={selected?.title ?? ""}
        subtitle={
          selected && (
            <span style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
              <span className="ptn-mono">{selected.ref}</span>
              <Tag tone={STATUS_LABELS[selected.status].tone} size="sm">
                {STATUS_LABELS[selected.status].label}
              </Tag>
            </span>
          )
        }
        footer={
          selected && (
            <>
              {selected.status === "review" && (
                <button type="button" className={styles.btnGhost}>
                  <Send size={14} aria-hidden /> Relancer le bailleur
                </button>
              )}
              {selected.status === "delivered" && (
                <button type="button" className={styles.btnPrimary}>
                  <TaskApproved size={14} aria-hidden /> Lancer la signature
                </button>
              )}
              {selected.status === "clarif" && (
                <button type="button" className={styles.btnPrimary}>
                  <Document size={14} aria-hidden /> Préparer la réponse
                </button>
              )}
            </>
          )
        }
      >
        {selected && <AnoDrawerContent it={selected} />}
      </Drawer>
    </Shell>
  );
}

function AnoDrawerContent({ it }: { it: AnoItem }) {
  return (
    <div className={styles.drawerContent}>
      <p className={styles.drawerDesc}>{it.description}</p>
      <div className={styles.drawerKv}>
        <KvRow label="Référence" value={it.ref} mono />
        <KvRow label="Type" value={it.type} />
        <KvRow label="Bailleur" value={it.donor} />
        <KvRow label="Composante" value={it.component} />
        <KvRow label="Montant" value={it.amount} mono />
        <KvRow label="Soumis le" value={it.submittedDate} mono />
        <KvRow label="SLA" value={`${it.slaDays} jours`} />
      </div>
      <div className={styles.timeline}>
        <h4>Étapes ANO</h4>
        <ul>
          <li className={styles.timelineDone}>
            <span className={styles.timelineDot} />
            <div>
              <strong>Soumission complète</strong>
              <span className="ptn-mono">{it.submittedDate}</span>
            </div>
          </li>
          <li className={styles.timelineDone}>
            <span className={styles.timelineDot} />
            <div>
              <strong>Accusé réception TTL</strong>
              <span>+24h</span>
            </div>
          </li>
          <li
            className={
              it.status === "review" || it.status === "submitted"
                ? styles.timelineCurrent
                : it.status === "delivered"
                  ? styles.timelineDone
                  : styles.timelineCurrent
            }
          >
            <span className={styles.timelineDot} />
            <div>
              <strong>Revue technique bailleur</strong>
              <span>
                {it.status === "review" || it.status === "submitted"
                  ? `En cours · J−${it.daysLeft}`
                  : it.status === "delivered"
                    ? "Conclu favorablement"
                    : it.status === "clarif"
                      ? "Demande de clarifications"
                      : "Conclu défavorablement"}
              </span>
            </div>
          </li>
          <li
            className={
              it.status === "delivered" ? styles.timelineDone : styles.timelineFuture
            }
          >
            <span className={styles.timelineDot} />
            <div>
              <strong>Décision</strong>
              <span>
                {it.status === "delivered"
                  ? "Non-objection délivrée"
                  : it.status === "rejected"
                    ? "Refus motivé"
                    : "—"}
              </span>
            </div>
          </li>
        </ul>
      </div>
    </div>
  );
}

function KvRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className={styles.kvRow}>
      <span>{label}</span>
      <strong className={mono ? "ptn-mono" : ""}>{value}</strong>
    </div>
  );
}
