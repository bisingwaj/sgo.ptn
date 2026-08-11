"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Field, Input, Textarea } from "@/components/wizard/WizardFields";
import { DropdownPicker } from "@/components/ui/DropdownPicker";
import { useToast } from "@/components/toast/ToastContext";
import { useOrganisation } from "@/components/profile/OrganisationContext";
import {
  Send,
  AiGenerate,
  Attachment,
  Document,
  CheckmarkFilled,
} from "@carbon/icons-react";
import styles from "../../organisation/edit/edit.module.scss";

const RECIPIENTS = [
  { value: "coord", label: "Coordonnateur UGP — M. Mukendi", sub: "UGP · Coordination" },
  { value: "rpm", label: "RPM UGP — K. Lufima", sub: "UGP · Passation" },
  { value: "ttl-bm", label: "TTL Banque mondiale — S. Adesina", sub: "Bailleur · IDA" },
  { value: "ttl-afd", label: "TTL AFD — L. Bernard", sub: "Bailleur · AFD" },
  { value: "rc1", label: "Responsable Composante 1", sub: "UGP · Accès & inclusion" },
  { value: "rc2", label: "Responsable Composante 2", sub: "UGP · Fondations" },
  { value: "es", label: "Référent E&S UGP — P. Mbongo", sub: "UGP · Sauvegardes" },
];

const CATEGORIES = [
  { value: "proposition", label: "Question sur une proposition", sub: "TDR · DAO" },
  { value: "ano", label: "Suivi ANO bailleur", sub: "BM / AFD" },
  { value: "es", label: "Sauvegardes E&S", sub: "PGES · CGES" },
  { value: "fiduciaire", label: "Fiduciaire / paiement", sub: "Compte désigné" },
  { value: "autre", label: "Autre", sub: "Hors catégorie" },
];

const PROPOSITIONS = [
  { value: "", label: "Aucune", sub: "" },
  { value: "PROP-2026-019", label: "Plateforme identité numérique", sub: "PROP-2026-019" },
  { value: "PROP-2026-014", label: "PGES Datacenter", sub: "PROP-2026-014" },
  { value: "PROP-2026-011", label: "Atelier ID4Africa", sub: "PROP-2026-011" },
  { value: "PROP-2026-007", label: "Modernisation registre", sub: "PROP-2026-007" },
];

const PRIORITIES = [
  { value: "low", label: "Faible", sub: "Réponse < 5 j" },
  { value: "normal", label: "Normale", sub: "Réponse < 48h" },
  { value: "urgent", label: "Urgente", sub: "Réponse < 24h" },
];

export function NouveauMessageClient() {
  const router = useRouter();
  const { toast } = useToast();
  const { org } = useOrganisation();

  const [recipient, setRecipient] = useState("");
  const [category, setCategory] = useState("proposition");
  const [proposition, setProposition] = useState("");
  const [priority, setPriority] = useState("normal");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  const handleSend = () => {
    if (!recipient || !subject || !body) {
      toast({
        tone: "warning",
        title: "Champs requis manquants",
        message: "Renseignez le destinataire, l'objet et le corps du message.",
      });
      return;
    }
    toast({
      tone: "success",
      title: "Message envoyé à l'UGP",
      message: "Accusé de réception attendu sous 4h ouvrables. Délai moyen UGP : 9h.",
      duration: 5000,
    });
    setTimeout(() => router.push("/partenaire/messages"), 200);
  };

  return (
    <>
      <div className={styles.headerRow}>
        <div>
          <div className={styles.eyebrow}>{org.sigle.toUpperCase()} · MESSAGERIE UGP</div>
          <h1 className={styles.title}>Nouveau fil de discussion</h1>
          <p className={styles.subtitle}>
            Démarrez un échange officiel avec l&apos;UGP. Tout fil est journalisé et signé pour
            audit.
          </p>
        </div>
        <div className={styles.actionsRow}>
          <Link href="/partenaire/messages" className={styles.btnSecondary}>
            Annuler
          </Link>
          <button type="button" className={styles.btnPrimary} onClick={handleSend}>
            <Send size={16} aria-hidden /> Envoyer
          </button>
        </div>
      </div>

      <div className={styles.layout}>
        <div className={styles.form}>
          <section className={styles.section}>
            <h3 className={styles.sectionH}>Destinataire & objet</h3>
            <div className={styles.grid2}>
              <Field label="Destinataire" required>
                <DropdownPicker
                  value={recipient}
                  onChange={setRecipient}
                  options={RECIPIENTS}
                  placeholder="Sélectionner un destinataire"
                  searchable
                  ariaLabel="Destinataire"
                />
              </Field>
              <Field label="Catégorie">
                <DropdownPicker
                  value={category}
                  onChange={setCategory}
                  options={CATEGORIES}
                  ariaLabel="Catégorie"
                />
              </Field>
              <Field label="Proposition liée (facultatif)">
                <DropdownPicker
                  value={proposition}
                  onChange={setProposition}
                  options={PROPOSITIONS}
                  placeholder="Aucune proposition liée"
                  searchable
                  ariaLabel="Proposition liée"
                />
              </Field>
              <Field label="Niveau de priorité">
                <DropdownPicker
                  value={priority}
                  onChange={setPriority}
                  options={PRIORITIES}
                  ariaLabel="Niveau de priorité"
                />
              </Field>
            </div>

            <div style={{ marginTop: 12 }}>
              <Field label="Objet du message" required>
                <Input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="ex. Clarification sur les profils-clés AMOA Plateforme identité"
                />
              </Field>
            </div>
          </section>

          <section className={styles.section}>
            <h3 className={styles.sectionH}>Message</h3>
            <p className={styles.sectionDesc}>
              Markdown supporté · joignez les pièces nécessaires pour faciliter le traitement.
            </p>
            <Field label="Contenu" required>
              <Textarea
                rows={10}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder={`Bonjour M. Mukendi,\n\nJe reviens vers vous concernant…\n\nCordialement,\n${org.fullName}`}
              />
            </Field>

            <div
              style={{
                display: "flex",
                gap: 8,
                marginTop: 12,
                alignItems: "center",
                fontSize: 12,
                color: "var(--cds-text-helper)",
              }}
            >
              <button
                type="button"
                style={{
                  background: "var(--cds-layer)",
                  border: "1px solid var(--cds-border-subtle)",
                  padding: "6px 12px",
                  fontSize: 12,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <Attachment size={14} aria-hidden /> Joindre un document
              </button>
              <button
                type="button"
                style={{
                  background: "var(--ptn-status-ai-surface)",
                  color: "var(--ptn-status-ai)",
                  border: "1px solid var(--ptn-status-ai)",
                  padding: "6px 12px",
                  fontSize: 12,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <AiGenerate size={14} aria-hidden /> Suggérer un brouillon IA
              </button>
              <span style={{ marginLeft: "auto" }}>0 / 5 pièces jointes · max 10 Mo</span>
            </div>
          </section>

          <div className={styles.formFooter}>
            <Link href="/partenaire/messages" className={styles.btnSecondary}>
              Annuler
            </Link>
            <button type="button" className={styles.btnSecondary}>
              Brouillon
            </button>
            <button type="button" className={styles.btnPrimary} onClick={handleSend}>
              <Send size={16} aria-hidden /> Envoyer
            </button>
          </div>
        </div>

        <aside className={styles.rail}>
          <section className={styles.railCard}>
            <h4 className={styles.railH}>SLA UGP</h4>
            <div
              style={{
                fontSize: 12,
                color: "var(--cds-text-secondary)",
                lineHeight: 1.5,
                display: "flex",
                flexDirection: "column",
                gap: 6,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <CheckmarkFilled size={12} aria-hidden style={{ color: "var(--ptn-status-success)" }} />
                Accusé de réception : sous 4 h ouvrables
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <CheckmarkFilled size={12} aria-hidden style={{ color: "var(--ptn-status-success)" }} />
                Réponse normale : sous 48 h
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <CheckmarkFilled size={12} aria-hidden style={{ color: "var(--ptn-status-success)" }} />
                Délai moyen actuel : 9 h
              </div>
            </div>
          </section>

          <section className={styles.railCard}>
            <h4 className={styles.railH}>
              <Document size={12} aria-hidden style={{ verticalAlign: "middle", marginRight: 4 }} />
              Conseils
            </h4>
            <p className={styles.railP}>
              Pour faciliter le traitement, citez les références exactes (PROP-, DOC-, RPT-),
              indiquez les délais souhaités et joignez les pièces dès le premier message.
            </p>
          </section>
        </aside>
      </div>
    </>
  );
}
