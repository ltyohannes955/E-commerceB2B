import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  ServiceUnavailableException,
} from '@nestjs/common';
import { AppService } from './app.service';
import { HealthService } from './common/health.service';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly health: HealthService,
  ) {}
  @Get() getHello(): string {
    return this.appService.getHello();
  }
  @Get('health') @HttpCode(HttpStatus.OK) async getHealth() {
    const result = await this.health.check();
    if (result.status === 'error')
      throw new ServiceUnavailableException(result);
    return result;
  }
}
