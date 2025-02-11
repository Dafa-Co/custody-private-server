import { Controller, UseFilters } from '@nestjs/common';
import { SigningTransactionService } from './signing-transaction.service';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { PrivateServerSignTransactionDto } from '../../rox-custody_common-modules/libs/interfaces/sign-transaction.interface';
import { _MessagePatterns } from 'rox-custody_common-modules/libs/utils/microservice-constants';
import { RmqController } from 'rox-custody_common-modules/libs/decorators/rmq-controller.decorator';

@RmqController()
export class SigningTransactionRmqController {
  constructor(private readonly signingService: SigningTransactionService) { }

  @MessagePattern({ cmd: _MessagePatterns.signTransaction })
  async generateKey(@Payload() dto: PrivateServerSignTransactionDto) {
    return this.signingService.signTransaction(dto);
  }
}
