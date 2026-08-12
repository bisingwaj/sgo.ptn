"use client";

/**
 * Connexion PTN-RDC.
 *
 * ---------------------------------------------------------------------------
 * CE QUI A ÉTÉ RETIRÉ, ET POURQUOI
 *
 * La version précédente (569 lignes) demandait de choisir une famille de
 * profil puis un sous-rôle parmi 51, via un combobox avec recherche.
 *
 * Or `LoginDto` côté backend n'accepte que { email, password }. Ni la famille
 * ni le sous-rôle n'étaient transmis : l'écran faisait choisir son rôle à
 * l'utilisateur, alors que le rôle découle de l'habilitation accordée par un
 * administrateur. Un commentaire du fichier l'admettait — le sélecteur ne
 * servait qu'à teinter l'interface.
 *
 * Un contrôle qui suggère une conséquence qu'il n'a pas est pire qu'un
 * contrôle absent : la personne qui choisit « Bailleur » et arrive sur un
 * écran UGP en conclut que le système s'est trompé. Devant un public d'agents
 * publics dont la lisibilité des affordances est le premier critère
 * d'utilisabilité, c'est disqualifiant.
 *
 * Ont également disparu, pour la même raison — annoncer ce qui n'existe pas :
 *   · « ENV · PROD-EU-W3 / BUILD 2026.05.07-r512 » — métadonnées inventées ;
 *   · le mode démonstration, dont le motif était que sept profils n'avaient
 *     pas de comptes en base ; ils en ont désormais (seed de développement) ;
 *   · l'illustration changeant selon le sous-rôle sélectionné ;
 *   · le sélecteur de langue, tant que l'internationalisation n'est pas en
 *     place : il ne traduisait rien.
 *
 * Restent : la marque, deux champs, un bouton, et les messages qui portent une
 * information réelle (fin de session, erreur d'authentification).
 * ---------------------------------------------------------------------------
 */

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, InlineNotification, PasswordInput, TextInput } from "@carbon/react";
import { ArrowRight, Help } from "@carbon/icons-react";
import { useAuth, toProfileKey } from "@/components/auth/AuthContext";
import { ApiError } from "@/lib/api";
import { PROFILES } from "@/lib/profiles";
import { BrandLockup } from "@/components/brand/BrandLockup";

interface LoginClientProps {
  /** Résolu côté serveur depuis la chaîne de requête (voir page.tsx). */
  sessionEnded: "expiree" | "inactivite" | null;
}

export function LoginClient({ sessionEnded }: LoginClientProps) {
  const router = useRouter();
  const { login } = useAuth();

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
      const result = await login(email.trim(), password);

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
    <main className="grid min-h-screen lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      {/* ---------- Panneau institutionnel ---------- */}
      <aside
        className="hidden flex-col justify-between bg-[#161616] p-10 lg:flex"
        aria-label="Informations institutionnelles"
      >
        <BrandLockup variant="full" inverse />

        <div className="max-w-[42ch]">
          <h1 className="text-heading-05 text-white">Plateforme de gouvernance</h1>
          <p className="text-body-lg mt-4 text-white/70">
            Passation des marchés, avis de non-objection, sauvegardes et reporting du
            Projet de Transformation Numérique de la République Démocratique du Congo.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Filet aux couleurs du drapeau — la seule marque institutionnelle
              conservée. Décoratif, donc masqué aux lecteurs d'écran. */}
          <span aria-hidden className="flex h-6 w-[3px] flex-col">
            <i className="flex-1 bg-[var(--ptn-drc-blue)]" />
            <i className="flex-1 bg-[var(--ptn-drc-yellow)]" />
            <i className="flex-1 bg-[var(--ptn-drc-red)]" />
          </span>
          <p className="text-caption text-white/50">
            P180495 · Financement IDA (Banque mondiale) et AFD
          </p>
        </div>
      </aside>

      {/* ---------- Formulaire ---------- */}
      <section
        className="bg-background flex flex-col justify-center px-6 py-12 sm:px-12"
        aria-label="Connexion"
      >
        <div className="mx-auto w-full max-w-[26rem]">
          {/* Marque visible seulement quand le panneau de gauche est masqué. */}
          <div className="mb-10 lg:hidden">
            <BrandLockup variant="full" />
          </div>

          <h2 className="text-heading-04 text-primary">Connexion</h2>
          <p className="text-body text-secondary mt-2">
            Vos droits découlent de l&apos;habilitation qui vous a été accordée.
          </p>

          {sessionEnded && (
            <InlineNotification
              kind="info"
              lowContrast
              hideCloseButton
              className="mt-6 max-w-none"
              title={
                sessionEnded === "inactivite" ? "Session expirée" : "Session terminée"
              }
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

          <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-6" noValidate>
            <TextInput
              id="login-email"
              type="email"
              labelText="Adresse électronique"
              placeholder="prenom.nom@ptn-rdc.gov.cd"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              // `username` plutôt que `email` : c'est ce que les gestionnaires
              // de mots de passe attendent pour associer l'identifiant au site.
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              required
              invalid={Boolean(error) && !email.trim()}
            />

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
            Un compte est créé par l&apos;administrateur de la plateforme.{" "}
            <Link href="/aide" className="text-accent inline-flex items-center gap-1 underline">
              <Help size={14} aria-hidden />
              Centre d&apos;assistance
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
