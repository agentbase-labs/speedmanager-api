import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { UserPlayer } from '../players/user-player.entity';
import { Team } from '../players/team.entity';
import { Match } from '../matches/match.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column({ unique: true })
  username: string;

  @Column()
  password: string;

  @Column({ default: 1000 })
  coins: number;

  @Column({ default: 0 })
  stars: number;

  @Column({ default: 'Bronze' })
  rank: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => UserPlayer, userPlayer => userPlayer.user)
  collection: UserPlayer[];

  @OneToMany(() => Team, team => team.user)
  team: Team[];

  @OneToMany(() => Match, match => match.user)
  matches: Match[];
}
