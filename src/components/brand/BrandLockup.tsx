import Image from "next/image";
import { cn } from "@/lib/cn";

/**
 * Signature institutionnelle UGPTN — logo officiel.
 *
 * Remplace la reconstitution vectorielle qui servait de provisoire. La source
 * est le fichier fourni (`public/assets/ugptn.jpeg`), détouré et redimensionné
 * par `npm run logo` (voir scripts/logo-transparent.mjs).
 *
 * Deux fichiers, et non un seul teinté par CSS : le lettrage est anthracite et
 * la carte bleue. Sur le bandeau Carbon (#161616), le lettrage disparaîtrait.
 * La variante « claire » n'éclaircit que les pixels sombres et conserve le
 * bleu de la carte, qui reste lisible sur les deux fonds.
 *
 * `width`/`height` sont toujours transmis : sans eux, le navigateur ne connaît
 * pas le rapport de l'image avant de l'avoir chargée et réserve une hauteur
 * nulle — la page saute au chargement.
 */

/** Rapport largeur/hauteur du fichier livré (553 × 280). */
const RATIO = 553 / 280;

interface BrandLockupProps {
  /**
   * `sombre` — pour un fond sombre : lettrage éclairci.
   * `clair`  — pour un fond clair : couleurs d'origine.
   */
  tone?: "clair" | "sombre";
  /** Hauteur rendue, en pixels. La largeur suit le rapport du fichier. */
  height?: number;
  /** Priorise le chargement — à activer sur l'écran de connexion. */
  priority?: boolean;
  className?: string;
}

export function BrandLockup({
  tone = "clair",
  height = 96,
  priority = false,
  className,
}: BrandLockupProps) {
  const src = tone === "sombre" ? "/brand/ugptn-logo-light.png" : "/brand/ugptn-logo.png";

  return (
    <Image
      src={src}
      alt="UGPTN — Unité de Gestion du Projet de Transformation Numérique"
      width={Math.round(height * RATIO)}
      height={height}
      // `priority` uniquement là où le logo est l'élément principal de la
      // page : ailleurs il entrerait en concurrence avec le contenu utile.
      priority={priority}
      // Ré-encodage désactivé. next/image sert par défaut du WebP à q=75 :
      // sur un logo, cette compression avec perte fabrique des salissures —
      // un trait parasite apparaissait sous le lettrage, absent du fichier
      // source. L'actif est déjà détouré, dimensionné pour les écrans 2× et
      // compressé par `npm run logo` ; l'optimiseur n'a rien à y gagner.
      unoptimized
      // Pas de `self-start` : il forçait l'alignement en haut à gauche et
      // empêchait le conteneur de centrer la marque. `shrink-0` suffit à
      // préserver le rapport ; l'alignement appartient au parent.
      className={cn("block shrink-0", className)}
    />
  );
}
