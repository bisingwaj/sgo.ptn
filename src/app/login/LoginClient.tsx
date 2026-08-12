"use client";

/**
 * Connexion PTN-RDC.
 *
 * Trois éléments seulement : profil, identifiant, mot de passe.
 *
 * Le sélecteur porte les 8 PROFILS, pas les 51 sous-rôles. Le sous-rôle
 * (« Comptable », « Chargé de Passation des Marchés »…) découle de
 * l'habilitation accordée par un administrateur : le demander à la connexion
 * reviendrait à laisser choisir ses propres droits.
 *
 * Le profil est transmis à l'API lorsqu'elle l'accepte — voir `authApi.login`,
 * qui rejoue sans le champ tant que `LoginDto` ne le déclare pas. Le profil
 * effectif appliqué à la session reste celui renvoyé par le serveur.
 */

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, InlineNotification, PasswordInput, TextInput } from "@carbon/react";
import { ArrowRight } from "@carbon/icons-react";
import { useAuth, toProfileKey } from "@/components/auth/AuthContext";
import { ApiError, type ProfileKeyApi } from "@/lib/api";
import { PROFILES, PROFILE_KEYS, type ProfileKey } from "@/lib/profiles";
import { BrandLockup } from "@/components/brand/BrandLockup";
import { LanguagePicker } from "@/components/chrome/LanguagePicker";
import { cn } from "@/lib/cn";

/** Correspondance vers les codes majuscules attendus par l'API. */
const TO_API_PROFILE: Record<ProfileKey, ProfileKeyApi> = {
  ugp: "UGP",
  mda: "MDA",
  partenaire: "PARTENAIRE",
  bailleur: "BAILLEUR",
  soumissionnaire: "SOUMISSIONNAIRE",
  sbp: "SBP",
  auditeur: "AUDITEUR",
  gouvernance: "GOUVERNANCE",
};

interface LoginClientProps {
  /** Résolu côté serveur depuis la chaîne de requête (voir page.tsx). */
  sessionEnded: "expiree" | "inactivite" | null;
}

export function LoginClient({ sessionEnded }: LoginClientProps) {
  const router = useRouter();
  const { login } = useAuth();

  const [profile, setProfile] = useState<ProfileKey>("ugp");
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
      const result = await login(email.trim(), password, TO_API_PROFILE[profile]);

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
    <div className="grid min-h-screen lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1fr)]">
      {/* ================= Panneau institutionnel ================= */}
      <aside
        className="hidden flex-col justify-between bg-[#161616] p-10 xl:p-12 lg:flex"
        aria-label="Informations institutionnelles"
      >
        <BrandLockup variant="full" height={104} className="text-white" />

        <div className="max-w-[40ch]">
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
          <nav aria-label="Liens publics" className="flex flex-wrap gap-x-5 gap-y-2">
            {[
              { href: "/mgp", label: "Déposer une plainte" },
              { href: "/documentation", label: "Documentation MEP" },
              { href: "/mentions-legales", label: "Mentions légales" },
            ].map((l) => (
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
        {/* Barre de service — aide et langue, disponibles avant connexion. */}
        <div className="flex items-center justify-end gap-4">
          <Link
            href="/aide"
            className="text-caption text-secondary hover:text-accent underline-offset-4 hover:underline"
          >
            Besoin d&apos;aide ? Assistance
          </Link>
          <LanguagePicker variant="compact" tone="light" />
        </div>

        <div className="mx-auto flex w-full max-w-[27rem] flex-1 flex-col justify-center py-10">
          {/* Marque reprise ici quand le panneau de gauche est masqué. */}
          <div className="mb-10 lg:hidden">
            <BrandLockup variant="full" height={80} className="text-primary" />
          </div>

          <h2 className="text-heading-04 text-primary">Connexion</h2>
          <p className="text-body text-secondary mt-2">
            Sélectionnez votre profil, puis identifiez-vous.
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

          <form onSubmit={handleSubmit} className="mt-7 flex flex-col gap-6" noValidate>
            {/* ----- Profil ----- */}
            <fieldset className="border-0 p-0">
              <legend className="text-caption text-secondary mb-2">Profil</legend>
              {/* Boutons radio plutôt qu'une liste déroulante : huit choix
                  tiennent à l'écran, et une option visible se lit sans ouvrir
                  un menu — ce qui compte pour un public peu familier des
                  interfaces denses. */}
              <div
                role="radiogroup"
                aria-label="Profil"
                className="grid grid-cols-2 gap-px bg-[var(--cds-border-subtle)]"
              >
                {PROFILE_KEYS.map((key) => {
                  const active = key === profile;
                  return (
                    <button
                      key={key}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      onClick={() => setProfile(key)}
                      className={cn(
                        "text-body-compact min-h-11 px-3 py-2.5 text-left transition-colors",
                        "focus-visible:outline-accent focus-visible:z-10 focus-visible:outline-2",
                        active
                          ? "bg-accent-surface text-primary shadow-[inset_3px_0_0_0_var(--ptn-accent)] font-medium"
                          : "bg-layer text-secondary hover:bg-layer-hover",
                      )}
                    >
                      {PROFILES[key].short}
                    </button>
                  );
                })}
              </div>
              <p className="text-caption text-helper mt-2">
                Vos droits effectifs découlent de l&apos;habilitation qui vous a été
                accordée.
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

          {/* Reprise des liens publics sous le formulaire quand le panneau
              institutionnel est masqué : ils ne doivent jamais disparaître. */}
          <nav
            aria-label="Liens publics"
            className="border-subtle mt-6 flex flex-wrap gap-x-5 gap-y-2 border-t pt-6 lg:hidden"
          >
            {[
              { href: "/mgp", label: "Déposer une plainte" },
              { href: "/documentation", label: "Documentation MEP" },
              { href: "/mentions-legales", label: "Mentions légales" },
            ].map((l) => (
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
