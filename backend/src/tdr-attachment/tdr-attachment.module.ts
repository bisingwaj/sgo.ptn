import { Module } from '@nestjs/common';
import { TdrAttachmentService } from './tdr-attachment.service';
import { TdrAttachmentController } from './tdr-attachment.controller';

@Module({
  controllers: [TdrAttachmentController],
  providers: [TdrAttachmentService],
  exports: [TdrAttachmentService],
})
export class TdrAttachmentModule {}
