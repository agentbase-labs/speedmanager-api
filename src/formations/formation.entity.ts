import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity('formations')
export class Formation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string; // e.g., "4-3-3"

  @Column()
  displayName: string; // e.g., "4-3-3 Attack"

  @Column('jsonb')
  positions: any; // Array of position objects with x, y coordinates and role

  @Column()
  description: string;

  @Column({ default: 'Balanced' })
  style: string; // Attacking, Balanced, Defensive
}
