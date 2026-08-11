"use client";

/**
 * Onboarding × 8 profils.
 *
 * Architecture :
 * - Composant Wizard générique partagé
 * - 8 configurations d'étapes (une par profil)
 * - Auto-bascule du data-profile pour l'accent visuel
 * - Redirection vers homePath du profil après finalisation
 */

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Wizard, type WizardStep } from "@/components/wizard/Wizard";
import { useProfile } from "@/components/profile/ProfileContext";
import { useOrganisation } from "@/components/profile/OrganisationContext";
import { Illustration } from "@/components/illustrations/Illustration";
import { PROFILES, type ProfileKey } from "@/lib/profiles";
import { COMPONENTS, ALL_PROVINCES, MDA_GLOSSARY, SUPPORTED_LANGUAGES } from "@/lib/project-data";
import { createInitialState, type OnboardingState } from "@/lib/onboarding-state";
import {
  Field,
  Input,
  Textarea,
  Select,
  Segmented,
  SelectableTile,
  CheckRow,
  SignatureBlock,
  Note,
} from "@/components/wizard/WizardFields";
import { DropdownPicker } from "@/components/ui/DropdownPicker";
import styles from "./onboarding.module.scss";

interface Props {
  profile: ProfileKey;
}

export function OnboardingClient({ profile }: Props) {
  const router = useRouter();
  const { setProfile } = useProfile();
  const { updateOrg } = useOrganisation();
  const config = PROFILES[profile];

  // Apply profile theme
  useEffect(() => {
    document.documentElement.setAttribute("data-profile", profile);
    setProfile(profile);
  }, [profile, setProfile]);

  const initial = createInitialState(profile);

  const onFinish = async (state: OnboardingState) => {
    // Mock submission delay
    await new Promise((r) => setTimeout(r, 600));
    // Marque l'onboarding comme effectué pour ce profil — les prochaines
    // connexions routent directement vers le homePath du profil.
    if (typeof window !== "undefined") {
      window.localStorage.setItem(`ptn-onboarded:${profile}`, "1");
    }

    // Pour le partenaire : persister le profil organisation dans le contexte
    if (profile === "partenaire" && state.organizationName) {
      updateOrg({
        name: state.partenaireSigle || state.organizationName.slice(0, 6).toUpperCase(),
        sigle: state.partenaireSigle || state.organizationName.slice(0, 6).toUpperCase(),
        fullName: state.organizationName,
        rccm: state.rccm || "CD/KIN/RCCM/2024-A-00184",
        nif: state.nif || "A0500127K",
        province: state.province || "Kinshasa",
        email: state.email,
        phone: state.phone,
        kycLevel: state.partenaireKycLevel ?? 1,
      });
    }

    router.push(config.homePath);
  };

  const steps = buildSteps(profile);

  return (
    <Wizard<OnboardingState>
      eyebrow={`ONBOARDING · ${config.short.toUpperCase()}`}
      title={config.label}
      subtitle={config.description}
      steps={steps}
      initialState={initial}
      cancelHref="/login"
      finishLabel="Accéder à mon tableau de bord"
      onFinish={onFinish}
      headerTrailing={
        <div className={styles.headerIllu}>
          <Illustration name={config.illustration as never} size="avatar" ariaLabel={`Profil ${config.short}`} />
        </div>
      }
    />
  );
}

// ============================================================
// Étapes communes — réutilisées
// ============================================================

const identityStep: WizardStep<OnboardingState> = {
  num: "01",
  label: "Identité",
  sub: "Vos informations personnelles",
  validate: (s) => {
    if (!s.firstName.trim() || !s.lastName.trim()) {
      return "Renseignez votre prénom et votre nom.";
    }
    if (!/^\+?[\d\s().-]{8,}$/.test(s.phone)) {
      return "Format de téléphone invalide.";
    }
    if (!s.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.email)) {
      return "Adresse email invalide.";
    }
    return null;
  },
  render: (s, set) => (
    <div className={styles.formStack}>
      <div className={styles.row2}>
        <Field label="Prénom" required>
          <Input
            value={s.firstName}
            onChange={(e) => set({ ...s, firstName: e.target.value })}
            placeholder="Ex. Jean"
            autoComplete="given-name"
          />
        </Field>
        <Field label="Nom" required>
          <Input
            value={s.lastName}
            onChange={(e) => set({ ...s, lastName: e.target.value })}
            placeholder="Ex. Bisingwa"
            autoComplete="family-name"
          />
        </Field>
      </div>

      <div className={styles.row2}>
        <Field label="Email institutionnel" required>
          <Input
            type="email"
            value={s.email}
            onChange={(e) => set({ ...s, email: e.target.value })}
            autoComplete="email"
          />
        </Field>
        <Field label="Téléphone" required helper="Format international avec indicatif pays">
          <Input
            type="tel"
            value={s.phone}
            onChange={(e) => set({ ...s, phone: e.target.value })}
            autoComplete="tel"
          />
        </Field>
      </div>

      <Field label="Langue préférée">
        <Segmented
          ariaLabel="Langue"
          value={s.preferredLanguage}
          onChange={(v) => set({ ...s, preferredLanguage: v as OnboardingState["preferredLanguage"] })}
          options={SUPPORTED_LANGUAGES.map((l) => ({ value: l.code, label: l.label }))}
        />
      </Field>
    </div>
  ),
};

const finalStep = (profile: ProfileKey): WizardStep<OnboardingState> => ({
  num: "04",
  label: "Confirmation",
  sub: "Récapitulatif et accès au tableau de bord",
  render: (s) => {
    const profileConfig = PROFILES[profile];
    return (
      <div className={styles.recapWrap}>
        <div className={styles.recapHero}>
          <Illustration name={profileConfig.illustration as never} size="hero" />
          <div>
            <div className={styles.recapEyebrow}>Vous y êtes presque</div>
            <h3 className={styles.recapTitle}>
              Bienvenue, {s.firstName || "—"} {s.lastName || ""}
            </h3>
            <p className={styles.recapText}>{profileConfig.greeting}</p>
          </div>
        </div>
        <div className={styles.recapGrid}>
          <RecapCard label="Profil" value={profileConfig.label} />
          <RecapCard label="Email" value={s.email || "—"} mono />
          <RecapCard label="Langue" value={SUPPORTED_LANGUAGES.find((l) => l.code === s.preferredLanguage)?.label ?? "—"} />
          {s.componentKey && <RecapCard label="Composante" value={`${s.componentKey} · ${COMPONENTS[s.componentKey].short}`} />}
          {s.organizationName && <RecapCard label="Organisation" value={s.organizationName} />}
          {s.province && <RecapCard label="Province" value={s.province} />}
          {s.bailleurInstitution && <RecapCard label="Institution" value={s.bailleurInstitution} />}
          {s.rccm && <RecapCard label="RCCM" value={s.rccm} mono />}
          {s.sbpType && <RecapCard label="Type structure" value={s.sbpType} />}
          {s.auditFirm && <RecapCard label="Cabinet" value={s.auditFirm} />}
          {s.governanceBody && <RecapCard label="Comité" value={s.governanceBody} />}
        </div>
        <Note tone="info" title="Permissions provisoires">
          Les permissions définitives sont attribuées par l&apos;administrateur UGP après validation.
          Vous accédez immédiatement à votre tableau de bord avec les droits de lecture par défaut.
        </Note>
      </div>
    );
  },
});

function RecapCard({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className={styles.recapCard}>
      <span className={styles.recapLabel}>{label}</span>
      <strong className={`${styles.recapValue} ${mono ? "ptn-mono" : ""}`}>{value}</strong>
    </div>
  );
}

// ============================================================
// Steps builder (par profil)
// ============================================================

function buildSteps(profile: ProfileKey): WizardStep<OnboardingState>[] {
  switch (profile) {
    case "ugp":
      return ugpSteps();
    case "mda":
      return mdaSteps();
    case "partenaire":
      return partenaireSteps();
    case "bailleur":
      return bailleurSteps();
    case "soumissionnaire":
      return soumissionnaireSteps();
    case "sbp":
      return sbpSteps();
    case "auditeur":
      return auditeurSteps();
    case "gouvernance":
      return gouvernanceSteps();
  }
}

// ----- UGP -----
function ugpSteps(): WizardStep<OnboardingState>[] {
  const ROLES = [
    { key: "lecteur", label: "Lecteur", level: { label: "Lecture", tone: "gray" as const }, desc: "Consultation des documents et indicateurs de la composante." },
    { key: "contrib", label: "Contributeur TDR", level: { label: "Édition", tone: "blue" as const }, desc: "Rédaction et co-rédaction des termes de référence." },
    { key: "valid", label: "Validateur", level: { label: "Validation", tone: "green" as const }, desc: "Validation interne avant transmission ANO bailleur." },
    { key: "commis", label: "Membre commission", level: { label: "Validation", tone: "green" as const }, desc: "Membre des commissions d'évaluation des offres." },
    { key: "respc", label: "Responsable composante", level: { label: "Validation", tone: "green" as const }, desc: "Pilotage opérationnel d'une composante PTN-RDC." },
  ];

  return [
    identityStep,
    {
      num: "02",
      label: "Composante",
      sub: "Choisissez votre composante d'affectation principale",
      validate: (s) => (s.componentKey ? null : "Sélectionnez une composante."),
      render: (s, set) => (
        <div className={styles.tilesGrid}>
          {(["C1", "C2", "C3", "C4"] as const).map((k) => {
            const c = COMPONENTS[k];
            return (
              <SelectableTile
                key={k}
                tag={k}
                title={c.short}
                description={c.label}
                selected={s.componentKey === k}
                onClick={() => set({ ...s, componentKey: k })}
                metrics={
                  <>
                    <span className="ptn-mono">{c.total} M USD</span>
                    <span>·</span>
                    <span className="ptn-mono">IDA {c.ida}</span>
                    <span>+</span>
                    <span className="ptn-mono">AFD {c.afd}</span>
                  </>
                }
              />
            );
          })}
        </div>
      ),
    },
    {
      num: "03",
      label: "Permissions & engagements",
      sub: "Rôles demandés + signature Code de Conduite + déclaration COI",
      validate: (s) => {
        if (s.selectedRoles.size === 0) return "Sélectionnez au moins un rôle.";
        if (!s.codeOfConductSigned) return "Vous devez signer le Code de Conduite.";
        if (!s.coiDeclared) return "Vous devez compléter la déclaration de conflits d'intérêts.";
        return null;
      },
      render: (s, set) => (
        <div className={styles.formStack}>
          <h3 className={styles.sectionTitle}>Rôles demandés</h3>
          <div className={styles.rolesGrid}>
            {ROLES.map((r) => (
              <CheckRow
                key={r.key}
                checked={s.selectedRoles.has(r.key)}
                onChange={(ch) => {
                  const next = new Set(s.selectedRoles);
                  if (ch) next.add(r.key);
                  else next.delete(r.key);
                  set({ ...s, selectedRoles: next });
                }}
                title={r.label}
                description={r.desc}
                level={r.level}
              />
            ))}
          </div>
          <Note tone="warning" title="Permissions provisoires">
            Les permissions définitives sont attribuées par l&apos;administrateur UGP après revue.
          </Note>
          <h3 className={styles.sectionTitle} style={{ marginTop: 16 }}>Engagements</h3>
          <SignatureBlock
            title="Code de Conduite UGP-PTN"
            text={
              <>
                Je m&apos;engage à respecter le Code de Conduite du PTN-RDC : intégrité dans
                la passation des marchés (MEP § 5.2.8), confidentialité des informations,
                non-discrimination, lutte contre l&apos;EAS/HS, signalement de toute
                irrégularité au MGP. Toute violation peut entraîner sanctions disciplinaires
                et résiliation immédiate.
              </>
            }
            signed={s.codeOfConductSigned}
            onSign={() => set({ ...s, codeOfConductSigned: true })}
            signerName={`${s.firstName} ${s.lastName}`.trim() || "—"}
          />
          <SignatureBlock
            title="Déclaration de conflits d'intérêts (COI)"
            text={
              <>
                Je déclare ne détenir aucun intérêt direct ou indirect, financier ou familial,
                avec une entreprise candidate ou un consultant susceptible d&apos;être attribué
                d&apos;un marché PTN-RDC. Toute évolution de ma situation sera notifiée sans
                délai au Coordonnateur UGP. Cette déclaration est renouvelée annuellement.
              </>
            }
            signed={s.coiDeclared}
            onSign={() => set({ ...s, coiDeclared: true })}
            signerName={`${s.firstName} ${s.lastName}`.trim() || "—"}
          />
        </div>
      ),
    },
    finalStep("ugp"),
  ];
}

// ----- MDA -----
function mdaSteps(): WizardStep<OnboardingState>[] {
  return [
    identityStep,
    {
      num: "02",
      label: "Ministère & affectation",
      sub: "Identifiez votre ministère sectoriel bénéficiaire",
      validate: (s) => (!s.organizationName ? "Renseignez votre ministère / agence." : null),
      render: (s, set) => (
        <div className={styles.formStack}>
          <Field label="Ministère / Agence sectorielle" required>
            <Select
              value={s.organizationName ?? ""}
              onChange={(e) => set({ ...s, organizationName: e.target.value })}
              placeholder="— Sélectionner —"
              options={MDA_GLOSSARY.map((m) => ({ value: m.code, label: `${m.code} — ${m.label}` }))}
            />
          </Field>
          <div className={styles.row2}>
            <Field label="Fonction au sein du ministère" required>
              <Input
                value={s.organizationType ?? ""}
                onChange={(e) => set({ ...s, organizationType: e.target.value })}
                placeholder="Ex. Secrétaire général, Directeur sectoriel…"
              />
            </Field>
            <Field label="Province d'affectation">
              <Select
                value={s.province ?? ""}
                onChange={(e) => set({ ...s, province: e.target.value })}
                placeholder="— Optionnel —"
                options={ALL_PROVINCES.map((p) => ({ value: p, label: p }))}
              />
            </Field>
          </div>
          <Note tone="info">
            Votre ministère est-il déjà inscrit comme entité bénéficiaire ? Si non, contactez
            l&apos;UGP-PTN pour signer un Protocole d&apos;Accord de Collaboration (Annexe 4
            du MEP).
          </Note>
        </div>
      ),
    },
    {
      num: "03",
      label: "Engagement",
      sub: "Code de Conduite et confidentialité",
      validate: (s) => (!s.codeOfConductSigned ? "Vous devez signer le Code de Conduite." : null),
      render: (s, set) => (
        <SignatureBlock
          title="Code de Conduite — Entité bénéficiaire"
          text={
            <>
              En tant que représentant d&apos;un ministère bénéficiaire, je m&apos;engage à
              utiliser les fonds et infrastructures financés par le PTN-RDC exclusivement aux
              fins prévues, à respecter les sauvegardes E&S, et à signaler toute irrégularité
              via le MGP. Je reconnais avoir lu le PEES.
            </>
          }
          signed={s.codeOfConductSigned}
          onSign={() => set({ ...s, codeOfConductSigned: true })}
          signerName={`${s.firstName} ${s.lastName}`.trim() || "—"}
        />
      ),
    },
    finalStep("mda"),
  ];
}

// ----- Partenaire -----
function partenaireSteps(): WizardStep<OnboardingState>[] {
  return [
    identityStep,
    {
      num: "02",
      label: "Organisation",
      sub: "Identifiez votre institution partenaire",
      validate: (s) =>
        !s.organizationName
          ? "Renseignez le nom complet de votre organisation."
          : !s.partenaireSigle
            ? "Renseignez le sigle court (affiché partout sur la plateforme)."
            : null,
      render: (s, set) => (
        <div className={styles.formStack}>
          <Field label="Type d'organisation" required>
            <Segmented
              ariaLabel="Type d'organisation"
              value={s.organizationType ?? ""}
              onChange={(v) => set({ ...s, organizationType: v })}
              options={[
                { value: "agence", label: "Agence publique" },
                { value: "min", label: "Ministère sectoriel" },
                { value: "univ", label: "Université / EES" },
                { value: "osc", label: "OSC / ONG" },
                { value: "fed", label: "Fédération privée" },
              ]}
            />
          </Field>
          <Field
            label="Nom complet de l'organisation"
            required
            helper="Affiché en en-tête de chaque page et dans la sidenav."
          >
            <Input
              value={s.organizationName ?? ""}
              onChange={(e) => set({ ...s, organizationName: e.target.value })}
              placeholder="Ex. Office National d'Identité (ANIE)"
            />
          </Field>
          <Field
            label="Sigle / nom court"
            required
            helper="3 à 8 caractères · utilisé en eyebrow et badge sidenav (ex. ANIE)"
          >
            <Input
              value={s.partenaireSigle ?? ""}
              onChange={(e) => set({ ...s, partenaireSigle: e.target.value.toUpperCase() })}
              maxLength={8}
              placeholder="ANIE"
            />
          </Field>
          <Field label="Province de rattachement">
            <DropdownPicker
              value={s.province ?? ""}
              onChange={(v) => set({ ...s, province: v })}
              options={ALL_PROVINCES.map((p) => ({ value: p, label: p }))}
              placeholder="Sélectionner"
              searchable
              ariaLabel="Province"
            />
          </Field>
        </div>
      ),
    },
    {
      num: "03",
      label: "Identité légale",
      sub: "Documents fiscaux et registres",
      render: (s, set) => (
        <div className={styles.formStack}>
          <Note tone="info">
            Ces informations alimentent votre <strong>KYC institutionnel</strong> et seront
            re-vérifiées par le secrétariat UGP. Champs verrouillés une fois le profil validé.
          </Note>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <Field label="RCCM" helper="Format CD/XXX/RCCM/AAAA-X-NNNNN">
              <Input
                value={s.rccm ?? ""}
                onChange={(e) => set({ ...s, rccm: e.target.value })}
                placeholder="CD/KIN/RCCM/2024-A-00184"
              />
            </Field>
            <Field label="NIF" helper="Numéro d'Identification Fiscale">
              <Input
                value={s.nif ?? ""}
                onChange={(e) => set({ ...s, nif: e.target.value })}
                placeholder="A0500127K"
              />
            </Field>
          </div>
          <Field label="Niveau KYC initial" helper="Le niveau 3 nécessite une vérification UGP (3 j)">
            <Segmented
              ariaLabel="Niveau KYC"
              value={String(s.partenaireKycLevel ?? 1)}
              onChange={(v) =>
                set({ ...s, partenaireKycLevel: Number(v) as 1 | 2 | 3 })
              }
              options={[
                { value: "1", label: "1 — Déclaratif" },
                { value: "2", label: "2 — Vérifié" },
                { value: "3", label: "3 — Signataires habilités" },
              ]}
            />
          </Field>
        </div>
      ),
    },
    {
      num: "04",
      label: "Engagement",
      sub: "Code de Conduite & MGP",
      validate: (s) =>
        !s.codeOfConductSigned
          ? "Vous devez signer le Code de Conduite."
          : !s.dataPrivacyAcknowledged
            ? "Vous devez reconnaître la politique données personnelles."
            : null,
      render: (s, set) => (
        <div className={styles.formStack}>
          <SignatureBlock
            title="Code de Conduite — Partenaire institutionnel"
            text={
              <>
                Je m&apos;engage en tant que représentant de mon organisation partenaire à
                respecter les standards d&apos;intégrité du PTN-RDC. Mes propositions de TDR
                suivront le workflow officiel (Brouillon → Soumission UGP → Arbitrage UGP →
                Intégration PPM → ANO bailleur → Exécution). Je reconnais que toute
                contribution IA est journalisée pour audit (ISO/IEC 42001).
              </>
            }
            signed={s.codeOfConductSigned}
            onSign={() => set({ ...s, codeOfConductSigned: true })}
            signerName={`${s.firstName} ${s.lastName}`.trim() || "—"}
          />
          <CheckRow
            checked={s.dataPrivacyAcknowledged}
            onChange={(v) => set({ ...s, dataPrivacyAcknowledged: v })}
            title="Loi RDC 2023-006 sur la protection des données personnelles"
            description="Je reconnais que mes données et celles de mon organisation sont conservées 5 ans après clôture du projet."
          />
          <Note tone="info">
            Pour toute violence, harcèlement ou abus sexuel, un canal{" "}
            <strong>EAS-HS confidentiel</strong> distinct est disponible (anonymat garanti).
            Accessible depuis l&apos;Espace partenaire → MGP.
          </Note>
        </div>
      ),
    },
    {
      num: "05",
      label: "Découverte",
      sub: "Aperçu de votre espace partenaire",
      render: () => (
        <div className={styles.formStack}>
          <Note tone="ai">
            Votre espace partenaire est prêt. Voici les modules à votre disposition :
          </Note>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, 1fr)",
              gap: 1,
              background: "var(--cds-border-subtle)",
              border: "1px solid var(--cds-border-subtle)",
            }}
          >
            {[
              {
                title: "Mes propositions",
                desc: "Liste filtrable de vos TDR, statut + étape pipeline en un coup d'œil.",
              },
              {
                title: "Wizard TDR ✦ IA",
                desc: "8 étapes guidées · brouillon IA · vérification cohérence MEP/PTBA.",
              },
              {
                title: "Workflow multi-acteurs",
                desc: "Pipeline 6 étapes par proposition · acteurs UGP/Bailleur/Partenaire.",
              },
              {
                title: "Modèles TDR",
                desc: "Bibliothèque de 24 modèles éprouvés ANO · délai moyen 9,4 j.",
              },
              {
                title: "Document IA éditable",
                desc: "Éditeur Tiptap · diffs IA acceptables/refusables · audit HMAC.",
              },
              {
                title: "Messages & MGP",
                desc: "Messagerie UGP officielle + canal MGP standard et EAS-HS confidentiel.",
              },
            ].map((m) => (
              <div
                key={m.title}
                style={{
                  background: "var(--cds-layer)",
                  padding: "14px 16px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 4,
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 500 }}>{m.title}</div>
                <div style={{ fontSize: 12, color: "var(--cds-text-secondary)", lineHeight: 1.45 }}>
                  {m.desc}
                </div>
              </div>
            ))}
          </div>
        </div>
      ),
    },
    finalStep("partenaire"),
  ];
}

// ----- Bailleur -----
function bailleurSteps(): WizardStep<OnboardingState>[] {
  return [
    identityStep,
    {
      num: "02",
      label: "Institution",
      sub: "Choisissez votre institution et zone d'expertise",
      validate: (s) => (!s.bailleurInstitution ? "Sélectionnez une institution." : null),
      render: (s, set) => (
        <div className={styles.formStack}>
          <Field label="Institution" required>
            <Segmented
              ariaLabel="Institution bailleur"
              value={s.bailleurInstitution ?? ""}
              onChange={(v) => set({ ...s, bailleurInstitution: v as "BM" | "AFD" | "CONJOINT" })}
              options={[
                { value: "BM", label: "Banque mondiale (IDA)" },
                { value: "AFD", label: "Agence Française de Développement" },
                { value: "CONJOINT", label: "Mission conjointe BM·AFD" },
              ]}
            />
          </Field>
          <Field label="Zone d'expertise" helper="Domaines techniques que vous suivez sur le PTN-RDC">
            <Input
              value={s.bailleurExpertise ?? ""}
              onChange={(e) => set({ ...s, bailleurExpertise: e.target.value })}
              placeholder="Ex. Connectivité fibre, Gouvernance numérique, E&S…"
            />
          </Field>
          <Note tone="info" title="Périmètre d'action bailleur">
            En tant que bailleur, vous consultez la documentation projet et émettez des Avis
            de Non-Objection. Vous ne rédigez pas de TDR — cette responsabilité incombe à
            l&apos;UGP, aux partenaires et aux bénéficiaires SBP.
          </Note>
        </div>
      ),
    },
    finalStep("bailleur"),
  ];
}

// ----- Soumissionnaire (5 étapes) -----
function soumissionnaireSteps(): WizardStep<OnboardingState>[] {
  return [
    {
      num: "01",
      label: "Représentant légal",
      sub: "Vous êtes le contact principal pour cette entreprise",
      validate: identityStep.validate,
      render: identityStep.render,
    },
    {
      num: "02",
      label: "Société",
      sub: "Identifiants légaux et forme juridique",
      validate: (s) => {
        if (!s.organizationName?.trim()) return "Renseignez la raison sociale.";
        if (!s.rccm?.trim()) return "Renseignez le numéro RCCM.";
        if (!s.nif?.trim()) return "Renseignez le NIF (numéro d'identification fiscale).";
        return null;
      },
      render: (s, set) => (
        <div className={styles.formStack}>
          <Field label="Raison sociale" required>
            <Input
              value={s.organizationName ?? ""}
              onChange={(e) => set({ ...s, organizationName: e.target.value })}
              placeholder="Ex. DigitalCongo Sarl"
            />
          </Field>
          <div className={styles.row2}>
            <Field label="N° RCCM" required helper="Registre du Commerce et du Crédit Mobilier">
              <Input
                value={s.rccm ?? ""}
                onChange={(e) => set({ ...s, rccm: e.target.value })}
                placeholder="Ex. CD/KIN/RCCM/14-A-1234"
                className="ptn-mono"
              />
            </Field>
            <Field label="NIF" required>
              <Input
                value={s.nif ?? ""}
                onChange={(e) => set({ ...s, nif: e.target.value })}
                placeholder="Ex. A0123456 X"
                className="ptn-mono"
              />
            </Field>
          </div>
          <Field label="Forme juridique" required>
            <Segmented
              ariaLabel="Forme juridique"
              value={s.legalForm ?? "SARL"}
              onChange={(v) => set({ ...s, legalForm: v as "SA" | "SARL" | "SNC" | "Autre" })}
              options={[
                { value: "SA", label: "SA" },
                { value: "SARL", label: "SARL" },
                { value: "SNC", label: "SNC" },
                { value: "Autre", label: "Autre" },
              ]}
            />
          </Field>
        </div>
      ),
    },
    {
      num: "03",
      label: "Capacités",
      sub: "Secteurs d'activité, effectif, chiffre d'affaires",
      render: (s, set) => (
        <div className={styles.formStack}>
          <Field label="Secteurs d'activité (multi-sélection)" helper="Ex. Travaux, Conseil, Fournitures, Numérique…">
            <Input
              value={(s.sectors ?? []).join(", ")}
              onChange={(e) =>
                set({
                  ...s,
                  sectors: e.target.value.split(",").map((v) => v.trim()).filter(Boolean),
                })
              }
              placeholder="Travaux, Numérique, Conseil"
            />
          </Field>
          <div className={styles.row2}>
            <Field label="Effectif">
              <Input
                type="number"
                min={0}
                value={s.employeeCount ?? ""}
                onChange={(e) => set({ ...s, employeeCount: Number(e.target.value) })}
                placeholder="Ex. 24"
              />
            </Field>
            <Field label="Chiffre d'affaires N-1 (USD)">
              <Input
                type="number"
                min={0}
                value={s.yearlyRevenue ?? ""}
                onChange={(e) => set({ ...s, yearlyRevenue: Number(e.target.value) })}
                placeholder="Ex. 1500000"
              />
            </Field>
          </div>
          <Note tone="info">
            Vos références projets et CV des experts clés seront ajoutés ultérieurement
            depuis votre espace soumissionnaire.
          </Note>
        </div>
      ),
    },
    {
      num: "04",
      label: "Engagements",
      sub: "KYC, anti-corruption, EAS/HS",
      validate: (s) => {
        if (!s.codeOfConductSigned) return "Vous devez signer le Code de Conduite.";
        if (!s.dataPrivacyAcknowledged) return "Vous devez accepter la politique de confidentialité.";
        return null;
      },
      render: (s, set) => (
        <div className={styles.formStack}>
          <SignatureBlock
            title="Code de Conduite — Soumissionnaire"
            text={
              <>
                Notre entreprise s&apos;engage à respecter les principes d&apos;intégrité,
                d&apos;équité et de transparence dans la passation des marchés. Nous
                déclarons ne pas être en situation de débarrement par la Banque mondiale ou
                tout autre bailleur, et acceptons le code anti-corruption et anti-EAS/HS du
                PTN-RDC.
              </>
            }
            signed={s.codeOfConductSigned}
            onSign={() => set({ ...s, codeOfConductSigned: true })}
            signerName={s.organizationName || "—"}
          />
          <CheckRow
            checked={s.dataPrivacyAcknowledged}
            onChange={(ch) => set({ ...s, dataPrivacyAcknowledged: ch })}
            title="Politique de confidentialité"
            description="J'accepte le traitement de mes données pour les besoins de la passation des marchés PTN-RDC."
          />
        </div>
      ),
    },
    finalStep("soumissionnaire"),
  ];
}

// ----- SBP -----
function sbpSteps(): WizardStep<OnboardingState>[] {
  return [
    identityStep,
    {
      num: "02",
      label: "Structure & profil",
      sub: "EESU, Hub technologique, Startup ou Centre d'innovation ?",
      validate: (s) => (!s.sbpType ? "Sélectionnez le type de votre structure." : null),
      render: (s, set) => (
        <div className={styles.formStack}>
          <div className={styles.tilesGrid}>
            {[
              { k: "EESU", t: "EESU", d: "Espace d'éducation supérieure universitaire" },
              { k: "Hub", t: "Hub technologique", d: "Pôle d'innovation et incubation" },
              { k: "Startup", t: "Startup numérique", d: "Jeune entreprise innovante" },
              { k: "Centre", t: "Centre d'innovation", d: "Centre universitaire ou communautaire" },
            ].map((opt) => (
              <SelectableTile
                key={opt.k}
                tag={opt.k.toUpperCase().slice(0, 4)}
                title={opt.t}
                description={opt.d}
                selected={s.sbpType === opt.k}
                onClick={() => set({ ...s, sbpType: opt.k as "EESU" | "Hub" | "Startup" | "Centre" })}
              />
            ))}
          </div>
          <Field label="Nom de la structure" required>
            <Input
              value={s.organizationName ?? ""}
              onChange={(e) => set({ ...s, organizationName: e.target.value })}
              placeholder="Ex. KIN-LAB Hub Lubumbashi"
            />
          </Field>
          <div className={styles.row2}>
            <Field label="Province">
              <Select
                value={s.province ?? ""}
                onChange={(e) => set({ ...s, province: e.target.value })}
                placeholder="— Sélectionner —"
                options={ALL_PROVINCES.map((p) => ({ value: p, label: p }))}
              />
            </Field>
            <Field label="Bénéficiaires cibles (estimation)">
              <Input
                type="number"
                min={0}
                value={s.participantsTarget ?? ""}
                onChange={(e) => set({ ...s, participantsTarget: Number(e.target.value) })}
                placeholder="Ex. 200"
              />
            </Field>
          </div>
          <CheckRow
            checked={!!s.womanLed}
            onChange={(ch) => set({ ...s, womanLed: ch })}
            title="Structure dirigée par une femme"
            description="Cible PTN-RDC : 30 % des startups SBP soutenues sont dirigées par des femmes (composante 3.2)."
          />
        </div>
      ),
    },
    {
      num: "03",
      label: "Engagement",
      sub: "Code de Conduite SBP",
      validate: (s) => (!s.codeOfConductSigned ? "Vous devez signer le Code de Conduite." : null),
      render: (s, set) => (
        <SignatureBlock
          title="Code de Conduite — Bénéficiaire SBP"
          text={
            <>
              En tant que bénéficiaire de Subventions Basées sur la Performance (SBP), je
              m&apos;engage à utiliser les fonds reçus exclusivement aux fins prévues, à
              fournir les preuves de performance demandées par l&apos;EG-SBP, et à accepter
              les vérifications terrain. Le non-respect peut entraîner la suspension ou
              l&apos;annulation de la subvention (MEP § 3.2.2).
            </>
          }
          signed={s.codeOfConductSigned}
          onSign={() => set({ ...s, codeOfConductSigned: true })}
          signerName={s.organizationName || "—"}
        />
      ),
    },
    finalStep("sbp"),
  ];
}

// ----- Auditeur -----
function auditeurSteps(): WizardStep<OnboardingState>[] {
  return [
    identityStep,
    {
      num: "02",
      label: "Cabinet & mission",
      sub: "Identifiez votre cabinet et le périmètre de votre mission",
      validate: (s) => (!s.auditFirm ? "Renseignez le cabinet d'audit." : null),
      render: (s, set) => (
        <div className={styles.formStack}>
          <Field label="Cabinet / Institution" required>
            <Input
              value={s.auditFirm ?? ""}
              onChange={(e) => set({ ...s, auditFirm: e.target.value })}
              placeholder="Ex. KPMG, EY, Cour des Comptes, IGF, ACE…"
            />
          </Field>
          <Field label="Périmètre de mission">
            <Textarea
              value={s.auditScope ?? ""}
              onChange={(e) => set({ ...s, auditScope: e.target.value })}
              placeholder="Ex. Audit externe annuel exercice 2026 ; mission TPM Backbone Goma-Bukavu…"
              rows={3}
            />
          </Field>
          <Field label="Accréditation / Référence" helper="Numéro d'agrément ou référence officielle">
            <Input
              value={s.auditAccreditation ?? ""}
              onChange={(e) => set({ ...s, auditAccreditation: e.target.value })}
              placeholder="Ex. ICCAEC-2026-014"
              className="ptn-mono"
            />
          </Field>
        </div>
      ),
    },
    {
      num: "03",
      label: "Lecture seule",
      sub: "Reconnaissance du périmètre d'accès",
      validate: (s) =>
        !s.readOnlyAcknowledged
          ? "Vous devez reconnaître le périmètre lecture seule."
          : null,
      render: (s, set) => (
        <div className={styles.formStack}>
          <Note tone="warning" title="Périmètre strictement lecture seule">
            En tant qu&apos;auditeur, votre accès à la plateforme est <strong>strictement
            lecture seule</strong>. Aucune édition, suppression ou export non-signé
            n&apos;est possible. Toutes vos consultations sont enregistrées dans
            l&apos;audit trail. Les données du canal MGP-EAS/HS confidentiel ne vous sont
            pas accessibles (statistiques agrégées uniquement).
          </Note>
          <CheckRow
            checked={s.readOnlyAcknowledged}
            onChange={(ch) => set({ ...s, readOnlyAcknowledged: ch })}
            title="Je reconnais le périmètre lecture seule"
            description="J'accepte que toutes mes consultations soient tracées et auditables, et que mes exports soient cryptographiquement signés (HMAC + horodatage)."
          />
          <CheckRow
            checked={s.dataPrivacyAcknowledged}
            onChange={(ch) => set({ ...s, dataPrivacyAcknowledged: ch })}
            title="Confidentialité des données auditées"
            description="Je m'engage à ne divulguer aucune information à des tiers en dehors des livrables officiels de la mission."
          />
        </div>
      ),
    },
    finalStep("auditeur"),
  ];
}

// ----- Gouvernance (COPIL/CTP) -----
function gouvernanceSteps(): WizardStep<OnboardingState>[] {
  return [
    identityStep,
    {
      num: "02",
      label: "Comité & mandat",
      sub: "COPIL stratégique ou CTP technique ?",
      validate: (s) => (!s.governanceBody ? "Sélectionnez un comité." : null),
      render: (s, set) => (
        <div className={styles.formStack}>
          <Field label="Comité" required>
            <Segmented
              ariaLabel="Comité"
              value={s.governanceBody ?? ""}
              onChange={(v) => set({ ...s, governanceBody: v as "COPIL" | "CTP" })}
              options={[
                { value: "COPIL", label: "COPIL — Comité de Pilotage" },
                { value: "CTP", label: "CTP — Comité Technique du Projet" },
              ]}
            />
          </Field>
          <Field label="Institution représentée" required>
            <Select
              value={s.representedInstitution ?? ""}
              onChange={(e) => set({ ...s, representedInstitution: e.target.value })}
              placeholder="— Sélectionner —"
              options={MDA_GLOSSARY.map((m) => ({ value: m.code, label: `${m.code} — ${m.label}` }))}
            />
          </Field>
          <Field label="Mandat / titre dans le comité">
            <Input
              value={s.mandate ?? ""}
              onChange={(e) => set({ ...s, mandate: e.target.value })}
              placeholder="Ex. Représentant titulaire, Suppléant, Président de séance…"
            />
          </Field>
          <Note tone="info" title="Périodicité des sessions">
            COPIL : sessions semestrielles minimum (ordinaires) ou extraordinaires sur
            convocation. CTP : sessions trimestrielles minimum, plus fréquentes selon les
            besoins de la mise en œuvre.
          </Note>
        </div>
      ),
    },
    {
      num: "03",
      label: "Engagement",
      sub: "Confidentialité des délibérations et déclaration COI",
      validate: (s) =>
        !s.codeOfConductSigned || !s.coiDeclared
          ? "Vous devez signer le Code de Conduite et déclarer vos COI."
          : null,
      render: (s, set) => (
        <div className={styles.formStack}>
          <SignatureBlock
            title="Confidentialité des délibérations"
            text={
              <>
                Je m&apos;engage à préserver la confidentialité des délibérations du{" "}
                {s.governanceBody ?? "comité"} jusqu&apos;à publication officielle des PV. Je
                vote selon ma conscience et l&apos;intérêt du projet, sans pression externe,
                conformément à la procédure de prise de décision (consensus, sinon majorité
                simple ou 2/3 selon le comité).
              </>
            }
            signed={s.codeOfConductSigned}
            onSign={() => set({ ...s, codeOfConductSigned: true })}
            signerName={`${s.firstName} ${s.lastName}`.trim() || "—"}
          />
          <SignatureBlock
            title="Déclaration de conflits d'intérêts"
            text={
              <>
                Je déclare ne détenir aucun intérêt direct ou indirect avec un dossier traité
                par le {s.governanceBody}. En cas de conflit, je m&apos;engage à me récuser
                lors de la délibération concernée.
              </>
            }
            signed={s.coiDeclared}
            onSign={() => set({ ...s, coiDeclared: true })}
            signerName={`${s.firstName} ${s.lastName}`.trim() || "—"}
          />
        </div>
      ),
    },
    finalStep("gouvernance"),
  ];
}
