"use client";

/**
 * Page démo Phase 0 — Validation visuelle des 8 illustrations profil-aware.
 *
 * Affiche les 8 illustrations dans leurs 3 tailles, avec leur palette d'accent active.
 * Bouton de bascule g10/g100 pour vérifier la robustesse en mode sombre.
 */

import { Illustration, type IllustrationName } from "@/components/illustrations/Illustration";
import { PROFILES, type ProfileKey } from "@/lib/profiles";
import { useProfile } from "@/components/profile/ProfileContext";
import { useEffect, useState } from "react";

const SECTIONS: { key: ProfileKey; illustration: IllustrationName }[] = [
  { key: "ugp", illustration: "ugp-coordination" },
  { key: "mda", illustration: "mda-ministry" },
  { key: "partenaire", illustration: "partenaire-network" },
  { key: "bailleur", illustration: "bailleur-governance" },
  { key: "soumissionnaire", illustration: "soumissionnaire-blocks" },
  { key: "sbp", illustration: "sbp-trajectory" },
  { key: "auditeur", illustration: "auditeur-magnifier" },
  { key: "gouvernance", illustration: "gouvernance-table" },
];

export default function IllustrationsDemoPage() {
  const { theme, setTheme } = useProfile();
  const [hoveredCard, setHoveredCard] = useState<ProfileKey | null>(null);

  // Force application du data-profile par carte au survol pour preview
  useEffect(() => {
    const root = document.documentElement;
    if (hoveredCard) {
      root.setAttribute("data-profile", hoveredCard);
    } else {
      root.setAttribute("data-profile", "ugp");
    }
  }, [hoveredCard]);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--cds-background)",
        color: "var(--cds-text-primary)",
        padding: "var(--ptn-space-07) var(--ptn-space-06)",
        fontFamily: "'IBM Plex Sans', system-ui, sans-serif",
      }}
    >
      <header
        style={{
          maxWidth: 1280,
          margin: "0 auto var(--ptn-space-07)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          gap: "var(--ptn-space-05)",
          flexWrap: "wrap",
        }}
      >
        <div>
          <div
            style={{
              fontSize: 11,
              textTransform: "uppercase",
              letterSpacing: "0.32px",
              color: "var(--cds-text-helper)",
              marginBottom: 8,
            }}
          >
            Phase 0 · Validation visuelle
          </div>
          <h1
            style={{
              fontSize: 32,
              fontWeight: 300,
              letterSpacing: "-0.01em",
              margin: 0,
            }}
          >
            8 illustrations profil-aware
          </h1>
          <p
            style={{
              fontSize: 14,
              color: "var(--cds-text-secondary)",
              marginTop: 12,
              maxWidth: 640,
              lineHeight: 1.55,
            }}
          >
            Survolez une carte pour appliquer son profil au document entier (couleur d&apos;accent
            globale). Style géométrique Carbon, 3 couleurs max par illustration, animation
            réduite via <code className="ptn-mono">prefers-reduced-motion</code>.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setTheme(theme === "g10" ? "g100" : "g10")}
          style={{
            background: "var(--cds-button-primary)",
            color: "var(--cds-text-on-color)",
            border: 0,
            padding: "12px 16px",
            cursor: "pointer",
            fontSize: 14,
            fontFamily: "inherit",
          }}
        >
          {theme === "g10" ? "Basculer en mode sombre (g100)" : "Basculer en mode clair (g10)"}
        </button>
      </header>

      <div
        style={{
          maxWidth: 1280,
          margin: "0 auto",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
          gap: "var(--ptn-space-04)",
        }}
      >
        {SECTIONS.map(({ key, illustration }) => {
          const profile = PROFILES[key];
          return (
            <article
              key={key}
              onMouseEnter={() => setHoveredCard(key)}
              onMouseLeave={() => setHoveredCard(null)}
              style={{
                background: "var(--cds-layer)",
                border: "1px solid var(--cds-border-subtle)",
                padding: "var(--ptn-space-04)",
                cursor: "pointer",
                transition: "border-color var(--ptn-motion-fast-02) var(--ptn-motion-easing-productive)",
              }}
              onFocus={() => setHoveredCard(key)}
              onBlur={() => setHoveredCard(null)}
              tabIndex={0}
            >
              <div
                style={{
                  height: 180,
                  display: "grid",
                  placeItems: "center",
                  background: "var(--cds-background)",
                  marginBottom: "var(--ptn-space-04)",
                  overflow: "hidden",
                }}
                data-profile={key}
              >
                <Illustration name={illustration} size="card" />
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 8,
                }}
              >
                <span
                  style={{
                    width: 12,
                    height: 12,
                    background: profile.accent.base,
                    flexShrink: 0,
                  }}
                  aria-hidden
                />
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 500,
                    color: "var(--cds-text-primary)",
                  }}
                >
                  {profile.label}
                </span>
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: "var(--cds-text-helper)",
                  marginBottom: 6,
                  fontFamily: "'IBM Plex Mono', monospace",
                }}
              >
                {profile.accent.base}
              </div>
              <p
                style={{
                  fontSize: 12,
                  color: "var(--cds-text-secondary)",
                  lineHeight: 1.5,
                  margin: 0,
                }}
              >
                {profile.description}
              </p>
            </article>
          );
        })}
      </div>

      <footer
        style={{
          maxWidth: 1280,
          margin: "var(--ptn-space-08) auto 0",
          paddingTop: "var(--ptn-space-05)",
          borderTop: "1px solid var(--cds-border-subtle)",
          fontSize: 12,
          color: "var(--cds-text-helper)",
          display: "flex",
          justifyContent: "space-between",
          gap: "var(--ptn-space-04)",
          flexWrap: "wrap",
        }}
      >
        <span>
          PTN-RDC · Phase 0 ·{" "}
          <code className="ptn-mono">@carbon/react v11</code> ·{" "}
          <code className="ptn-mono">tokens g10/g100</code>
        </span>
        <span className="ptn-mono">P180495 · IDA + AFD</span>
      </footer>
    </div>
  );
}
