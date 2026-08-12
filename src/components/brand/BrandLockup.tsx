import { cn } from "@/lib/cn";

/**
 * Signature institutionnelle UGPTN.
 *
 * Reproduit la structure du logo : lettrage « ugptn », barre d'accent
 * aux couleurs du drapeau RDC, puis le développé du sigle.
 *
 * NOTE — le glyphe cartographique (réseau de nœuds formant la RDC) n'est
 * pas encore intégré : l'asset fourni est en basse définition sur fond
 * blanc opaque. Voir `public/brand/README.md`.
 */

interface BrandLockupProps {
  /** `mark` = lettrage seul · `full` = lettrage + développé du sigle */
  variant?: "mark" | "full";
  /** Sur fond sombre (header Carbon, g100), le lettrage passe en blanc. */
  inverse?: boolean;
  className?: string;
}

export function BrandLockup({
  variant = "mark",
  inverse = false,
  className,
}: BrandLockupProps) {
  return (
    <span
      className={cn("inline-flex items-center gap-3", className)}
      // Une seule étiquette pour l'ensemble : un lecteur d'écran doit
      // annoncer « UGPTN », pas épeler chaque fragment décoratif.
      role="img"
      aria-label="UGPTN — Unité de Gestion du Projet de Transformation Numérique"
    >
      <span
        aria-hidden
        className={cn(
          "font-sans text-heading-03 leading-none font-semibold tracking-tight lowercase",
          // `text-primary` suit le thème : anthracite en g10, quasi-blanc en
          // g100. `--ptn-brand-ink` est réservé aux fonds clairs garantis
          // (impression, page publique), où il ne doit pas s'éclaircir.
          inverse ? "text-white" : "text-primary",
        )}
      >
        ugptn
      </span>

      {variant === "full" && (
        <>
          {/* Barre d'accent — triade du drapeau RDC, reprise du logo. */}
          <span aria-hidden className="flex h-8 w-[3px] flex-col">
            <i className="flex-1 bg-[var(--ptn-drc-blue)]" />
            <i className="flex-1 bg-[var(--ptn-drc-yellow)]" />
            <i className="flex-1 bg-[var(--ptn-drc-red)]" />
          </span>

          <span
            aria-hidden
            className={cn(
              "text-caption max-w-[22ch] leading-tight font-medium uppercase",
              inverse ? "text-white/80" : "text-secondary",
            )}
          >
            Unité de Gestion du Projet de Transformation Numérique
          </span>
        </>
      )}
    </span>
  );
}
