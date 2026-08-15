import { Module } from '@nestjs/common';
import { TdrDocumentService } from './tdr-document.service';
import { TdrDocumentController } from './tdr-document.controller';

@Module({
  controllers: [TdrDocumentController],
  providers: [TdrDocumentService],
  exports: [TdrDocumentService],
})
export class TdrDocumentModule {}
