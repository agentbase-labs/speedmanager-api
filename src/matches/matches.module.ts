import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MatchesService } from './matches.service';
import { MatchesController } from './matches.controller';
import { Match } from './match.entity';
import { User } from '../users/user.entity';
import { Player } from '../players/player.entity';
import { LeagueTeam } from '../league-teams/league-team.entity';
import { UsersModule } from '../users/users.module';
import { MatchCommentaryModule } from '../match-commentary/match-commentary.module';
import { MatchEventsModule } from '../match-events/match-events.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Match, User, Player, LeagueTeam]),
    UsersModule,
    MatchCommentaryModule,
    MatchEventsModule,
  ],
  providers: [MatchesService],
  controllers: [MatchesController],
})
export class MatchesModule {}