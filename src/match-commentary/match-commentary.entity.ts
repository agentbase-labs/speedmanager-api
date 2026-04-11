import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, CreateDateColumn, JoinColumn } from 'typeorm';
import { Match } from '../matches/match.entity';

@Entity('match_commentary')
export class MatchCommentary {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  matchId: string;

  @Column()
  minute: number;

  @Column()
  type: string; // Event type (goal, shot, pass, etc.)

  @Column('text')
  text: string; // Commentary text

  @Column()
  importance: string; // low, medium, high

  @Column({ nullable: true })
  teamId: string;

  @Column({ nullable: true })
  playerId: string;

  @Column({ nullable: true })
  playerName: string;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => Match, match => match.commentary)
  @JoinColumn({ name: 'matchId' })
  match: Match;
}
