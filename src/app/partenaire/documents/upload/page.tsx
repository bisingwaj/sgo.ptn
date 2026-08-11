import { Shell } from "@/components/shell/Shell";
import { UploadClient } from "./UploadClient";

export const metadata = { title: "Téléverser des documents · Espace partenaire · PTN-RDC" };

export default function UploadPage() {
  return (
    <Shell
      crumbs={[
        { label: "Espace partenaire", href: "/partenaire" },
        { label: "Documents partagés", href: "/partenaire/documents" },
        { label: "Téléverser" },
      ]}
    >
      <UploadClient />
    </Shell>
  );
}
