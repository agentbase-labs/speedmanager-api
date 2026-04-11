import { Injectable, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';
import { UserPlayer } from '../players/user-player.entity';
import { Player } from '../players/player.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(UserPlayer)
    private userPlayersRepository: Repository<UserPlayer>,
    @InjectRepository(Player)
    private playersRepository: Repository<Player>,
  ) {}

  async create(userData: { email: string; username: string; password: string }): Promise<User> {
    const existingEmail = await this.usersRepository.findOne({ where: { email: userData.email } });
    if (existingEmail) {
      throw new ConflictException('Email already exists');
    }

    const existingUsername = await this.usersRepository.findOne({ where: { username: userData.username } });
    if (existingUsername) {
      throw new ConflictException('Username already exists');
    }

    const user = this.usersRepository.create(userData);
    const savedUser = await this.usersRepository.save(user);

    // Give new users 5 random starter players
    await this.giveStarterPlayers(savedUser.id);

    return savedUser;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { email } });
  }

  async findById(id: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { id } });
  }

  async getProfile(userId: string) {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) return null;

    return {
      id: user.id,
      email: user.email,
      username: user.username,
      coins: user.coins,
      stars: user.stars,
      rank: user.rank,
    };
  }

  async updateCoins(userId: string, amount: number) {
    await this.usersRepository.increment({ id: userId }, 'coins', amount);
  }

  async updateStars(userId: string, amount: number) {
    await this.usersRepository.increment({ id: userId }, 'stars', amount);
  }

  async getCollection(userId: string) {
    const userPlayers = await this.userPlayersRepository.find({
      where: { userId },
      relations: ['player'],
    });

    return userPlayers.map(up => ({
      id: up.player.id,
      name: up.player.name,
      position: up.player.position,
      rating: up.player.rating,
      rarity: up.player.rarity,
      special: up.player.special,
      level: up.level,
      acquiredAt: up.acquiredAt,
    }));
  }

  async openPack(userId: string) {
    const user = await this.findById(userId);
    if (!user || user.coins < 100) {
      throw new Error('Insufficient coins');
    }

    // Deduct coins
    await this.usersRepository.decrement({ id: userId }, 'coins', 100);

    // Get 3 random players with rarity weighting
    const players = await this.getRandomPlayers(3);

    // Add to user's collection
    for (const player of players) {
      const existing = await this.userPlayersRepository.findOne({
        where: { userId, playerId: player.id },
      });

      if (existing) {
        // Level up if already owned
        await this.userPlayersRepository.increment(
          { userId, playerId: player.id },
          'level',
          1
        );
      } else {
        // Add new player
        const userPlayer = this.userPlayersRepository.create({
          userId,
          playerId: player.id,
        });
        await this.userPlayersRepository.save(userPlayer);
      }
    }

    return players.map(p => ({
      id: p.id,
      name: p.name,
      position: p.position,
      rating: p.rating,
      rarity: p.rarity,
      special: p.special,
    }));
  }

  private async giveStarterPlayers(userId: string) {
    const players = await this.getRandomPlayers(5);
    
    for (const player of players) {
      const userPlayer = this.userPlayersRepository.create({
        userId,
        playerId: player.id,
      });
      await this.userPlayersRepository.save(userPlayer);
    }
  }

  private async getRandomPlayers(count: number): Promise<Player[]> {
    // Weighted random selection based on rarity
    const allPlayers = await this.playersRepository.find();
    const selected: Player[] = [];

    for (let i = 0; i < count; i++) {
      const rand = Math.random() * 100;
      let rarity: string;

      if (rand < 0.1) {
        rarity = 'Legendary'; // 0.1% for special (Roy Hogeg)
      } else if (rand < 5) {
        rarity = 'Legendary'; // 5%
      } else if (rand < 20) {
        rarity = 'Epic'; // 15%
      } else if (rand < 50) {
        rarity = 'Rare'; // 30%
      } else {
        rarity = 'Common'; // 50%
      }

      const rarityPlayers = allPlayers.filter(p => p.rarity === rarity);
      if (rarityPlayers.length > 0) {
        const randomPlayer = rarityPlayers[Math.floor(Math.random() * rarityPlayers.length)];
        selected.push(randomPlayer);
      } else {
        // Fallback to any player if rarity not found
        const randomPlayer = allPlayers[Math.floor(Math.random() * allPlayers.length)];
        selected.push(randomPlayer);
      }
    }

    return selected;
  }
}
