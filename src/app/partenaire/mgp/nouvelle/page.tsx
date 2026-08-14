import { AuthGate } from "@/components/auth/AuthGate";
import { PlainteWizardClient } from "./PlainteWizardClient";

export const metadata = { title: "Nouvelle plainte · MGP · PTN-RDC" };

export default function NouvellePlaintePage() {
  return (
    <AuthGate>
      <PlainteWizardClient />
    </AuthGate>
  );
}
