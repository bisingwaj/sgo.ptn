"use client";

/**
 * Connexion PTN-RDC.
 *
 * Trois choses : la famille d'acteurs, l'identifiant, le mot de passe.
 *
 * La FAMILLE, et non le profil ni le sous-rôle. C'est ce que `LoginDto`
 * attend (`UGP_GOUV` | `BAILLEURS` | `BENEFICIAIRES` | `CONTROLE`) et ce
 * qu'elle sert à trancher : une personne peut détenir plusieurs habilitations,
 * dans des familles différentes ; la famille choisie décide de celle qui est
 * activée pour la session.
 *
 * Le profil, le sous-rôle, l'organisation et les permissions effectifs sont
 * renvoyés par l'API — ils ne se choisissent pas ici.
 */

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, InlineNotification, PasswordInput, TextInput } from "@carbon/react";
import { ArrowRight, CheckmarkFilled } from "@carbon/icons-react";
import { useAuth, toProfileKey } from "@/components/auth/AuthContext";
import { type FamilyKey } from "@/lib/api";
import { PROFILES } from "@/lib/profiles";
import { BrandLockup } from "@/components/brand/BrandLockup";
import { PartnerMarks } from "@/components/brand/PartnerMarks";
import { LanguagePicker } from "@/components/chrome/LanguagePicker";
import { cn } from "@/lib/cn";
import { loginErrorMessage } from "./auth-errors";

interface FamilyOption {
  key: FamilyKey;
  label: string;
  hint: string;
}

/** Aligné sur `FAMILIES` du backend (referentiel.service.ts). */
const FAMILIES: FamilyOption[] = [
  {
    key: "UGP_GOUV",
    label: "UGP / Gouvernement",
    hint: "MPTN, UGP, ministères et agences bénéficiaires, gouvernance COPIL / CTP",
  },
  {
    key: "BAILLEURS",
    label: "Bailleurs",
    hint: "Banque mondiale (IDA) et Agence Française de Développement",
  },
  {
    key: "BENEFICIAIRES",
    label: "Bénéficiaires et soumissionnaires",
    hint: "Partenaires institutionnels, entreprises candidates, EESU, hubs et startups",
  },
  {
    key: "CONTROLE",
    label: "Contrôle et vérification",
    hint: "Audit externe, TPM, Cour des Comptes, IGF, ACE",
  },
];

const PUBLIC_LINKS = [
  { href: "/mgp", label: "Déposer une plainte" },
  { href: "/documentation", label: "Documentation MEP" },
  { href: "/mentions-legales", label: "Mentions légales" },
];

/** Chiffres du MEP — repris tels quels, jamais recalculés. */
const KEY_FIGURES = [
  { value: "510", unit: "M USD", label: "Enveloppe du projet" },
  { value: "26", unit: "provinces", label: "Couverture nationale" },
  { value: "2029", unit: "", label: "Achèvement technique" },
];

interface FieldErrors {
  email?: string;
  password?: string;
}

interface LoginClientProps {
  /** Résolu côté serveur depuis la chaîne de requête (voir page.tsx). */
  sessionEnded: "expiree" | "inactivite" | null;
  /** Destination voulue avant le renvoi vers la connexion, déjà validée. */
  next: string | null;
}

export function LoginClient({ sessionEnded, next }: LoginClientProps) {
  const router = useRouter();
  const { login, user, loading: authLoading } = useAuth();

  const [family, setFamily] = useState<FamilyKey>("UGP_GOUV");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  /**
   * Session déjà ouverte : on ne présente pas un formulaire de connexion à
   * quelqu'un qui est connecté.
   *
   * Le cas se produit dès qu'on revient sur /login par l'historique, un
   * signet ou un lien. Sans ce renvoi, la personne ressaisit ses
   * identifiants pour arriver là où elle était déjà.
   *
   * `submitting` exclu : pendant l'envoi, c'est `handleSubmit` qui conduit la
   * navigation, y compris vers /activation. Deux redirections concurrentes se
   * disputeraient la destination.
   */
  useEffect(() => {
    if (authLoading || submitting || !user) return;
    if (user.mustChangePassword || !user.onboardingCompleted) {
      router.replace("/activation");
      return;
    }
    router.replace(next ?? PROFILES[toProfileKey(user.profile)].homePath);
  }, [user, authLoading, submitting, next, router]);

  /**
   * Validation au moment de l'envoi, jamais à la frappe.
   *
   * Signaler « adresse invalide » dès le troisième caractère saisi revient à
   * reprocher à quelqu'un de ne pas avoir fini d'écrire. On valide quand la
   * personne dit avoir terminé, puis on efface le reproche dès qu'elle
   * corrige — c'est la séquence qui déroute le moins un usager peu familier
   * des formulaires.
   */
  const validate = (): FieldErrors => {
    const errors: FieldErrors = {};
    if (!email.trim()) {
      errors.email = "Saisissez votre adresse électronique.";
    } else if (!email.includes("@")) {
      errors.email = "Cette adresse semble incomplète — il manque le « @ ».";
    }
    if (!password) {
      errors.password = "Saisissez votre mot de passe.";
    }
    return errors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const errors = validate();
    setFieldErrors(errors);

    if (Object.keys(errors).length > 0) {
      // Le focus va au premier champ fautif : sans cela, un usager au clavier
      // ou au lecteur d'écran doit repartir en quête du problème, et sur un
      // écran d'accueil c'est le moment où l'on abandonne.
      (errors.email ? emailRef : passwordRef).current?.focus();
      return;
    }

    setSubmitting(true);
    try {
      const result = await login(email.trim(), password, family);

      // Prise de fonction inachevée : mot de passe temporaire non remplacé ou
      // engagements non signés. L'API refuse de toute façon les autres routes.
      if (result.user.mustChangePassword || !result.user.onboardingCompleted) {
        router.push("/activation");
        return;
      }

      // Retour à la page demandée avant le renvoi, à défaut l'accueil du profil.
      router.push(next ?? PROFILES[toProfileKey(result.user.profile)].homePath);
    } catch (err) {
      // Message neutralisé — voir auth-errors.ts.
      setFormError(loginErrorMessage(err));
      setSubmitting(false);
      emailRef.current?.focus();
    }
  };

  /** Efface l'erreur d'un champ dès la première correction. */
  const clearField = (field: keyof FieldErrors) => {
    setFieldErrors((prev) => (prev[field] ? { ...prev, [field]: undefined } : prev));
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1fr)]">
      {/* ================= Panneau institutionnel ================= */}
      <aside
        className="relative hidden flex-col justify-between overflow-hidden bg-[#161616] p-10 lg:flex xl:p-14"
        aria-label="Informations institutionnelles"
      >
        {/* Trame discrète : donne de la matière au fond sans rien ajouter à
            lire. Carbon reste sobre — la grille est à peine perceptible. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.055]"
          style={{
            backgroundImage:
              "linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />
        {/* Halo du bleu de marque, ancré derrière la signature. */}
        <div
          aria-hidden
          className="pointer-events-none absolute -top-32 -right-24 h-96 w-96 rounded-full opacity-25 blur-3xl"
          style={{ background: "radial-gradient(circle, #1192E8 0%, transparent 70%)" }}
        />

        <div className="relative">
          <BrandLockup tone="sombre" height={104} priority />
        </div>

        <div className="relative max-w-[40ch]">
          {/* Filet aux couleurs du drapeau — marqueur institutionnel discret. */}
          <span aria-hidden className="mb-6 flex h-1 w-24">
            <i className="flex-1 bg-[var(--ptn-drc-blue)]" />
            <i className="flex-1 bg-[var(--ptn-drc-yellow)]" />
            <i className="flex-1 bg-[var(--ptn-drc-red)]" />
          </span>

          <p className="text-caption mb-3 tracking-[0.14em] text-white/45 uppercase">
            Plateforme officielle · accès restreint
          </p>
          <h1 className="text-heading-05 text-white">Plateforme de gouvernance</h1>
          <p className="text-body-lg mt-4 text-white/65">
            Passation des marchés, avis de non-objection, sauvegardes et reporting du
            Projet de Transformation Numérique de la République Démocratique du Congo.
          </p>

          {/* Chiffres du MEP : ils situent l'échelle du projet en un regard, et
              ancrent la crédibilité institutionnelle de l'écran d'accueil.
              `w-max` les affranchit de la largeur de lecture du paragraphe
              (40 caractères), qui renvoyait « 2029 » seul à la ligne. */}
          <dl className="mt-9 grid w-max grid-cols-3 gap-x-10 gap-y-5">
            {KEY_FIGURES.map((f) => (
              <div key={f.label} className="flex flex-col gap-0.5">
                <dt className="sr-only">{f.label}</dt>
                <dd className="text-heading-04 mono flex items-baseline gap-1.5 text-white">
                  {f.value}
                  {f.unit && <span className="text-caption text-white/55">{f.unit}</span>}
                </dd>
                <span aria-hidden className="text-caption text-white/45">
                  {f.label}
                </span>
              </div>
            ))}
          </dl>
        </div>

        <div className="relative flex flex-col gap-7">
          <PartnerMarks tone="sombre" height={38} />

          <div className="flex flex-col gap-3 border-t border-white/10 pt-6">
            <p className="text-caption text-white/40">
              P180495 · Financement IDA (Banque mondiale) et AFD
            </p>
            {/* Liens ouverts, accessibles sans compte. Le dépôt de plainte
                relève du Mécanisme de Gestion des Plaintes : il doit rester
                atteignable par une personne qui n'a précisément pas accès à
                la plateforme. */}
            <nav aria-label="Liens publics" className="flex flex-wrap gap-x-6 gap-y-2">
              {PUBLIC_LINKS.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className="text-caption text-white/60 underline-offset-4 hover:text-white hover:underline"
                >
                  {l.label}
                </Link>
              ))}
            </nav>
          </div>
        </div>
      </aside>

      {/* ================= Formulaire ================= */}
      <main
        id="ptn-main"
        className="bg-background flex flex-col px-6 py-8 sm:px-12"
        aria-label="Connexion"
      >
        <div className="flex items-center justify-end gap-5">
          <Link
            href="/aide"
            className="text-caption text-secondary hover:text-accent underline-offset-4 hover:underline"
          >
            Besoin d&apos;aide ? Assistance
          </Link>
          <LanguagePicker variant="compact" tone="light" />
        </div>

        <div className="mx-auto flex w-full max-w-[30rem] flex-1 flex-col justify-center py-10">
          <div className="mb-10 lg:hidden">
            <BrandLockup tone="clair" height={72} priority />
          </div>

          <h2 className="text-heading-04 text-primary">Connexion</h2>
          <p className="text-body text-secondary mt-2">
            Indiquez le cadre dans lequel vous intervenez, puis identifiez-vous.
          </p>

          {sessionEnded && (
            <InlineNotification
              kind="info"
              lowContrast
              hideCloseButton
              className="mt-6 max-w-none"
              title={sessionEnded === "inactivite" ? "Session expirée" : "Session terminée"}
              subtitle={
                sessionEnded === "inactivite"
                  ? "Vous avez été déconnecté après 30 minutes sans activité."
                  : "Reconnectez-vous pour continuer."
              }
            />
          )}

          {/* `role="alert"` : l'erreur est annoncée dès son apparition, sans
              que la personne ait à la chercher. */}
          {formError && (
            <div role="alert">
              <InlineNotification
                kind="error"
                lowContrast
                hideCloseButton
                className="mt-6 max-w-none"
                title="Connexion impossible"
                subtitle={formError}
              />
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-7 flex flex-col gap-7" noValidate>
            {/* ----- Famille d'acteurs ----- */}
            <fieldset className="border-0 p-0">
              <legend className="text-caption text-secondary mb-2.5">
                Vous intervenez en tant que
              </legend>

              {/* Chaque option porte son intitulé ET ce qu'elle recouvre :
                  « Bénéficiaires et soumissionnaires » ne se devine pas, et
                  quelqu'un qui hésite ne doit pas avoir à essayer pour savoir. */}
              <div
                role="radiogroup"
                aria-label="Famille d'acteurs"
                className="grid grid-cols-2"
              >
                {FAMILIES.map((f) => {
                  const active = f.key === family;
                  return (
                    <button
                      key={f.key}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      onClick={() => setFamily(f.key)}
                      className={cn(
                        "border-subtle flex items-start gap-3 rounded-lg border p-4 text-left transition-colors",
                        "focus-visible:outline-accent focus-visible:z-10 focus-visible:outline-2",
                        active
                          ? "bg-accent-surface border-accent relative z-10"
                          : "bg-layer hover:bg-layer-hover",
                      )}
                    >
                      <span className="flex min-w-0 flex-1 flex-col gap-1">
                        <span
                          className={cn("text-body text-primary", active && "font-semibold")}
                        >
                          {f.label}
                        </span>
                        <span className="text-caption text-secondary">{f.hint}</span>
                      </span>
                      {active && (
                        <CheckmarkFilled
                          size={18}
                          className="text-accent mt-0.5 shrink-0"
                          aria-hidden
                        />
                      )}
                    </button>
                  );
                })}
              </div>

              <p className="text-caption text-helper mt-2.5">
                Ce choix détermine l&apos;habilitation activée si vous en détenez
                plusieurs. Vos droits restent ceux qui vous ont été accordés.
              </p>
            </fieldset>

            <TextInput
              id="login-email"
              ref={emailRef}
              type="email"
              labelText="Adresse électronique"
              placeholder="prenom.nom@ptn-rdc.gov.cd"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                clearField("email");
              }}
              // `username` plutôt que `email` : c'est ce qu'attendent les
              // gestionnaires de mots de passe pour associer l'identifiant au site.
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              invalid={Boolean(fieldErrors.email)}
              invalidText={fieldErrors.email}
            />

            <div className="flex flex-col gap-2">
              <PasswordInput
                id="login-password"
                ref={passwordRef}
                labelText="Mot de passe"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  clearField("password");
                }}
                autoComplete="current-password"
                invalid={Boolean(fieldErrors.password)}
                invalidText={fieldErrors.password}
                showPasswordLabel="Afficher le mot de passe"
                hidePasswordLabel="Masquer le mot de passe"
              />
              <Link
                href="/mot-de-passe-oublie"
                className="text-caption text-accent self-end underline-offset-4 hover:underline"
              >
                Mot de passe oublié ?
              </Link>
            </div>

            <Button
              type="submit"
              size="lg"
              renderIcon={ArrowRight}
              disabled={submitting}
              className="w-full max-w-none"
            >
              {submitting ? "Connexion en cours…" : "Se connecter"}
            </Button>
          </form>

          <p className="text-caption text-helper mt-8">
            Les comptes sont créés par l&apos;administrateur de la plateforme.
          </p>

          <nav
            aria-label="Liens publics"
            className="border-subtle mt-6 flex flex-wrap gap-x-6 gap-y-2 border-t pt-6 lg:hidden"
          >
            {PUBLIC_LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="text-caption text-secondary hover:text-accent underline-offset-4 hover:underline"
              >
                {l.label}
              </Link>
            ))}
          </nav>
        </div>
      </main>
    </div>
  );
}
