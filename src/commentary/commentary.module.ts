import { Module } from '@nestjs/common';
import { CommentaryService } from './commentary.service';

@Module({
  providers: [CommentaryService],
  exports: [CommentaryService],
})
export class CommentaryModule {}
