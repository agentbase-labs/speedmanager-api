import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Match } from './match.entity';
import { User } from '../users/user.entity';
import { Player } from '../players/player.entity';
import { LeagueTeam } from '../league-teams/league-team.entity';
import { UsersService } from '../users/users.service';
import { MatchCommentaryService } from '../match-commentary/match-commentary.service';
import { MatchEventsService } from '../match-events/match-events.service';

interface Decision {
  id: string;
  minute: number;
  type: string;
  question: string;
  options: { id: string; text: string; effect: number }[];
}

interface MatchState {
  matchId: string;
  opponent: {
    name: string;
    rating: number;
    team: Player[];
  };
  decisions: Decision[];
  userScore: number;
  opponentScore: number;
  userChoices: any[];
  startTime: number;
  goals: any[]; // Track goals scored during match
  teamRating: number; // User team rating
}

@Injectable()
export class MatchesService {
  private activeMatches: Map<string, MatchState> = new Map();

  constructor(
    @InjectRepository(Match)
    private matchesRepository: Repository<Match>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(Player)
    private playersRepository: Repository<Player>,
    @InjectRepository(LeagueTeam)
    private leagueTeamsRepository: Repository<LeagueTeam>,
    private usersService: UsersService,
    private matchCommentaryService: MatchCommentaryService,
    private matchEventsService: MatchEventsService,
  ) {}

  async startMatch(userId: string, teamId?: string, formation?: string) {
    // Fetch user to get their selected league team
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new Error('User not found');
    }
    
    // Use teamId from request if provided, otherwise use user's saved leagueTeamId
    const selectedTeamId = teamId || user.leagueTeamId;
    if (!selectedTeamId) {
      throw new Error('User has not selected a league team');
    }

    // Fetch the user's league team with all players
    const userTeam = await this.leagueTeamsRepository.findOne({
      where: { id: selectedTeamId },
      relations: ['players'],
    });
    if (!userTeam) {
      throw new Error('League team not found');
    }

    // Generate random opponent team
    const allPlayers = await this.playersRepository.find();
    const opponentTeam = this.getRandomTeam(allPlayers, 11);
    const opponentRating = Math.floor(opponentTeam.reduce((sum, p) => sum + p.rating, 0) / 11);
    const opponentName = `${this.getRandomTeamName()} FC`;

    // Generate decision moments
    const decisions = this.generateDecisions();
    
    // Calculate user team rating
    const userTeamRating = Math.floor(
      userTeam.players.slice(0, 11).reduce((sum, p) => sum + p.rating, 0) / 11
    );

    // Create match state
    const matchId = `match_${Date.now()}_${userId}`;
    const matchState: MatchState = {
      matchId,
      opponent: {
        name: opponentName,
        rating: opponentRating,
        team: opponentTeam,
      },
      decisions,
      userScore: 0,
      opponentScore: 0,
      userChoices: [],
      startTime: Date.now(),
      goals: [],
      teamRating: userTeamRating,
    };

    this.activeMatches.set(matchId, matchState);
    
    // ✅ BUG FIX: Generate goals during match simulation
    this.simulateMatchGoals(matchId);

    return {
      matchId,
      team: {
        id: userTeam.id,
        name: userTeam.name,
        players: userTeam.players, // All 18 players for substitutions
      },
      opponent: {
        name: opponentName,
        rating: opponentRating,
      },
      decisions: decisions.map(d => ({
        id: d.id,
        minute: d.minute,
        type: d.type,
        question: d.question,
        options: d.options.map(o => ({ id: o.id, text: o.text })),
      })),
    };
  }

  async makeDecision(matchId: string, decisionId: string, choiceId: string) {
    const matchState = this.activeMatches.get(matchId);
    if (!matchState) {
      throw new Error('Match not found');
    }

    const decision = matchState.decisions.find(d => d.id === decisionId);
    if (!decision) {
      throw new Error('Decision not found');
    }

    const option = decision.options.find(o => o.id === choiceId);
    if (!option) {
      throw new Error('Option not found');
    }

    // Record choice
    matchState.userChoices.push({
      decisionId,
      choiceId,
      effect: option.effect,
      minute: decision.minute,
    });

    return {
      success: true,
      effect: option.effect,
    };
  }

  async completeMatch(userId: string, matchId: string, userScore?: number, opponentScore?: number) {
    const matchState = this.activeMatches.get(matchId);
    if (!matchState) {
      throw new Error('Match not found');
    }

    // Use provided scores if available, otherwise calculate
    if (userScore === undefined || opponentScore === undefined) {
      // Calculate final score based on decisions
      const totalEffect = matchState.userChoices.reduce((sum, c) => sum + c.effect, 0);
      
      // Base probability (50-50)
      let userGoalProbability = 0.5 + (totalEffect * 0.05); // Each +1 effect = 5% better chance
      userGoalProbability = Math.max(0.2, Math.min(0.8, userGoalProbability)); // Clamp between 20-80%

      // Simulate goals (3-8 total goals in match)
      const totalGoals = Math.floor(Math.random() * 6) + 3;
      userScore = 0;
      opponentScore = 0;

      for (let i = 0; i < totalGoals; i++) {
        if (Math.random() < userGoalProbability) {
          userScore++;
        } else {
          opponentScore++;
        }
      }
    }

    // Determine result based on ACTUAL scores
    let result: string;
    let coinsEarned: number;
    let starsEarned: number;

    if (userScore > opponentScore) {
      result = 'Win';
      coinsEarned = 150 + Math.floor(Math.random() * 50);
      starsEarned = 3 + Math.floor(Math.random() * 3);
    } else if (userScore === opponentScore) {
      result = 'Draw';
      coinsEarned = 75 + Math.floor(Math.random() * 25);
      starsEarned = 1;
    } else {
      result = 'Loss';
      coinsEarned = 50 + Math.floor(Math.random() * 20);
      starsEarned = 0;
    }

    // Save match to database
    const match = this.matchesRepository.create({
      userId,
      opponentName: matchState.opponent.name,
      userScore,
      opponentScore,
      coinsEarned,
      starsEarned,
      decisions: matchState.userChoices,
      result,
    });
    await this.matchesRepository.save(match);

    // Update user stats
    await this.usersService.updateCoins(userId, coinsEarned);
    await this.usersService.updateStars(userId, starsEarned);

    // Chance for player pack (20% on win)
    let packReward = null;
    if (result === 'Win' && Math.random() < 0.2) {
      packReward = { type: 'player_pack', quantity: 1 };
    }

    // Clean up match state
    this.activeMatches.delete(matchId);

    return {
      matchId,
      result,
      userScore,
      opponentScore,
      coinsEarned,
      starsEarned,
      packReward,
    };
  }

  async getLeaderboard(type: 'stars' | 'coins' = 'stars', limit: number = 100) {
    const orderBy = type === 'stars' ? 'stars' : 'coins';
    
    const users = await this.usersRepository.find({
      order: { [orderBy]: 'DESC' },
      take: limit,
    });

    return users.map((user, index) => ({
      rank: index + 1,
      username: user.username,
      stars: user.stars,
      coins: user.coins,
      matchesPlayed: 0, // TODO: Add count
    }));
  }

  private generateDecisions(): Decision[] {
    const decisionTemplates = [
      {
        type: 'counter',
        question: 'Counter Attack Opportunity!',
        options: [
          { text: 'Push Forward', effect: 2 },
          { text: 'Play Safe', effect: -1 },
          { text: 'Long Ball', effect: 1 },
        ],
      },
      {
        type: 'yellow',
        question: 'Your player got a yellow card!',
        options: [
          { text: 'Substitute Him', effect: 0 },
          { text: 'Keep Playing', effect: 1 },
          { text: 'Tell Him to Calm Down', effect: -1 },
        ],
      },
      {
        type: 'pressure',
        question: 'Opponent is dominating!',
        options: [
          { text: 'Change to Defensive', effect: -1 },
          { text: 'Stay Attacking', effect: 2 },
          { text: 'Balanced Approach', effect: 0 },
        ],
      },
      {
        type: 'freekick',
        question: 'Free Kick in dangerous position!',
        options: [
          { text: 'Shoot Directly', effect: 1 },
          { text: 'Cross to Box', effect: 1 },
          { text: 'Short Pass', effect: -1 },
        ],
      },
      {
        type: 'injury',
        question: 'Injury Time - Final moments!',
        options: [
          { text: 'All-Out Attack', effect: 2 },
          { text: 'Hold Position', effect: -2 },
          { text: 'Smart Play', effect: 0 },
        ],
      },
    ];

    // Pick 3-5 random decision moments
    const numDecisions = Math.floor(Math.random() * 3) + 3;
    const selectedDecisions: Decision[] = [];
    const minutes = [15, 30, 45, 60, 75, 85];

    for (let i = 0; i < numDecisions; i++) {
      const template = decisionTemplates[Math.floor(Math.random() * decisionTemplates.length)];
      selectedDecisions.push({
        id: `decision_${i + 1}`,
        minute: minutes[i],
        type: template.type,
        question: template.question,
        options: template.options.map((opt, idx) => ({
          id: `option_${i}_${idx}`,
          text: opt.text,
          effect: opt.effect,
        })),
      });
    }

    return selectedDecisions;
  }

  private getRandomTeam(allPlayers: Player[], size: number): Player[] {
    const shuffled = [...allPlayers].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, size);
  }

  private getRandomTeamName(): string {
    const names = [
      'Thunder', 'Lightning', 'Phoenix', 'Dragons', 'Eagles',
      'Titans', 'Warriors', 'Knights', 'Lions', 'Tigers',
      'Panthers', 'Wolves', 'Hawks', 'Falcons', 'Storm',
    ];
    return names[Math.floor(Math.random() * names.length)];
  }

  // ✅ BUG FIX: Simulate goals during match (called asynchronously)
  private async simulateMatchGoals(matchId: string) {
    const matchState = this.activeMatches.get(matchId);
    if (!matchState) return;

    // Calculate goal probability based on team ratings
    const ratingDiff = matchState.teamRating - matchState.opponent.rating;
    let userGoalProb = 0.5 + (ratingDiff / 200); // Normalize rating difference
    userGoalProb = Math.max(0.3, Math.min(0.7, userGoalProb)); // Clamp 30-70%

    // Generate 2-6 total goals over 90 minutes
    const totalGoals = Math.floor(Math.random() * 5) + 2; // 2-6 goals
    const goalMinutes = [];
    
    for (let i = 0; i < totalGoals; i++) {
      // Random minute between 1-90
      goalMinutes.push(Math.floor(Math.random() * 90) + 1);
    }
    
    goalMinutes.sort((a, b) => a - b);

    // Schedule goals to be added over time
    for (const minute of goalMinutes) {
      setTimeout(() => {
        const state = this.activeMatches.get(matchId);
        if (!state) return;

        const isUserGoal = Math.random() < userGoalProb;
        
        if (isUserGoal) {
          state.userScore++;
          const scorer = this.getRandomPlayer(matchState.opponent.team); // Use opponent team for now
          state.goals.push({
            minute,
            team: 'user',
            scorer: scorer?.name || 'Player',
            type: 'goal',
          });
        } else {
          state.opponentScore++;
          const scorer = this.getRandomPlayer(matchState.opponent.team);
          state.goals.push({
            minute,
            team: 'opponent',
            scorer: scorer?.name || 'Opponent Player',
            type: 'goal',
          });
        }
      }, minute * 1000); // Schedule goal at that minute (1s = 1 min)
    }
  }

  async getMatchGoals(matchId: string) {
    const matchState = this.activeMatches.get(matchId);
    if (!matchState) {
      throw new Error('Match not found');
    }

    return {
      matchId,
      userScore: matchState.userScore,
      opponentScore: matchState.opponentScore,
      goals: matchState.goals,
    };
  }

  async getMatchEvents(matchId: string) {
    return this.matchEventsService.getMatchEvents(matchId);
  }

  private getRandomPlayer(team: Player[]): Player | null {
    if (!team || team.length === 0) return null;
    return team[Math.floor(Math.random() * team.length)];
  }

  // ✅ BUG FIX: Implement substitution logic
  async makeSubstitution(matchId: string, playerOutId: string, playerInId: string) {
    const matchState = this.activeMatches.get(matchId);
    if (!matchState) {
      throw new Error('Match not found');
    }

    // Fetch the actual player records to swap
    const playerOut = await this.playersRepository.findOne({ where: { id: playerOutId } });
    const playerIn = await this.playersRepository.findOne({ where: { id: playerInId } });

    if (!playerOut || !playerIn) {
      throw new Error('Player not found');
    }

    // Record substitution event
    const currentMinute = Math.floor((Date.now() - matchState.startTime) / 1000);
    matchState.userChoices.push({
      type: 'substitution',
      playerOut: playerOut.name,
      playerIn: playerIn.name,
      minute: Math.min(currentMinute, 90),
    });

    return {
      success: true,
      message: `Substitution made: ${playerOut.name} → ${playerIn.name}`,
      playerOut: playerOut.name,
      playerIn: playerIn.name,
    };
  }

  // Commentary system integration
  async getMatchCommentary(matchId: string, sinceMinute?: number) {
    const commentary = await this.matchCommentaryService.getMatchCommentary(matchId, sinceMinute);
    return { commentary };
  }

  async generateCommentary(matchId: string, minute: number) {
    const matchState = this.activeMatches.get(matchId);
    if (!matchState) {
      throw new Error('Match not found');
    }

    // Get player names from teams
    const homePlayers = matchState.opponent.team.map(p => ({ 
      id: p.id, 
      name: p.name 
    }));
    const awayPlayers = matchState.opponent.team.map(p => ({ 
      id: p.id, 
      name: p.name 
    }));

    const events = await this.matchCommentaryService.generateAndSaveCommentary(
      matchId,
      minute,
      {
        homeTeam: 'Your Team',
        awayTeam: matchState.opponent.name,
        homeScore: matchState.userScore,
        awayScore: matchState.opponentScore,
        homePlayers,
        awayPlayers,
      }
    );

    return { events };
  }
}
