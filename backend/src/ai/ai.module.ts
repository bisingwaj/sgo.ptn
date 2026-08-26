import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AiService } from './ai.service';
import { AiController } from './ai.controller';
import { TdrAssistService } from './tdr-assist.service';
import { TdrAgentService } from './tdr-agent.service';

@Module({
  imports: [ConfigModule],
  controllers: [AiController],
  providers: [AiService, TdrAssistService, TdrAgentService],
  exports: [AiService, TdrAssistService, TdrAgentService],
})
export class AiModule {}
