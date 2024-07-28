import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { _MessagePatterns } from 'src/utils/microservice-constants';
import { generateKeyPair } from './interfaces/generate-key.interface';
import { KeysManagerService } from './keys-manager.service';

@Controller('keys-manager')
export class KeysManagerController {
  constructor(private readonly keysManagerService: KeysManagerService) {}

  @MessagePattern({ cmd: _MessagePatterns.generateKey })
  async generateKey(@Payload() dto: generateKeyPair) {

    return this.keysManagerService.generateKeyPair(dto);
  }
}
