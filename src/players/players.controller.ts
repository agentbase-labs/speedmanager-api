import { Controller, Get, Param, Query } from '@nestjs/common';
import { PlayersService } from './players.service';

@Controller('players')
export class PlayersController {
  constructor(private playersService: PlayersService) {}

  @Get()
  async findAll(@Query('page') page: string = '1', @Query('limit') limit: string = '50') {
    return this.playersService.findAll(parseInt(page), parseInt(limit));
  }

  @Get(':id')
  async findById(@Param('id') id: string) {
    return this.playersService.findById(id);
  }
}
