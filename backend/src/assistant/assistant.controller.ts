import { Body, Controller, HttpStatus, Post, Req, Res } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import type { Request, Response } from 'express';
import { AssistantService } from './assistant.service';
import { CurrentUser } from '../common/decorators';
import type { AuthenticatedUser } from '../common/types/authenticated-user';

class TourDto {
  @IsIn(['user', 'assistant'], { message: 'Tour de parole non reconnu.' })
  role!: 'user' | 'assistant';

  @IsString({ message: 'Un tour de parole doit porter du texte.' })
  @MaxLength(4000, { message: 'Ce message est trop long pour être rappelé.' })
  content!: string;
}

class QuestionDto {
  @IsString({ message: 'Posez votre question sous forme de texte.' })
  @MinLength(2, { message: 'La question est trop courte.' })
  @MaxLength(2000, {
    message: 'La question est trop longue : reformulez-la plus brièvement.',
  })
  question!: string;

  @IsOptional()
  @IsArray({ message: 'L’historique de la conversation est mal formé.' })
  @Type(() => TourDto)
  historique?: TourDto[];
}

/**
 * L'assistant général de la plateforme.
 *
 * Il répond depuis le socle de connaissance du projet et depuis le
 * référentiel en base. Il ne modifie rien : aucun de ses outils n'écrit, et
 * c'est délibéré — il est offert sur tous les écrans et aux huit profils,
 * auditeurs compris.
 */
@ApiTags('Assistant')
@ApiBearerAuth()
@Controller('assistant')
export class AssistantController {
  constructor(private readonly assistant: AssistantService) {}

  @Post('question')
  @ApiOperation({
    summary: 'Poser une question à l’assistant, réponse au fil de l’eau',
    description:
      'Les seuils, méthodes et catégories sont lus dans le référentiel, jamais donnés de mémoire. Les sources rendues sont celles réellement consultées.',
  })
  async question(
    @Body() dto: QuestionDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    res.writeHead(HttpStatus.OK, {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      // Sans cela, un proxy intermédiaire garde le flux en tampon et le rend
      // d'un bloc : l'effet recherché disparaît.
      'X-Accel-Buffering': 'no',
    });

    const envoyer = (ev: unknown) =>
      res.write(`data: ${JSON.stringify(ev)}\n\n`);

    // Une personne qui ferme le panneau ferme la connexion : inutile de
    // continuer à écrire dans le vide.
    let ferme = false;
    req.on('close', () => {
      ferme = true;
    });

    try {
      for await (const ev of this.assistant.repondre(
        dto.question,
        dto.historique ?? [],
        actor,
        {
          ipAddress: req.ip ?? undefined,
          userAgent: req.get('user-agent') ?? undefined,
        },
      )) {
        if (ferme) break;
        envoyer(ev);
      }
    } catch {
      if (!ferme) {
        envoyer({
          type: 'erreur',
          message:
            'La réponse n’a pas abouti. Réessayez dans un instant ; si cela persiste, signalez-le à votre administrateur.',
        });
      }
    } finally {
      res.end();
    }
  }
}
