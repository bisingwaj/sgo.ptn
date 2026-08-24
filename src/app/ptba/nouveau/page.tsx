import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthGate } from "@/components/auth/AuthGate";
import { PtbaWizardClient } from "./PtbaWizardClient";

export const metadata: Metadata = {
  title: "Inscrire une activité · PTBA · PTN-RDC",
  description:
    "Inscription pas à pas d'une activité au plan annuel : composante, identification, couverture, enveloppe, contenu.",
};

/**
 * Parcours plein écran : il ne passe pas par `Shell`, il porte donc
 * `AuthGate` explicitement — comme la rédaction d'un TDR.
 */
export default function NouvelleActivitePage() {
  return (
    <AuthGate>
      {/* `useSearchParams` — l'exercice visé vient de l'URL — impose une
          frontière de suspense en rendu statique. */}
      <Suspense fallback={null}>
        <PtbaWizardClient />
      </Suspense>
    </AuthGate>
  );
}
