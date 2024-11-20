import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { _MessagePatterns } from 'src/utils/microservice-constants';
import { KeysManagerService } from './keys-manager.service';
import { GenerateKeyPairBridge } from 'rox-custody_common-modules/libs/interfaces/generate-key.interface';

@Controller('keys-manager')
export class KeysManagerController {
  constructor(private readonly keysManagerService: KeysManagerService) {}

  @MessagePattern({ cmd: _MessagePatterns.generateKey })
  async generateKey(@Payload() dto: GenerateKeyPairBridge) {
    return this.keysManagerService.generateKeyPair(dto);
  }
}
