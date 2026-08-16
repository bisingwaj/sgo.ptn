/**
 * Lecture d'un flux d'évènements de l'assistant.
 *
 * `EventSource` ne sait faire que du GET, or l'instruction voyage en corps
 * de requête. On lit donc le corps de la réponse à la main : `fetch` rend un
 * `ReadableStream`, natif dans tous les navigateurs visés.
 *
 * Le client HTTP général (`src/lib/api.ts`) ne peut pas servir ici : il
 * termine par `await response.json()`, ce qui attendrait la fin du flux et
 * annulerait tout l'intérêt.
 */

import { getAccessToken, api } from "./api";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333/api";

export type AgentEvent =
  | { type: "texte"; delta: string }
  | { type: "travail"; libelle: string }
  /** Le texte ENTIER en cours d'écriture, déjà nettoyé — non un fragment */
  | { type: "apercu"; champ: string; texte: string }
  | { type: "ecriture"; champ: string; etape: string; valeur: unknown; avant: unknown }
  | { type: "refus"; champ: string; motif: string }
  | { type: "fin"; tours: number }
  | { type: "erreur"; message: string };

export interface TourDeParole {
  role: "user" | "assistant";
  content: string;
}

/**
 * Ouvre un échange et rend les évènements au fil de l'eau.
 *
 * `signal` permet à l'auteur d'interrompre : quitter l'étape ou poser une
 * autre question ne doit pas laisser un appel courir dans le vide.
 */
export async function* parlerAgent(
  tdrId: string,
  instruction: string,
  historique: TourDeParole[],
  signal?: AbortSignal,
): AsyncGenerator<AgentEvent> {
  const lancer = async () =>
    fetch(`${API_BASE}/tdr/${tdrId}/agent`, {
      method: "POST",
      signal,
      headers: {
        "Content-Type": "application/json",
        ...(getAccessToken() ? { Authorization: `Bearer ${getAccessToken()}` } : {}),
      },
      body: JSON.stringify({ instruction, historique }),
    });

  let response = await lancer();

  // Jeton expiré : on renouvelle et on rejoue, comme le fait le client
  // général. Sans cela, une conversation entamée s'interromprait au bout
  // d'un quart d'heure.
  if (response.status === 401) {
    const renouvele = await api.refresh();
    if (renouvele) response = await lancer();
  }

  if (!response.ok || !response.body) {
    let message = `L’assistant a répondu ${response.status}.`;
    try {
      const corps = (await response.json()) as { message?: string };
      if (corps.message) message = corps.message;
    } catch {
      // Réponse sans corps JSON exploitable
    }
    yield { type: "erreur", message };
    return;
  }

  const lecteur = response.body.getReader();
  const decodeur = new TextDecoder();
  let tampon = "";

  try {
    for (;;) {
      const { done, value } = await lecteur.read();
      if (done) break;
      tampon += decodeur.decode(value, { stream: true });

      // Un évènement SSE se termine par une ligne vide. Un fragment réseau
      // peut couper un évènement en deux : on n'en traite que d'entiers.
      let coupure: number;
      while ((coupure = tampon.indexOf("\n\n")) !== -1) {
        const bloc = tampon.slice(0, coupure).trim();
        tampon = tampon.slice(coupure + 2);
        if (!bloc.startsWith("data:")) continue;
        try {
          yield JSON.parse(bloc.slice(5)) as AgentEvent;
        } catch {
          // Un évènement illisible ne doit pas rompre l'échange.
        }
      }
    }
  } catch (e) {
    if ((e as Error).name === "AbortError") return;
    yield { type: "erreur", message: "La liaison avec l’assistant a été rompue." };
  } finally {
    lecteur.releaseLock();
  }
}

/* ------------------------------------------------------------------ */
/* Rédaction d'un champ, au fil de l'eau                               */
/* ------------------------------------------------------------------ */

export type AssistEvent =
  | { type: "ancrage"; groundedOn: string[]; mode: "reprise" | "redaction" }
  | { type: "texte"; delta: string }
  /** `texte` porte la valeur définitive, débarrassée de tout balisage */
  | { type: "fin"; texte: string }
  | { type: "erreur"; message: string };

/**
 * Même proposition que `tdrApi.assistField`, servie par fragments.
 *
 * Ce n'est pas un effet : une rédaction met dix à vingt secondes, et
 * l'auteur regardait un écran immobile pendant tout ce temps. Les premiers
 * mots paraissent en une seconde, et il juge tôt s'il garde ou relance.
 *
 * Le décodage SSE est celui de `parlerAgent` — même découpe sur la ligne
 * vide, même tolérance à un évènement coupé par un fragment réseau.
 */
export async function* redigerChamp(
  tdrId: string,
  champ: string,
  signal?: AbortSignal,
): AsyncGenerator<AssistEvent> {
  const lancer = async () =>
    fetch(`${API_BASE}/tdr/${tdrId}/assistance/champ/flux`, {
      method: "POST",
      signal,
      headers: {
        "Content-Type": "application/json",
        ...(getAccessToken() ? { Authorization: `Bearer ${getAccessToken()}` } : {}),
      },
      body: JSON.stringify({ champ }),
    });

  let response = await lancer();
  if (response.status === 401) {
    const renouvele = await api.refresh();
    if (renouvele) response = await lancer();
  }

  if (!response.ok || !response.body) {
    let message =
      response.status === 503
        ? "L’assistance n’est pas configurée sur ce serveur. Le champ reste à remplir à la main."
        : `L’assistant a répondu ${response.status}.`;
    try {
      const corps = (await response.json()) as { message?: string };
      if (corps.message) message = corps.message;
    } catch {
      // Réponse sans corps JSON exploitable
    }
    yield { type: "erreur", message };
    return;
  }

  const lecteur = response.body.getReader();
  const decodeur = new TextDecoder();
  let tampon = "";

  try {
    for (;;) {
      const { done, value } = await lecteur.read();
      if (done) break;
      tampon += decodeur.decode(value, { stream: true });

      let coupure: number;
      while ((coupure = tampon.indexOf("\n\n")) !== -1) {
        const bloc = tampon.slice(0, coupure).trim();
        tampon = tampon.slice(coupure + 2);
        if (!bloc.startsWith("data:")) continue;
        try {
          yield JSON.parse(bloc.slice(5).trim()) as AssistEvent;
        } catch {
          // Fragment illisible : on poursuit plutôt que d'interrompre.
        }
      }
    }
  } finally {
    lecteur.releaseLock();
  }
}
