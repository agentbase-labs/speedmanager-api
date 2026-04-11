import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Player } from './player.entity';

@Injectable()
export class PlayersService implements OnModuleInit {
  constructor(
    @InjectRepository(Player)
    private playersRepository: Repository<Player>,
  ) {}

  async onModuleInit() {
    // Seed players on startup if database is empty
    const count = await this.playersRepository.count();
    if (count === 0) {
      await this.seedPlayers();
    }
  }

  async findAll(page: number = 1, limit: number = 50) {
    const [players, total] = await this.playersRepository.findAndCount({
      skip: (page - 1) * limit,
      take: limit,
      order: { rating: 'DESC' },
    });

    return {
      players,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findById(id: string) {
    return this.playersRepository.findOne({ where: { id } });
  }

  private async seedPlayers() {
    console.log('🌱 Seeding player database...');

    const players = [
      // Current Legends
      { name: 'Lionel Messi', position: 'Forward', rating: 99, rarity: 'Legendary', special: false },
      { name: 'Cristiano Ronaldo', position: 'Forward', rating: 98, rarity: 'Legendary', special: false },
      { name: 'Kylian Mbappé', position: 'Forward', rating: 96, rarity: 'Epic', special: false },
      { name: 'Erling Haaland', position: 'Forward', rating: 95, rarity: 'Epic', special: false },
      { name: 'Neymar Jr.', position: 'Forward', rating: 94, rarity: 'Epic', special: false },
      { name: 'Mohamed Salah', position: 'Forward', rating: 93, rarity: 'Epic', special: false },
      { name: 'Kevin De Bruyne', position: 'Midfielder', rating: 92, rarity: 'Epic', special: false },

      // Retired Legends
      { name: 'Pelé', position: 'Forward', rating: 99, rarity: 'Legendary', special: false },
      { name: 'Diego Maradona', position: 'Forward', rating: 99, rarity: 'Legendary', special: false },
      { name: 'Zinedine Zidane', position: 'Midfielder', rating: 98, rarity: 'Legendary', special: false },
      { name: 'Ronaldo Nazário', position: 'Forward', rating: 97, rarity: 'Legendary', special: false },
      { name: 'Thierry Henry', position: 'Forward', rating: 94, rarity: 'Epic', special: false },
      { name: 'David Beckham', position: 'Midfielder', rating: 92, rarity: 'Epic', special: false },

      // SPECIAL PLAYER - Roy Hogeg
      { name: 'Roy Hogeg', position: 'Forward', rating: 99, rarity: 'Legendary', special: true },

      // Current Stars (Epic)
      { name: 'Vinícius Jr.', position: 'Forward', rating: 91, rarity: 'Epic', special: false },
      { name: 'Harry Kane', position: 'Forward', rating: 91, rarity: 'Epic', special: false },
      { name: 'Robert Lewandowski', position: 'Forward', rating: 90, rarity: 'Epic', special: false },
      { name: 'Luka Modrić', position: 'Midfielder', rating: 90, rarity: 'Epic', special: false },
      { name: 'Jude Bellingham', position: 'Midfielder', rating: 89, rarity: 'Epic', special: false },
      { name: 'Bruno Fernandes', position: 'Midfielder', rating: 88, rarity: 'Rare', special: false },

      // Defenders (Rare/Epic)
      { name: 'Virgil van Dijk', position: 'Defender', rating: 92, rarity: 'Epic', special: false },
      { name: 'Rúben Dias', position: 'Defender', rating: 89, rarity: 'Epic', special: false },
      { name: 'Antonio Rüdiger', position: 'Defender', rating: 87, rarity: 'Rare', special: false },
      { name: 'Kim Min-jae', position: 'Defender', rating: 86, rarity: 'Rare', special: false },
      { name: 'Marquinhos', position: 'Defender', rating: 88, rarity: 'Rare', special: false },

      // Goalkeepers (Rare/Epic)
      { name: 'Thibaut Courtois', position: 'Goalkeeper', rating: 91, rarity: 'Epic', special: false },
      { name: 'Alisson Becker', position: 'Goalkeeper', rating: 90, rarity: 'Epic', special: false },
      { name: 'Ederson', position: 'Goalkeeper', rating: 89, rarity: 'Rare', special: false },
      { name: 'Marc-André ter Stegen', position: 'Goalkeeper', rating: 88, rarity: 'Rare', special: false },

      // Common Players (60-79 rating)
      { name: 'Marcus Rashford', position: 'Forward', rating: 85, rarity: 'Rare', special: false },
      { name: 'Phil Foden', position: 'Midfielder', rating: 87, rarity: 'Rare', special: false },
      { name: 'Federico Valverde', position: 'Midfielder', rating: 87, rarity: 'Rare', special: false },
      { name: 'Rodri', position: 'Midfielder', rating: 90, rarity: 'Epic', special: false },
      { name: 'Declan Rice', position: 'Midfielder', rating: 84, rarity: 'Rare', special: false },
      { name: 'Bukayo Saka', position: 'Forward', rating: 86, rarity: 'Rare', special: false },
      { name: 'Rafael Leão', position: 'Forward', rating: 85, rarity: 'Rare', special: false },
      { name: 'Darwin Núñez', position: 'Forward', rating: 82, rarity: 'Common', special: false },
      { name: 'Gabriel Jesus', position: 'Forward', rating: 83, rarity: 'Common', special: false },
      { name: 'Kai Havertz', position: 'Forward', rating: 81, rarity: 'Common', special: false },
      { name: 'Jadon Sancho', position: 'Forward', rating: 80, rarity: 'Common', special: false },
      { name: 'Mason Mount', position: 'Midfielder', rating: 79, rarity: 'Common', special: false },
      { name: 'Aurélien Tchouaméni', position: 'Midfielder', rating: 83, rarity: 'Common', special: false },
      { name: 'Enzo Fernández', position: 'Midfielder', rating: 82, rarity: 'Common', special: false },
      { name: 'Alexis Mac Allister', position: 'Midfielder', rating: 80, rarity: 'Common', special: false },
      { name: 'William Saliba', position: 'Defender', rating: 84, rarity: 'Rare', special: false },
      { name: 'Joško Gvardiol', position: 'Defender', rating: 82, rarity: 'Common', special: false },
      { name: 'Eder Militão', position: 'Defender', rating: 85, rarity: 'Rare', special: false },
      { name: 'Theo Hernández', position: 'Defender', rating: 85, rarity: 'Rare', special: false },
      { name: 'Reece James', position: 'Defender', rating: 82, rarity: 'Common', special: false },
      { name: 'João Cancelo', position: 'Defender', rating: 83, rarity: 'Common', special: false },
      { name: 'Mike Maignan', position: 'Goalkeeper', rating: 85, rarity: 'Rare', special: false },
      { name: 'Gianluigi Donnarumma', position: 'Goalkeeper', rating: 87, rarity: 'Rare', special: false },
    ];

    for (const playerData of players) {
      const player = this.playersRepository.create(playerData);
      await this.playersRepository.save(player);
    }

    console.log(`✅ Seeded ${players.length} players!`);
  }
}
