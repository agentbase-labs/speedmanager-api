import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MatchEvent } from './match-event.entity';
import { PlayerRating } from '../player-ratings/player-rating.entity';
import { MatchEventsService } from './match-events.service';

@Module({
  imports: [TypeOrmModule.forFeature([MatchEvent, PlayerRating])],
  providers: [MatchEventsService],
  exports: [MatchEventsService],
})
export class MatchEventsModule {}
