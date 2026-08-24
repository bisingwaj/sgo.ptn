import type { Metadata } from "next";
import { Shell } from "@/components/shell/Shell";
import { AllocationsRedirect } from "./AllocationsRedirect";

export const metadata: Metadata = {
  title: "Allocation annuelle · PTBA · PTN-RDC",
};

/**
 * Ancienne route de l'écran d'allocation, conservée en redirection : les
 * allocations vivent maintenant sur `/ptba/exercices/[year]`, où l'année
 * est explicite. Voir `AllocationsRedirect`.
 */
export default function AllocationsPage() {
  return (
    <Shell
      crumbs={[
        { label: "PTBA", href: "/ptba" },
        { label: "Allocation annuelle" },
      ]}
    >
      <AllocationsRedirect />
    </Shell>
  );
}
