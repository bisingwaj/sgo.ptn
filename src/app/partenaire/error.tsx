"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Shell } from "@/components/shell/Shell";
import { ErrorFilled, Renew, ArrowRight, Voicemail } from "@carbon/icons-react";

export default function PartenaireError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      console.error("[partenaire/error.tsx]", error);
    }
  }, [error]);

  return (
    <Shell crumbs={[{ label: "Espace partenaire", href: "/partenaire" }, { label: "Erreur" }]}>
      <div
        style={{
          maxWidth: 640,
          margin: "48px auto",
          padding: "32px",
          background: "var(--cds-layer)",
          border: "1px solid var(--cds-border-subtle)",
          borderLeft: "3px solid var(--ptn-status-danger)",
        }}
      >
        <div
          style={{
            width: 48,
            height: 48,
            background: "var(--ptn-status-danger-surface)",
            color: "var(--ptn-status-danger)",
            display: "grid",
            placeItems: "center",
            marginBottom: 16,
          }}
        >
          <ErrorFilled size={24} aria-hidden />
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
          ERREUR · ESPACE PARTENAIRE
        </div>

        <h1
          style={{
            fontSize: 24,
            fontWeight: 300,
            letterSpacing: "-0.005em",
            margin: "0 0 8px",
          }}
        >
          Une erreur est survenue
        </h1>

        <p
          style={{
            fontSize: 14,
            color: "var(--cds-text-secondary)",
            lineHeight: 1.55,
            margin: "0 0 16px",
          }}
        >
          Quelque chose s&apos;est mal passé pendant le chargement de cette page. Vos données
          n&apos;ont pas été affectées — vos brouillons sont automatiquement sauvegardés.
        </p>

        {error.digest && (
          <div
            style={{
              background: "var(--cds-layer-accent-01)",
              padding: "10px 12px",
              fontSize: 11,
              fontFamily: "var(--font-ibm-plex-mono)",
              color: "var(--cds-text-helper)",
              marginBottom: 20,
              wordBreak: "break-all",
            }}
          >
            Référence incident · <strong>{error.digest}</strong>
          </div>
        )}

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={reset}
            style={{
              background: "var(--ptn-accent)",
              color: "#fff",
              border: 0,
              padding: "10px 16px",
              fontSize: 13,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              minHeight: 40,
            }}
          >
            <Renew size={14} aria-hidden /> Réessayer
          </button>

          <Link
            href="/partenaire"
            style={{
              background: "var(--cds-layer)",
              border: "1px solid var(--cds-border-subtle)",
              padding: "10px 16px",
              fontSize: 13,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              minHeight: 40,
              textDecoration: "none",
              color: "var(--cds-text-primary)",
            }}
          >
            Retour au tableau de bord <ArrowRight size={14} aria-hidden />
          </Link>

          <Link
            href="/partenaire/mgp/nouvelle"
            style={{
              background: "transparent",
              border: 0,
              padding: "10px 16px",
              fontSize: 13,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              minHeight: 40,
              textDecoration: "none",
              color: "var(--ptn-accent)",
            }}
          >
            <Voicemail size={14} aria-hidden /> Signaler le problème
          </Link>
        </div>
      </div>
    </Shell>
  );
}
