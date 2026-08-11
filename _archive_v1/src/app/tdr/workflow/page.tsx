import type { Metadata } from "next";
import { Shell } from "@/components/shell/Shell";
import { WorkflowClient } from "./Client";

export const metadata: Metadata = { title: "Workflow TDR multi-acteurs · PTN-RDC" };

export default function Page() {
  return (
    <Shell
      crumbs={[
        { label: "Accueil", href: "/home" },
        { label: "TDR", href: "/tdr" },
        { label: "Workflow multi-acteurs" },
      ]}
    >
      <WorkflowClient />
    </Shell>
  );
}
