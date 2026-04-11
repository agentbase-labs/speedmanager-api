import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../users/user.entity';
import { Player } from './player.entity';

@Entity('teams')
export class Team {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column()
  slot: number; // 1-11

  @Column()
  playerId: string;

  @ManyToOne(() => User, user => user.team)
  @JoinColumn({ name: 'userId' })
  user: User;

  @ManyToOne(() => Player, player => player.teams)
  @JoinColumn({ name: 'playerId' })
  player: Player;
}
