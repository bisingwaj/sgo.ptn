import { Module } from '@nestjs/common';
import { DocumentsService } from './documents.service';
import { DocumentsController } from './documents.controller';

/**
 * Le corpus documentaire du projet.
 *
 * AUCUNE DÉPENDANCE VERS L'IA, à dessein : c'est `AiModule` qui importe
 * celui-ci, pour que l'agent puisse consulter le corpus. L'inverse aurait
 * fermé un cycle. La question « le modèle lit-il les PDF ? » se pose à
 * `GET /ai/capacites`, que le navigateur interroge déjà.
 */
@Module({
  controllers: [DocumentsController],
  providers: [DocumentsService],
  exports: [DocumentsService],
})
export class DocumentsModule {}
