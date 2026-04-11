import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Transfer } from './transfer.entity';
import { TransfersService } from './transfers.service';
import { TransfersController } from './transfers.controller';
import { LeagueTeam } from '../league-teams/league-team.entity';
import { LeaguePlayer } from '../league-teams/league-player.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Transfer, LeagueTeam, LeaguePlayer])],
  controllers: [TransfersController],
  providers: [TransfersService],
  exports: [TransfersService],
})
export class TransfersModule {}
