import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { TdrReferentielService, type LibraryKind } from './tdr-referentiel.service';
import {
  ListLibraryQueryDto,
  UpsertClauseDto,
  UpsertIndicatorDto,
  UpsertRiskDto,
} from './dto/tdr-referentiel.dto';
import { CurrentUser, RequirePermissions } from '../common/decorators';
import type { AuthenticatedUser } from '../common/types/authenticated-user';
import type { RequestContext } from '../auth/auth.service';

function contextOf(req: Request): RequestContext {
  return { ipAddress: req.ip ?? undefined, userAgent: req.get('user-agent') ?? undefined };
}

/**
 * Référentiel de passation et bibliothèques TDR.
 *
 * La lecture est ouverte à toute personne authentifiée — un rédacteur a
 * besoin des clauses. L'écriture relève du RPM et des spécialistes, jamais
 * de l'administrateur technique : éditer une clause contractuelle n'est pas
 * un réglage système.
 */
@ApiTags('Référentiel TDR')
@ApiBearerAuth()
@Controller('referentiel-tdr')
export class TdrReferentielController {
  constructor(private readonly referentiel: TdrReferentielService) {}

  // ===== Lecture =====

  @Get('types')
  @ApiOperation({ summary: 'Les 11 types de TDR et leurs origines autorisées' })
  types() {
    return this.referentiel.types();
  }

  @Get('methodes')
  @ApiOperation({ summary: 'Méthodes de passation et seuils applicables' })
  methods() {
    return this.referentiel.methods();
  }

  @Get('methode-applicable')
  @ApiOperation({
    summary: 'Déduire la méthode et le type de revue depuis une catégorie et un montant',
    description: 'Le seuil est la règle : la déduire ici évite qu’un écran l’écrive en dur.',
  })
  resolveMethod(@Query('categorie') category: string, @Query('montantUsd') amount: string) {
    return this.referentiel.resolveMethod(category, Number(amount));
  }

  @Get('bibliotheque/:kind')
  @ApiOperation({ summary: 'Bibliothèque de clauses, indicateurs ou risques' })
  library(@Param('kind') kind: LibraryKind, @Query() query: ListLibraryQueryDto) {
    return this.referentiel.library(kind, query);
  }

  @Get('bibliotheque/:kind/historique/:familyKey')
  @ApiOperation({ summary: 'Toutes les versions successives d’un élément' })
  history(@Param('kind') kind: LibraryKind, @Param('familyKey') familyKey: string) {
    return this.referentiel.history(kind, familyKey);
  }

  // ===== Édition — réservée au RPM et aux spécialistes =====

  @Post('bibliotheque/clauses')
  @RequirePermissions('referentiel:clauses')
  @ApiOperation({
    summary: 'Créer une clause ou une nouvelle version',
    description:
      'Crée toujours un brouillon. Fournir `familyKey` en requête pour versionner une clause existante plutôt que d’en créer une nouvelle.',
  })
  draftClause(
    @Body() dto: UpsertClauseDto,
    @Query('familyKey') familyKey: string | undefined,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.referentiel.draft('clauses', { ...dto }, familyKey, actor, contextOf(req));
  }

  @Post('bibliotheque/indicateurs')
  @RequirePermissions('referentiel:clauses')
  @ApiOperation({ summary: 'Créer un indicateur ou une nouvelle version' })
  draftIndicator(
    @Body() dto: UpsertIndicatorDto,
    @Query('familyKey') familyKey: string | undefined,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.referentiel.draft('indicateurs', { ...dto }, familyKey, actor, contextOf(req));
  }

  @Post('bibliotheque/risques')
  @RequirePermissions('referentiel:clauses')
  @ApiOperation({ summary: 'Créer un risque ou une nouvelle version' })
  draftRisk(
    @Body() dto: UpsertRiskDto,
    @Query('familyKey') familyKey: string | undefined,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.referentiel.draft('risques', { ...dto }, familyKey, actor, contextOf(req));
  }

  @Post('bibliotheque/:kind/:id/publier')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('referentiel:clauses')
  @ApiOperation({
    summary: 'Mettre une version en vigueur',
    description: 'La version publiée précédente est archivée, jamais supprimée : un TDR déjà soumis la cite.',
  })
  publish(
    @Param('kind') kind: LibraryKind,
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.referentiel.publish(kind, id, actor, contextOf(req));
  }

  @Post('bibliotheque/:kind/:id/archiver')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('referentiel:clauses')
  @ApiOperation({ summary: 'Retirer une version du service' })
  archive(
    @Param('kind') kind: LibraryKind,
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.referentiel.archive(kind, id, actor, contextOf(req));
  }
}
