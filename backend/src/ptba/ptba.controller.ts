import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
  Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { PtbaService } from './ptba.service';
import { DeactivateActivityDto, UpsertActivityDto, UpsertAllocationDto } from './dto/ptba.dto';
import { CurrentUser, RequirePermissions } from '../common/decorators';
import type { AuthenticatedUser } from '../common/types/authenticated-user';
import type { RequestContext } from '../auth/auth.service';

function contextOf(req: Request): RequestContext {
  return { ipAddress: req.ip ?? undefined, userAgent: req.get('user-agent') ?? undefined };
}

/**
 * Plan de Travail et Budget Annuel.
 *
 * La lecture est ouverte : tout rédacteur de TDR doit voir à quelle
 * activité rattacher son besoin. L'écriture revient au RAF, aux
 * responsables de composante et au Spécialiste S&E ; la validation, qui
 * rend le plan opposable, au Coordonnateur.
 */
@ApiTags('PTBA')
@ApiBearerAuth()
@Controller('ptba')
export class PtbaController {
  constructor(private readonly ptba: PtbaService) {}

  @Get('exercices')
  @RequirePermissions('ptba:read')
  @ApiOperation({ summary: 'Exercices PTBA et leur nombre d’activités' })
  years() {
    return this.ptba.years();
  }

  @Get('exercices/:year/activites')
  @RequirePermissions('ptba:read')
  @ApiOperation({ summary: 'Activités d’un exercice, avec le cumul des enveloppes' })
  activities(
    @Param('year', ParseIntPipe) year: number,
    @Query('composante') componentCode?: string,
  ) {
    return this.ptba.activities(year, { componentCode });
  }

  @Get('activites/:id')
  @RequirePermissions('ptba:read')
  @ApiOperation({
    summary: 'Fiche d’une activité, avec les TDR qui s’y rattachent',
    description:
      'Le nombre de marchés découlant d’une ligne du plan, et leur état, est la question ' +
      'qu’on vient poser à cette fiche.',
  })
  activity(@Param('id', ParseUUIDPipe) id: string) {
    return this.ptba.activity(id);
  }

  @Get('exercices/:year/allocations')
  @RequirePermissions('ptba:read')
  @ApiOperation({
    summary: 'Allocations annuelles par composante',
    description:
      'Une ligne par composante du MEP, y compris celles qui n’ont pas encore d’allocation — ' +
      'c’est ce qui reste à arrêter avant que le plan puisse s’écrire. Chaque ligne porte aussi ' +
      'ce que le plan engage déjà et ce qui reste de la dotation de projet.',
  })
  allocations(@Param('year', ParseIntPipe) year: number) {
    return this.ptba.allocations(year);
  }

  @Put('exercices/:year/allocations')
  @RequirePermissions('ptba:write')
  @ApiOperation({
    summary: 'Arrêter l’allocation annuelle d’une composante',
    description:
      'Le cumul des allocations d’une composante, tous exercices confondus, ne peut excéder sa ' +
      'dotation de projet (MEP Tableau 2). Une allocation ne peut pas non plus descendre sous ce ' +
      'que le plan de l’exercice engage déjà.',
  })
  setAllocation(
    @Param('year', ParseIntPipe) year: number,
    @Body() dto: UpsertAllocationDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.ptba.setAllocation(year, dto, actor, contextOf(req));
  }

  @Post('exercices/:year/activites')
  @RequirePermissions('ptba:write')
  @ApiOperation({
    summary: 'Inscrire une activité au plan',
    description:
      'Le cumul des enveloppes d’une composante ne peut excéder son allocation SUR CET EXERCICE. ' +
      'Une composante sans allocation n’accepte aucune activité.',
  })
  create(
    @Param('year', ParseIntPipe) year: number,
    @Body() dto: UpsertActivityDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.ptba.createActivity(year, dto, actor, contextOf(req));
  }

  @Put('activites/:id')
  @RequirePermissions('ptba:write')
  @ApiOperation({ summary: 'Modifier une activité' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpsertActivityDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.ptba.updateActivity(id, dto, actor, contextOf(req));
  }

  @Post('activites/:id/retirer')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('ptba:write')
  @ApiOperation({
    summary: 'Retirer une activité du plan',
    description:
      'Conservée en base : un TDR peut déjà la citer. Le motif est exigé et journalisé — ' +
      'l’opération n’a pas de réciproque côté produit.',
  })
  deactivate(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: DeactivateActivityDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.ptba.deactivateActivity(id, dto.motif.trim(), actor, contextOf(req));
  }

  @Post('exercices/:year/valider')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('ptba:validate')
  @ApiOperation({ summary: 'Valider l’exercice — le plan devient opposable' })
  validate(
    @Param('year', ParseIntPipe) year: number,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.ptba.validateYear(year, actor, contextOf(req));
  }
}
