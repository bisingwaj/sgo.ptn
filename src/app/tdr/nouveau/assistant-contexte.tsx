"use client";

/**
 * L'assistant du dossier — un seul module, deux surfaces.
 *
 * Il y avait deux assistants : un bouton en ligne dans chaque champ, et un
 * panneau conversationnel en colonne. Chacun tenait son propre état, aucun
 * ne voyait ce que l'autre écrivait, et tous deux pouvaient viser le même
 * champ — le dernier écrivait, sans que rien ne le signale.
 *
 * Le fil de conversation vit désormais ici. Une génération lancée depuis un
 * champ s'y inscrit exactement comme si elle avait été demandée au panneau :
 * l'auteur qui ouvre l'assistant retrouve tout ce qui a été fait sur son
 * dossier, dans l'ordre. C'est aussi ce qui en fait un journal.
 *
 * La règle qui décide du reste : le fil est la mémoire, le panneau n'en est
 * qu'une vue. On peut le fermer sans rien perdre.
 */

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export interface Ecriture {
  champ: string;
  etape: string;
  valeur: unknown;
  avant: unknown;
}

export interface Bulle {
  role: "user" | "assistant";
  texte: string;
  /** Ce que l'assistant a fait pendant ce tour */
  actes: Array<{ genre: "travail" | "ecriture" | "refus"; libelle: string; champ?: string }>;
  /** Écritures de ce tour, pour l'annulation */
  ecritures: Ecriture[];
  encours?: boolean;
  /** Marque une action lancée depuis un champ, non depuis le fil. */
  enLigne?: boolean;
}

interface Assistant {
  ouvert: boolean;
  ouvrir: () => void;
  fermer: () => void;
  basculer: () => void;

  bulles: Bulle[];
  setBulles: React.Dispatch<React.SetStateAction<Bulle[]>>;

  /** Champ sur lequel l'auteur travaille — affiché en tête du panneau. */
  champCourant: string | null;
  setChampCourant: (c: string | null) => void;

  /**
   * Inscrit au fil une action menée depuis un champ.
   *
   * Le panneau n'a pas besoin d'être ouvert : c'est précisément l'intérêt.
   * L'auteur peut travailler en ligne toute la session et ne l'ouvrir qu'à
   * la fin pour relire ce qui s'est passé.
   */
  consignerEnLigne: (demande: string, reponse: string, champ: string) => void;
}

const Ctx = createContext<Assistant | null>(null);

export function AssistantProvider({ children }: { children: ReactNode }) {
  const [ouvert, setOuvert] = useState(false);
  const [bulles, setBulles] = useState<Bulle[]>([]);
  const [champCourant, setChampCourant] = useState<string | null>(null);

  const consignerEnLigne = useCallback(
    (demande: string, reponse: string, champ: string) => {
      setBulles((b) => [
        ...b,
        { role: "user", texte: demande, actes: [], ecritures: [], enLigne: true },
        {
          role: "assistant",
          texte: reponse,
          actes: [{ genre: "travail", libelle: `Proposition rédigée pour « ${champ} »` }],
          ecritures: [],
          enLigne: true,
        },
      ]);
    },
    [setBulles],
  );

  const valeur = useMemo<Assistant>(
    () => ({
      ouvert,
      ouvrir: () => setOuvert(true),
      fermer: () => setOuvert(false),
      basculer: () => setOuvert((v) => !v),
      bulles,
      setBulles,
      champCourant,
      setChampCourant,
      consignerEnLigne,
    }),
    [ouvert, bulles, champCourant, consignerEnLigne],
  );

  return <Ctx.Provider value={valeur}>{children}</Ctx.Provider>;
}

export function useAssistant(): Assistant {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAssistant hors de AssistantProvider");
  return v;
}
