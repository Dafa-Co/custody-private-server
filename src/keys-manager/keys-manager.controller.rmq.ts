import { Controller } from '@nestjs/common';
import { EventPattern, MessagePattern, Payload } from '@nestjs/microservices';
import { KeysManagerService } from './keys-manager.service';
import { GenerateKeyPairBridge } from 'rox-custody_common-modules/libs/interfaces/generate-key.interface';
import { _EventPatterns, _MessagePatterns } from 'rox-custody_common-modules/libs/utils/microservice-constants';
import { RmqController } from 'rox-custody_common-modules/libs/decorators/rmq-controller.decorator';
import { cleanUpPrivateKeyDto } from 'rox-custody_common-modules/libs/dtos/clean-up-private-key.dto';

@RmqController()
export class KeysManagerRmqController {
  constructor(private readonly keysManagerService: KeysManagerService) { }

  @MessagePattern({ cmd: _MessagePatterns.generateKey })
  async generateKey(@Payload() dto: GenerateKeyPairBridge) {
    return await this.keysManagerService.generateKeyPair(dto);
  }

  @EventPattern({ cmd: _EventPatterns.rollbackKeyGeneration })
  async cleanKey(@Payload() dto: cleanUpPrivateKeyDto) {
    return this.keysManagerService.cleanUpPrivateKey(dto.keyId);
  }
}
