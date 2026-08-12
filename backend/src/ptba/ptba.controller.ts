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
import { UpsertActivityDto } from './dto/ptba.dto';
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

  @Post('exercices/:year/activites')
  @RequirePermissions('ptba:write')
  @ApiOperation({
    summary: 'Inscrire une activité au plan',
    description:
      'Le cumul des enveloppes d’une composante ne peut excéder la dotation que lui attribue le MEP.',
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
    description: 'Conservée en base : un TDR peut déjà la citer.',
  })
  deactivate(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.ptba.deactivateActivity(id, actor, contextOf(req));
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
