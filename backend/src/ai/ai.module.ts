import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AiService } from './ai.service';
import { TdrAssistService } from './tdr-assist.service';
import { TdrAgentService } from './tdr-agent.service';

@Module({
  imports: [ConfigModule],
  providers: [AiService, TdrAssistService, TdrAgentService],
  exports: [AiService, TdrAssistService, TdrAgentService],
})
export class AiModule {}
