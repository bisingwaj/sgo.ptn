"use client";

import { useState, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ApiError } from "./client";

/**
 * Fournisseur TanStack Query.
 *
 * Le client est créé dans un `useState` et non au niveau du module : en rendu
 * serveur, un client partagé ferait fuiter le cache d'un utilisateur vers la
 * requête d'un autre. Sur une plateforme où un auditeur, un bailleur et un
 * agent UGP n'ont pas le droit de voir les mêmes lignes, ce n'est pas un
 * détail de performance.
 */
export function QueryProvider({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Les données de gouvernance changent lentement : inutile de
            // recharger à chaque prise de focus sur un poste de bureau.
            staleTime: 60_000,
            refetchOnWindowFocus: false,
            retry: (failureCount, error) => {
              // Ne jamais réessayer un refus métier ni une ressource absente :
              // le résultat sera identique, et l'attente inutile fait passer
              // une réponse claire pour une panne.
              if (error instanceof ApiError) {
                if (error.status === 404 || error.isGuardrail) return false;
                if (error.status >= 400 && error.status < 500) return false;
              }
              return failureCount < 2;
            },
          },
          mutations: {
            // Une écriture n'est jamais rejouée automatiquement : sur une
            // décision d'ANO, un doublon serait un acte de gouvernance en trop.
            retry: false,
          },
        },
      }),
  );

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
