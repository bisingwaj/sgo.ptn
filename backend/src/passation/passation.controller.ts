import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import type { Request } from 'express';
import { PassationService } from './passation.service';
import { CurrentUser, RequirePermissions } from '../common/decorators';
import type { AuthenticatedUser } from '../common/types/authenticated-user';

class MotifDto {
  @IsString({ message: 'Le motif doit être du texte.' })
  @MaxLength(2000, { message: 'Ce motif est trop long : résumez-le.' })
  motif!: string;
}

class DecisionDto {
  @IsIn(['NON_OBJECTION', 'REFUS', 'DEMANDE_MODIFICATION'], {
    message: 'Décision non reconnue.',
  })
  decision!: 'NON_OBJECTION' | 'REFUS' | 'DEMANDE_MODIFICATION';

  @IsOptional()
  @IsString({ message: 'Le motif doit être du texte.' })
  @MaxLength(2000, { message: 'Ce motif est trop long : résumez-le.' })
  motif?: string;
}

class PublierDto {
  @IsOptional()
  @IsString()
  @MaxLength(300, { message: 'L’objet de l’avis est trop long.' })
  objet?: string;

  @IsString({ message: 'Le résumé de l’avis est requis.' })
  @MaxLength(2000, {
    message: 'Ce résumé est trop long : un candidat doit pouvoir le parcourir.',
  })
  resume!: string;

  @IsOptional()
  @IsArray({ message: 'Les qualifications doivent former une liste.' })
  qualifications?: string[];

  @IsOptional()
  @IsInt({ message: 'Le délai de dépôt s’exprime en jours entiers.' })
  @Min(7, {
    message:
      'Un délai de dépôt de moins de sept jours ne laisse pas constituer un dossier.',
  })
  @Max(120, {
    message:
      'Un délai de plus de cent vingt jours demande une justification hors plateforme.',
  })
  joursDeDepot?: number;
}

function contextOf(req: Request) {
  return {
    ipAddress: req.ip ?? undefined,
    userAgent: req.get('user-agent') ?? undefined,
  };
}

/**
 * Le cycle de passation, côté UGPTN et côté bailleur.
 *
 * Cinq permissions distinctes, arbitrées depuis le MEP : `tdr:review`
 * instruit, `tdr:validate` arrête le dossier — deux personnes seulement —,
 * `ano:submit` demande la non-objection, `ano:decide` la rend et
 * n'appartient qu'aux bailleurs, `dao:publish` publie l'avis.
 */
@ApiTags('Passation')
@ApiBearerAuth()
@Controller()
export class PassationController {
  constructor(private readonly passation: PassationService) {}

  @Get('passation/a-instruire')
  @RequirePermissions('tdr:review')
  @ApiOperation({ summary: 'Les dossiers transmis, en attente d’instruction' })
  aInstruire() {
    return this.passation.aInstruire();
  }

  @Post('tdr/:id/revue')
  @RequirePermissions('tdr:review')
  @ApiOperation({ summary: 'Prendre un dossier en revue' })
  ouvrirRevue(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.passation.ouvrirRevue(id, actor, contextOf(req));
  }

  @Post('tdr/:id/retourner')
  @RequirePermissions('tdr:review')
  @ApiOperation({
    summary: 'Retourner le dossier à son auteur',
    description: 'Le motif est requis : il dit à l’auteur quoi reprendre.',
  })
  retourner(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: MotifDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.passation.retourner(id, dto.motif, actor, contextOf(req));
  }

  @Post('tdr/:id/valider')
  @RequirePermissions('tdr:validate')
  @ApiOperation({
    summary: 'Valider le dossier et faire naître le marché',
    description:
      'C’est ici, et nulle part ailleurs, qu’un marché apparaît. Il reprend la référence du dossier, sa méthode et son type de revue figés à la transmission.',
  })
  valider(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.passation.valider(id, actor, contextOf(req));
  }

  @Post('marches/:id/ano')
  @RequirePermissions('ano:submit')
  @ApiOperation({
    summary: 'Soumettre le dossier d’appel d’offres à non-objection',
    description:
      'L’UGPTN demande, elle ne décide pas. Le délai de service court à compter d’ici : 14 jours BM, 21 jours AFD.',
  })
  demanderAno(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.passation.demanderAno(id, actor, contextOf(req));
  }

  @Get('anos/en-cours')
  @RequirePermissions('ano:read')
  @ApiOperation({ summary: 'Les demandes de non-objection en attente' })
  anosEnCours() {
    return this.passation.anosEnCours();
  }

  @Post('anos/:id/decision')
  @RequirePermissions('ano:decide')
  @ApiOperation({
    summary: 'Rendre la décision de non-objection',
    description:
      'Réservée aux bailleurs. Un refus et une demande de modification se motivent — sans motif, l’UGPTN ne sait pas quoi reprendre.',
  })
  deciderAno(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: DecisionDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.passation.deciderAno(
      id,
      dto.decision,
      dto.motif,
      actor,
      contextOf(req),
    );
  }

  @Post('marches/:id/publier')
  @RequirePermissions('dao:publish')
  @ApiOperation({
    summary: 'Publier l’avis d’appel d’offres',
    description:
      'Refusée sans non-objection sur le dossier, et refusée deux fois : un candidat qui verrait paraître deux avis pour le même marché ne saurait auquel répondre.',
  })
  publier(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: PublierDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.passation.publier(id, dto, actor, contextOf(req));
  }
}
