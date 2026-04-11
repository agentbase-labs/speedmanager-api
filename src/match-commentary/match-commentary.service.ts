import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MatchCommentary } from './match-commentary.entity';
import { CommentaryService, CommentaryEvent } from '../commentary/commentary.service';

@Injectable()
export class MatchCommentaryService {
  constructor(
    @InjectRepository(MatchCommentary)
    private matchCommentaryRepository: Repository<MatchCommentary>,
    private commentaryService: CommentaryService,
  ) {}

  async createCommentary(matchId: string, event: CommentaryEvent) {
    const commentary = this.matchCommentaryRepository.create({
      matchId,
      minute: event.minute,
      type: event.type,
      text: event.text,
      importance: event.importance,
      teamId: event.teamId,
      playerId: event.playerId,
      playerName: event.playerName,
    });
    
    return this.matchCommentaryRepository.save(commentary);
  }

  async createBulkCommentary(matchId: string, events: CommentaryEvent[]) {
    const commentaries = events.map(event =>
      this.matchCommentaryRepository.create({
        matchId,
        minute: event.minute,
        type: event.type,
        text: event.text,
        importance: event.importance,
        teamId: event.teamId,
        playerId: event.playerId,
        playerName: event.playerName,
      })
    );
    
    return this.matchCommentaryRepository.save(commentaries);
  }

  async getMatchCommentary(matchId: string, sinceMinute?: number) {
    const query = this.matchCommentaryRepository
      .createQueryBuilder('commentary')
      .where('commentary.matchId = :matchId', { matchId })
      .orderBy('commentary.minute', 'ASC')
      .addOrderBy('commentary.createdAt', 'ASC');

    if (sinceMinute !== undefined) {
      query.andWhere('commentary.minute > :sinceMinute', { sinceMinute });
    }

    return query.getMany();
  }

  async generateAndSaveCommentary(
    matchId: string,
    minute: number,
    matchState: {
      homeTeam: string;
      awayTeam: string;
      homeScore: number;
      awayScore: number;
      homePlayers: any[];
      awayPlayers: any[];
    }
  ) {
    const events = this.commentaryService.generateMatchCommentary(minute, matchState);
    
    if (events.length > 0) {
      await this.createBulkCommentary(matchId, events);
    }

    return events;
  }
}
