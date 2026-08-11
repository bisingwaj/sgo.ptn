import { Shell } from "@/components/shell/Shell";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Tag } from "@/components/ui/Tag";
import { KpiStrip, KpiTile } from "@/components/ui/KpiTile";
import { TaskApproved, Time, WarningAltFilled, ArrowRight } from "@carbon/icons-react";
import styles from "./bailleur-ano.module.scss";

export const metadata = { title: "Inbox ANO · Bailleur · PTN-RDC" };

interface Item {
  ref: string;
  title: string;
  type: "TDR" | "DAO" | "PV éval." | "Contrat";
  daysLeft: number;
  slaDays: number;
  amount: string;
  componentTone: "blue" | "purple" | "teal" | "green";
  componentCode: string;
  status: "submitted" | "review" | "clarif";
}

const ITEMS: Item[] = [
  { ref: "PTN-2026-019", title: "TDR · Plateforme nationale d'identité numérique", type: "TDR", daysLeft: 4, slaDays: 14, amount: "8,7 M USD", componentCode: "C2", componentTone: "purple", status: "review" },
  { ref: "PTN-2026-021", title: "TDR · Backbone fibre Goma-Bukavu", type: "TDR", daysLeft: 9, slaDays: 21, amount: "12,4 M USD", componentCode: "C1", componentTone: "blue", status: "review" },
  { ref: "PTN-2026-040", title: "DAO · Modernisation routes numériques", type: "DAO", daysLeft: 11, slaDays: 14, amount: "22,1 M USD", componentCode: "C1", componentTone: "blue", status: "review" },
  { ref: "PTN-2026-027", title: "TDR · Hubs technologiques", type: "TDR", daysLeft: 12, slaDays: 14, amount: "5,6 M USD", componentCode: "C3", componentTone: "teal", status: "submitted" },
  { ref: "PTN-2026-033", title: "TDR · Atelier ID4Africa Abidjan", type: "TDR", daysLeft: 13, slaDays: 14, amount: "0,2 M USD", componentCode: "C4", componentTone: "green", status: "submitted" },
];

export default function BailleurAnoPage() {
  const urgent = ITEMS.filter((i) => i.daysLeft <= 7);
  return (
    <Shell crumbs={[{ label: "Dashboard", href: "/bailleur" }, { label: "Inbox ANO" }]}>
      <PageHeader
        eyebrow="WORLD BANK · TTL DECISION QUEUE"
        title="ANO Inbox — your decision is required"
        subtitle="Files awaiting your non-objection decision. SLA 14 days (BM) / 21 days (AFD)."
      />

      <KpiStrip cols={4}>
        <KpiTile icon={<TaskApproved size={14} />} label="Total in queue" value={ITEMS.length} />
        <KpiTile
          icon={<WarningAltFilled size={14} />}
          label="Urgent (≤ 7 days)"
          value={urgent.length}
          trend={{ direction: "up", label: "Action required" }}
        />
        <KpiTile icon={<Time size={14} />} label="Avg. response time" value="14,2" unit="days" />
        <KpiTile label="Approval rate (12 m)" value="92" unit="%" />
      </KpiStrip>

      <Card noPadding>
        <ul className={styles.list}>
          {ITEMS.map((it) => {
            const isUrgent = it.daysLeft <= 7;
            return (
              <li key={it.ref} className={`${styles.item} ${isUrgent ? styles.itemUrgent : ""}`}>
                <div className={styles.left}>
                  <div className={styles.head}>
                    <span className="ptn-mono">{it.ref}</span>
                    <Tag tone={it.componentTone} size="sm">{it.componentCode}</Tag>
                    <Tag tone="gray" size="sm">{it.type}</Tag>
                  </div>
                  <strong>{it.title}</strong>
                  <div className={styles.meta}>
                    <span className="ptn-mono">{it.amount}</span>
                    <span>·</span>
                    <span>SLA {it.slaDays} days</span>
                  </div>
                </div>
                <div className={styles.right}>
                  <span className={`${styles.delay} ${isUrgent ? styles.delayUrgent : ""}`}>
                    <Time size={14} aria-hidden />
                    <span className="ptn-mono">{it.daysLeft} days left</span>
                  </span>
                  <button type="button" className={styles.btnReview}>
                    Review <ArrowRight size={14} aria-hidden />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      </Card>
    </Shell>
  );
}
