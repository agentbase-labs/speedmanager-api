import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MatchCommentary } from './match-commentary.entity';
import { MatchCommentaryService } from './match-commentary.service';
import { CommentaryModule } from '../commentary/commentary.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([MatchCommentary]),
    CommentaryModule,
  ],
  providers: [MatchCommentaryService],
  exports: [MatchCommentaryService],
})
export class MatchCommentaryModule {}
