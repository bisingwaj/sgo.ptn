import { Module } from '@nestjs/common';
import { TdrController } from './tdr.controller';
import { TdrService } from './tdr.service';
import { TdrReferentielModule } from '../tdr-referentiel/tdr-referentiel.module';

@Module({
  imports: [TdrReferentielModule],
  controllers: [TdrController],
  providers: [TdrService],
  exports: [TdrService],
})
export class TdrModule {}
