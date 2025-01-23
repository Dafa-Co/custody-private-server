import { Controller, Get, Query } from '@nestjs/common';


@Controller()
export class AppController {
  constructor(
  ) {
  }

  @Get()
  index() {
    return {
      message: 'Custody solution api is up and running',
    };
  }

  @Get('health-check')
  healthCheck() {
    return {
      message: 'Health Check Is Succeed',
    };
  }

}
