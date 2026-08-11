/**
 * Illustration SVG profil-aware.
 *
 * 8 illustrations géométriques minimales correspondant aux 8 profils.
 * Chaque illustration utilise au plus 3 couleurs : --ptn-accent + 2 grays Carbon.
 * Inline SVG pour permettre l'animation et le theming via CSS variables.
 *
 * @example
 *   <Illustration name="ugp-coordination" size="hero" />
 *   <Illustration name="bailleur-governance" size="card" animate />
 */

import type { CSSProperties } from "react";

export type IllustrationName =
  | "ugp-coordination"
  | "mda-ministry"
  | "partenaire-network"
  | "bailleur-governance"
  | "soumissionnaire-blocks"
  | "sbp-trajectory"
  | "auditeur-magnifier"
  | "gouvernance-table";

export type IllustrationSize = "hero" | "card" | "avatar";

interface IllustrationProps {
  name: IllustrationName;
  size?: IllustrationSize;
  animate?: boolean;
  className?: string;
  ariaLabel?: string;
}

const SIZE_DIMENSIONS: Record<IllustrationSize, { w: number; h: number }> = {
  hero: { w: 320, h: 240 },
  card: { w: 160, h: 120 },
  avatar: { w: 64, h: 64 },
};

export function Illustration({
  name,
  size = "card",
  animate = false,
  className,
  ariaLabel,
}: IllustrationProps) {
  const { w, h } = SIZE_DIMENSIONS[size];
  const style: CSSProperties = animate
    ? { transition: "transform var(--ptn-motion-moderate-02) var(--ptn-motion-easing-productive)" }
    : {};

  const commonProps = {
    width: w,
    height: h,
    viewBox: "0 0 320 240",
    role: "img",
    "aria-label": ariaLabel ?? `Illustration ${name}`,
    className,
    style,
  };

  switch (name) {
    case "ugp-coordination":
      return <UgpCoordination {...commonProps} />;
    case "mda-ministry":
      return <MdaMinistry {...commonProps} />;
    case "partenaire-network":
      return <PartenaireNetwork {...commonProps} />;
    case "bailleur-governance":
      return <BailleurGovernance {...commonProps} />;
    case "soumissionnaire-blocks":
      return <SoumissionnaireBlocks {...commonProps} />;
    case "sbp-trajectory":
      return <SbpTrajectory {...commonProps} />;
    case "auditeur-magnifier":
      return <AuditeurMagnifier {...commonProps} />;
    case "gouvernance-table":
      return <GouvernanceTable {...commonProps} />;
  }
}

type SvgProps = React.SVGProps<SVGSVGElement>;

/* ============================================================
 * UGP — Coordination
 * Tour stylisée + 4 colonnes (composantes C1-C4) + base
 * ============================================================ */
function UgpCoordination(props: SvgProps) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg">
      <title>Tour de coordination UGP</title>
      <desc>4 colonnes verticales représentant les composantes C1-C4 surmontées d'une coupole</desc>
      {/* Base */}
      <rect x="40" y="200" width="240" height="8" fill="var(--ptn-accent)" opacity="0.9" />
      <rect x="20" y="208" width="280" height="4" fill="var(--cds-border-subtle)" />
      {/* 4 colonnes composantes */}
      <rect x="60" y="80" width="32" height="120" fill="var(--ptn-accent)" opacity="0.8" />
      <rect x="108" y="60" width="32" height="140" fill="var(--ptn-accent)" />
      <rect x="156" y="100" width="32" height="100" fill="var(--ptn-accent)" opacity="0.7" />
      <rect x="204" y="120" width="32" height="80" fill="var(--ptn-accent)" opacity="0.6" />
      {/* Coupole */}
      <path d="M50 80 Q160 20 270 80 L270 88 L50 88 Z" fill="var(--cds-text-secondary)" />
      <circle cx="160" cy="40" r="6" fill="var(--ptn-accent)" />
      {/* Lignes horizontales (cohésion) */}
      <line x1="40" y1="160" x2="280" y2="160" stroke="var(--cds-border-subtle)" strokeWidth="1" strokeDasharray="2 4" />
      <line x1="40" y1="120" x2="280" y2="120" stroke="var(--cds-border-subtle)" strokeWidth="1" strokeDasharray="2 4" />
    </svg>
  );
}

/* ============================================================
 * MDA — Bâtiment ministériel modulaire
 * ============================================================ */
function MdaMinistry(props: SvgProps) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg">
      <title>Bâtiment ministériel MDA</title>
      <desc>Façade de bâtiment institutionnel à 3 niveaux modulaires</desc>
      {/* Base */}
      <rect x="30" y="200" width="260" height="6" fill="var(--cds-border-subtle)" />
      {/* Façade niveau 1 */}
      <rect x="60" y="160" width="200" height="40" fill="var(--ptn-accent)" />
      {/* Niveau 2 */}
      <rect x="80" y="120" width="160" height="40" fill="var(--ptn-accent)" opacity="0.85" />
      {/* Niveau 3 */}
      <rect x="100" y="80" width="120" height="40" fill="var(--ptn-accent)" opacity="0.7" />
      {/* Toit pyramidal */}
      <path d="M100 80 L160 50 L220 80 Z" fill="var(--cds-text-secondary)" />
      {/* Fenêtres niveau 1 (5) */}
      {[80, 120, 160, 200, 240].map((x) => (
        <rect key={x} x={x} y="172" width="14" height="16" fill="var(--cds-background)" />
      ))}
      {/* Fenêtres niveau 2 (4) */}
      {[100, 140, 180, 220].map((x) => (
        <rect key={x} x={x} y="132" width="14" height="16" fill="var(--cds-background)" />
      ))}
      {/* Porte centrale */}
      <rect x="148" y="180" width="24" height="20" fill="var(--cds-background)" />
    </svg>
  );
}

/* ============================================================
 * Partenaire — Réseau de nœuds connectés
 * ============================================================ */
function PartenaireNetwork(props: SvgProps) {
  const nodes = [
    { x: 80, y: 80 },
    { x: 240, y: 80 },
    { x: 60, y: 160 },
    { x: 160, y: 120 },
    { x: 260, y: 160 },
    { x: 160, y: 200 },
  ];
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg">
      <title>Réseau de partenaires</title>
      <desc>6 nœuds reliés par des connexions multidirectionnelles</desc>
      {/* Liens */}
      {nodes.map((a, i) =>
        nodes.slice(i + 1).map((b, j) => (
          <line
            key={`${i}-${j}`}
            x1={a.x}
            y1={a.y}
            x2={b.x}
            y2={b.y}
            stroke="var(--cds-border-subtle)"
            strokeWidth="1.5"
            opacity="0.6"
          />
        )),
      )}
      {/* Nœuds */}
      {nodes.map((n, i) => (
        <g key={i}>
          <circle cx={n.x} cy={n.y} r="14" fill="var(--cds-background)" stroke="var(--ptn-accent)" strokeWidth="2" />
          <circle cx={n.x} cy={n.y} r="6" fill="var(--ptn-accent)" />
        </g>
      ))}
      {/* Centre — nœud principal */}
      <circle cx="160" cy="120" r="20" fill="var(--ptn-accent)" />
    </svg>
  );
}

/* ============================================================
 * Bailleur — Cercle de gouvernance
 * ============================================================ */
function BailleurGovernance(props: SvgProps) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg">
      <title>Cercle de gouvernance bailleurs</title>
      <desc>Cercle central entouré d'arcs représentant supervision et gouvernance</desc>
      {/* Arcs externes */}
      <circle cx="160" cy="120" r="100" fill="none" stroke="var(--cds-border-subtle)" strokeWidth="1" strokeDasharray="4 6" />
      <circle cx="160" cy="120" r="80" fill="none" stroke="var(--ptn-accent)" strokeWidth="2" opacity="0.4" />
      {/* Cercle principal */}
      <circle cx="160" cy="120" r="56" fill="var(--ptn-accent)" />
      {/* Logo IDA / AFD stylisés */}
      <text
        x="160"
        y="116"
        textAnchor="middle"
        fontSize="14"
        fontWeight="500"
        fill="var(--cds-text-on-color)"
        fontFamily="IBM Plex Sans, sans-serif"
      >
        IDA
      </text>
      <text
        x="160"
        y="134"
        textAnchor="middle"
        fontSize="11"
        fill="var(--cds-text-on-color)"
        opacity="0.85"
        fontFamily="IBM Plex Sans, sans-serif"
      >
        AFD
      </text>
      {/* 4 satellites — institutions */}
      {[
        { x: 160, y: 40 },
        { x: 240, y: 120 },
        { x: 160, y: 200 },
        { x: 80, y: 120 },
      ].map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="8" fill="var(--cds-text-secondary)" />
      ))}
    </svg>
  );
}

/* ============================================================
 * Soumissionnaire — Pile de blocs d'expertise
 * ============================================================ */
function SoumissionnaireBlocks(props: SvgProps) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg">
      <title>Blocs d'expertise soumissionnaire</title>
      <desc>Pile de blocs représentant expertise, références, capacités</desc>
      {/* Bloc 1 (base, large) */}
      <rect x="60" y="180" width="200" height="32" fill="var(--ptn-accent)" />
      <text x="160" y="201" textAnchor="middle" fontSize="11" fill="var(--cds-text-on-color)" fontFamily="IBM Plex Mono, monospace">
        EXPERTISE
      </text>
      {/* Bloc 2 */}
      <rect x="80" y="140" width="160" height="32" fill="var(--ptn-accent)" opacity="0.85" />
      <text x="160" y="161" textAnchor="middle" fontSize="11" fill="var(--cds-text-on-color)" fontFamily="IBM Plex Mono, monospace">
        RÉFÉRENCES
      </text>
      {/* Bloc 3 */}
      <rect x="100" y="100" width="120" height="32" fill="var(--ptn-accent)" opacity="0.7" />
      <text x="160" y="121" textAnchor="middle" fontSize="11" fill="var(--cds-text-on-color)" fontFamily="IBM Plex Mono, monospace">
        ÉQUIPE
      </text>
      {/* Bloc 4 (sommet) */}
      <rect x="120" y="60" width="80" height="32" fill="var(--ptn-accent)" opacity="0.55" />
      <text x="160" y="81" textAnchor="middle" fontSize="11" fill="var(--cds-text-on-color)" fontFamily="IBM Plex Mono, monospace">
        OFFRE
      </text>
      {/* Lignes verticales (cohésion) */}
      <line x1="120" y1="60" x2="120" y2="212" stroke="var(--cds-border-subtle)" strokeWidth="1" strokeDasharray="1 3" />
      <line x1="200" y1="60" x2="200" y2="212" stroke="var(--cds-border-subtle)" strokeWidth="1" strokeDasharray="1 3" />
    </svg>
  );
}

/* ============================================================
 * SBP — Trajectoire ascendante (fusée minimaliste)
 * ============================================================ */
function SbpTrajectory(props: SvgProps) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg">
      <title>Trajectoire SBP ascendante</title>
      <desc>Courbe ascendante avec jalons étape de croissance startup/EESU/hub</desc>
      {/* Grille de fond */}
      <line x1="40" y1="200" x2="280" y2="200" stroke="var(--cds-border-subtle)" strokeWidth="1" />
      <line x1="40" y1="40" x2="40" y2="200" stroke="var(--cds-border-subtle)" strokeWidth="1" />
      {/* Trajectoire */}
      <path
        d="M40 200 Q120 180 160 140 T280 60"
        fill="none"
        stroke="var(--ptn-accent)"
        strokeWidth="3"
        strokeLinecap="round"
      />
      {/* Aire sous la courbe (subtle) */}
      <path
        d="M40 200 Q120 180 160 140 T280 60 L280 200 Z"
        fill="var(--ptn-accent)"
        opacity="0.12"
      />
      {/* Jalons */}
      {[
        { x: 40, y: 200, l: "J1" },
        { x: 120, y: 180, l: "J2" },
        { x: 200, y: 100, l: "J3" },
        { x: 280, y: 60, l: "J4" },
      ].map((j) => (
        <g key={j.l}>
          <circle cx={j.x} cy={j.y} r="6" fill="var(--ptn-accent)" stroke="var(--cds-background)" strokeWidth="2" />
        </g>
      ))}
      {/* Fusée minimaliste au sommet */}
      <g transform="translate(280, 60) rotate(-30)">
        <path d="M-8 0 L0 -16 L8 0 L4 4 L-4 4 Z" fill="var(--cds-text-primary)" />
        <path d="M-4 4 L-2 8 L0 4 Z" fill="var(--ptn-accent)" />
        <path d="M4 4 L2 8 L0 4 Z" fill="var(--ptn-accent)" />
      </g>
    </svg>
  );
}

/* ============================================================
 * Auditeur — Loupe + grille d'audit
 * ============================================================ */
function AuditeurMagnifier(props: SvgProps) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg">
      <title>Loupe d'audit</title>
      <desc>Loupe sur grille de données représentant audit et traçabilité</desc>
      {/* Grille de fond (registres) */}
      <g stroke="var(--cds-border-subtle)" strokeWidth="1">
        {[60, 80, 100, 120, 140, 160, 180].map((y) => (
          <line key={`h-${y}`} x1="40" y1={y} x2="280" y2={y} />
        ))}
        {[80, 120, 160, 200, 240].map((x) => (
          <line key={`v-${x}`} x1={x} y1="60" x2={x} y2="200" />
        ))}
      </g>
      {/* Données dans la grille (ticks de validation) */}
      {[
        { x: 60, y: 70 },
        { x: 100, y: 90 },
        { x: 140, y: 110 },
      ].map((d, i) => (
        <text
          key={i}
          x={d.x}
          y={d.y}
          fontSize="10"
          fill="var(--cds-text-secondary)"
          fontFamily="IBM Plex Mono, monospace"
        >
          ✓
        </text>
      ))}
      {/* Loupe */}
      <g>
        <circle
          cx="200"
          cy="140"
          r="40"
          fill="var(--cds-background)"
          stroke="var(--ptn-accent)"
          strokeWidth="3"
        />
        <line
          x1="232"
          y1="172"
          x2="260"
          y2="200"
          stroke="var(--ptn-accent)"
          strokeWidth="6"
          strokeLinecap="round"
        />
        <circle cx="200" cy="140" r="32" fill="var(--ptn-accent)" opacity="0.08" />
        <text
          x="200"
          y="146"
          textAnchor="middle"
          fontSize="14"
          fill="var(--ptn-accent)"
          fontFamily="IBM Plex Mono, monospace"
          fontWeight="500"
        >
          AUDIT
        </text>
      </g>
    </svg>
  );
}

/* ============================================================
 * Gouvernance — Table ronde COPIL/CTP
 * ============================================================ */
function GouvernanceTable(props: SvgProps) {
  const seats = 8;
  const cx = 160;
  const cy = 120;
  const r = 70;
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg">
      <title>Table ronde gouvernance</title>
      <desc>Table circulaire représentant COPIL/CTP avec 8 sièges</desc>
      {/* Ombre table */}
      <ellipse cx={cx} cy={cy + 60} rx={r + 20} ry="8" fill="var(--cds-border-subtle)" opacity="0.4" />
      {/* Table */}
      <ellipse cx={cx} cy={cy} rx={r} ry={r * 0.5} fill="var(--ptn-accent)" />
      <ellipse cx={cx} cy={cy - 4} rx={r - 6} ry={(r - 6) * 0.5} fill="var(--ptn-accent)" opacity="0.7" />
      {/* Sièges */}
      {Array.from({ length: seats }).map((_, i) => {
        const angle = (i * 2 * Math.PI) / seats;
        const sx = cx + Math.cos(angle) * (r + 24);
        const sy = cy + Math.sin(angle) * (r * 0.5 + 14);
        return (
          <g key={i}>
            <circle cx={sx} cy={sy - 6} r="10" fill="var(--cds-text-secondary)" />
            <rect x={sx - 8} y={sy + 2} width="16" height="14" fill="var(--cds-text-secondary)" />
          </g>
        );
      })}
      {/* Document central */}
      <rect x={cx - 18} y={cy - 16} width="36" height="22" fill="var(--cds-background)" />
      <line x1={cx - 12} y1={cy - 8} x2={cx + 12} y2={cy - 8} stroke="var(--ptn-accent)" strokeWidth="1.5" />
      <line x1={cx - 12} y1={cy - 4} x2={cx + 8} y2={cy - 4} stroke="var(--ptn-accent)" strokeWidth="1.5" />
      <line x1={cx - 12} y1={cy} x2={cx + 12} y2={cy} stroke="var(--ptn-accent)" strokeWidth="1.5" />
    </svg>
  );
}
