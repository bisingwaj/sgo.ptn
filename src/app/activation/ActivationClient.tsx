"use client";

/**
 * Prise de fonction — premier accès à la plateforme.
 *
 * Remplace l'ancien parcours d'onboarding, qui était en réalité un
 * formulaire d'auto-inscription : la personne y ressaisissait son identité,
 * choisissait sa composante d'affectation et cochait ses propres rôles —
 * jusqu'à « Validateur » et « Membre commission ». Ces éléments relèvent
 * de l'habilitation accordée par l'administrateur, pas d'un choix personnel.
 *
 * Ce parcours ne retient donc que ce que la personne peut légitimement
 * faire : définir son mot de passe, corriger ses préférences, signer ses
 * engagements, et prendre connaissance de son périmètre.
 */

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth, toProfileKey } from "@/components/auth/AuthContext";
import {
  authApi,
  referentielApi,
  ApiError,
  type FamilyApi,
  type PermissionApi,
} from "@/lib/api";
import { Wizard, type WizardStep } from "@/components/wizard/Wizard";
import { Field, Input, Segmented, Note, SignatureBlock } from "@/components/wizard/WizardFields";
import { PROFILES } from "@/lib/profiles";
import { SUPPORTED_LANGUAGES } from "@/lib/project-data";
import { CheckmarkFilled, Locked, WarningAltFilled } from "@carbon/icons-react";
import styles from "./activation.module.scss";

const PASSWORD_RULES = [
  { test: (v: string) => v.length >= 12, label: "12 caractères minimum" },
  { test: (v: string) => /[a-z]/.test(v), label: "une minuscule" },
  { test: (v: string) => /[A-Z]/.test(v), label: "une majuscule" },
  { test: (v: string) => /\d/.test(v), label: "un chiffre" },
  { test: (v: string) => /[^A-Za-z0-9]/.test(v), label: "un caractère spécial" },
];

interface State {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
  phone: string;
  preferredLanguage: string;
  codeOfConductSigned: boolean;
  coiDeclared: boolean;
  dataPrivacyAck: boolean;
}

export function ActivationClient() {
  const router = useRouter();
  const { user, loading, changePassword, refresh } = useAuth();
  const [families, setFamilies] = useState<FamilyApi[]>([]);
  const [permissions, setPermissions] = useState<PermissionApi[]>([]);

  useEffect(() => {
    if (!user) return;
    Promise.all([referentielApi.familles(), referentielApi.permissions()])
      .then(([f, p]) => {
        setFamilies(f);
        setPermissions(p);
      })
      .catch(() => undefined);
  }, [user]);

  const profileDef = useMemo(
    () =>
      families.flatMap((f) => f.profiles).find((p) => p.key === user?.profile),
    [families, user?.profile],
  );

  const steps = useMemo<WizardStep<State>[]>(() => {
    if (!user) return [];

    return [
      // ===== 01 · Mot de passe =====
      {
        num: "01",
        label: "Mot de passe",
        sub: "Remplacez le mot de passe temporaire par le vôtre",
        // Masquée si le mot de passe a déjà été changé — cas d'une personne
        // qui revient signer ses engagements plus tard.
        visibleIf: () => user.mustChangePassword,
        validate: (s) => {
          if (!s.currentPassword) return "Saisissez le mot de passe temporaire.";
          if (!PASSWORD_RULES.every((r) => r.test(s.newPassword)))
            return "Le nouveau mot de passe ne respecte pas la politique.";
          if (s.newPassword !== s.confirmPassword) return "Les deux saisies diffèrent.";
          return null;
        },
        // Doit aboutir avant la suite : tant que le mot de passe temporaire
        // n'est pas remplacé, l'API refuse les autres routes.
        commit: async (s) => {
          await changePassword(s.currentPassword, s.newPassword);
        },
        render: (s, set) => <PasswordStep state={s} set={set} />,
      },

      // ===== 02 · Coordonnées =====
      {
        num: "02",
        label: "Vos coordonnées",
        sub: "Les termes de votre habilitation, et ce que vous pouvez ajuster",
        commit: async (s) => {
          await authApi.updatePreferences({
            phone: s.phone,
            preferredLanguage: s.preferredLanguage,
          });
        },
        render: (s, set) => <DetailsStep state={s} set={set} />,
      },

      // ===== 03 · Engagements =====
      {
        num: "03",
        label: "Engagements",
        sub: "Actes que vous seul pouvez poser",
        validate: (s) => {
          if (!s.codeOfConductSigned) return "La signature du Code de Conduite est obligatoire.";
          if (!s.coiDeclared) return "La déclaration de conflits d’intérêts est obligatoire.";
          if (!s.dataPrivacyAck) return "L’engagement de confidentialité est obligatoire.";
          return null;
        },
        commit: async () => {
          await authApi.signEngagements();
          await refresh();
        },
        render: (s, set) => <EngagementsStep state={s} set={set} />,
      },

      // ===== 04 · Habilitation =====
      {
        num: "04",
        label: "Votre habilitation",
        sub: "Ce que vous pouvez faire, et ce qui ne relève pas de vous",
        render: () => (
          <HabilitationStep
            permissions={permissions}
            granted={user.permissions}
            restrictions={profileDef?.restrictions ?? []}
          />
        ),
      },
    ];
  }, [user, changePassword, refresh, permissions, profileDef]);

  if (loading) return <div className={styles.centered}>Chargement de la session…</div>;

  if (!user) {
    return (
      <div className={styles.centered}>
        <Locked size={32} aria-hidden />
        <h1>Session requise</h1>
        <p>Connectez-vous pour effectuer votre prise de fonction.</p>
        <Link href="/login" className={styles.link}>
          Aller à la connexion
        </Link>
      </div>
    );
  }

  const initial: State = {
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
    phone: user.mustChangePassword ? "+243 " : "",
    preferredLanguage: "FR",
    codeOfConductSigned: false,
    coiDeclared: false,
    dataPrivacyAck: false,
  };

  return (
    <Wizard<State>
      eyebrow="PRISE DE FONCTION"
      title={`Bienvenue, ${user.firstName}`}
      subtitle={`${user.subroleLabel} · ${user.organisationName}`}
      steps={steps}
      initialState={initial}
      cancelHref="/login"
      finishLabel="Accéder à mon espace"
      onFinish={() => {
        router.push(PROFILES[toProfileKey(user.profile)].homePath);
      }}
    />
  );
}

// ============================================================

function PasswordStep({ state, set }: { state: State; set: (s: State) => void }) {
  const satisfied = PASSWORD_RULES.map((r) => r.test(state.newPassword));
  const matches = state.newPassword.length > 0 && state.newPassword === state.confirmPassword;

  return (
    <div className={styles.stack}>
      <Note tone="info" title="Pourquoi ce changement">
        Le mot de passe temporaire qui vous a été communiqué est connu de l’administrateur qui l’a
        émis. Remplacez-le par un mot de passe que vous seul connaissez.
      </Note>

      <Field label="Mot de passe temporaire" required>
        <Input
          type="password"
          autoComplete="current-password"
          value={state.currentPassword}
          onChange={(e) => set({ ...state, currentPassword: e.target.value })}
          placeholder="Celui transmis par l’administrateur"
        />
      </Field>

      <Field label="Nouveau mot de passe" required>
        <Input
          type="password"
          autoComplete="new-password"
          value={state.newPassword}
          onChange={(e) => set({ ...state, newPassword: e.target.value })}
        />
      </Field>

      <ul className={styles.rules} aria-label="Politique de mot de passe">
        {PASSWORD_RULES.map((rule, i) => (
          <li key={rule.label} className={satisfied[i] ? styles.ruleOk : ""}>
            <CheckmarkFilled size={14} aria-hidden />
            {rule.label}
          </li>
        ))}
      </ul>

      <Field
        label="Confirmation"
        required
        error={state.confirmPassword.length > 0 && !matches ? "Les deux saisies diffèrent." : undefined}
      >
        <Input
          type="password"
          autoComplete="new-password"
          value={state.confirmPassword}
          onChange={(e) => set({ ...state, confirmPassword: e.target.value })}
        />
      </Field>
    </div>
  );
}

function DetailsStep({ state, set }: { state: State; set: (s: State) => void }) {
  const { user } = useAuth();
  if (!user) return null;

  return (
    <div className={styles.stack}>
      <div>
        <h3 className={styles.sectionTitle}>Les termes de votre habilitation</h3>
        <p className={styles.sectionHint}>
          Ces éléments ont été fixés par l’administrateur. Ils ne se modifient pas ici : signalez
          toute erreur plutôt que de la corriger vous-même — c’est ce qui garantit que la piste
          d’audit reste fidèle.
        </p>
        <dl className={styles.readonly}>
          <ReadOnly label="Nom" value={`${user.firstName} ${user.lastName}`} />
          <ReadOnly label="Adresse électronique" value={user.email} mono />
          <ReadOnly label="Sous-rôle" value={user.subroleLabel} />
          <ReadOnly label="Organisation" value={user.organisationName} />
          {user.componentCode && <ReadOnly label="Composante" value={user.componentCode} />}
          {user.provinceCode && <ReadOnly label="Province" value={user.provinceCode} />}
        </dl>
      </div>

      <div>
        <h3 className={styles.sectionTitle}>Vos préférences</h3>
        <p className={styles.sectionHint}>Modifiables à tout moment.</p>

        <Field label="Téléphone" helper="Sert à vous joindre pour toute question d’habilitation.">
          <Input
            type="tel"
            value={state.phone}
            onChange={(e) => set({ ...state, phone: e.target.value })}
            placeholder="+243 81 234 56 78"
          />
        </Field>

        <Field label="Langue de l’interface">
          <Segmented
            ariaLabel="Langue"
            value={state.preferredLanguage}
            onChange={(v) => set({ ...state, preferredLanguage: v })}
            options={SUPPORTED_LANGUAGES.map((l) => ({
              value: l.code.toUpperCase(),
              label: l.label,
            }))}
          />
        </Field>
      </div>
    </div>
  );
}

function ReadOnly({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className={styles.readonlyRow}>
      <dt>{label}</dt>
      <dd className={mono ? "ptn-mono" : ""}>{value}</dd>
    </div>
  );
}

function EngagementsStep({ state, set }: { state: State; set: (s: State) => void }) {
  const { user } = useAuth();
  const signerName = user ? `${user.firstName} ${user.lastName}` : "—";

  return (
    <div className={styles.stack}>
      <Note tone="info" title="Portée de ces signatures">
        Horodatées et consignées dans la piste d’audit. Un contrôleur doit pouvoir établir
        qu’une déclaration de conflits d’intérêts était en vigueur à la date où vous avez siégé
        en commission.
      </Note>

      <SignatureBlock
        title="Code de Conduite UGP-PTN"
        text={
          <>
            Je m’engage à respecter le Code de Conduite du PTN-RDC : intégrité dans la passation
            des marchés (MEP § 5.2.8), confidentialité des informations, non-discrimination, lutte
            contre l’EAS/HS, signalement de toute irrégularité au MGP. Toute violation peut
            entraîner sanctions disciplinaires et résiliation immédiate.
          </>
        }
        signed={state.codeOfConductSigned}
        onSign={() => set({ ...state, codeOfConductSigned: true })}
        signerName={signerName}
      />

      <SignatureBlock
        title="Déclaration de conflits d’intérêts"
        text={
          <>
            Je déclare ne détenir aucun intérêt direct ou indirect, financier ou familial, avec une
            entreprise candidate ou un consultant susceptible d’être attributaire d’un marché
            PTN-RDC. Toute évolution de ma situation sera notifiée sans délai au Coordonnateur UGP.
            Cette déclaration est renouvelée annuellement.
          </>
        }
        signed={state.coiDeclared}
        onSign={() => set({ ...state, coiDeclared: true })}
        signerName={signerName}
      />

      <SignatureBlock
        title="Confidentialité et protection des données"
        text={
          <>
            Je m’engage à ne divulguer aucune information non publique du projet, à ne pas exporter
            ni reproduire de données hors des usages prévus, et à respecter le cloisonnement
            absolu du canal confidentiel MGP-EAS/HS. Je reconnais que mes consultations sont
            tracées.
          </>
        }
        signed={state.dataPrivacyAck}
        onSign={() => set({ ...state, dataPrivacyAck: true })}
        signerName={signerName}
      />
    </div>
  );
}

function HabilitationStep({
  permissions,
  granted,
  restrictions,
}: {
  permissions: PermissionApi[];
  granted: string[];
  restrictions: string[];
}) {
  const grantedSet = new Set(granted);
  const byCategory = permissions
    .filter((p) => grantedSet.has(p.code))
    .reduce<Record<string, PermissionApi[]>>((acc, p) => {
      (acc[p.category] ??= []).push(p);
      return acc;
    }, {});

  const CATEGORY_LABELS: Record<string, string> = {
    referentiel: "Référentiel",
    passation: "Passation des marchés",
    fiduciaire: "Gestion fiduciaire",
    sauvegardes: "Sauvegardes E&S",
    mgp: "Gestion des plaintes",
    pilotage: "Pilotage et suivi",
    gouvernance: "Gouvernance",
    marche: "Espace marché",
    admin: "Administration",
  };

  return (
    <div className={styles.stack}>
      <p className={styles.sectionHint}>
        Votre habilitation vous ouvre {granted.length} permissions. En prendre connaissance fait
        partie de la prise de fonction : le périmètre se comprend, il ne se choisit pas.
      </p>

      {Object.entries(byCategory).map(([category, perms]) => (
        <div key={category} className={styles.permGroup}>
          <h3 className={styles.sectionTitle}>{CATEGORY_LABELS[category] ?? category}</h3>
          <ul className={styles.permList}>
            {perms.map((p) => (
              <li key={p.code}>
                <CheckmarkFilled size={14} aria-hidden />
                <span>{p.label}</span>
                {p.isSensitive && <span className={styles.permSensitive}>sensible</span>}
              </li>
            ))}
          </ul>
        </div>
      ))}

      {restrictions.length > 0 && (
        <div className={styles.restrictions}>
          <h3 className={styles.sectionTitle}>
            <WarningAltFilled size={16} aria-hidden /> Ce qui ne relève pas de vous
          </h3>
          <ul>
            {restrictions.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
