"use client";

/**
 * Création de compte — parcours administrateur.
 *
 * Ce wizard porte l'acte d'HABILITATION : qui entre, avec quel rôle, sur
 * quel périmètre, pendant combien de temps. Il ne porte pas les
 * ENGAGEMENTS (code de conduite, déclaration de conflit d'intérêts) —
 * ceux-là sont signés par la personne elle-même à sa première connexion,
 * dans le parcours d'onboarding. Un administrateur ne peut pas déclarer
 * un conflit d'intérêts à la place d'un tiers (MEP § 5.2.8).
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  accountsApi,
  referentielApi,
  ApiError,
  type ComponentApi,
  type CreateAccountPayload,
  type CreateAccountResponse,
  type FamilyApi,
  type Guardrail,
  type OrganisationApi,
  type ProfileKeyApi,
  type ProvinceApi,
  type SubroleApi,
} from "@/lib/api";
import { Wizard, type WizardStep } from "@/components/wizard/Wizard";
import { Field, Input, Textarea, SelectableTile, Select, Note } from "@/components/wizard/WizardFields";
import { DropdownPicker } from "@/components/ui/DropdownPicker";
import { useAuth } from "@/components/auth/AuthContext";
import {
  ArrowLeft,
  CheckmarkFilled,
  Copy,
  Locked,
  Time,
  UserFollow,
  WarningAltFilled,
} from "@carbon/icons-react";
import styles from "./create-account.module.scss";

interface FormState {
  // 01 — famille, profil, sous-rôle
  familyKey: string;
  profile: ProfileKeyApi | "";
  subroleCode: string;

  // 02 — identité
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  preferredLanguage: string;

  // 03 — rattachement
  organisationId: string;
  componentCode: string;
  provinceCode: string;

  // 04 — bornage et justification
  missionRef: string;
  validUntil: string;
  justification: string;

  // runtime
  blockers: Guardrail[];
  warnings: Guardrail[];
  checking: boolean;
}

const INITIAL: FormState = {
  familyKey: "",
  profile: "",
  subroleCode: "",
  firstName: "",
  lastName: "",
  email: "",
  phone: "+243 ",
  preferredLanguage: "FR",
  organisationId: "",
  componentCode: "",
  provinceCode: "",
  missionRef: "",
  validUntil: "",
  justification: "",
  blockers: [],
  warnings: [],
  checking: false,
};

function toPayload(s: FormState): CreateAccountPayload {
  return {
    firstName: s.firstName.trim(),
    lastName: s.lastName.trim(),
    email: s.email.trim().toLowerCase(),
    phone: s.phone.trim() === "+243" ? undefined : s.phone.trim() || undefined,
    preferredLanguage: s.preferredLanguage,
    profile: s.profile as ProfileKeyApi,
    subroleCode: s.subroleCode,
    organisationId: s.organisationId,
    componentCode: s.componentCode || undefined,
    provinceCode: s.provinceCode || undefined,
    missionRef: s.missionRef.trim() || undefined,
    validUntil: s.validUntil || undefined,
    justification: s.justification.trim() || undefined,
    isPrimary: true,
  };
}

export function CreateAccountClient() {
  const { can, loading: authLoading, user } = useAuth();

  const [families, setFamilies] = useState<FamilyApi[]>([]);
  const [organisations, setOrganisations] = useState<OrganisationApi[]>([]);
  const [provinces, setProvinces] = useState<ProvinceApi[]>([]);
  const [components, setComponents] = useState<ComponentApi[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [created, setCreated] = useState<CreateAccountResponse | null>(null);

  useEffect(() => {
    if (authLoading || !user) return;
    Promise.all([
      referentielApi.familles(),
      referentielApi.organisations(),
      referentielApi.provinces(),
      referentielApi.composantes(),
    ])
      .then(([f, o, p, c]) => {
        setFamilies(f);
        setOrganisations(o);
        setProvinces(p);
        setComponents(c);
      })
      .catch((error: unknown) =>
        setLoadError(error instanceof Error ? error.message : "Référentiel indisponible."),
      );
  }, [authLoading, user]);

  const findSubrole = useCallback(
    (code: string): SubroleApi | undefined => {
      for (const family of families) {
        for (const profile of family.profiles) {
          const found = profile.subroles.find((s) => s.code === code);
          if (found) return found;
        }
      }
      return undefined;
    },
    [families],
  );

  const steps = useMemo<WizardStep<FormState>[]>(
    () => [
      // ===== 01 · Famille, profil, sous-rôle =====
      {
        num: "01",
        label: "Famille & rôle",
        sub: "Qui est cette personne dans le dispositif du projet",
        validate: (s) =>
          !s.familyKey
            ? "Sélectionnez une famille."
            : !s.profile
              ? "Sélectionnez un profil."
              : !s.subroleCode
                ? "Sélectionnez un sous-rôle."
                : null,
        render: (s, set) => (
          <RoleStep state={s} set={set} families={families} />
        ),
      },

      // ===== 02 · Identité =====
      {
        num: "02",
        label: "Identité",
        sub: "Coordonnées de la personne habilitée",
        validate: (s) => {
          if (s.firstName.trim().length < 2) return "Renseignez le prénom.";
          if (s.lastName.trim().length < 2) return "Renseignez le nom.";
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.email.trim()))
            return "Adresse électronique invalide.";
          return null;
        },
        render: (s, set) => <IdentityStep state={s} set={set} />,
      },

      // ===== 03 · Rattachement =====
      {
        num: "03",
        label: "Rattachement",
        sub: "Organisation, composante et couverture géographique",
        validate: (s) => {
          if (!s.organisationId) return "Sélectionnez une organisation de rattachement.";
          const subrole = findSubrole(s.subroleCode);
          if (subrole?.requiresComponent && !s.componentCode)
            return `« ${subrole.label} » doit être rattaché à une composante.`;
          return null;
        },
        render: (s, set) => (
          <AttachmentStep
            state={s}
            set={set}
            organisations={organisations}
            provinces={provinces}
            components={components}
            subrole={findSubrole(s.subroleCode)}
          />
        ),
      },

      // ===== 04 · Habilitations =====
      {
        num: "04",
        label: "Habilitations",
        sub: "Contrôle des règles institutionnelles du MEP",
        validate: (s) =>
          s.checking
            ? "Vérification en cours…"
            : s.blockers.length > 0
              ? "Des règles institutionnelles bloquent cette habilitation."
              : null,
        render: (s, set) => (
          <GuardrailsStep state={s} set={set} subrole={findSubrole(s.subroleCode)} />
        ),
      },

      // ===== 05 · Récapitulatif =====
      {
        num: "05",
        label: "Récapitulatif",
        sub: "Vérification avant création du compte",
        render: (s) => (
          <SummaryStep
            state={s}
            subrole={findSubrole(s.subroleCode)}
            organisation={organisations.find((o) => o.id === s.organisationId)}
          />
        ),
      },
    ],
    [families, organisations, provinces, components, findSubrole],
  );

  if (authLoading) {
    return <div className={styles.loading}>Chargement de la session…</div>;
  }

  if (!user) {
    return (
      <div className={styles.gate}>
        <Locked size={32} aria-hidden />
        <h1>Session requise</h1>
        <p>Connectez-vous pour accéder à l’administration des comptes.</p>
        <Link href="/login" className={styles.gateLink}>
          Aller à la connexion
        </Link>
      </div>
    );
  }

  if (!can("admin:users")) {
    return (
      <div className={styles.gate}>
        <Locked size={32} aria-hidden />
        <h1>Habilitation insuffisante</h1>
        <p>
          L’administration des comptes est réservée au sous-rôle UGP «&nbsp;Responsable
          Informatique&nbsp;» (permission <code>admin:users</code>).
        </p>
        <p className={styles.gateMeta}>
          Habilitation active : {user.subroleLabel} · {user.organisationName}
        </p>
      </div>
    );
  }

  if (created) {
    return <SuccessPanel result={created} onReset={() => setCreated(null)} />;
  }

  if (loadError) {
    return (
      <div className={styles.gate}>
        <WarningAltFilled size={32} aria-hidden />
        <h1>Référentiel indisponible</h1>
        <p>{loadError}</p>
      </div>
    );
  }

  return (
    <Wizard<FormState>
      eyebrow="ADMINISTRATION · HABILITATIONS"
      title="Créer un compte"
      subtitle="L’administrateur accorde l’habilitation. La personne signera elle-même ses engagements à sa première connexion."
      steps={steps}
      initialState={INITIAL}
      cancelHref="/admin/comptes"
      finishLabel="Créer le compte"
      onFinish={async (state) => {
        try {
          setCreated(await accountsApi.create(toPayload(state)));
        } catch (error) {
          if (error instanceof ApiError && error.blockers.length > 0) {
            throw new Error(error.blockers.map((b) => b.message).join(" · "));
          }
          throw error;
        }
      }}
    />
  );
}

// ============================================================
// Étape 01 — Famille, profil, sous-rôle
// ============================================================

function RoleStep({
  state,
  set,
  families,
}: {
  state: FormState;
  set: (s: FormState) => void;
  families: FamilyApi[];
}) {
  const family = families.find((f) => f.key === state.familyKey);
  const profile = family?.profiles.find((p) => p.key === state.profile);

  return (
    <div className={styles.stack}>
      <Field label="Famille d’acteurs" required helper="Les quatre familles du dispositif PTN-RDC.">
        <div className={styles.tileGrid}>
          {families.map((f) => (
            <SelectableTile
              key={f.key}
              selected={state.familyKey === f.key}
              onClick={() =>
                set({ ...state, familyKey: f.key, profile: "", subroleCode: "", blockers: [], warnings: [] })
              }
              title={f.label}
              description={f.hint}
              tag={`${f.profiles.length} profil${f.profiles.length > 1 ? "s" : ""}`}
            />
          ))}
        </div>
      </Field>

      {family && (
        <Field label="Profil" required helper="Détermine l’espace de travail et la couleur d’accent.">
          <div className={styles.tileGrid}>
            {family.profiles.map((p) => (
              <SelectableTile
                key={p.key}
                selected={state.profile === p.key}
                onClick={() => set({ ...state, profile: p.key, subroleCode: "", blockers: [], warnings: [] })}
                title={p.label}
                description={`${p.subroles.length} sous-rôles disponibles${p.readOnly ? " · lecture seule" : ""}`}
                tag={p.short}
              />
            ))}
          </div>
        </Field>
      )}

      {profile && (
        <Field
          label="Sous-rôle"
          required
          helper="Le sous-rôle détermine les permissions accordées. Les postes uniques et les habilitations sensibles sont signalés."
        >
          <DropdownPicker
            value={state.subroleCode}
            onChange={(code) => set({ ...state, subroleCode: code, blockers: [], warnings: [] })}
            placeholder="Rechercher un sous-rôle…"
            searchable
            options={profile.subroles.map((s) => ({
              value: s.code,
              label: s.label,
              sub: [
                `${s.permissionCount} permissions`,
                s.isUnique ? "poste unique" : null,
                s.isSensitive ? "sensible" : null,
                s.requiresComponent ? "composante requise" : null,
                s.requiresMission ? "mission bornée" : null,
              ]
                .filter(Boolean)
                .join(" · "),
            }))}
          />
        </Field>
      )}
    </div>
  );
}

// ============================================================
// Étape 02 — Identité
// ============================================================

function IdentityStep({ state, set }: { state: FormState; set: (s: FormState) => void }) {
  return (
    <div className={styles.stack}>
      <div className={styles.row2}>
        <Field label="Prénom" required>
          <Input
            value={state.firstName}
            onChange={(e) => set({ ...state, firstName: e.target.value })}
            placeholder="Joseph"
          />
        </Field>
        <Field label="Nom" required>
          <Input
            value={state.lastName}
            onChange={(e) => set({ ...state, lastName: e.target.value })}
            placeholder="Mukendi"
          />
        </Field>
      </div>

      <Field
        label="Adresse électronique"
        required
        helper={
          state.profile === "UGP"
            ? "Les comptes UGP utilisent une adresse en @ptn-rdc.gov.cd."
            : "Servira d’identifiant de connexion."
        }
      >
        <Input
          type="email"
          value={state.email}
          onChange={(e) => set({ ...state, email: e.target.value })}
          placeholder={state.profile === "UGP" ? "j.mukendi@ptn-rdc.gov.cd" : "prenom.nom@organisation.cd"}
        />
      </Field>

      <div className={styles.row2}>
        <Field label="Téléphone" helper="Utile pour transmettre le mot de passe temporaire.">
          <Input
            value={state.phone}
            onChange={(e) => set({ ...state, phone: e.target.value })}
            placeholder="+243 81 234 56 78"
          />
        </Field>
        <Field label="Langue de l’interface">
          <Select
            value={state.preferredLanguage}
            onChange={(e) => set({ ...state, preferredLanguage: e.target.value })}
            options={[
              { value: "FR", label: "Français" },
              { value: "EN", label: "English" },
              { value: "LN", label: "Lingala" },
              { value: "SW", label: "Swahili" },
              { value: "TS", label: "Tshiluba" },
              { value: "KK", label: "Kikongo" },
            ]}
          />
        </Field>
      </div>
    </div>
  );
}

// ============================================================
// Étape 03 — Rattachement
// ============================================================

function AttachmentStep({
  state,
  set,
  organisations,
  provinces,
  components,
  subrole,
}: {
  state: FormState;
  set: (s: FormState) => void;
  organisations: OrganisationApi[];
  provinces: ProvinceApi[];
  components: ComponentApi[];
  subrole?: SubroleApi;
}) {
  return (
    <div className={styles.stack}>
      <Field
        label="Organisation de rattachement"
        required
        helper="Glossaire officiel des MDA et parties prenantes (MEP § 13.1)."
      >
        <DropdownPicker
          value={state.organisationId}
          onChange={(id) => set({ ...state, organisationId: id })}
          placeholder="Rechercher une organisation…"
            searchable
          options={organisations.map((o) => ({
            value: o.id,
            label: `${o.code} — ${o.fullName}`,
            sub: o.type.toLowerCase().replace(/_/g, " "),
          }))}
        />
      </Field>

      <Field
        label="Composante du projet"
        required={subrole?.requiresComponent}
        helper={
          subrole?.requiresComponent
            ? `« ${subrole.label} » pilote une composante : le rattachement est obligatoire.`
            : "Facultatif — restreint le périmètre de travail."
        }
      >
        <Select
          value={state.componentCode}
          onChange={(e) => set({ ...state, componentCode: e.target.value })}
          placeholder="Aucune composante particulière"
          options={components.map((c) => ({
            value: c.code,
            label: `${c.code} · ${c.shortLabel} (${Number(c.totalUsdM)} M USD)`,
          }))}
        />
      </Field>

      <Field label="Province" helper="Pour les agents de liaison et les activités territorialisées.">
        <Select
          value={state.provinceCode}
          onChange={(e) => set({ ...state, provinceCode: e.target.value })}
          placeholder="Couverture nationale"
          options={provinces.map((p) => ({
            value: p.code,
            label: p.isPriorityCpf ? `${p.label} · prioritaire CPF` : p.label,
          }))}
        />
      </Field>
    </div>
  );
}

// ============================================================
// Étape 04 — Habilitations et garde-fous
// ============================================================

function GuardrailsStep({
  state,
  set,
  subrole,
}: {
  state: FormState;
  set: (s: FormState) => void;
  subrole?: SubroleApi;
}) {
  const payloadKey = JSON.stringify(toPayload(state));

  // Le contrôle est délégué au backend : les règles du MEP ne sont pas
  // dupliquées côté client, où elles dériveraient tôt ou tard.
  useEffect(() => {
    let cancelled = false;
    set({ ...state, checking: true });

    accountsApi
      .verify(toPayload(state))
      .then((report) => {
        if (cancelled) return;
        set({ ...state, blockers: report.blockers, warnings: report.warnings, checking: false });
      })
      .catch(() => {
        if (!cancelled) set({ ...state, checking: false });
      });

    return () => {
      cancelled = true;
    };
    // Volontairement dépendant de la seule charge utile : `set` et `state`
    // changent à chaque frappe et relanceraient la vérification en boucle.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payloadKey]);

  return (
    <div className={styles.stack}>
      {subrole && (
        <div className={styles.subroleCard}>
          <div className={styles.subroleHead}>
            <strong>{subrole.label}</strong>
            <span className={`${styles.permCount} ptn-mono`}>
              {subrole.permissionCount} permissions
            </span>
          </div>
          <div className={styles.badgeRow}>
            {subrole.isUnique && <span className={styles.badge}>Poste unique</span>}
            {subrole.isSensitive && (
              <span className={`${styles.badge} ${styles.badgeSensitive}`}>
                <Locked size={12} aria-hidden /> Habilitation sensible
              </span>
            )}
            {subrole.requiresMission && (
              <span className={styles.badge}>
                <Time size={12} aria-hidden /> Mission bornée
              </span>
            )}
            {subrole.incompatibleWith.length > 0 && (
              <span className={styles.badge}>
                {subrole.incompatibleWith.length} incompatibilité
                {subrole.incompatibleWith.length > 1 ? "s" : ""}
              </span>
            )}
          </div>
        </div>
      )}

      {subrole?.requiresMission && (
        <div className={styles.row2}>
          <Field
            label="Référence de mission"
            required
            helper="L’habilitation est liée à un mandat identifié."
          >
            <Input
              value={state.missionRef}
              onChange={(e) => set({ ...state, missionRef: e.target.value })}
              placeholder="AUD-EXT-2026-T1"
            />
          </Field>
          <Field
            label="Fin d’habilitation"
            required
            helper="L’accès expire automatiquement à cette date."
          >
            <Input
              type="date"
              value={state.validUntil}
              onChange={(e) => set({ ...state, validUntil: e.target.value })}
            />
          </Field>
        </div>
      )}

      {!subrole?.requiresMission && (
        <Field
          label="Fin d’habilitation"
          helper="Facultatif — laissez vide pour une habilitation permanente."
        >
          <Input
            type="date"
            value={state.validUntil}
            onChange={(e) => set({ ...state, validUntil: e.target.value })}
          />
        </Field>
      )}

      {subrole?.isSensitive && (
        <Field
          label="Justification de l’habilitation"
          required
          helper="Consignée dans la piste d’audit et opposable lors d’une revue d’accès."
        >
          <Textarea
            rows={4}
            value={state.justification}
            onChange={(e) => set({ ...state, justification: e.target.value })}
            placeholder="Nomination au poste par décision n°… du …, prise de fonction le …"
          />
        </Field>
      )}

      {state.checking && (
        <div className={styles.checking}>Vérification des règles institutionnelles…</div>
      )}

      {!state.checking && state.blockers.length === 0 && state.warnings.length === 0 && (
        <Note tone="info" title="Aucun conflit détecté">
          Les règles d’unicité des postes, de séparation des tâches et de périmètre sont
          respectées.
        </Note>
      )}

      {state.blockers.map((b) => (
        <Note key={b.code + b.message} tone="danger" title="Règle institutionnelle bloquante">
          {b.message}
        </Note>
      ))}

      {state.warnings.map((w) => (
        <Note key={w.code + w.message} tone="warning" title="À vérifier">
          {w.message}
        </Note>
      ))}
    </div>
  );
}

// ============================================================
// Étape 05 — Récapitulatif
// ============================================================

function SummaryStep({
  state,
  subrole,
  organisation,
}: {
  state: FormState;
  subrole?: SubroleApi;
  organisation?: OrganisationApi;
}) {
  return (
    <div className={styles.stack}>
      <div className={styles.recap}>
        <RecapRow label="Nom complet" value={`${state.firstName} ${state.lastName}`} />
        <RecapRow label="Adresse électronique" value={state.email.toLowerCase()} mono />
        {state.phone.trim() !== "+243" && <RecapRow label="Téléphone" value={state.phone} mono />}
        <RecapRow label="Profil" value={state.profile} />
        <RecapRow label="Sous-rôle" value={subrole?.label ?? state.subroleCode} />
        <RecapRow label="Organisation" value={organisation?.fullName ?? "—"} />
        {state.componentCode && <RecapRow label="Composante" value={state.componentCode} />}
        {state.provinceCode && <RecapRow label="Province" value={state.provinceCode} />}
        {state.missionRef && <RecapRow label="Mission" value={state.missionRef} mono />}
        <RecapRow
          label="Fin d’habilitation"
          value={state.validUntil || "Permanente"}
          mono={Boolean(state.validUntil)}
        />
        <RecapRow label="Permissions accordées" value={`${subrole?.permissionCount ?? 0}`} mono />
      </div>

      <Note tone="info" title="Ce qui se passe à la création">
        Un mot de passe temporaire est généré et affiché <strong>une seule fois</strong> — seul son
        haché est conservé. Transmettez-le de vive voix ou par un canal sûr. Il expire sous 72
        heures. À sa première connexion, la personne définira son propre mot de passe puis signera
        ses engagements — code de conduite, déclaration de conflit d’intérêts, confidentialité.
      </Note>
    </div>
  );
}

function RecapRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className={styles.recapRow}>
      <span>{label}</span>
      <strong className={mono ? "ptn-mono" : ""}>{value}</strong>
    </div>
  );
}

// ============================================================
// Confirmation — mot de passe temporaire
// ============================================================

function SuccessPanel({
  result,
  onReset,
}: {
  result: CreateAccountResponse;
  onReset: () => void;
}) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(result.temporaryPassword);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2400);
    } catch {
      // Presse-papiers indisponible : le mot de passe reste lisible à l'écran.
    }
  };

  const expires = new Date(result.temporaryPasswordExpiresAt);

  return (
    <div className={styles.successShell}>
      <div className={styles.successCard}>
        <div className={styles.successIcon}>
          <CheckmarkFilled size={32} aria-hidden />
        </div>

        <div className={styles.successHead}>
          <span className={styles.eyebrow}>COMPTE CRÉÉ</span>
          <h1>
            {result.user.firstName} {result.user.lastName}
          </h1>
          <p>
            {result.assignment.subroleLabel} · <span className="ptn-mono">{result.user.email}</span>
          </p>
        </div>

        <div className={styles.passwordBlock}>
          <div className={styles.passwordLabel}>
            <Locked size={14} aria-hidden /> Mot de passe temporaire
          </div>
          <div className={`${styles.passwordValue} ptn-mono`}>{result.temporaryPassword}</div>
          <button type="button" className={styles.copyBtn} onClick={copy}>
            <Copy size={14} aria-hidden />
            {copied ? "Copié" : "Copier"}
          </button>
        </div>

        <Note tone="warning" title="Affiché une seule fois">
          Ce mot de passe n’est plus consultable après cet écran — seul son haché est conservé.
          Transmettez-le de vive voix ou par un canal sûr. Il expire le{" "}
          <strong>
            {expires.toLocaleDateString("fr-FR")} à {expires.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
          </strong>
          . Passé ce délai, réémettez-en un depuis la fiche du compte.
        </Note>

        {result.warnings.map((w) => (
          <Note key={w.code} tone="warning" title="À vérifier">
            {w.message}
          </Note>
        ))}

        <div className={styles.successActions}>
          <Link href="/admin/comptes" className={styles.btnGhost}>
            <ArrowLeft size={14} aria-hidden /> Retour à la liste
          </Link>
          <button type="button" className={styles.btnPrimary} onClick={onReset}>
            <UserFollow size={14} aria-hidden /> Créer un autre compte
          </button>
        </div>
      </div>
    </div>
  );
}
