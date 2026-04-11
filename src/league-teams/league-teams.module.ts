import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LeagueTeam } from './league-team.entity';
import { LeaguePlayer } from './league-player.entity';
import { LeagueTeamsService } from './league-teams.service';
import { LeagueTeamsController } from './league-teams.controller';

@Module({
  imports: [TypeOrmModule.forFeature([LeagueTeam, LeaguePlayer])],
  controllers: [LeagueTeamsController],
  providers: [LeagueTeamsService],
  exports: [LeagueTeamsService],
})
export class LeagueTeamsModule {}
