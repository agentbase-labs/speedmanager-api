import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { User } from './user.entity';
import { UserPlayer } from '../players/user-player.entity';
import { Player } from '../players/player.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, UserPlayer, Player])],
  providers: [UsersService],
  controllers: [UsersController],
  exports: [UsersService],
})
export class UsersModule {}
