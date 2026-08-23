import { Shell } from "@/components/shell/Shell";
import { AllocationsClient } from "./AllocationsClient";

export const metadata = { title: "Allocation annuelle · PTBA · PTN-RDC" };

export default function AllocationsPage() {
  return (
    <Shell
      crumbs={[
        { label: "PTBA", href: "/ptba" },
        { label: "Allocation annuelle" },
      ]}
    >
      <AllocationsClient />
    </Shell>
  );
}
