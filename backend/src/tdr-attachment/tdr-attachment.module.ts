import { Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module';
import { TdrAttachmentService } from './tdr-attachment.service';
import { TdrAttachmentController } from './tdr-attachment.controller';

@Module({
  // Une pièce n'est « lue par l'assistant » que si le modèle configuré
  // sait la lire : la réponse vient d'ici.
  imports: [AiModule],
  controllers: [TdrAttachmentController],
  providers: [TdrAttachmentService],
  exports: [TdrAttachmentService],
})
export class TdrAttachmentModule {}
