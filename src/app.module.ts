import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { PlayersModule } from './players/players.module';
import { MatchesModule } from './matches/matches.module';
import { LeagueTeamsModule } from './league-teams/league-teams.module';
import { TransfersModule } from './transfers/transfers.module';
import { FormationsModule } from './formations/formations.module';
import { MatchEventsModule } from './match-events/match-events.module';
import { EmailModule } from './email/email.module';
import { User } from './users/user.entity';
import { Player } from './players/player.entity';
import { UserPlayer } from './players/user-player.entity';
import { Team } from './players/team.entity';
import { Match } from './matches/match.entity';
import { LeagueTeam } from './league-teams/league-team.entity';
import { LeaguePlayer } from './league-teams/league-player.entity';
import { Transfer } from './transfers/transfer.entity';
import { Formation } from './formations/formation.entity';
import { MatchEvent } from './match-events/match-event.entity';
import { PlayerRating } from './player-ratings/player-rating.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      url: process.env.DATABASE_URL,
      ssl: {
        rejectUnauthorized: false,
      },
      entities: [
        User,
        Player,
        UserPlayer,
        Team,
        Match,
        LeagueTeam,
        LeaguePlayer,
        Transfer,
        Formation,
        MatchEvent,
        PlayerRating,
      ],
      synchronize: true, // Auto-create tables (for development)
      logging: false,
    }),
    AuthModule,
    UsersModule,
    PlayersModule,
    MatchesModule,
    LeagueTeamsModule,
    TransfersModule,
    FormationsModule,
    MatchEventsModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
