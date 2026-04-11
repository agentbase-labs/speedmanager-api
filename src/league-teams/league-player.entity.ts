import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from 'typeorm';
import { LeagueTeam } from './league-team.entity';

@Entity('league_players')
export class LeaguePlayer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column()
  position: string; // Forward, Midfielder, Defender, Goalkeeper

  @Column()
  rating: number; // 60-99

  @Column({ default: 1000000 })
  price: number; // Transfer value

  @Column()
  teamId: string;

  @Column({ default: false })
  isStarter: boolean; // true if in starting XI

  @Column({ nullable: true })
  positionInFormation: number; // 1-11 for starters, null for bench

  @Column({ default: 85 })
  fitness: number; // 0-100

  @Column({ default: 'Normal' })
  morale: string; // High, Normal, Low

  @Column({ default: 0 })
  goals: number;

  @Column({ default: 0 })
  assists: number;

  @Column({ default: 0 })
  yellowCards: number;

  @Column({ default: 0 })
  redCards: number;

  @Column({ default: 0 })
  gamesPlayed: number;

  @Column({ nullable: true })
  lastMatchRating: number; // 0-10

  @ManyToOne(() => LeagueTeam, team => team.players)
  @JoinColumn({ name: 'teamId' })
  team: LeagueTeam;
}
