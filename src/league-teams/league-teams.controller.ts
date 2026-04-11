import { Controller, Get, Post, Put, Param, Body, UseGuards } from '@nestjs/common';
import { LeagueTeamsService } from './league-teams.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('league-teams')
export class LeagueTeamsController {
  constructor(private leagueTeamsService: LeagueTeamsService) {}

  @Get()
  async getAllTeams() {
    return this.leagueTeamsService.findAll();
  }

  @Get('table')
  async getLeagueTable() {
    return this.leagueTeamsService.getLeagueTable();
  }

  @Get(':id')
  async getTeam(@Param('id') id: string) {
    return this.leagueTeamsService.findById(id);
  }

  @UseGuards(JwtAuthGuard)
  @Put(':id/formation')
  async updateFormation(
    @Param('id') id: string,
    @Body() body: { formation: string; lineup: any[] }
  ) {
    return this.leagueTeamsService.updateFormation(id, body.formation, body.lineup);
  }
}
