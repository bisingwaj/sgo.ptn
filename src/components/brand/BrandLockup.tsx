import { cn } from "@/lib/cn";

/**
 * Signature institutionnelle UGPTN.
 *
 * SVG écrit en ligne plutôt que chargé via <img> : le lettrage utilise
 * `currentColor`, il suit donc la couleur du texte environnant — anthracite
 * sur fond clair, blanc sur le bandeau Carbon — à partir d'un seul actif.
 * Une balise <img> ne permettrait pas cette adaptation et imposerait de
 * maintenir deux fichiers.
 *
 * ATTENTION — reconstitution vectorielle. Le fichier fourni est une image
 * matricielle de faible définition sur fond blanc opaque, inutilisable sur
 * fond sombre et floue à l'impression. Le tracé de la carte est une
 * approximation fidèle à la structure de la marque, à remplacer par le
 * vectoriel officiel dès réception (voir public/brand/README.md).
 */

/* Lettrage « ugptn » — tracés partagés par toutes les variantes. */
function Wordmark() {
  return (
    <g fill="currentColor">
      <path d="M6 84h44v96c0 18 10 28 27 28s28-10 28-28V84h44v100c0 44-28 70-72 70S6 228 6 184V84Z" />
      <path d="M164 168c0-50 32-86 78-86 22 0 39 8 50 22V84h43v160c0 48-32 78-84 78-40 0-70-16-82-44l38-18c7 15 22 24 43 24 26 0 41-15 41-42v-14c-11 14-28 22-49 22-46 0-78-36-78-82Zm128 0c0-26-17-45-42-45s-42 19-42 45 17 45 42 45 42-19 42-45Z" />
      <path d="M348 84h43v22c11-15 29-24 51-24 46 0 78 37 78 86s-32 86-78 86c-22 0-39-8-50-22v90h-44V84Zm128 84c0-26-17-45-42-45s-42 19-42 45 17 45 42 45 42-19 42-45Z" />
      <path d="M536 122V84h26V38l44-14v60h38v38h-38v72c0 12 6 18 18 18h20v40h-30c-36 0-52-18-52-52v-78h-26Z" />
      <path d="M660 84h44v20c11-15 28-22 48-22 40 0 64 27 64 70v100h-44V160c0-22-11-35-30-35-21 0-38 15-38 42v81h-44V84Z" />
    </g>
  );
}

/** Carte de la RDC figurée par un réseau de nœuds connectés. */
function NetworkMap() {
  const nodes: Array<[number, number, number]> = [
    [96, 26, 9], [148, 8, 7], [214, 22, 9], [268, 6, 7], [296, 42, 9],
    [276, 96, 8], [300, 140, 7], [286, 190, 9], [244, 214, 7], [236, 262, 8],
    [198, 300, 7], [156, 286, 9], [120, 306, 7], [78, 268, 8], [96, 224, 9],
    [62, 196, 7], [74, 148, 8], [44, 118, 7], [62, 74, 8], [148, 68, 10],
    [174, 118, 10], [118, 96, 8], [148, 176, 10], [220, 190, 9], [198, 254, 9],
  ];

  return (
    <g transform="translate(872 14)">
      <g
        stroke="var(--ptn-brand, #1192E8)"
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.95"
      >
        <path d="M96 26 148 8 214 22 268 6 296 42 276 96 300 140 286 190 244 214 236 262 198 300 156 286 120 306 78 268 96 224 62 196 74 148 44 118 62 74 96 26Z" />
        <path d="M96 26 148 68 214 22M148 68 268 6M148 68 174 118 296 42M174 118 276 96M174 118 118 96 96 26M118 96 62 74M118 96 74 148M174 118 148 176 300 140M148 176 62 196M148 176 96 224M148 176 220 190 286 190M220 190 244 214M220 190 198 254 236 262M198 254 156 286M198 254 120 306M198 254 198 300M96 224 78 268M44 118 74 148M62 196 78 268" />
      </g>
      <g fill="var(--ptn-brand, #1192E8)">
        {nodes.map(([cx, cy, r]) => (
          <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={r} />
        ))}
      </g>
    </g>
  );
}

/** Barre du drapeau RDC + développé du sigle. */
function Descriptor() {
  return (
    <g transform="translate(10 366)">
      <rect x="0" y="0" width="9" height="25" fill="var(--ptn-brand-deep, #0072C3)" />
      <rect x="0" y="29" width="9" height="25" fill="var(--ptn-drc-blue, #1192E8)" />
      <rect x="0" y="58" width="9" height="25" fill="var(--ptn-drc-yellow, #F1C21B)" />
      <rect x="0" y="87" width="9" height="25" fill="var(--ptn-drc-red, #DA1E28)" />
      <g
        fill="currentColor"
        fontFamily="'IBM Plex Sans', system-ui, sans-serif"
        fontSize="27"
        fontWeight="600"
        letterSpacing="0.6"
      >
        <text x="28" y="21">UNITÉ DE GESTION</text>
        <text x="28" y="50">DU PROJET</text>
        <text x="28" y="79">DE TRANSFORMATION</text>
        <text x="28" y="108">NUMÉRIQUE</text>
      </g>
    </g>
  );
}

interface BrandLockupProps {
  /**
   * `wordmark` — lettrage seul, pour le bandeau de 48 px.
   * `mark`     — lettrage + carte, à partir d'environ 40 px de haut.
   * `full`     — signature complète, pour la connexion et l'impression.
   *
   * Le choix n'est pas cosmétique : sous ~40 px, les nœuds de la carte
   * tombent sous le pixel et se réduisent à une tache. Mieux vaut n'afficher
   * que le lettrage, parfaitement lisible, que la marque entière illisible.
   */
  variant?: "wordmark" | "mark" | "full";
  /** Hauteur rendue, en pixels. La largeur suit le ratio. */
  height?: number;
  className?: string;
}

export function BrandLockup({ variant = "mark", height, className }: BrandLockupProps) {
  const isFull = variant === "full";
  const isWordmark = variant === "wordmark";

  // Trois cadrages sur un même dessin, sans dupliquer les tracés.
  const viewBox = isFull
    ? "0 0 1190 492"
    : isWordmark
      ? "0 0 830 336"
      : "0 0 1190 336";
  const defaultHeight = isFull ? 96 : 28;

  return (
    <svg
      viewBox={viewBox}
      height={height ?? defaultHeight}
      className={cn("w-auto shrink-0 self-start", className)}
      role="img"
      aria-label="UGPTN — Unité de Gestion du Projet de Transformation Numérique"
      fill="none"
    >
      <Wordmark />
      {!isWordmark && <NetworkMap />}
      {isFull && <Descriptor />}
    </svg>
  );
}
