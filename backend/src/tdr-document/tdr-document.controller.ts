import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { TdrDocumentService } from './tdr-document.service';
import { CurrentUser, RequirePermissions } from '../common/decorators';
import type { AuthenticatedUser } from '../common/types/authenticated-user';

/**
 * Le document de termes de référence, composé depuis le dossier.
 *
 * Deux formats, un seul plan. Le PDF est la pièce à transmettre ; le DOCX
 * sert quand l'UGP doit annoter. Aucun modèle n'intervient dans leur
 * composition.
 */
@ApiTags('TDR')
@ApiBearerAuth()
@Controller('tdr')
export class TdrDocumentController {
  constructor(private readonly documents: TdrDocumentService) {}

  @Get(':id/document/apercu')
  @RequirePermissions('tdr:read')
  @ApiOperation({
    summary: 'Plan du document, pour relecture à l’écran',
    description:
      'Le contenu exact du document, avant de le fabriquer. Permet de relire ce qui partira sans télécharger un fichier.',
  })
  apercu(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.documents.plan(id, actor);
  }

  @Get(':id/document')
  @RequirePermissions('tdr:read')
  @ApiOperation({
    summary: 'Télécharger le document',
    description:
      'Format PDF par défaut, DOCX sur demande. Chaque génération est journalisée : un document contractuel doit pouvoir être rattaché à qui l’a produit, et quand.',
  })
  async telecharger(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
    @Res() res: Response,
    @Query('format') format?: string,
  ): Promise<void> {
    const ctx = {
      ipAddress: req.ip ?? undefined,
      userAgent: req.get('user-agent') ?? undefined,
    };
    const plan = await this.documents.plan(id, actor);
    const docx = format === 'docx';

    const contenu = docx
      ? await this.documents.docx(id, actor, ctx)
      : await this.documents.pdf(id, actor, ctx);

    // Le nom porte la référence : un fichier téléchargé se retrouve dans un
    // dossier de téléchargements parmi cent autres.
    const nom = `${plan.reference}.${docx ? 'docx' : 'pdf'}`;

    res.setHeader(
      'Content-Type',
      docx
        ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        : 'application/pdf',
    );
    res.setHeader('Content-Disposition', `inline; filename="${nom}"`);
    res.setHeader('Content-Length', String(contenu.length));
    res.end(contenu);
  }
}
