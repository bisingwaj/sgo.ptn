import type { Metadata } from "next";
import { LoginClient } from "./LoginClient";

export const metadata: Metadata = {
  title: "Connexion · PTN-RDC",
  description:
    "Plateforme de gouvernance du Projet de Transformation Numérique de la République Démocratique du Congo.",
};

type SessionEndReason = "expiree" | "inactivite";

/**
 * Le motif de fin de session est lu ICI, côté serveur, et transmis en
 * propriété.
 *
 * La version précédente le lisait depuis `window.location` dans un effet, pour
 * garder la page statique. Cela imposait un `setState` dans un effet — ce que
 * React 19 déconseille et que notre configuration ESLint refuse — et faisait
 * apparaître le message après le premier rendu, donc après un clignotement.
 *
 * La contrepartie est que la route devient dynamique. Sans conséquence : une
 * page de connexion n'est de toute façon pas mise en cache.
 */
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ session?: string }>;
}) {
  const { session } = await searchParams;
  const sessionEnded: SessionEndReason | null =
    session === "expiree" || session === "inactivite" ? session : null;

  return <LoginClient sessionEnded={sessionEnded} />;
}
