"use client";

/**
 * Connexion PTN-RDC.
 *
 * Trois choses : la famille d'acteurs, l'identifiant, le mot de passe.
 *
 * La FAMILLE, et non le profil ni le sous-rôle. C'est ce que `LoginDto`
 * attend (`UGP_GOUV` | `BAILLEURS` | `BENEFICIAIRES` | `CONTROLE`) et ce
 * qu'elle sert à trancher : une personne peut détenir plusieurs
 * habilitations, dans des familles différentes ; la famille choisie décide
 * de celle qui est activée pour la session. Omise, c'est l'habilitation
 * principale qui est chargée.
 *
 * Le profil, le sous-rôle, l'organisation et les permissions effectifs sont
 * renvoyés par l'API — ils ne se choisissent pas ici.
 *
 * Les quatre familles sont écrites en dur plutôt que chargées depuis
 * `/referentiel/profils` : elles sont fixées par le MEP, et l'écran de
 * connexion doit rester utilisable quand l'API ne répond pas — c'est
 * précisément là qu'il faut un message clair, pas une page vide.
 */

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, InlineNotification, PasswordInput, TextInput } from "@carbon/react";
import { ArrowRight, CheckmarkFilled } from "@carbon/icons-react";
import { useAuth, toProfileKey } from "@/components/auth/AuthContext";
import { ApiError, type FamilyKey } from "@/lib/api";
import { PROFILES } from "@/lib/profiles";
import { BrandLockup } from "@/components/brand/BrandLockup";
import { LanguagePicker } from "@/components/chrome/LanguagePicker";
import { cn } from "@/lib/cn";

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

interface LoginClientProps {
  /** Résolu côté serveur depuis la chaîne de requête (voir page.tsx). */
  sessionEnded: "expiree" | "inactivite" | null;
}

export function LoginClient({ sessionEnded }: LoginClientProps) {
  const router = useRouter();
  const { login } = useAuth();

  const [family, setFamily] = useState<FamilyKey>("UGP_GOUV");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !password) {
      setError("Renseignez votre adresse électronique et votre mot de passe.");
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

      router.push(PROFILES[toProfileKey(result.user.profile)].homePath);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Service d'authentification injoignable. Vérifiez que l'API est démarrée.",
      );
      setSubmitting(false);
    }
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1fr)]">
      {/* ================= Panneau institutionnel ================= */}
      <aside
        className="hidden flex-col justify-between bg-[#161616] p-10 lg:flex xl:p-14"
        aria-label="Informations institutionnelles"
      >
        <BrandLockup variant="full" height={104} className="text-white" />

        <div className="max-w-[38ch]">
          <h1 className="text-heading-05 text-white">Plateforme de gouvernance</h1>
          <p className="text-body-lg mt-4 text-white/70">
            Passation des marchés, avis de non-objection, sauvegardes et reporting du
            Projet de Transformation Numérique de la République Démocratique du Congo.
          </p>
        </div>

        <div className="flex flex-col gap-5">
          <p className="text-caption text-white/45">
            P180495 · Financement IDA (Banque mondiale) et AFD · Achèvement 2029
          </p>
          {/* Liens ouverts, accessibles sans compte. Le dépôt de plainte relève
              du Mécanisme de Gestion des Plaintes : il doit rester atteignable
              par une personne qui n'a précisément pas accès à la plateforme. */}
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
            <BrandLockup variant="full" height={80} className="text-primary" />
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

          {error && (
            <InlineNotification
              kind="error"
              lowContrast
              hideCloseButton
              className="mt-6 max-w-none"
              title="Connexion impossible"
              subtitle={error}
            />
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
                className="flex flex-col gap-px"
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
                        "border-subtle flex items-start gap-3 border px-4 py-3 text-left transition-colors",
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
              type="email"
              labelText="Adresse électronique"
              placeholder="prenom.nom@ptn-rdc.gov.cd"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              // `username` plutôt que `email` : c'est ce qu'attendent les
              // gestionnaires de mots de passe pour associer l'identifiant au site.
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              required
              invalid={Boolean(error) && !email.trim()}
            />

            <div className="flex flex-col gap-2">
              <PasswordInput
                id="login-password"
                labelText="Mot de passe"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
                invalid={Boolean(error) && !password}
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
