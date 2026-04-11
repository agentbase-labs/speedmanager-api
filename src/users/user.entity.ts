import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, OneToMany, OneToOne, JoinColumn } from 'typeorm';
import { UserPlayer } from '../players/user-player.entity';
import { Team } from '../players/team.entity';
import { Match } from '../matches/match.entity';
import { LeagueTeam } from '../league-teams/league-team.entity';

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

  @Column({ nullable: true })
  leagueTeamId: string; // User's managed team in the league

  @Column({ default: 50000000 })
  transferBudget: number; // Available budget for transfers

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

  @OneToOne(() => LeagueTeam, { nullable: true })
  @JoinColumn({ name: 'leagueTeamId' })
  leagueTeam: LeagueTeam;
}
