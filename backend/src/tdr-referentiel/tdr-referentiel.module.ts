import { Module } from '@nestjs/common';
import { TdrReferentielController } from './tdr-referentiel.controller';
import { TdrReferentielService } from './tdr-referentiel.service';

@Module({
  controllers: [TdrReferentielController],
  providers: [TdrReferentielService],
  exports: [TdrReferentielService],
})
export class TdrReferentielModule {}
