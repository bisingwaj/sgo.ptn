import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/**
 * Échelles projet déclarées à tailwind-merge.
 *
 * POURQUOI c'est indispensable : `text-*` sert à la fois la taille de
 * police et la couleur du texte. tailwind-merge ne connaît que les noms
 * Tailwind par défaut ; face à `cn("text-heading-06", "text-primary")` il
 * considérait les deux comme concurrents et n'en gardait qu'un — la taille
 * disparaissait silencieusement, sans erreur, sans avertissement.
 *
 * En déclarant les deux groupes, chaque classe est rangée dans le bon et
 * les deux coexistent.
 */
const FONT_SIZES = [
  // `label` et `helper` ont été retirés : ils dupliquaient `caption` (12px),
  // et `helper` entrait en collision avec la couleur du même nom.
  "caption",
  "body-compact",
  "body",
  "body-lg",
  "heading-01",
  "heading-02",
  "heading-03",
  "heading-04",
  "heading-05",
  "heading-06",
];

const TEXT_COLORS = [
  "primary",
  "secondary",
  "helper",
  "placeholder",
  "on-color",
  "inverse",
  "accent",
  "accent-hover",
  "success",
  "success-text",
  "warning",
  "warning-text",
  "danger",
  "danger-text",
  "info",
  "info-text",
  "ai",
  "ai-text",
  "brand",
  "brand-deep",
  "brand-ink",
];

const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [{ text: FONT_SIZES }],
      "text-color": [{ text: TEXT_COLORS }],
    },
  },
});

/**
 * Fusionne des classes conditionnelles en résolvant les conflits Tailwind.
 *
 * `clsx` gère les conditions, `twMerge` élimine les doublons contradictoires :
 * `cn("p-4", isDense && "p-2")` produit `"p-2"` et non `"p-4 p-2"`, où la
 * gagnante dépendrait de l'ordre dans la feuille de style.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
