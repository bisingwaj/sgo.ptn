import Link from "next/link";
import { Shell } from "@/components/shell/Shell";
import { PageHeader } from "@/components/ui/PageHeader";
import { MessagesClient } from "./MessagesClient";
import { Add } from "@carbon/icons-react";

export const metadata = { title: "Messages · Espace partenaire · PTN-RDC" };

export default function MessagesPage() {
  return (
    <Shell crumbs={[{ label: "Espace partenaire", href: "/partenaire" }, { label: "Messages" }]}>
      <PageHeader
        eyebrow="ANIE · MESSAGERIE UGP"
        title="Messages & échanges"
        subtitle="Fil de discussion par proposition. Chaque échange est journalisé et signé pour audit."
        meta={
          <>
            <span>
              5 fils actifs · <strong>1 réponse attendue</strong>
            </span>
            <span>·</span>
            <span>
              Délai moyen UGP : <span className="ptn-mono">9 h</span>
            </span>
          </>
        }
        actions={
          <Link
            href="/partenaire/messages/nouveau"
            style={{
              background: "var(--ptn-accent, #0f62fe)",
              color: "#fff",
              border: 0,
              padding: "8px 14px",
              fontSize: 13,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              minHeight: 36,
              textDecoration: "none",
            }}
          >
            <Add size={16} aria-hidden />
            Nouveau fil
          </Link>
        }
      />

      <MessagesClient />
    </Shell>
  );
}
