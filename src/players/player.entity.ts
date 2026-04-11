import { Entity, Column, PrimaryGeneratedColumn, OneToMany } from 'typeorm';
import { UserPlayer } from './user-player.entity';
import { Team } from './team.entity';

@Entity('players')
export class Player {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column()
  position: string; // Forward, Midfielder, Defender, Goalkeeper

  @Column()
  rating: number; // 1-99

  @Column()
  rarity: string; // Common, Rare, Epic, Legendary

  @Column({ default: false })
  special: boolean; // true for Roy Hogeg

  @OneToMany(() => UserPlayer, userPlayer => userPlayer.player)
  userPlayers: UserPlayer[];

  @OneToMany(() => Team, team => team.player)
  teams: Team[];
}
