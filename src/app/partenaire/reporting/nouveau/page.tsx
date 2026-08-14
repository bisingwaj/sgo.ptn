import { AuthGate } from "@/components/auth/AuthGate";
import { RapportWizardClient } from "./RapportWizardClient";

export const metadata = { title: "Nouveau rapport · Espace partenaire · PTN-RDC" };

export default function NouveauRapportPage() {
  return (
    <AuthGate>
      <RapportWizardClient />
    </AuthGate>
  );
}
