import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Formation } from './formation.entity';

@Injectable()
export class FormationsService implements OnModuleInit {
  constructor(
    @InjectRepository(Formation)
    private formationsRepository: Repository<Formation>,
  ) {}

  async onModuleInit() {
    const count = await this.formationsRepository.count();
    if (count === 0) {
      await this.seedFormations();
    }
  }

  async findAll() {
    return this.formationsRepository.find();
  }

  private async seedFormations() {
    console.log('⚽ Seeding formations...');

    const formations = [
      {
        name: '4-3-3',
        displayName: '4-3-3 Attack',
        description: 'Balanced attacking formation with wide wingers',
        style: 'Attacking',
        positions: [
          { slot: 1, role: 'GK', x: 50, y: 95 },
          { slot: 2, role: 'RB', x: 80, y: 75 },
          { slot: 3, role: 'CB', x: 60, y: 80 },
          { slot: 4, role: 'CB', x: 40, y: 80 },
          { slot: 5, role: 'LB', x: 20, y: 75 },
          { slot: 6, role: 'CM', x: 50, y: 55 },
          { slot: 7, role: 'CM', x: 35, y: 50 },
          { slot: 8, role: 'CM', x: 65, y: 50 },
          { slot: 9, role: 'RW', x: 80, y: 25 },
          { slot: 10, role: 'ST', x: 50, y: 15 },
          { slot: 11, role: 'LW', x: 20, y: 25 },
        ],
      },
      {
        name: '4-4-2',
        displayName: '4-4-2 Classic',
        description: 'Traditional balanced formation',
        style: 'Balanced',
        positions: [
          { slot: 1, role: 'GK', x: 50, y: 95 },
          { slot: 2, role: 'RB', x: 80, y: 75 },
          { slot: 3, role: 'CB', x: 60, y: 80 },
          { slot: 4, role: 'CB', x: 40, y: 80 },
          { slot: 5, role: 'LB', x: 20, y: 75 },
          { slot: 6, role: 'RM', x: 80, y: 50 },
          { slot: 7, role: 'CM', x: 60, y: 55 },
          { slot: 8, role: 'CM', x: 40, y: 55 },
          { slot: 9, role: 'LM', x: 20, y: 50 },
          { slot: 10, role: 'ST', x: 40, y: 20 },
          { slot: 11, role: 'ST', x: 60, y: 20 },
        ],
      },
      {
        name: '3-5-2',
        displayName: '3-5-2 Control',
        description: 'Midfield dominance with wing-backs',
        style: 'Balanced',
        positions: [
          { slot: 1, role: 'GK', x: 50, y: 95 },
          { slot: 2, role: 'CB', x: 30, y: 80 },
          { slot: 3, role: 'CB', x: 50, y: 82 },
          { slot: 4, role: 'CB', x: 70, y: 80 },
          { slot: 5, role: 'RWB', x: 80, y: 60 },
          { slot: 6, role: 'CM', x: 65, y: 55 },
          { slot: 7, role: 'CM', x: 50, y: 50 },
          { slot: 8, role: 'CM', x: 35, y: 55 },
          { slot: 9, role: 'LWB', x: 20, y: 60 },
          { slot: 10, role: 'ST', x: 40, y: 20 },
          { slot: 11, role: 'ST', x: 60, y: 20 },
        ],
      },
      {
        name: '4-2-3-1',
        displayName: '4-2-3-1 Modern',
        description: 'Two holding midfielders with attacking midfielder',
        style: 'Balanced',
        positions: [
          { slot: 1, role: 'GK', x: 50, y: 95 },
          { slot: 2, role: 'RB', x: 80, y: 75 },
          { slot: 3, role: 'CB', x: 60, y: 80 },
          { slot: 4, role: 'CB', x: 40, y: 80 },
          { slot: 5, role: 'LB', x: 20, y: 75 },
          { slot: 6, role: 'CDM', x: 60, y: 60 },
          { slot: 7, role: 'CDM', x: 40, y: 60 },
          { slot: 8, role: 'RW', x: 75, y: 35 },
          { slot: 9, role: 'CAM', x: 50, y: 40 },
          { slot: 10, role: 'LW', x: 25, y: 35 },
          { slot: 11, role: 'ST', x: 50, y: 15 },
        ],
      },
      {
        name: '3-4-3',
        displayName: '3-4-3 Attack',
        description: 'Ultra-attacking with three forwards',
        style: 'Attacking',
        positions: [
          { slot: 1, role: 'GK', x: 50, y: 95 },
          { slot: 2, role: 'CB', x: 30, y: 80 },
          { slot: 3, role: 'CB', x: 50, y: 82 },
          { slot: 4, role: 'CB', x: 70, y: 80 },
          { slot: 5, role: 'RM', x: 75, y: 55 },
          { slot: 6, role: 'CM', x: 55, y: 60 },
          { slot: 7, role: 'CM', x: 45, y: 60 },
          { slot: 8, role: 'LM', x: 25, y: 55 },
          { slot: 9, role: 'RW', x: 75, y: 25 },
          { slot: 10, role: 'ST', x: 50, y: 15 },
          { slot: 11, role: 'LW', x: 25, y: 25 },
        ],
      },
      {
        name: '5-3-2',
        displayName: '5-3-2 Defensive',
        description: 'Solid defense with counter-attacking potential',
        style: 'Defensive',
        positions: [
          { slot: 1, role: 'GK', x: 50, y: 95 },
          { slot: 2, role: 'RWB', x: 85, y: 70 },
          { slot: 3, role: 'CB', x: 65, y: 80 },
          { slot: 4, role: 'CB', x: 50, y: 82 },
          { slot: 5, role: 'CB', x: 35, y: 80 },
          { slot: 6, role: 'LWB', x: 15, y: 70 },
          { slot: 7, role: 'CM', x: 65, y: 50 },
          { slot: 8, role: 'CM', x: 50, y: 55 },
          { slot: 9, role: 'CM', x: 35, y: 50 },
          { slot: 10, role: 'ST', x: 40, y: 20 },
          { slot: 11, role: 'ST', x: 60, y: 20 },
        ],
      },
    ];

    for (const formationData of formations) {
      const formation = this.formationsRepository.create(formationData);
      await this.formationsRepository.save(formation);
    }

    console.log('✅ Seeded 6 formations!');
  }
}
