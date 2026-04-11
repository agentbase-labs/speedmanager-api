import { Controller, Post, Body, Get, Query, UseGuards, Request, Param } from '@nestjs/common';
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

  @Get(':matchId/goals')
  @UseGuards(JwtAuthGuard)
  async getMatchGoals(@Request() req, @Param('matchId') matchId: string) {
    return this.matchesService.getMatchGoals(matchId);
  }

  @Get(':matchId/events')
  @UseGuards(JwtAuthGuard)
  async getMatchEvents(@Param('matchId') matchId: string) {
    return this.matchesService.getMatchEvents(matchId);
  }

  @Get(':matchId/commentary')
  @UseGuards(JwtAuthGuard)
  async getMatchCommentary(
    @Param('matchId') matchId: string,
    @Query('sinceMinute') sinceMinute?: string
  ) {
    return this.matchesService.getMatchCommentary(matchId, sinceMinute ? parseInt(sinceMinute) : undefined);
  }

  @Post(':matchId/commentary/generate')
  @UseGuards(JwtAuthGuard)
  async generateCommentary(
    @Param('matchId') matchId: string,
    @Body() body: { minute: number }
  ) {
    return this.matchesService.generateCommentary(matchId, body.minute);
  }

  // ✅ BUG FIX: Add substitution endpoint
  @Post('substitution')
  @UseGuards(JwtAuthGuard)
  async makeSubstitution(
    @Request() req,
    @Body() body: { matchId: string; playerOutId: string; playerInId: string }
  ) {
    return this.matchesService.makeSubstitution(
      body.matchId,
      body.playerOutId,
      body.playerInId
    );
  }
}
