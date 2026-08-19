import { Module } from '@nestjs/common';
import { PassationService } from './passation.service';
import { PassationController } from './passation.controller';

@Module({
  controllers: [PassationController],
  providers: [PassationService],
  exports: [PassationService],
})
export class PassationModule {}
