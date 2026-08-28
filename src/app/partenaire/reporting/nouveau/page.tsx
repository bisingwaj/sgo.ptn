import { AuthGate } from "@/components/auth/AuthGate";
import { RapportWizardClient } from "./RapportWizardClient";
import { VoileSelonChemin } from "@/components/etat/VoileDeveloppement";

export const metadata = { title: "Nouveau rapport · Espace partenaire · PTN-RDC" };

export default function NouveauRapportPage() {
  return (
    <VoileSelonChemin>
      <AuthGate>
      <RapportWizardClient />
    </AuthGate>
    </VoileSelonChemin>
  );
}
