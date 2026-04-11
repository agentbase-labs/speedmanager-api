import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, OneToMany, CreateDateColumn, JoinColumn } from 'typeorm';
import { User } from '../users/user.entity';
import { LeagueTeam } from '../league-teams/league-team.entity';
import { MatchEvent } from '../match-events/match-event.entity';
import { PlayerRating } from '../player-ratings/player-rating.entity';
import { MatchCommentary } from '../match-commentary/match-commentary.entity';

@Entity('matches')
export class Match {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: true })
  userId: string;

  @Column({ nullable: true })
  homeTeamId: string;

  @Column({ nullable: true })
  awayTeamId: string;

  @Column({ nullable: true })
  opponentName: string; // Legacy field

  @Column({ default: 0 })
  homeScore: number;

  @Column({ default: 0 })
  awayScore: number;

  @Column({ nullable: true })
  userScore: number; // Legacy field

  @Column({ nullable: true })
  opponentScore: number; // Legacy field

  @Column({ default: 0 })
  coinsEarned: number;

  @Column({ default: 0 })
  starsEarned: number;

  @Column('jsonb', { nullable: true })
  decisions: any; // JSON array of decisions

  @Column({ nullable: true })
  result: string; // Win, Draw, Loss

  @Column({ default: 'completed' })
  status: string; // scheduled, live, completed

  @Column({ nullable: true })
  currentMinute: number; // For live matches

  @CreateDateColumn()
  playedAt: Date;

  @Column({ nullable: true })
  scheduledAt: Date;

  @ManyToOne(() => User, user => user.matches, { nullable: true })
  @JoinColumn({ name: 'userId' })
  user: User;

  @ManyToOne(() => LeagueTeam, team => team.homeMatches, { nullable: true })
  @JoinColumn({ name: 'homeTeamId' })
  homeTeam: LeagueTeam;

  @ManyToOne(() => LeagueTeam, team => team.awayMatches, { nullable: true })
  @JoinColumn({ name: 'awayTeamId' })
  awayTeam: LeagueTeam;

  @OneToMany(() => MatchEvent, event => event.match)
  events: MatchEvent[];

  @OneToMany(() => PlayerRating, rating => rating.match)
  playerRatings: PlayerRating[];

  @OneToMany(() => MatchCommentary, commentary => commentary.match)
  commentary: MatchCommentary[];
}
