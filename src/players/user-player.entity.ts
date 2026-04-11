import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, CreateDateColumn, JoinColumn } from 'typeorm';
import { User } from '../users/user.entity';
import { Player } from './player.entity';

@Entity('user_players')
export class UserPlayer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column()
  playerId: string;

  @Column({ default: 1 })
  level: number;

  @CreateDateColumn()
  acquiredAt: Date;

  @ManyToOne(() => User, user => user.collection)
  @JoinColumn({ name: 'userId' })
  user: User;

  @ManyToOne(() => Player, player => player.userPlayers)
  @JoinColumn({ name: 'playerId' })
  player: Player;
}
