import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { PlayersModule } from './players/players.module';
import { MatchesModule } from './matches/matches.module';
import { User } from './users/user.entity';
import { Player } from './players/player.entity';
import { UserPlayer } from './players/user-player.entity';
import { Team } from './players/team.entity';
import { Match } from './matches/match.entity';

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
      entities: [User, Player, UserPlayer, Team, Match],
      synchronize: true, // Auto-create tables (for development)
      logging: false,
    }),
    AuthModule,
    UsersModule,
    PlayersModule,
    MatchesModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
