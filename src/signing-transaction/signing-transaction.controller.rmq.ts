import { SigningTransactionService } from './signing-transaction.service';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { PrivateServerSignTransactionDto } from '../../rox-custody_common-modules/libs/interfaces/sign-transaction.interface';
import { _MessagePatterns } from 'rox-custody_common-modules/libs/utils/microservice-constants';
import { RmqController } from 'rox-custody_common-modules/libs/decorators/rmq-controller.decorator';
import { SignContractTransactionDto } from 'rox-custody_common-modules/libs/interfaces/sign-contract-transaction.interface';

@RmqController()
export class SigningTransactionRmqController {
  constructor(private readonly signingService: SigningTransactionService) { }

  @MessagePattern({ cmd: _MessagePatterns.signTransaction })
  async signTransaction(@Payload() dto: PrivateServerSignTransactionDto) {
    return this.signingService.signTransaction(dto);
  }

  @MessagePattern({ cmd: _MessagePatterns.signContractTransaction })
  async signContractTransaction(@Payload() dto: SignContractTransactionDto) {
    return this.signingService.signContractTransaction(dto);
  }

  @MessagePattern({ cmd: _MessagePatterns.signSwapTransaction })
  async signSwapTransaction(@Payload() dto: PrivateServerSignTransactionDto) {
    return this.signingService.signSwapTransaction(dto);
  }
}
