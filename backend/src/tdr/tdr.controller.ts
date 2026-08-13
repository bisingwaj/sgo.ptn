import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
  Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';
import type { Request } from 'express';
import { TdrService } from './tdr.service';
import { TdrAssistService } from '../ai/tdr-assist.service';
import { CurrentUser, RequirePermissions } from '../common/decorators';
import type { AuthenticatedUser } from '../common/types/authenticated-user';
import type { RequestContext } from '../auth/auth.service';

function contextOf(req: Request): RequestContext {
  return { ipAddress: req.ip ?? undefined, userAgent: req.get('user-agent') ?? undefined };
}

export class CreateDraftDto {
  @ApiProperty({ example: 'TDR-CS' })
  @IsString()
  @MinLength(3)
  tdrTypeCode!: string;

  @ApiProperty({ example: 'AMOA plateforme d’identité numérique' })
  @IsString()
  @MinLength(5, { message: 'Un intitulé est requis.' })
  @MaxLength(300)
  title!: string;

  @ApiPropertyOptional({ description: 'Activité PTBA de rattachement' })
  @IsOptional()
  @IsUUID()
  ptbaActivityId?: string;
}

/**
 * Termes de référence.
 *
 * L'origine de rédaction découle du profil de la session : un bailleur et
 * un auditeur ne rédigent jamais (MEP § 15.4). C'est `tdr:author` qui
 * ouvre la rédaction, et cette permission ne leur est pas accordée.
 */
@ApiTags('TDR')
@ApiBearerAuth()
@Controller('tdr')
export class TdrController {
  constructor(
    private readonly tdr: TdrService,
    private readonly assist: TdrAssistService,
  ) {}

  @Get()
  @RequirePermissions('tdr:read')
  @ApiOperation({
    summary: 'Lister les TDR',
    description:
      'Hors UGP et bailleurs, la liste est restreinte aux TDR de votre organisation.',
  })
  list(@CurrentUser() actor: AuthenticatedUser, @Query('statut') status?: string) {
    return this.tdr.list(actor, { status });
  }

  @Get(':id')
  @RequirePermissions('tdr:read')
  @ApiOperation({ summary: 'Consulter un TDR' })
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() actor: AuthenticatedUser) {
    return this.tdr.findOne(id, actor);
  }

  @Get(':id/completude')
  @RequirePermissions('tdr:read')
  @ApiOperation({
    summary: 'Contrôle de complétude',
    description:
      'Permet au parcours de rédaction d’afficher les manques au fil de l’eau, plutôt qu’au moment de soumettre.',
  })
  completeness(@Param('id', ParseUUIDPipe) id: string) {
    return this.tdr.checkCompleteness(id);
  }

  @Post()
  @RequirePermissions('tdr:author')
  @ApiOperation({
    summary: 'Ouvrir un brouillon',
    description:
      'L’origine est déduite du profil de la session. Le type doit être ouvert à cette origine.',
  })
  create(
    @Body() dto: CreateDraftDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.tdr.createDraft(dto, actor, contextOf(req));
  }

  @Put(':id')
  @RequirePermissions('tdr:author')
  @ApiOperation({
    summary: 'Enregistrer le brouillon',
    description:
      'Enregistrement partiel : seuls les champs transmis sont modifiés. Les collections envoyées sont remplacées en bloc.',
  })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: Record<string, unknown>,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.tdr.updateDraft(id, body, actor);
  }

  @Post(':id/assistance/contexte')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('tdr:author')
  @ApiOperation({
    summary: 'Proposer une rédaction du contexte',
    description:
      'Le modèle reçoit l’activité PTBA, la composante, le type et la couverture — jamais de donnée personnelle ni de contenu EAS/HS. Il renvoie une proposition : rien n’est enregistré tant que l’auteur ne l’a pas reprise.',
  })
  assistContext(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.assist.proposeContext(id, actor, contextOf(req));
  }

  @Post(':id/assistance/justification')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('tdr:author')
  @ApiOperation({
    summary: 'Proposer ou reprendre la justification',
    description:
      'Rédige si le champ est vide. S’il est renseigné, le modèle en reprend la forme sans y introduire de fait nouveau — améliorer ne doit pas servir à ajouter des affirmations que l’auteur n’a pas écrites.',
  })
  assistJustification(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.assist.proposeJustification(id, actor, contextOf(req));
  }

  @Post(':id/assistance/objectifs')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('tdr:author')
  @ApiOperation({
    summary: 'Proposer des objectifs assortis de leur critère de constatation',
    description:
      'S’appuie sur le contexte déjà rédigé. Les valeurs cibles manquantes sont laissées entre crochets plutôt qu’inventées.',
  })
  assistObjectives(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.assist.proposeObjectives(id, actor, contextOf(req));
  }

  @Post(':id/soumettre')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('tdr:author')
  @ApiOperation({
    summary: 'Transmettre à l’UGP',
    description:
      'Fige la méthode de passation et le type de revue depuis les seuils en vigueur, et prend un instantané complet du document.',
  })
  submit(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.tdr.submit(id, actor, contextOf(req));
  }
}
