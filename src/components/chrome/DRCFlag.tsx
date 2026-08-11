/**
 * Drapeau RDC stylisé en SVG.
 * Couleurs officielles : ciel `#007FFF`, rouge `#DA1E28`, jaune `#FFE800`.
 */

interface DRCFlagProps {
  width?: number;
  height?: number;
  className?: string;
}

export function DRCFlag({ width = 64, height = 48, className }: DRCFlagProps) {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 64 48"
      role="img"
      aria-label="Drapeau de la République Démocratique du Congo"
      className={className}
    >
      <rect width="64" height="48" fill="#007FFF" />
      <path d="M0 38 L64 6" stroke="#DA1E28" strokeWidth="4" />
      <path d="M0 36 L64 4" stroke="#FFE800" strokeWidth="0.5" />
      <path d="M0 40 L64 8" stroke="#FFE800" strokeWidth="0.5" />
      <g transform="translate(10,10)">
        <polygon
          points="0,-6 1.4,-1.8 6,-1.8 2.3,1 3.7,5.7 0,3 -3.7,5.7 -2.3,1 -6,-1.8 -1.4,-1.8"
          fill="#FFE800"
        />
      </g>
    </svg>
  );
}
