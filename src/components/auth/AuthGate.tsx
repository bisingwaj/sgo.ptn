"use client";

/**
 * Garde d'accès des écrans authentifiés.
 *
 * ---------------------------------------------------------------------------
 * CE QU'ELLE CORRIGE
 *
 * Aucune route n'était protégée. Sans session, `/cockpit`, `/fiduciaire`,
 * `/contrats` et jusqu'à `/mgp-eas-hs` — le canal confidentiel de signalement
 * des violences sexuelles — s'affichaient intégralement. Les données étant
 * encore fictives, rien de réel ne fuitait ; mais l'écran, sa structure et ses
 * intitulés étaient publics, et le jour où ces pages sont branchées sur l'API
 * — ce qui a déjà commencé avec le TDR et le PTBA — la fuite devient réelle.
 *
 * ---------------------------------------------------------------------------
 * POURQUOI ICI ET PAS DANS UN MIDDLEWARE
 *
 * Un middleware Next s'exécute côté serveur et ne lit que les cookies. Or la
 * session vit dans le `localStorage` : jeton de rafraîchissement persisté,
 * jeton d'accès en mémoire. Le serveur ne peut donc rien décider tant que les
 * jetons ne sont pas passés en cookies `httpOnly` — migration prévue, notée
 * dans src/lib/api.ts.
 *
 * En attendant, la garde est posée dans `Shell`, que tous les écrans
 * authentifiés traversent déjà. Elle n'est PAS une protection des données :
 * celles-ci sont protégées par le serveur, qui refuse toute requête sans
 * jeton valide. Elle évite d'exposer l'interface et de laisser quelqu'un
 * croire qu'il consulte des informations réelles.
 * ---------------------------------------------------------------------------
 */

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Loading } from "@carbon/react";
import { useAuth } from "@/components/auth/AuthContext";

export function AuthGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading, sessionEnded } = useAuth();

  useEffect(() => {
    if (loading || user) return;

    // La destination voulue est conservée pour y revenir après connexion :
    // sans cela, quelqu'un qui ouvre un lien profond atterrit sur son accueil
    // et doit refaire le chemin à la main.
    const params = new URLSearchParams();
    if (pathname && pathname !== "/") params.set("next", pathname);
    // Une session refusée se dit. Sans ce motif, quelqu'un que le serveur
    // vient de déconnecter retrouve un formulaire vierge et en conclut que
    // l'application a perdu sa saisie sans raison.
    if (sessionEnded) params.set("session", "expiree");

    const query = params.toString();
    router.replace(query ? `/login?${query}` : "/login");
  }, [user, loading, sessionEnded, pathname, router]);

  if (loading) {
    return (
      <div
        className="bg-background flex min-h-screen items-center justify-center"
        aria-busy="true"
      >
        <Loading withOverlay={false} description="Vérification de votre session…" />
      </div>
    );
  }

  // Redirection en cours : on n'affiche rien plutôt qu'un écran qui
  // disparaîtrait aussitôt.
  if (!user) return null;

  return <>{children}</>;
}
