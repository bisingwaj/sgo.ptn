import { Suspense } from "react";
import { ProposalWizardClient } from "./ProposalWizardClient";

export const metadata = {
  title: "Proposer une initiative · PTN-RDC",
};

export default function NewInitiativePage() {
  return (
    <Suspense>
      <ProposalWizardClient />
    </Suspense>
  );
}
