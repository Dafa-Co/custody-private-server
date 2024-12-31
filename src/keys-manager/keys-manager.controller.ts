import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { KeysManagerService } from './keys-manager.service';
import { GenerateKeyPairBridge } from 'rox-custody_common-modules/libs/interfaces/generate-key.interface';
import { _MessagePatterns } from 'rox-custody_common-modules/libs/utils/microservice-constants';

@Controller('keys-manager')
export class KeysManagerController {
  constructor(private readonly keysManagerService: KeysManagerService) {}

  @MessagePattern({ cmd: _MessagePatterns.generateKey })
  async generateKey(@Payload() dto: GenerateKeyPairBridge) {
    return this.keysManagerService.generateKeyPair(dto);
  }
}
