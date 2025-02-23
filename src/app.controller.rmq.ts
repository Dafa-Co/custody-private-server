import { EventPattern, MessagePattern } from '@nestjs/microservices';
import { RmqController } from 'rox-custody_common-modules/libs/decorators/rmq-controller.decorator';
import { _EventPatterns, _MessagePatterns } from 'rox-custody_common-modules/libs/utils/microservice-constants';


@RmqController()
export class AppControllerRmq {
  constructor(
  ) {
  }

  @MessagePattern({ cmd: _MessagePatterns.privateServer.healthCheck })
  healthCheck() {
    return {
      message: 'Health Check Is Succeed',
    };
  }

  @EventPattern({ cmd: _EventPatterns.privateServer.healthCheck })
  async healthCheckEvent() {
    return {
      message: 'Health Check Is Succeed',
    };
  }
}
