import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import type { Request } from 'express';
import { MarketplaceService } from './marketplace.service';
import { CurrentUser, RequirePermissions } from '../common/decorators';
import type { AuthenticatedUser } from '../common/types/authenticated-user';

class DeposerDto {
  @IsNumber({}, { message: 'Le montant de votre offre doit être un nombre.' })
  @Min(1, { message: 'Le montant de votre offre est requis.' })
  montantUsd!: number;

  @IsOptional()
  @IsString({ message: 'La note doit être du texte.' })
  @MaxLength(4000, { message: 'Cette note est trop longue : résumez-la.' })
  note?: string;
}

function contextOf(req: Request) {
  return {
    ipAddress: req.ip ?? undefined,
    userAgent: req.get('user-agent') ?? undefined,
  };
}

/**
 * Le marketplace, côté candidat.
 *
 * `marketplace:read` ouvre la consultation des avis publiés ;
 * `soumission:write` ouvre le dépôt. Les deux sont détenues par les trois
 * sous-rôles soumissionnaire, et la première l'est aussi par le
 * représentant d'une fédération — qui consulte pour ses membres sans
 * pouvoir concourir.
 */
@ApiTags('Marketplace')
@ApiBearerAuth()
@Controller('marketplace')
export class MarketplaceController {
  constructor(private readonly marketplace: MarketplaceService) {}

  @Get('avis')
  @RequirePermissions('marketplace:read')
  @ApiOperation({
    summary: 'Les avis d’appel d’offres ouverts',
    description:
      'Les marchés publiés, avec leur date limite. Chaque ligne dit si votre organisation y a déjà déposé une offre.',
  })
  avis(@CurrentUser() actor: AuthenticatedUser, @Query('clos') clos?: string) {
    return this.marketplace.avis(actor, {
      clos: clos === '1' || clos === 'true',
    });
  }

  @Get('avis/:id')
  @RequirePermissions('marketplace:read')
  @ApiOperation({ summary: 'Le détail d’un avis' })
  detail(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.marketplace.avisDetail(id, actor);
  }

  @Get('mes-soumissions')
  @RequirePermissions('marketplace:read')
  @ApiOperation({
    summary: 'Les offres de votre organisation',
    description:
      'Bornées à l’organisation de l’appelant. Les offres concurrentes ne sont jamais rendues.',
  })
  mesSoumissions(@CurrentUser() actor: AuthenticatedUser) {
    return this.marketplace.mesSoumissions(actor);
  }

  @Post('avis/:id/soumission')
  @RequirePermissions('soumission:write')
  @ApiOperation({
    summary: 'Déposer une offre',
    description:
      'Refusée après la date limite, et une seule par organisation et par avis. Le dépôt est journalisé : il engage le candidat.',
  })
  deposer(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: DeposerDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.marketplace.deposer(id, dto, actor, contextOf(req));
  }
}
