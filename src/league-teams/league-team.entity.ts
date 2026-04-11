import { Entity, Column, PrimaryGeneratedColumn, OneToMany } from 'typeorm';
import { LeaguePlayer } from './league-player.entity';
import { Match } from '../matches/match.entity';
import { Transfer } from '../transfers/transfer.entity';

@Entity('league_teams')
export class LeagueTeam {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string; // e.g., "Red Devils"

  @Column()
  nickname: string; // e.g., "Red Devils" (display name)

  @Column({ nullable: true })
  originalName: string; // e.g., "Manchester United" (for reference)

  @Column()
  manager: string; // e.g., "Erik ten Hag"

  @Column({ default: 50000000 })
  budget: number; // Team budget for transfers

  @Column({ default: '4-3-3' })
  formation: string;

  @Column({ default: 'Balanced' })
  tactics: string; // Attacking, Balanced, Defensive

  @Column({ default: 0 })
  wins: number;

  @Column({ default: 0 })
  draws: number;

  @Column({ default: 0 })
  losses: number;

  @Column({ default: 0 })
  goalsFor: number;

  @Column({ default: 0 })
  goalsAgainst: number;

  @Column({ default: 0 })
  points: number;

  @Column('jsonb', { nullable: true })
  recentForm: string[]; // ['W', 'L', 'D', 'W', 'W'] - last 5 matches

  @Column({ default: true })
  isAIControlled: boolean; // false for user's team

  @OneToMany(() => LeaguePlayer, player => player.team)
  players: LeaguePlayer[];

  @OneToMany(() => Match, match => match.homeTeam)
  homeMatches: Match[];

  @OneToMany(() => Match, match => match.awayTeam)
  awayMatches: Match[];

  @OneToMany(() => Transfer, transfer => transfer.fromTeam)
  transfersOut: Transfer[];

  @OneToMany(() => Transfer, transfer => transfer.toTeam)
  transfersIn: Transfer[];
}
