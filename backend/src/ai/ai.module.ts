import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AiService } from './ai.service';
import { TdrAssistService } from './tdr-assist.service';

@Module({
  imports: [ConfigModule],
  providers: [AiService, TdrAssistService],
  exports: [AiService, TdrAssistService],
})
export class AiModule {}
