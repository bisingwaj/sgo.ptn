"use client";

/**
 * PTN-RDC · Voile « en développement ».
 *
 * ---------------------------------------------------------------------------
 * CE QU'IL FAIT
 *
 * Il floute le contenu d'un module non branché et pose au-dessus un panneau
 * qui le nomme. On devine qu'une structure existe derrière — colonnes,
 * cartes, tableaux — sans pouvoir lire une seule valeur.
 *
 * POURQUOI FLOUTER PLUTÔT QUE VIDER
 *
 * Un écran vide ne dit pas s'il est en panne, interdit, ou simplement à
 * venir. Le flou montre qu'il y a une forme, et le panneau dit laquelle et
 * pourquoi elle n'est pas encore utilisable. Les usagers visés sont des
 * agents publics souvent peu familiers des interfaces denses : leur laisser
 * deviner est le plus sûr moyen qu'ils concluent à une panne.
 *
 * ---------------------------------------------------------------------------
 * TROIS PRÉCAUTIONS QUI NE SE VOIENT PAS
 *
 * 1. LE FLOU N'EST PAS UNE PROTECTION. Le contenu reste dans le DOM et se lit
 *    dans l'inspecteur. Ce sont des données d'exemple, donc sans gravité —
 *    mais ne jamais voiler ainsi quelque chose de confidentiel.
 *
 * 2. IL EST RETIRÉ DES TECHNOLOGIES D'ASSISTANCE. `aria-hidden` et `inert`
 *    ensemble : le premier le sort de l'arbre d'accessibilité, le second lui
 *    ôte le focus. Sans `inert`, une tabulation traverserait un formulaire
 *    invisible et flou — le pire des deux mondes. `inert` est un attribut
 *    natif, pris en charge par React 19.
 *
 * 3. IL NE S'IMPRIME PAS. Ces usagers impriment leurs dossiers. Un tableau
 *    flou sur une feuille est illisible, et un tableau NET de chiffres
 *    inventés serait bien pire — il sortirait de l'écran sans son voile et
 *    circulerait comme un état réel. Seul le panneau part à l'impression.
 * ---------------------------------------------------------------------------
 */

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { InProgress } from "@carbon/icons-react";
import {
  fonctionnaliteDe,
  type Fonctionnalite,
} from "@/lib/fonctionnalites";

interface VoileProps {
  /** Le module concerné. */
  fonctionnalite: Fonctionnalite;
  children: ReactNode;
}

function Voile({ fonctionnalite, children }: VoileProps) {
  return (
    <div className="relative isolate">
      {/*
        Le contenu voilé. `overflow-hidden` coupe la frange que le flou
        déborde ; il est posé ICI et non sur le conteneur, car un
        `overflow` sur un ancêtre casserait le `sticky` du panneau.
      */}
      <div
        aria-hidden="true"
        inert
        className="pointer-events-none select-none overflow-hidden opacity-60 blur-[5px] print:hidden"
      >
        {children}
      </div>

      {/*
        Le panneau. `sticky` afin qu'il reste en vue sur un module long :
        centré une fois pour toutes, il disparaîtrait au premier défilement
        et l'écran redeviendrait un flou sans explication.
      */}
      <div className="absolute inset-0 flex items-start justify-center px-4 py-8 print:static print:p-0">
        <div className="sticky top-8 w-full max-w-md border border-subtle bg-layer p-6 text-center shadow-lg print:shadow-none">
          <InProgress
            size={32}
            aria-hidden
            className="mx-auto mb-4 text-secondary"
          />

          <p className="text-heading-03 text-primary">En développement</p>

          <p className="mt-1 text-body-compact text-secondary">
            Bientôt disponible
          </p>

          <hr className="my-4 border-0 border-t border-subtle" />

          <p className="text-body-compact text-primary">
            {fonctionnalite.libelle}
          </p>

          {fonctionnalite.detail && (
            <p className="mt-2 text-caption text-secondary">
              {fonctionnalite.detail}
            </p>
          )}

          <p className="mt-4 text-caption text-secondary">
            Les éléments visibles en arrière-plan sont des exemples de mise en
            page. Ils ne portent aucune donnée du projet.
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * Voile posé d'après le chemin courant.
 *
 * Monté une fois dans `ShellFrame`, il couvre TOUS les écrans authentifiés
 * sans qu'aucune page n'ait à le savoir. Le registre reste le seul endroit où
 * l'on déclare, et le seul où l'on lève.
 */
export function VoileSelonChemin({ children }: { children: ReactNode }) {
  const chemin = usePathname() ?? "";
  const fonctionnalite = fonctionnaliteDe(chemin);

  if (!fonctionnalite || fonctionnalite.statut !== "en-developpement") {
    return <>{children}</>;
  }

  return <Voile fonctionnalite={fonctionnalite}>{children}</Voile>;
}

/**
 * Voile posé à la main, pour une SECTION d'un écran par ailleurs actif.
 *
 * Utile le jour où un module se branche par morceaux : la partie servie par
 * le serveur se découvre, celle qui tient encore sur des fixtures reste
 * voilée. Le registre gère les modules entiers ; ceci gère le détail.
 */
export function VoileDeveloppement({
  libelle,
  detail,
  children,
}: {
  libelle: string;
  detail?: string;
  children: ReactNode;
}) {
  return (
    <Voile
      fonctionnalite={{ chemin: "", libelle, detail, statut: "en-developpement" }}
    >
      {children}
    </Voile>
  );
}
