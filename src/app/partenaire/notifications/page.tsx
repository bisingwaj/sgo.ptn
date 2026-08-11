import Link from "next/link";
import { Shell } from "@/components/shell/Shell";
import { PageHeader } from "@/components/ui/PageHeader";
import {
  Notification,
  CheckmarkFilled,
  WarningAltFilled,
  AiGenerate,
  Settings,
} from "@carbon/icons-react";
import { NotificationsClient } from "./NotificationsClient";
import styles from "./notifications.module.scss";

export const metadata = { title: "Notifications · Espace partenaire · PTN-RDC" };

export default function NotificationsPage() {
  return (
    <Shell crumbs={[{ label: "Espace partenaire", href: "/partenaire" }, { label: "Notifications" }]}>
      <PageHeader
        eyebrow="ANIE · CENTRE DE NOTIFICATIONS"
        title="Notifications & alertes"
        subtitle="Échéances, ANO bailleurs, demandes de clarification, suggestions IA — tout au même endroit."
        meta={
          <>
            <span>
              <strong>3 non lues</strong> · 3 actions requises
            </span>
            <span>·</span>
            <span>
              Dernière sync. : <span className="ptn-mono">il y a 4 min</span>
            </span>
          </>
        }
        actions={
          <Link
            href="/partenaire/notifications/preferences"
            style={{
              background: "var(--cds-layer)",
              border: "1px solid var(--cds-border-subtle)",
              padding: "8px 14px",
              fontSize: 13,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              minHeight: 36,
              textDecoration: "none",
              color: "var(--cds-text-primary)",
            }}
          >
            <Settings size={16} aria-hidden /> Préférences
          </Link>
        }
      />

      <div className={styles.kpis}>
        <div className={styles.kpi}>
          <div className={styles.kpiK}>
            <Notification size={14} aria-hidden /> Total
          </div>
          <div className={styles.kpiV}>8</div>
          <div className={styles.kpiU}>cette semaine</div>
        </div>
        <div className={styles.kpi}>
          <div className={styles.kpiK}>
            <WarningAltFilled size={14} aria-hidden /> Action requise
          </div>
          <div className={styles.kpiV} style={{ color: "var(--ptn-status-warning)" }}>
            3
          </div>
          <div className={styles.kpiU}>dont 1 urgente</div>
        </div>
        <div className={styles.kpi}>
          <div className={styles.kpiK}>
            <CheckmarkFilled size={14} aria-hidden /> Résolues
          </div>
          <div className={styles.kpiV} style={{ color: "var(--ptn-status-success)" }}>
            4
          </div>
          <div className={styles.kpiU}>cette semaine</div>
        </div>
        <div className={styles.kpi}>
          <div className={styles.kpiK}>
            <AiGenerate size={14} aria-hidden /> Suggestions IA
          </div>
          <div className={styles.kpiV} style={{ color: "var(--ptn-status-ai)" }}>
            1
          </div>
          <div className={styles.kpiU}>brouillon généré</div>
        </div>
      </div>

      <NotificationsClient />
    </Shell>
  );
}
