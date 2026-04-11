import { Controller, Get, Post, Put, UseGuards, Request, Body } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('user')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  async getProfile(@Request() req) {
    return this.usersService.getProfile(req.user.id);
  }

  @Get('collection')
  @UseGuards(JwtAuthGuard)
  async getCollection(@Request() req) {
    return this.usersService.getCollection(req.user.id);
  }

  @Post('open-pack')
  @UseGuards(JwtAuthGuard)
  async openPack(@Request() req) {
    return this.usersService.openPack(req.user.id);
  }

  @Post('select-team')
  @UseGuards(JwtAuthGuard)
  async selectTeam(@Request() req, @Body() body: { teamId: string }) {
    return this.usersService.selectTeam(req.user.id, body.teamId);
  }
}
