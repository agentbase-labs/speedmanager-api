import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, CreateDateColumn, JoinColumn } from 'typeorm';
import { Match } from '../matches/match.entity';
import { LeaguePlayer } from '../league-teams/league-player.entity';

@Entity('match_events')
export class MatchEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  matchId: string;

  @Column()
  minute: number; // 1-90+

  @Column()
  eventType: string; // goal, assist, yellow_card, red_card, substitution, injury

  @Column({ nullable: true })
  playerId: string; // Player involved

  @Column({ nullable: true })
  playerName: string; // For quick display

  @Column({ nullable: true })
  secondaryPlayerId: string; // For assists, substitutions

  @Column({ nullable: true })
  secondaryPlayerName: string;

  @Column()
  teamId: string; // Which team the event belongs to

  @Column({ nullable: true })
  description: string; // "Marcus Rashford scores from outside the box!"

  @Column('jsonb', { nullable: true })
  metadata: any; // Additional data (goal type, card reason, etc.)

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => Match, match => match.events)
  @JoinColumn({ name: 'matchId' })
  match: Match;

  @ManyToOne(() => LeaguePlayer, { nullable: true })
  @JoinColumn({ name: 'playerId' })
  player: LeaguePlayer;

  @ManyToOne(() => LeaguePlayer, { nullable: true })
  @JoinColumn({ name: 'secondaryPlayerId' })
  secondaryPlayer: LeaguePlayer;
}
