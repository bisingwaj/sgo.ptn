import { Shell } from "@/components/shell/Shell";
import { PreferencesClient } from "./PreferencesClient";

export const metadata = { title: "Préférences notifications · Espace partenaire · PTN-RDC" };

export default function PreferencesPage() {
  return (
    <Shell
      crumbs={[
        { label: "Espace partenaire", href: "/partenaire" },
        { label: "Notifications", href: "/partenaire/notifications" },
        { label: "Préférences" },
      ]}
    >
      <PreferencesClient />
    </Shell>
  );
}
