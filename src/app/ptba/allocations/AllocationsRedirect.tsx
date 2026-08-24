"use client";

/**
 * Redirection — les allocations ont rejoint leur exercice.
 *
 * Cette route existait comme écran autonome et déduisait seule de quel
 * exercice elle parlait. C'était le défaut : le registre en retenait un
 * autre, et le lien « Allocations » d'une ligne d'exercice ignorait la
 * ligne cliquée. L'écran vit désormais sous `/ptba/exercices/[year]`, où
 * l'année est portée par l'URL.
 *
 * La route est conservée en redirection plutôt que supprimée : elle a été
 * mise dans les mains de gens, elle est en signet et en lien depuis le
 * registre. Une 404 les laisserait chercher.
 *
 * La cible est l'exercice le plus récent — la MÊME définition que
 * `usePtbaExercice`, qui prend la tête d'une liste triée par année
 * décroissante. Il n'y a plus qu'une réponse à « quel exercice ? » dans le
 * module, et c'est tout l'objet de la manœuvre.
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { InlineNotification } from "@carbon/react";
import { useAuth } from "@/components/auth/AuthContext";
import { ptbaApi } from "@/lib/api";

export function AllocationsRedirect() {
  const router = useRouter();
  const { loading: authLoading } = useAuth();
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    let annule = false;

    void (async () => {
      try {
        const exercices = await ptbaApi.years();
        if (annule) return;
        // Trié par année décroissante côté serveur : la tête est le plus
        // récent. Sans exercice, la liste est la seule page qui ait un sens.
        const cible = exercices[0];
        router.replace(cible ? `/ptba/exercices/${cible.year}` : "/ptba/exercices");
      } catch (e) {
        if (!annule) {
          setErreur(e instanceof Error ? e.message : "Exercices indisponibles.");
        }
      }
    })();

    return () => {
      annule = true;
    };
  }, [authLoading, router]);

  if (erreur) {
    return (
      <InlineNotification
        kind="error"
        lowContrast
        hideCloseButton
        title="Redirection impossible"
        subtitle={`${erreur} Les allocations se trouvent désormais sur la fiche de chaque exercice.`}
        className="max-w-none"
      />
    );
  }

  return (
    <p className="text-body text-secondary">
      Les allocations ont rejoint la fiche de leur exercice. Redirection…
    </p>
  );
}
