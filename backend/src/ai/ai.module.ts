import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DocumentsModule } from '../documents/documents.module';
import { AiService } from './ai.service';
import { AiController } from './ai.controller';
import { TdrAssistService } from './tdr-assist.service';
import { TdrAgentService } from './tdr-agent.service';

@Module({
  // L'agent consulte le corpus documentaire du projet : le sens de la
  // dépendance va d'ici vers là, jamais l'inverse.
  imports: [ConfigModule, DocumentsModule],
  controllers: [AiController],
  providers: [AiService, TdrAssistService, TdrAgentService],
  exports: [AiService, TdrAssistService, TdrAgentService],
})
export class AiModule {}
