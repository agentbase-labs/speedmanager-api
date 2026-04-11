import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get('health')
  health() {
    return { 
      status: 'ok', 
      service: 'Speed Manager API',
      timestamp: new Date().toISOString() 
    };
  }
}
