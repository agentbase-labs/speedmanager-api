import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, CreateDateColumn, JoinColumn } from 'typeorm';
import { User } from '../users/user.entity';

@Entity('matches')
export class Match {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column()
  opponentName: string;

  @Column()
  userScore: number;

  @Column()
  opponentScore: number;

  @Column()
  coinsEarned: number;

  @Column()
  starsEarned: number;

  @Column('jsonb')
  decisions: any; // JSON array of decisions

  @Column()
  result: string; // Win, Draw, Loss

  @CreateDateColumn()
  playedAt: Date;

  @ManyToOne(() => User, user => user.matches)
  @JoinColumn({ name: 'userId' })
  user: User;
}
