import {
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/** Un tour de conversation, au format des API compatibles OpenAI. */
/**
 * Un morceau de message.
 *
 * Le texte suffit presque toujours. Les deux autres formes servent à
 * transmettre une pièce apportée par l'auteur : le modèle lit nativement
 * les PDF et les images, sans extraction intermédiaire — ce qui évite la
 * déformation qu'introduit toute conversion en texte, et notamment la perte
 * des tableaux.
 */
export type MorceauMessage =
  | { type: 'text'; text: string; cache_control?: { type: 'ephemeral' } }
  | {
      type: 'image_url';
      image_url: { url: string };
      cache_control?: { type: 'ephemeral' };
    }
  | {
      type: 'file';
      file: { filename: string; file_data: string };
      cache_control?: { type: 'ephemeral' };
    };

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | MorceauMessage[] | null;
  /** Renseigné par l'assistant lorsqu'il demande l'exécution d'outils */
  tool_calls?: ToolCall[];
  /** Renseigné sur un message de rôle `tool` : à quel appel il répond */
  tool_call_id?: string;
}

export interface ToolCall {
  id: string;
  type: 'function';
  function: { name: string; arguments: string };
}

/** Déclaration d'un outil offert au modèle. */
export interface ToolSpec {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

export interface GenerationRequest {
  system: string;
  user: string;
  maxTokens?: number;
  temperature?: number;
  /** Exiger une réponse JSON stricte */
  json?: boolean;
}

export interface ChatRequest {
  messages: ChatMessage[];
  tools?: ToolSpec[];
  maxTokens?: number;
  temperature?: number;
  /**
   * Délai d'abandon propre à l'appel. Un tour de conversation court n'a pas
   * besoin des soixante secondes qu'exige la composition d'une section
   * entière.
   */
  timeoutMs?: number;
}

export interface GenerationResult {
  text: string;
  model: string;
  /**
   * Motif d'arret renvoye par le fournisseur. « length » signale une reponse
   * coupee au plafond de jetons : distinguer ce cas d'une reponse mal formee
   * evite de renvoyer « illisible » a l'auteur quand le texte etait bon mais
   * incomplet.
   */
  finishReason?: string;
  /** Appels d'outils demandés par le modèle, le cas échéant */
  toolCalls?: ToolCall[];
  /** Jetons consommés, quand le fournisseur les renvoie */
  usage?: { prompt: number; completion: number };
}

/**
 * Évènement d'un appel en flux.
 *
 * `texte` porte un fragment à afficher au fil de l'eau. `outil` porte un
 * fragment d'appel d'outil : le fournisseur envoie le nom d'abord, puis les
 * arguments par morceaux, qu'il faut réassembler avant de les lire.
 */
export type StreamEvent =
  | { type: 'texte'; delta: string }
  | {
      type: 'outil';
      index: number;
      id?: string;
      nom?: string;
      argsDelta?: string;
    }
  | {
      type: 'fin';
      finishReason?: string;
      usage?: { prompt: number; completion: number };
    };

/**
 * Appels de modèle, via OpenRouter.
 *
 * L'appel part du serveur, jamais du navigateur : la clé n'a pas à
 * circuler côté client, et le passage obligé par le backend permet de
 * journaliser chaque génération.
 *
 * Ce service ne sait rien du métier. Il ne construit aucune invite et ne
 * décide de rien — voir `TdrAssistService` pour l'ancrage documentaire.
 */
@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private static readonly ENDPOINT =
    'https://openrouter.ai/api/v1/chat/completions';

  /** Un tour de conversation est court ; composer une section ne l'est pas. */
  private static readonly TIMEOUT_DEFAUT = 60_000;

  constructor(private readonly config: ConfigService) {}

  get isConfigured(): boolean {
    return Boolean(this.config.get<string>('OPENROUTER_API_KEY'));
  }

  get model(): string {
    return (
      this.config.get<string>('OPENROUTER_MODEL') ??
      'anthropic/claude-sonnet-4.5'
    );
  }

  private apiKey(): string {
    const key = this.config.get<string>('OPENROUTER_API_KEY');
    if (!key) {
      throw new ServiceUnavailableException(
        'Assistance rédactionnelle non configurée : aucune clé OpenRouter n’est renseignée côté serveur.',
      );
    }
    return key;
  }

  private headers(apiKey: string): Record<string, string> {
    return {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      // Recommandé par OpenRouter pour l'attribution des appels.
      'HTTP-Referer':
        this.config.get<string>('CORS_ORIGIN') ?? 'http://localhost:3000',
      'X-Title': 'PTN-RDC · Plateforme de gouvernance',
    };
  }

  /**
   * Marque le dernier bloc système comme cachable.
   *
   * Le socle institutionnel pèse près de quatre mille jetons et repart
   * identique à chaque appel. Anthropic sait le conserver entre deux
   * requêtes ; OpenRouter transmet l'annotation. Un fournisseur qui ne la
   * connaît pas l'ignore, de sorte que la marque ne coûte rien là où elle ne
   * sert pas.
   */
  private static cacheSystem(messages: ChatMessage[]): unknown[] {
    return messages.map((m) =>
      m.role === 'system' && typeof m.content === 'string'
        ? {
            role: 'system',
            content: [
              {
                type: 'text',
                text: m.content,
                cache_control: { type: 'ephemeral' },
              },
            ],
          }
        : m,
    );
  }

  private async post(
    body: unknown,
    timeoutMs: number,
    apiKey: string,
  ): Promise<Response> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(AiService.ENDPOINT, {
        method: 'POST',
        signal: controller.signal,
        headers: this.headers(apiKey),
        body: JSON.stringify(body),
      });
      if (!response.ok) {
        const detail = await response.text().catch(() => '');
        this.logger.error(
          `OpenRouter ${response.status} — ${detail.slice(0, 400)}`,
        );
        throw new HttpException(
          `Le service de génération a répondu ${response.status}. Vérifiez la clé et le modèle configurés.`,
          HttpStatus.BAD_GATEWAY,
        );
      }
      return response;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      if (error instanceof Error && error.name === 'AbortError') {
        throw new HttpException(
          'Le service de génération n’a pas répondu dans le délai imparti.',
          HttpStatus.GATEWAY_TIMEOUT,
        );
      }
      this.logger.error(
        'Appel au service de génération impossible',
        error as Error,
      );
      throw new HttpException(
        'Service de génération injoignable.',
        HttpStatus.BAD_GATEWAY,
      );
    } finally {
      // Le délai couvre l'établissement de la requête ; la lecture du corps,
      // en flux, dure aussi longtemps que le modèle écrit et ne peut pas être
      // bornée par le même compte à rebours.
      clearTimeout(timeout);
    }
  }

  /**
   * Conversation complète, réponse attendue d'un bloc.
   *
   * Contrairement à la version précédente, une réponse sans texte n'est plus
   * une erreur : un modèle qui demande l'exécution d'un outil renvoie
   * `content: null` et place sa demande dans `tool_calls`. Traiter ce cas
   * comme une réponse vide produisait un 502 systématique dès qu'un outil
   * était offert.
   */
  async chat(request: ChatRequest): Promise<GenerationResult> {
    const apiKey = this.apiKey();
    const model = this.model;

    const response = await this.post(
      {
        model,
        temperature: request.temperature ?? 0.3,
        max_tokens: request.maxTokens ?? 1200,
        ...(request.tools?.length ? { tools: request.tools } : {}),
        messages: AiService.cacheSystem(request.messages),
      },
      request.timeoutMs ?? AiService.TIMEOUT_DEFAUT,
      apiKey,
    );

    const payload = (await response.json()) as {
      choices?: Array<{
        message?: { content?: string | null; tool_calls?: ToolCall[] };
        finish_reason?: string;
      }>;
      usage?: { prompt_tokens?: number; completion_tokens?: number };
    };

    const choice = payload.choices?.[0];
    const text = choice?.message?.content?.trim() ?? '';
    const toolCalls = choice?.message?.tool_calls;

    if (!text && !toolCalls?.length) {
      throw new HttpException(
        'Réponse vide du service de génération.',
        HttpStatus.BAD_GATEWAY,
      );
    }

    return {
      text,
      model,
      finishReason: choice?.finish_reason,
      toolCalls,
      usage: payload.usage
        ? {
            prompt: payload.usage.prompt_tokens ?? 0,
            completion: payload.usage.completion_tokens ?? 0,
          }
        : undefined,
    };
  }

  /**
   * Conversation en flux.
   *
   * Le premier fragment arrive en moins d'une seconde là où la réponse
   * entière demande de dix à vingt-cinq secondes. C'est le seul levier qui
   * agisse réellement sur l'attente ressentie : le backend hors modèle ne
   * pèse qu'une dizaine de millisecondes sur ce total.
   */
  async *stream(request: ChatRequest): AsyncGenerator<StreamEvent> {
    const apiKey = this.apiKey();

    const response = await this.post(
      {
        model: this.model,
        temperature: request.temperature ?? 0.3,
        max_tokens: request.maxTokens ?? 1200,
        stream: true,
        ...(request.tools?.length ? { tools: request.tools } : {}),
        messages: AiService.cacheSystem(request.messages),
      },
      request.timeoutMs ?? AiService.TIMEOUT_DEFAUT,
      apiKey,
    );

    if (!response.body) {
      throw new HttpException('Flux indisponible.', HttpStatus.BAD_GATEWAY);
    }

    const decoder = new TextDecoder();
    let tampon = '';

    // Les fragments arrivent découpés arbitrairement : une ligne SSE peut
    // être coupée en deux lectures. On accumule et on ne traite que les
    // lignes complètes.
    for await (const morceau of response.body as unknown as AsyncIterable<Uint8Array>) {
      tampon += decoder.decode(morceau, { stream: true });

      let coupure: number;
      while ((coupure = tampon.indexOf('\n')) !== -1) {
        const ligne = tampon.slice(0, coupure).trim();
        tampon = tampon.slice(coupure + 1);

        if (!ligne.startsWith('data:')) continue;
        const charge = ligne.slice(5).trim();
        if (charge === '[DONE]') return;
        // OpenRouter intercale des commentaires de maintien de connexion.
        if (!charge || charge.startsWith(':')) continue;

        let bloc: {
          choices?: Array<{
            delta?: {
              content?: string | null;
              tool_calls?: Array<{
                index: number;
                id?: string;
                function?: { name?: string; arguments?: string };
              }>;
            };
            finish_reason?: string;
          }>;
          usage?: { prompt_tokens?: number; completion_tokens?: number };
        };
        try {
          bloc = JSON.parse(charge);
        } catch {
          // Un fragment illisible ne doit pas interrompre le flux : le
          // suivant portera la suite du texte.
          continue;
        }

        const choix = bloc.choices?.[0];
        const delta = choix?.delta;

        if (delta?.content) yield { type: 'texte', delta: delta.content };

        for (const appel of delta?.tool_calls ?? []) {
          yield {
            type: 'outil',
            index: appel.index,
            id: appel.id,
            nom: appel.function?.name,
            argsDelta: appel.function?.arguments,
          };
        }

        if (choix?.finish_reason) {
          yield {
            type: 'fin',
            finishReason: choix.finish_reason,
            usage: bloc.usage
              ? {
                  prompt: bloc.usage.prompt_tokens ?? 0,
                  completion: bloc.usage.completion_tokens ?? 0,
                }
              : undefined,
          };
        }
      }
    }
  }

  /**
   * Génération à un tour — la forme qu'employaient les quatre assistances
   * d'origine. Conservée pour ne pas les réécrire, mais elle n'est qu'un cas
   * particulier de `chat`.
   */
  async generate(request: GenerationRequest): Promise<GenerationResult> {
    const apiKey = this.apiKey();
    const model = this.model;

    const response = await this.post(
      {
        model,
        temperature: request.temperature ?? 0.3,
        max_tokens: request.maxTokens ?? 1200,
        ...(request.json ? { response_format: { type: 'json_object' } } : {}),
        messages: AiService.cacheSystem([
          { role: 'system', content: request.system },
          { role: 'user', content: request.user },
        ]),
      },
      AiService.TIMEOUT_DEFAUT,
      apiKey,
    );

    const payload = (await response.json()) as {
      choices?: Array<{
        message?: { content?: string };
        finish_reason?: string;
      }>;
      usage?: { prompt_tokens?: number; completion_tokens?: number };
    };

    const text = payload.choices?.[0]?.message?.content?.trim();
    if (!text) {
      throw new HttpException(
        'Réponse vide du service de génération.',
        HttpStatus.BAD_GATEWAY,
      );
    }

    return {
      text,
      model,
      finishReason: payload.choices?.[0]?.finish_reason,
      usage: payload.usage
        ? {
            prompt: payload.usage.prompt_tokens ?? 0,
            completion: payload.usage.completion_tokens ?? 0,
          }
        : undefined,
    };
  }
}
