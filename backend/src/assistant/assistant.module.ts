import { Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module';
import { AssistantService } from './assistant.service';
import { AssistantController } from './assistant.controller';

@Module({
  imports: [AiModule],
  controllers: [AssistantController],
  providers: [AssistantService],
})
export class AssistantModule {}
