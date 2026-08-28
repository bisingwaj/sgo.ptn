import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import type { Request, Response } from 'express';
import { DocumentsService } from './documents.service';
import { CurrentUser, RequirePermissions } from '../common/decorators';
import type { AuthenticatedUser } from '../common/types/authenticated-user';
import type { RequestContext } from '../auth/auth.service';
import type { NatureDocument } from '../../generated/prisma/enums';

const NATURES = [
  'MEP',
  'PPSD',
  'PLAN_PASSATION',
  'CGES',
  'CPR',
  'PMPP',
  'PGMO',
  'PEES',
  'PPA',
  'REGLEMENT_BAILLEUR',
  'ACCORD_FINANCEMENT',
  'MANUEL',
  'PROCES_VERBAL',
  'AUTRE',
] as const;

class DeposerDto {
  @IsString({ message: 'L’intitulé doit être du texte.' })
  @MinLength(4, { message: 'Un intitulé de quatre caractères au minimum.' })
  @MaxLength(200, {
    message: 'Cet intitulé est trop long pour une ligne de catalogue.',
  })
  titre!: string;

  @IsIn(NATURES, { message: 'Nature de document non reconnue.' })
  nature!: NatureDocument;

  /**
   * Ce que le document apporte, en une phrase.
   *
   * Facultatif au dépôt, mais c'est lui que l'assistant lit pour choisir ce
   * qu'il consultera : sans résumé, il ne lui reste que l'intitulé.
   */
  @IsOptional()
  @IsString()
  @MaxLength(400, {
    message: 'Ce résumé est trop long : une phrase, deux au plus.',
  })
  resume?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  version?: string;

  @IsOptional()
  @IsString()
  effectiveFrom?: string;
}

interface FichierRecu {
  originalname: string;
  mimetype: string;
  buffer: Buffer;
  size: number;
}

function contextOf(req: Request): RequestContext {
  return {
    ipAddress: req.ip ?? undefined,
    userAgent: req.get('user-agent') ?? undefined,
  };
}

/**
 * Le corpus documentaire du projet.
 *
 * LA LECTURE EST OUVERTE À TOUS ceux qui portent `referentiel:read`, c'est-à-dire
 * à tout le monde : ce sont les manuels du projet, les cacher à ses propres
 * agents n'aurait aucun sens.
 *
 * LE DÉPÔT EST RÉSERVÉ. Ces pièces font autorité — l'assistant s'en sert pour
 * répondre, et un document périmé déposé par inadvertance ferait écrire des
 * règles abrogées dans une pièce contractuelle.
 */
@ApiTags('Documents de référence')
@ApiBearerAuth()
@Controller('documents')
export class DocumentsController {
  constructor(private readonly documents: DocumentsService) {}

  @Get()
  @RequirePermissions('referentiel:read')
  @ApiOperation({
    summary: 'Le corpus documentaire du projet',
    description:
      'Sans le contenu des fichiers : un catalogue de vingt pièces en base64 pèserait des dizaines de mégaoctets pour afficher vingt titres.',
  })
  async lister(@Query('inactifs') inactifs?: string) {
    // L'écran ne doit pas promettre une lecture par l'assistant si le modèle
    // configuré ne lit pas les fichiers — le cas s'est déjà produit sur les
    // pièces jointes. La réponse vient de `GET /ai/capacites`, que le
    // navigateur interroge déjà : la redemander ici créerait un cycle entre
    // le corpus et l'IA pour une information que l'écran a sous la main.
    return { rows: await this.documents.lister({ inactifs: inactifs === 'true' }) };
  }

  @Post()
  @RequirePermissions('referentiel:documents')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Déposer un document de référence',
    description:
      'Le PDF est soumis à l’assistant ; Word et texte sont conservés à l’archive sans lui être transmis. Un fichier déjà présent est refusé — deux exemplaires du même MEP laisseraient l’assistant choisir sans raison.',
  })
  @UseInterceptors(
    FileInterceptor('fichier', {
      // Comme pour les pièces jointes : les octets ne touchent pas le disque.
      storage: undefined,
      limits: { fileSize: 20 * 1024 * 1024, files: 1 },
    }),
  )
  deposer(
    @UploadedFile() fichier: FichierRecu | undefined,
    @Body() dto: DeposerDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    if (!fichier) throw new BadRequestException('Aucun fichier reçu.');
    return this.documents.deposer(fichier, dto, actor, contextOf(req));
  }

  @Get(':id/fichier')
  @RequirePermissions('referentiel:read')
  @ApiOperation({ summary: 'Télécharger un document de référence' })
  async telecharger(
    @Param('id', ParseUUIDPipe) id: string,
    @Res() res: Response,
  ): Promise<void> {
    const doc = await this.documents.lireContenu(id);
    res.setHeader('Content-Type', doc.mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${doc.filename}"`);
    res.end(Buffer.from(doc.content));
  }

  @Post(':id/retirer')
  @RequirePermissions('referentiel:documents')
  @ApiOperation({
    summary: 'Retirer un document du corpus',
    description:
      'Le document cesse d’être consultable par l’assistant, sans être effacé : ce qu’il a cité un jour doit rester retrouvable.',
  })
  retirer(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.documents.retirer(id, actor, contextOf(req));
  }
}
