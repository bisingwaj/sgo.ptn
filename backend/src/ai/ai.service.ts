import { HttpException, HttpStatus, Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface GenerationRequest {
  system: string;
  user: string;
  maxTokens?: number;
  temperature?: number;
  /** Exiger une réponse JSON stricte */
  json?: boolean;
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
  /** Jetons consommés, quand le fournisseur les renvoie */
  usage?: { prompt: number; completion: number };
}

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
  private static readonly ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions';

  constructor(private readonly config: ConfigService) {}

  get isConfigured(): boolean {
    return Boolean(this.config.get<string>('OPENROUTER_API_KEY'));
  }

  get model(): string {
    return this.config.get<string>('OPENROUTER_MODEL') ?? 'anthropic/claude-sonnet-4.5';
  }

  async generate(request: GenerationRequest): Promise<GenerationResult> {
    const apiKey = this.config.get<string>('OPENROUTER_API_KEY');
    if (!apiKey) {
      throw new ServiceUnavailableException(
        'Assistance rédactionnelle non configurée : aucune clé OpenRouter n’est renseignée côté serveur.',
      );
    }

    const model = this.model;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60_000);

    try {
      const response = await fetch(AiService.ENDPOINT, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          // Recommandé par OpenRouter pour l'attribution des appels.
          'HTTP-Referer': this.config.get<string>('CORS_ORIGIN') ?? 'http://localhost:3000',
          'X-Title': 'PTN-RDC · Plateforme de gouvernance',
        },
        body: JSON.stringify({
          model,
          temperature: request.temperature ?? 0.3,
          max_tokens: request.maxTokens ?? 1200,
          ...(request.json ? { response_format: { type: 'json_object' } } : {}),
          messages: [
            { role: 'system', content: request.system },
            { role: 'user', content: request.user },
          ],
        }),
      });

      if (!response.ok) {
        const detail = await response.text().catch(() => '');
        this.logger.error(`OpenRouter ${response.status} — ${detail.slice(0, 400)}`);
        throw new HttpException(
          `Le service de génération a répondu ${response.status}. Vérifiez la clé et le modèle configurés.`,
          HttpStatus.BAD_GATEWAY,
        );
      }

      const payload = (await response.json()) as {
        choices?: Array<{ message?: { content?: string }; finish_reason?: string }>;
        usage?: { prompt_tokens?: number; completion_tokens?: number };
      };

      const text = payload.choices?.[0]?.message?.content?.trim();
      if (!text) {
        throw new HttpException('Réponse vide du service de génération.', HttpStatus.BAD_GATEWAY);
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
    } catch (error) {
      if (error instanceof HttpException) throw error;
      if (error instanceof Error && error.name === 'AbortError') {
        throw new HttpException(
          'Le service de génération n’a pas répondu dans le délai imparti.',
          HttpStatus.GATEWAY_TIMEOUT,
        );
      }
      this.logger.error('Appel au service de génération impossible', error as Error);
      throw new HttpException('Service de génération injoignable.', HttpStatus.BAD_GATEWAY);
    } finally {
      clearTimeout(timeout);
    }
  }
}
