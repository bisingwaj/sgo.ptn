import Image from "next/image";
import { cn } from "@/lib/cn";

/**
 * Marques des ministères partenaires.
 *
 * Hiérarchie voulue : l'UGPTN est la marque de la plateforme, ces deux-là
 * l'accompagnent. Trois moyens y concourent, tous délibérés :
 *
 *   1. la taille — un tiers de la hauteur de la signature UGPTN ;
 *   2. l'aplat blanc sur fond sombre, qui les fait lire comme des signes et
 *      non comme des illustrations ; deux armoiries en couleurs à côté du
 *      logo principal produiraient trois foyers d'attention concurrents ;
 *   3. la mention « Sous la tutelle de », qui énonce le rapport plutôt que
 *      de le laisser deviner.
 *
 * Le MPTN est le ministère de tutelle au sens du MEP § 3.1 ; il est nommé en
 * premier.
 */

interface Partner {
  src: string;
  monoSrc: string;
  alt: string;
  /** Rapport largeur/hauteur du fichier livré. */
  ratio: number;
}

const PARTNERS: Partner[] = [
  {
    src: "/brand/ptntic.png",
    monoSrc: "/brand/ptntic-mono.png",
    alt: "Ministère des Postes et Télécommunications",
    ratio: 290 / 112,
  },
  {
    src: "/brand/eco-num.png",
    monoSrc: "/brand/eco-num-mono.png",
    alt: "Ministère de l'Économie Numérique",
    ratio: 236 / 112,
  },
];

interface PartnerMarksProps {
  /** `sombre` bascule sur les aplats blancs. */
  tone?: "clair" | "sombre";
  /** Hauteur des marques, en pixels. */
  height?: number;
  className?: string;
}

export function PartnerMarks({
  tone = "sombre",
  // 38 px et non 30 : sous cette taille, « MINISTÈRE DES POSTES ET
  // TÉLÉCOMMUNICATIONS » composé sur trois lignes tombe sous le seuil de
  // lisibilité, et une marque qu'on ne peut pas lire ne remplit plus sa
  // fonction — elle n'est plus qu'une tache.
  height = 38,
  className,
}: PartnerMarksProps) {
  const dark = tone === "sombre";

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <p
        className={cn(
          "text-caption tracking-wide uppercase",
          dark ? "text-white/40" : "text-helper",
        )}
      >
        Sous la tutelle de
      </p>
      <div className="flex flex-wrap items-center gap-x-7 gap-y-4">
        {PARTNERS.map((p) => (
          <Image
            key={p.src}
            src={dark ? p.monoSrc : p.src}
            alt={p.alt}
            width={Math.round(height * p.ratio)}
            height={height}
            // Même raison que pour la signature : pas de ré-encodage avec
            // perte sur une marque déjà dimensionnée et compressée.
            unoptimized
            className={cn(
              "block shrink-0",
              // Légèrement en retrait au repos, pleine présence au survol :
              // les marques restent lisibles sans capter l'œil en permanence.
              dark && "opacity-70 transition-opacity duration-150 hover:opacity-100",
            )}
          />
        ))}
      </div>
    </div>
  );
}
