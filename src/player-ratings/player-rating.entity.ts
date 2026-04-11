import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Match } from '../matches/match.entity';
import { LeaguePlayer } from '../league-teams/league-player.entity';

@Entity('player_ratings')
export class PlayerRating {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  matchId: string;

  @Column()
  playerId: string;

  @Column('decimal', { precision: 3, scale: 1 })
  rating: number; // 0.0-10.0

  @Column({ default: 0 })
  goals: number;

  @Column({ default: 0 })
  assists: number;

  @Column({ default: 0 })
  shots: number;

  @Column({ default: 0 })
  shotsOnTarget: number;

  @Column({ default: 0 })
  passes: number;

  @Column({ default: 0 })
  passesCompleted: number;

  @Column({ default: 0 })
  tackles: number;

  @Column({ default: 0 })
  interceptions: number;

  @Column({ default: 0 })
  saves: number; // For goalkeepers

  @Column({ default: false })
  manOfTheMatch: boolean;

  @ManyToOne(() => Match, match => match.playerRatings)
  @JoinColumn({ name: 'matchId' })
  match: Match;

  @ManyToOne(() => LeaguePlayer)
  @JoinColumn({ name: 'playerId' })
  player: LeaguePlayer;
}
