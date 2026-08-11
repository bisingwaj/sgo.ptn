import Link from "next/link";
import { Shell } from "@/components/shell/Shell";
import {
  WarningAltFilled,
  ArrowRight,
  Search,
  Document,
  Voicemail,
  Dashboard,
} from "@carbon/icons-react";

const QUICK_LINKS = [
  { label: "Tableau de bord", href: "/partenaire", icon: Dashboard },
  { label: "Mes propositions", href: "/partenaire/propositions", icon: Document },
  { label: "Messagerie UGP", href: "/partenaire/messages", icon: Voicemail },
];

export default function PartenaireNotFound() {
  return (
    <Shell crumbs={[{ label: "Espace partenaire", href: "/partenaire" }, { label: "Page introuvable" }]}>
      <div
        style={{
          maxWidth: 640,
          margin: "48px auto",
          padding: "32px",
          background: "var(--cds-layer)",
          border: "1px solid var(--cds-border-subtle)",
          borderLeft: "3px solid var(--ptn-status-warning)",
        }}
      >
        <div
          style={{
            width: 48,
            height: 48,
            background: "var(--ptn-status-warning-surface)",
            color: "#8e6a00",
            display: "grid",
            placeItems: "center",
            marginBottom: 16,
          }}
        >
          <WarningAltFilled size={24} aria-hidden />
        </div>

        <div
          style={{
            fontSize: 11,
            textTransform: "uppercase",
            letterSpacing: "0.32px",
            color: "var(--cds-text-helper)",
            marginBottom: 8,
          }}
        >
          <span className="ptn-mono">404</span> · ESPACE PARTENAIRE
        </div>

        <h1
          style={{
            fontSize: 24,
            fontWeight: 300,
            letterSpacing: "-0.005em",
            margin: "0 0 8px",
          }}
        >
          Page introuvable
        </h1>

        <p
          style={{
            fontSize: 14,
            color: "var(--cds-text-secondary)",
            lineHeight: 1.55,
            margin: "0 0 24px",
          }}
        >
          La page demandée n&apos;existe pas ou a été déplacée. Si vous avez suivi un lien
          depuis un email ou un document, la référence a peut-être été modifiée.
        </p>

        <div
          style={{
            background: "var(--cds-background)",
            padding: "12px 14px",
            display: "flex",
            alignItems: "center",
            gap: 10,
            marginBottom: 24,
            borderBottom: "1px solid var(--cds-border-strong)",
          }}
        >
          <Search size={14} aria-hidden style={{ color: "var(--cds-text-helper)" }} />
          <input
            type="search"
            placeholder="Rechercher (réf. PROP-, DOC-, MGP-, RPT-)"
            disabled
            style={{
              border: 0,
              background: "transparent",
              fontSize: 13,
              flex: 1,
              outline: "none",
              fontFamily: "var(--font-ibm-plex-mono)",
              color: "var(--cds-text-helper)",
            }}
          />
        </div>

        <div
          style={{
            fontSize: 11,
            textTransform: "uppercase",
            letterSpacing: "0.32px",
            color: "var(--cds-text-helper)",
            fontWeight: 500,
            marginBottom: 8,
          }}
        >
          Accès rapides
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 1,
            background: "var(--cds-border-subtle)",
            border: "1px solid var(--cds-border-subtle)",
          }}
        >
          {QUICK_LINKS.map((q) => {
            const Icon = q.icon;
            return (
              <Link
                key={q.href}
                href={q.href}
                style={{
                  background: "var(--cds-layer)",
                  padding: "16px",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  fontSize: 13,
                  color: "var(--cds-text-primary)",
                  textDecoration: "none",
                  minHeight: 64,
                }}
              >
                <Icon size={16} aria-hidden style={{ color: "var(--cds-text-helper)" }} />
                <span style={{ flex: 1 }}>{q.label}</span>
                <ArrowRight size={14} aria-hidden style={{ color: "var(--cds-text-helper)" }} />
              </Link>
            );
          })}
        </div>
      </div>
    </Shell>
  );
}
