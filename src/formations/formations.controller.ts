import { Controller, Get } from '@nestjs/common';
import { FormationsService } from './formations.service';

@Controller('formations')
export class FormationsController {
  constructor(private formationsService: FormationsService) {}

  @Get()
  async getAllFormations() {
    return this.formationsService.findAll();
  }
}
