import { AuthGate } from "@/components/auth/AuthGate";
import { PlainteWizardClient } from "./PlainteWizardClient";
import { VoileSelonChemin } from "@/components/etat/VoileDeveloppement";

export const metadata = { title: "Nouvelle plainte · MGP · PTN-RDC" };

export default function NouvellePlaintePage() {
  return (
    <VoileSelonChemin>
      <AuthGate>
      <PlainteWizardClient />
    </AuthGate>
    </VoileSelonChemin>
  );
}
