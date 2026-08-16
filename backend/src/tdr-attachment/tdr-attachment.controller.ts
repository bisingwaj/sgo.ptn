import {
  BadRequestException,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
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
import type { Request, Response } from 'express';
import { TdrAttachmentService } from './tdr-attachment.service';
import { CurrentUser, RequirePermissions } from '../common/decorators';
import type { AuthenticatedUser } from '../common/types/authenticated-user';

/** Le fichier tel que multer le remet, sans dépendre de ses types. */
interface FichierRecu {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

function contextOf(req: Request) {
  return {
    ipAddress: req.ip ?? undefined,
    userAgent: req.get('user-agent') ?? undefined,
  };
}

/**
 * Les pièces apportées au dossier.
 *
 * Elles servent de modèle de forme à l'assistant — structure, ton, niveau
 * de détail — et jamais de source de fait : les valeurs du TDR viennent du
 * rédacteur et du PTBA.
 */
@ApiTags('TDR')
@ApiBearerAuth()
@Controller('tdr/:id/pieces')
export class TdrAttachmentController {
  constructor(private readonly pieces: TdrAttachmentService) {}

  @Get()
  @RequirePermissions('tdr:read')
  @ApiOperation({ summary: 'Les pièces jointes au dossier' })
  lister(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.pieces.lister(id, actor);
  }

  @Post()
  @RequirePermissions('tdr:author')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Verser une pièce',
    description:
      'PDF et images sont lus par l’assistant comme modèle de forme. Word et texte sont conservés au dossier sans lui être soumis.',
  })
  @UseInterceptors(
    FileInterceptor('fichier', {
      // Les octets restent en mémoire : ils partent en base juste après,
      // et un fichier temporaire sur disque serait un second endroit d'où
      // une pièce de dossier pourrait fuir.
      storage: undefined,
      limits: { fileSize: TdrAttachmentService.TAILLE_MAX, files: 1 },
    }),
  )
  verser(
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() fichier: FichierRecu | undefined,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    if (!fichier) throw new BadRequestException('Aucun fichier reçu.');
    return this.pieces.verser(id, fichier, actor, contextOf(req));
  }

  @Get(':pieceId')
  @RequirePermissions('tdr:read')
  @ApiOperation({ summary: 'Télécharger une pièce' })
  async telecharger(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('pieceId', ParseUUIDPipe) pieceId: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Res() res: Response,
  ): Promise<void> {
    const piece = await this.pieces.contenu(id, pieceId, actor);
    res.setHeader('Content-Type', piece.mimeType);
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${piece.filename}"`,
    );
    res.setHeader('Content-Length', String(piece.sizeBytes));
    res.end(Buffer.from(piece.content));
  }

  @Delete(':pieceId')
  @RequirePermissions('tdr:author')
  @ApiOperation({ summary: 'Retirer une pièce du dossier' })
  supprimer(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('pieceId', ParseUUIDPipe) pieceId: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.pieces.supprimer(id, pieceId, actor, contextOf(req));
  }
}
