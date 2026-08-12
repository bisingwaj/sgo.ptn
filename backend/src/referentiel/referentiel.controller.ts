import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ReferentielService } from './referentiel.service';

/**
 * Référentiel institutionnel servi depuis la base.
 *
 * Les écrans consomment ces valeurs plutôt que de les réécrire en dur —
 * c'est la parade structurelle à la dérive constatée sur les enveloppes
 * de composantes, où plusieurs écrans affichaient des montants
 * divergents du MEP.
 */
@ApiTags('Référentiel')
@ApiBearerAuth()
@Controller('referentiel')
export class ReferentielController {
  constructor(private readonly referentiel: ReferentielService) {}

  @Get('profils')
  @ApiOperation({ summary: 'Les 4 familles, leurs profils et sous-rôles' })
  profils() {
    return this.referentiel.familles();
  }

  @Get('organisations')
  @ApiOperation({ summary: 'Organisations du glossaire MEP § 13.1' })
  organisations() {
    return this.referentiel.organisations();
  }

  @Get('provinces')
  @ApiOperation({ summary: 'Les 26 provinces, dont 10 prioritaires CPF' })
  provinces() {
    return this.referentiel.provinces();
  }

  @Get('composantes')
  @ApiOperation({ summary: 'Composantes du projet et enveloppes (MEP Tableau 2)' })
  composantes() {
    return this.referentiel.composantes();
  }
}
