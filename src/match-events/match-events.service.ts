import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MatchEvent } from './match-event.entity';
import { PlayerRating } from '../player-ratings/player-rating.entity';

@Injectable()
export class MatchEventsService {
  constructor(
    @InjectRepository(MatchEvent)
    private matchEventsRepository: Repository<MatchEvent>,
    @InjectRepository(PlayerRating)
    private playerRatingsRepository: Repository<PlayerRating>,
  ) {}

  async createEvent(eventData: Partial<MatchEvent>) {
    const event = this.matchEventsRepository.create(eventData);
    return this.matchEventsRepository.save(event);
  }

  async getMatchEvents(matchId: string) {
    return this.matchEventsRepository.find({
      where: { matchId },
      order: { minute: 'ASC' },
    });
  }

  async createPlayerRatings(matchId: string, ratings: any[]) {
    const ratingEntities = ratings.map(r => 
      this.playerRatingsRepository.create({
        matchId,
        playerId: r.playerId,
        rating: r.rating,
        goals: r.goals || 0,
        assists: r.assists || 0,
        shots: r.shots || 0,
        shotsOnTarget: r.shotsOnTarget || 0,
        passes: r.passes || 0,
        passesCompleted: r.passesCompleted || 0,
        tackles: r.tackles || 0,
        interceptions: r.interceptions || 0,
        saves: r.saves || 0,
        manOfTheMatch: r.manOfTheMatch || false,
      })
    );

    return this.playerRatingsRepository.save(ratingEntities);
  }

  async getPlayerRatings(matchId: string) {
    return this.playerRatingsRepository.find({
      where: { matchId },
      relations: ['player'],
      order: { rating: 'DESC' },
    });
  }
}
