"use client";

/**
 * Aiguillage de la racine.
 *
 * ---------------------------------------------------------------------------
 * POURQUOI CE COMPOSANT EXISTE
 *
 * `app/page.tsx` était un composant serveur qui appelait `redirect("/login")`
 * sans condition. Le serveur ne peut pourtant rien savoir de la session : le
 * jeton de rafraîchissement vit dans le `localStorage` du navigateur et le
 * jeton d'accès en mémoire. Une personne connectée qui revenait sur la racine
 * était donc renvoyée au formulaire de connexion, alors que sa session était
 * parfaitement valide — la racine ne posait simplement jamais la question.
 *
 * La décision doit donc être prise côté client, après restauration de la
 * session. C'est ce que fait ce composant.
 * ---------------------------------------------------------------------------
 */

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth, toProfileKey } from "@/components/auth/AuthContext";
import { PROFILES } from "@/lib/profiles";
import { BrandLockup } from "@/components/brand/BrandLockup";

export function RootRouter() {
  const router = useRouter();
  const { user, loading, sessionEnded } = useAuth();

  useEffect(() => {
    // Tant que la session n'est pas résolue, on ne tranche pas : rediriger
    // maintenant reviendrait à reproduire le défaut qu'on corrige.
    if (loading) return;

    if (!user) {
      router.replace(sessionEnded ? "/login?session=expiree" : "/login");
      return;
    }

    // Prise de fonction inachevée : l'API refuse de toute façon les autres
    // routes, autant y conduire directement.
    if (user.mustChangePassword || !user.onboardingCompleted) {
      router.replace("/activation");
      return;
    }

    router.replace(PROFILES[toProfileKey(user.profile)].homePath);
  }, [user, loading, sessionEnded, router]);

  // `replace` et non `push` : la racine ne doit pas s'insérer dans
  // l'historique, sinon le bouton « précédent » y repasse et redirige à
  // nouveau — l'utilisateur se retrouve prisonnier de la page.
  return (
    <main
      className="bg-background flex min-h-screen flex-col items-center justify-center gap-6"
      aria-busy="true"
    >
      <BrandLockup tone="clair" height={72} priority />
      {/* `role="status"` : le lecteur d'écran annonce l'attente au lieu de
          laisser croire que la page est vide. */}
      <p role="status" className="text-body text-secondary">
        Ouverture de votre espace…
      </p>
    </main>
  );
}
