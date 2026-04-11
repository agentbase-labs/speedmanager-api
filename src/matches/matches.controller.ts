import { Controller, Post, Body, Get, Query, UseGuards, Request } from '@nestjs/common';
import { MatchesService } from './matches.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('match')
export class MatchesController {
  constructor(private matchesService: MatchesService) {}

  @Post('start')
  @UseGuards(JwtAuthGuard)
  async startMatch(@Request() req, @Body() body: { teamId?: string; formation?: string }) {
    return this.matchesService.startMatch(req.user.id, body.teamId, body.formation);
  }

  @Post('decision')
  @UseGuards(JwtAuthGuard)
  async makeDecision(@Body() body: { matchId: string; decisionId: string; choice: string }) {
    return this.matchesService.makeDecision(body.matchId, body.decisionId, body.choice);
  }

  @Post('complete')
  @UseGuards(JwtAuthGuard)
  async completeMatch(@Request() req, @Body() body: { matchId: string; homeScore?: number; awayScore?: number }) {
    return this.matchesService.completeMatch(req.user.id, body.matchId, body.homeScore, body.awayScore);
  }

  @Get('leaderboard')
  async getLeaderboard(@Query('type') type: 'stars' | 'coins' = 'stars') {
    return this.matchesService.getLeaderboard(type);
  }
}