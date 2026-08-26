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
export function parlerAgent(
  tdrId: string,
  instruction: string,
  historique: TourDeParole[],
  signal?: AbortSignal,
): AsyncGenerator<AgentEvent> {
  return lireFlux<AgentEvent>(
    `/tdr/${tdrId}/agent`,
    { instruction, historique },
    (statut) => `L’assistant a répondu ${statut}.`,
    signal,
  );
}

/* ------------------------------------------------------------------ */
/* Rédaction d'un champ, au fil de l'eau                               */
/* ------------------------------------------------------------------ */

export type AssistEvent =
  | { type: "ancrage"; groundedOn: string[]; mode: "reprise" | "redaction" }
  /**
   * Où en est la génération.
   *
   * Le modèle configuré RÉFLÉCHIT avant d'écrire, et il y met du temps :
   * mesuré, sept secondes sur quinze avant le premier mot, pendant
   * lesquelles le serveur ne transmettait rien du tout. L'écran restait
   * muet sur la moitié de l'attente, ce qui ne se distingue pas d'une
   * panne. `avancement` porte le nombre de signes de réflexion produits —
   * jamais la réflexion elle-même, qui n'a rien à faire dans une pièce
   * contractuelle.
   */
  | { type: "phase"; phase: "reflexion" | "redaction"; avancement?: number }
  | { type: "texte"; delta: string }
  /**
   * `texte` porte la valeur définitive, débarrassée de tout balisage.
   *
   * `tronque` dit que le modèle s'est arrêté faute de place, et non parce
   * qu'il avait fini. Les deux cas étaient indiscernables : le texte
   * partait coupé en milieu de phrase sans que rien ne le signale.
   */
  | { type: "fin"; texte: string; tronque?: boolean }
  | { type: "erreur"; message: string };

/**
 * Lit un flux d'évènements SSE et les rend au fil de l'eau.
 *
 * Le décodage était recopié à l'identique dans chaque fonction de ce
 * fichier — même découpe sur la ligne vide, même tolérance à un évènement
 * coupé par un fragment réseau, même renouvellement du jeton. Quatre
 * copies, dont l'une avait déjà perdu son filet d'erreur : `redigerChamp`
 * n'attrapait rien, si bien qu'une liaison rompue en cours de rédaction
 * remontait en exception nue jusqu'à l'appelant.
 */
async function* lireFlux<T>(
  chemin: string,
  corps: unknown,
  messageDeSecours: (statut: number) => string,
  signal?: AbortSignal,
): AsyncGenerator<T> {
  const lancer = async () =>
    fetch(`${API_BASE}${chemin}`, {
      method: "POST",
      signal,
      headers: {
        "Content-Type": "application/json",
        ...(getAccessToken() ? { Authorization: `Bearer ${getAccessToken()}` } : {}),
      },
      body: JSON.stringify(corps),
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
    let message = messageDeSecours(response.status);
    try {
      const c = (await response.json()) as { message?: string };
      if (c.message) message = c.message;
    } catch {
      // Réponse sans corps JSON exploitable
    }
    yield { type: "erreur", message } as T;
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
          yield JSON.parse(bloc.slice(5).trim()) as T;
        } catch {
          // Un évènement illisible ne doit pas rompre l'échange.
        }
      }
    }
  } catch (e) {
    // Une interruption VOULUE n'est pas une panne : l'auteur a appuyé sur
    // « Arrêter », et un bandeau rouge serait incompréhensible.
    if ((e as Error).name === "AbortError") return;
    yield {
      type: "erreur",
      message: "La liaison avec l’assistant a été rompue.",
    } as T;
  } finally {
    lecteur.releaseLock();
  }
}

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
export function redigerChamp(
  tdrId: string,
  champ: string,
  signal?: AbortSignal,
): AsyncGenerator<AssistEvent> {
  return lireFlux<AssistEvent>(
    `/tdr/${tdrId}/assistance/champ/flux`,
    { champ },
    (statut) =>
      statut === 503
        ? "L’assistance n’est pas configurée sur ce serveur. Le champ reste à remplir à la main."
        : `L’assistant a répondu ${statut}.`,
    signal,
  );
}

/**
 * Poursuit une rédaction coupée, là où elle s'est arrêtée.
 *
 * Le modèle s'arrête parfois faute de place — mesuré, et le motif d'arrêt
 * remonte désormais jusqu'ici. Refaire tout un paragraphe pour trois
 * phrases manquantes est ce que l'auteur reprochait à l'outil : il garde
 * ce qui a été écrit, et ne demande que la suite.
 *
 * `debut` voyage depuis l'écran : la proposition n'est pas enregistrée au
 * serveur tant que l'auteur ne l'a pas reprise, et le serveur ne peut donc
 * pas la relire.
 */
export function poursuivreChamp(
  tdrId: string,
  champ: string,
  debut: string,
  signal?: AbortSignal,
): AsyncGenerator<AssistEvent> {
  return lireFlux<AssistEvent>(
    `/tdr/${tdrId}/assistance/champ/suite`,
    { champ, debut },
    (statut) => `L’assistant a répondu ${statut}.`,
    signal,
  );
}

/* ------------------------------------------------------------------ */
/* L'assistant général, hors parcours                                  */

export type AssistantEvent =
  | { type: "texte"; delta: string }
  /** Une consultation en cours, dite pendant qu'elle a lieu */
  | { type: "consultation"; libelle: string }
  /** Ce qui a RÉELLEMENT été consulté : le serveur le rapporte, pas le modèle */
  | { type: "sources"; sources: string[] }
  | { type: "fin" }
  | { type: "erreur"; message: string };

/**
 * Pose une question à l'assistant général.
 *
 * Même décodage que `parlerAgent` — même découpe sur la ligne vide, même
 * tolérance à un évènement coupé par un fragment réseau, même
 * renouvellement du jeton. Ce qui change est la route et ce qui en revient.
 */
export function interrogerAssistant(
  question: string,
  historique: TourDeParole[],
  signal?: AbortSignal,
): AsyncGenerator<AssistantEvent> {
  return lireFlux<AssistantEvent>(
    "/assistant/question",
    { question, historique },
    () => "L’assistant est momentanément indisponible. Réessayez dans un instant.",
    signal,
  );
}
