"use client";

import { useRouter } from "next/navigation";
import { Wizard, type WizardStep } from "@/components/wizard/Wizard";
import { useToast } from "@/components/toast/ToastContext";
import {
  Field,
  Input,
  Textarea,
  Segmented,
  SelectableTile,
  CheckRow,
} from "@/components/wizard/WizardFields";
import { DropdownPicker } from "@/components/ui/DropdownPicker";
import {
  Voicemail,
  Locked,
  CheckmarkFilled,
  Information,
  Email,
  Phone,
} from "@carbon/icons-react";

interface PlainteState {
  category: string;
  province: string;
  subject: string;
  description: string;
  date: string;
  proposition: string;
  identityMode: "anonymous" | "identified";
  name: string;
  email: string;
  phone: string;
  preferredChannel: "email" | "phone" | "physical";
  consent: boolean;
}

const INITIAL: PlainteState = {
  category: "",
  province: "",
  subject: "",
  description: "",
  date: "",
  proposition: "",
  identityMode: "identified",
  name: "",
  email: "",
  phone: "",
  preferredChannel: "email",
  consent: false,
};

const CATEGORIES = [
  {
    id: "qualite",
    tag: "QUALITÉ",
    title: "Qualité de service",
    description: "Coupure, lenteur, accès partiel ou indisponibilité d'un service numérique du PTN.",
  },
  {
    id: "info",
    tag: "INFO",
    title: "Demande d'information",
    description: "Question sur le calendrier, la procédure, les bénéficiaires, l'éligibilité.",
  },
  {
    id: "consultation",
    tag: "CONSULT.",
    title: "Consultation publique",
    description: "Remarque sur un TDR, un DAO ou une consultation publique en cours.",
  },
  {
    id: "fiduciaire",
    tag: "FIDUC.",
    title: "Fiduciaire / paiement",
    description: "Réclamation paiement fournisseur, retard, désaccord sur un montant.",
  },
  {
    id: "amelioration",
    tag: "AMÉL.",
    title: "Suggestion d'amélioration",
    description: "Idée pour améliorer un service, un processus, une activité du PTN-RDC.",
  },
  {
    id: "autre",
    tag: "AUTRE",
    title: "Autre",
    description: "Tout autre objet ne rentrant pas dans les catégories précédentes.",
  },
];

const PROPOSITIONS = [
  { value: "", label: "Sans rattachement à une proposition" },
  { value: "PROP-2026-019", label: "PROP-2026-019 · Plateforme identité numérique" },
  { value: "PROP-2026-014", label: "PROP-2026-014 · PGES Datacenter" },
  { value: "PROP-2026-011", label: "PROP-2026-011 · Atelier ID4Africa" },
  { value: "PROP-2026-007", label: "PROP-2026-007 · Modernisation registre" },
];

function buildSteps(): WizardStep<PlainteState>[] {
  return [
    {
      num: "01",
      label: "Catégorie",
      sub: "Choisissez l'objet de votre plainte ou suggestion",
      validate: (s) => (s.category ? null : "Sélectionnez une catégorie."),
      render: (s, set) => (
        <>
          <div
            style={{
              background: "var(--ptn-status-danger-surface)",
              borderLeft: "2px solid var(--ptn-status-danger)",
              padding: "12px 16px",
              marginBottom: 16,
              fontSize: 12,
              color: "var(--cds-text-primary)",
              lineHeight: 1.55,
              display: "flex",
              gap: 12,
              alignItems: "flex-start",
            }}
          >
            <Locked size={16} aria-hidden style={{ color: "var(--ptn-status-danger)", flexShrink: 0, marginTop: 2 }} />
            <div>
              <strong>Plainte EAS-HS ?</strong> Si votre plainte concerne une violence basée sur
              le genre, un harcèlement ou une exploitation sexuelle, utilisez le canal
              confidentiel dédié — vie privée et anonymat garantis.{" "}
              <a
                href="/mgp-eas-hs"
                style={{ color: "var(--ptn-status-danger)", textDecoration: "underline" }}
              >
                Accéder au canal confidentiel →
              </a>
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 8,
            }}
          >
            {CATEGORIES.map((c) => (
              <SelectableTile
                key={c.id}
                tag={c.tag}
                title={c.title}
                description={c.description}
                selected={s.category === c.id}
                onClick={() => set({ ...s, category: c.id })}
              />
            ))}
          </div>
        </>
      ),
    },
    {
      num: "02",
      label: "Détails",
      sub: "Décrivez précisément votre situation",
      validate: (s) =>
        s.subject && s.description.length >= 30
          ? null
          : "Renseignez l'objet et une description d'au moins 30 caractères.",
      render: (s, set) => (
        <div style={{ display: "grid", gap: 16 }}>
          <Field label="Objet" required helper="Une phrase courte (max 120 caractères).">
            <Input
              value={s.subject}
              onChange={(e) => set({ ...s, subject: e.target.value })}
              maxLength={120}
              placeholder="ex. Coupure d'accès internet sur le site de Lubumbashi"
            />
          </Field>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <Field label="Province concernée">
              <DropdownPicker
                value={s.province}
                onChange={(v) => set({ ...s, province: v })}
                options={[
                  { value: "kinshasa", label: "Kinshasa", sub: "Capitale" },
                  { value: "kongo-central", label: "Kongo-Central", sub: "Sud-Ouest" },
                  { value: "haut-katanga", label: "Haut-Katanga", sub: "Lubumbashi" },
                  { value: "nord-kivu", label: "Nord-Kivu", sub: "Goma" },
                  { value: "national", label: "Couverture nationale", sub: "26 provinces" },
                  { value: "autre", label: "Autre / non applicable", sub: "" },
                ]}
                placeholder="Sélectionner"
                searchable
                ariaLabel="Province concernée"
              />
            </Field>
            <Field label="Date du fait">
              <Input
                type="date"
                value={s.date}
                onChange={(e) => set({ ...s, date: e.target.value })}
              />
            </Field>
          </div>

          <Field label="Proposition liée (facultatif)">
            <DropdownPicker
              value={s.proposition}
              onChange={(v) => set({ ...s, proposition: v })}
              options={PROPOSITIONS}
              placeholder="Aucune proposition liée"
              searchable
              ariaLabel="Proposition liée"
            />
          </Field>

          <Field
            label="Description détaillée"
            required
            helper="Décrivez les faits, les personnes/services concernés, les dates, les conséquences. Plus la description est précise, plus le traitement sera rapide."
          >
            <Textarea
              rows={8}
              value={s.description}
              onChange={(e) => set({ ...s, description: e.target.value })}
              placeholder="Le 06 mai à 14h00, l'accès internet du site de Lubumbashi a été interrompu. Plusieurs agents n'ont pas pu accéder…"
            />
          </Field>
        </div>
      ),
    },
    {
      num: "03",
      label: "Identité",
      sub: "Anonyme ou identifié — votre choix est respecté",
      validate: (s) => {
        if (s.identityMode === "anonymous") return null;
        if (!s.name || (!s.email && !s.phone))
          return "Renseignez votre nom et au moins un canal (email ou téléphone).";
        return null;
      },
      render: (s, set) => (
        <div style={{ display: "grid", gap: 16 }}>
          <Field
            label="Mode de dépôt"
            required
            helper="Le canal anonyme garantit qu'aucune information vous identifiant n'est conservée."
          >
            <Segmented
              value={s.identityMode}
              onChange={(v) => set({ ...s, identityMode: v as "anonymous" | "identified" })}
              ariaLabel="Mode d'identification"
              options={[
                { value: "identified", label: "Avec identification" },
                { value: "anonymous", label: "Anonyme" },
              ]}
            />
          </Field>

          {s.identityMode === "anonymous" ? (
            <div
              style={{
                background: "var(--cds-layer-accent-01)",
                padding: "16px 20px",
                fontSize: 13,
                color: "var(--cds-text-secondary)",
                lineHeight: 1.55,
                display: "flex",
                gap: 12,
                alignItems: "flex-start",
              }}
            >
              <Information size={16} aria-hidden style={{ flexShrink: 0, marginTop: 2 }} />
              <div>
                <strong style={{ color: "var(--cds-text-primary)" }}>
                  Mode anonyme activé.
                </strong>{" "}
                Aucune donnée personnelle ne sera collectée. Un code unique vous sera fourni à
                la fin du dépôt pour suivre l&apos;avancement de votre plainte sans révéler votre
                identité.
              </div>
            </div>
          ) : (
            <>
              <Field label="Nom complet" required>
                <Input
                  value={s.name}
                  onChange={(e) => set({ ...s, name: e.target.value })}
                  placeholder="ex. M. Marie Kabongo"
                />
              </Field>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <Field
                  label="Email"
                  helper={
                    <>
                      Pour la réponse écrite. Au moins l&apos;un des deux (email ou téléphone)
                      requis.
                    </>
                  }
                >
                  <Input
                    type="email"
                    value={s.email}
                    onChange={(e) => set({ ...s, email: e.target.value })}
                    placeholder="vous@example.cd"
                  />
                </Field>
                <Field label="Téléphone">
                  <Input
                    type="tel"
                    value={s.phone}
                    onChange={(e) => set({ ...s, phone: e.target.value })}
                    placeholder="+243 81 234 56 78"
                  />
                </Field>
              </div>

              <Field label="Canal de réponse préféré">
                <Segmented
                  value={s.preferredChannel}
                  onChange={(v) =>
                    set({ ...s, preferredChannel: v as "email" | "phone" | "physical" })
                  }
                  ariaLabel="Canal préféré"
                  options={[
                    { value: "email", label: "Email" },
                    { value: "phone", label: "Téléphone" },
                    { value: "physical", label: "Rencontre physique" },
                  ]}
                />
              </Field>
            </>
          )}
        </div>
      ),
    },
    {
      num: "04",
      label: "Récapitulatif & dépôt",
      sub: "Vérifiez puis déposez la plainte",
      validate: (s) => (s.consent ? null : "Vous devez accepter le traitement de votre plainte."),
      render: (s, set) => {
        const cat = CATEGORIES.find((c) => c.id === s.category);
        return (
          <div style={{ display: "grid", gap: 16 }}>
            <div
              style={{
                background: "var(--cds-layer)",
                border: "1px solid var(--cds-border-subtle)",
              }}
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "180px 1fr",
                  gap: 16,
                  padding: "12px 16px",
                  borderBottom: "1px solid var(--cds-border-subtle)",
                  fontSize: 13,
                }}
              >
                <span
                  style={{
                    fontSize: 11,
                    textTransform: "uppercase",
                    letterSpacing: "0.32px",
                    color: "var(--cds-text-helper)",
                  }}
                >
                  Catégorie
                </span>
                <span>
                  {cat ? (
                    <>
                      <span
                        className="ptn-mono"
                        style={{ color: "var(--cds-text-helper)", marginRight: 8 }}
                      >
                        {cat.tag}
                      </span>
                      {cat.title}
                    </>
                  ) : (
                    "—"
                  )}
                </span>
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "180px 1fr",
                  gap: 16,
                  padding: "12px 16px",
                  borderBottom: "1px solid var(--cds-border-subtle)",
                  fontSize: 13,
                }}
              >
                <span
                  style={{
                    fontSize: 11,
                    textTransform: "uppercase",
                    letterSpacing: "0.32px",
                    color: "var(--cds-text-helper)",
                  }}
                >
                  Objet
                </span>
                <span>{s.subject || "—"}</span>
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "180px 1fr",
                  gap: 16,
                  padding: "12px 16px",
                  borderBottom: "1px solid var(--cds-border-subtle)",
                  fontSize: 13,
                }}
              >
                <span
                  style={{
                    fontSize: 11,
                    textTransform: "uppercase",
                    letterSpacing: "0.32px",
                    color: "var(--cds-text-helper)",
                  }}
                >
                  Province / Date
                </span>
                <span>
                  {s.province || "—"} · <span className="ptn-mono">{s.date || "—"}</span>
                </span>
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "180px 1fr",
                  gap: 16,
                  padding: "12px 16px",
                  borderBottom: "1px solid var(--cds-border-subtle)",
                  fontSize: 13,
                }}
              >
                <span
                  style={{
                    fontSize: 11,
                    textTransform: "uppercase",
                    letterSpacing: "0.32px",
                    color: "var(--cds-text-helper)",
                  }}
                >
                  Identité
                </span>
                <span>
                  {s.identityMode === "anonymous" ? (
                    <span style={{ color: "var(--ptn-status-danger)" }}>Anonyme</span>
                  ) : (
                    <>
                      {s.name} · {s.email}
                      {s.phone ? ` · ${s.phone}` : ""}
                    </>
                  )}
                </span>
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "180px 1fr",
                  gap: 16,
                  padding: "12px 16px",
                  fontSize: 13,
                }}
              >
                <span
                  style={{
                    fontSize: 11,
                    textTransform: "uppercase",
                    letterSpacing: "0.32px",
                    color: "var(--cds-text-helper)",
                  }}
                >
                  Description
                </span>
                <span style={{ whiteSpace: "pre-wrap", lineHeight: 1.5 }}>
                  {s.description || "—"}
                </span>
              </div>
            </div>

            <div
              style={{
                background: "var(--cds-layer-accent-01)",
                padding: "12px 16px",
                fontSize: 12,
                color: "var(--cds-text-secondary)",
                lineHeight: 1.5,
                display: "flex",
                gap: 12,
                alignItems: "flex-start",
              }}
            >
              <Voicemail size={14} aria-hidden style={{ flexShrink: 0, marginTop: 2 }} />
              <div>
                <strong style={{ color: "var(--cds-text-primary)" }}>SLA</strong> · accusé de
                réception sous 24h, réponse au plus tard sous 10 jours ouvrables (J+10). Référent
                attribué automatiquement. Escalade Coord UGP en cas de désaccord.
              </div>
            </div>

            <CheckRow
              checked={s.consent}
              onChange={(v) => set({ ...s, consent: v })}
              title="J'autorise le traitement de cette plainte conformément au CGES PTN-RDC §6.3 et à la Loi RDC 2023-006"
              description="Vos données seront conservées 5 ans après clôture conformément aux exigences Banque mondiale."
            />
          </div>
        );
      },
    },
  ];
}

export function PlainteWizardClient() {
  const router = useRouter();
  const { toast } = useToast();
  const steps = buildSteps();

  return (
    <Wizard<PlainteState>
      eyebrow="ANIE · NOUVELLE PLAINTE"
      title="Déposer une plainte ou une suggestion"
      subtitle="Mécanisme de Gestion des Plaintes (MGP) — conforme CGES PTN-RDC §6.3 et NES 10 Banque mondiale."
      steps={steps}
      initialState={INITIAL}
      cancelHref="/partenaire/mgp"
      finishLabel="Déposer la plainte"
      headerTrailing={
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontSize: 11,
            color: "var(--cds-text-helper)",
          }}
        >
          <CheckmarkFilled size={14} aria-hidden style={{ color: "var(--ptn-status-success)" }} />
          <span>Audit signé HMAC</span>
          <span>·</span>
          <Email size={14} aria-hidden />
          <span className="ptn-mono">mgp@ptn-rdc.cd</span>
          <span>·</span>
          <Phone size={14} aria-hidden />
          <span className="ptn-mono">+243 81 234 56 78</span>
        </div>
      }
      onFinish={async () => {
        await new Promise((r) => setTimeout(r, 400));
        const newRef = "MGP-2026-043";
        toast({
          tone: "success",
          title: "Plainte enregistrée",
          message: `Réf. ${newRef} · accusé de réception sous 24h · réponse au plus tard sous 10 j ouvrables.`,
          action: {
            label: "Suivre la plainte",
            onClick: () => router.push(`/partenaire/mgp/${newRef}`),
          },
          duration: 6000,
        });
        router.push("/partenaire/mgp");
      }}
    />
  );
}
