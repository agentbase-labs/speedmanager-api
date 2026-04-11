import { Controller, Get, Post, Body, Param, UseGuards, Request } from '@nestjs/common';
import { TransfersService } from './transfers.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('transfers')
@UseGuards(JwtAuthGuard)
export class TransfersController {
  constructor(private transfersService: TransfersService) {}

  @Post()
  async createOffer(
    @Request() req,
    @Body() body: {
      playerId: string;
      fromTeamId: string;
      toTeamId: string;
      offerAmount: number;
    }
  ) {
    return this.transfersService.createOffer(
      body.playerId,
      body.fromTeamId,
      body.toTeamId,
      body.offerAmount,
      req.user.userId
    );
  }

  @Get('my-transfers')
  async getMyTransfers(@Request() req) {
    return this.transfersService.findUserTransfers(req.user.userId);
  }

  @Post(':id/accept-counter')
  async acceptCounterOffer(@Request() req, @Param('id') id: string) {
    return this.transfersService.acceptCounterOffer(id, req.user.userId);
  }
}
