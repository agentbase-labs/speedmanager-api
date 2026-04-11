import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, CreateDateColumn, JoinColumn } from 'typeorm';
import { LeagueTeam } from '../league-teams/league-team.entity';
import { LeaguePlayer } from '../league-teams/league-player.entity';
import { User } from '../users/user.entity';

@Entity('transfers')
export class Transfer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  playerId: string;

  @Column()
  fromTeamId: string;

  @Column()
  toTeamId: string;

  @Column({ nullable: true })
  userId: string; // If user initiated the transfer

  @Column()
  offerAmount: number;

  @Column({ default: 'pending' })
  status: string; // pending, accepted, rejected, expired

  @Column({ nullable: true })
  aiResponse: string; // AI manager's reasoning

  @Column({ nullable: true })
  counterOffer: number; // AI can make counter offer

  @CreateDateColumn()
  createdAt: Date;

  @Column({ nullable: true })
  resolvedAt: Date;

  @ManyToOne(() => LeaguePlayer)
  @JoinColumn({ name: 'playerId' })
  player: LeaguePlayer;

  @ManyToOne(() => LeagueTeam, team => team.transfersOut)
  @JoinColumn({ name: 'fromTeamId' })
  fromTeam: LeagueTeam;

  @ManyToOne(() => LeagueTeam, team => team.transfersIn)
  @JoinColumn({ name: 'toTeamId' })
  toTeam: LeagueTeam;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'userId' })
  user: User;
}
