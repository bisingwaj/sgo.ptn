import { Shell } from "@/components/shell/Shell";
import { ExercicesClient } from "./ExercicesClient";

export const metadata = { title: "Exercices budgétaires · PTBA · PTN-RDC" };

export default function ExercicesPage() {
  return (
    <Shell crumbs={[{ label: "PTBA", href: "/ptba" }, { label: "Exercices" }]}>
      <ExercicesClient />
    </Shell>
  );
}
