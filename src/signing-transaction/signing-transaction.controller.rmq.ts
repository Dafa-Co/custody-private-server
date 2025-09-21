import { SigningTransactionService } from './signing-transaction.service';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { PrivateServerSignSwapTransactionDto, PrivateServerSignTransactionDto } from '../../rox-custody_common-modules/libs/interfaces/sign-transaction.interface';
import { _MessagePatterns } from 'rox-custody_common-modules/libs/utils/microservice-constants';
import { RmqController } from 'rox-custody_common-modules/libs/decorators/rmq-controller.decorator';
import { IPrivateServerSignContractTransaction } from 'rox-custody_common-modules/libs/interfaces/sign-contract-transaction.interface';
import { IPrivateServerMintTokenTransaction } from 'rox-custody_common-modules/libs/interfaces/sign-mint-token-transaction.interface';
import { IPrivateServerBurnTokenTransaction } from 'rox-custody_common-modules/libs/interfaces/sign-burn-token-transaction.interface';

@RmqController()
export class SigningTransactionRmqController {
  constructor(private readonly signingService: SigningTransactionService) { }

  @MessagePattern({ cmd: _MessagePatterns.signTransaction })
  async signTransaction(@Payload() dto: PrivateServerSignTransactionDto) {
    return this.signingService.signTransaction(dto);
  }

  @MessagePattern({ cmd: _MessagePatterns.signContractTransaction })
  async signContractTransaction(@Payload() dto: IPrivateServerSignContractTransaction) {
    return this.signingService.signContractTransaction(dto);
  }

  @MessagePattern({ cmd: _MessagePatterns.signMintTokenTransaction })
  async signMintTokenTransaction(@Payload() dto: IPrivateServerMintTokenTransaction) {
    return this.signingService.signMintTokenTransaction(dto);
  }

  @MessagePattern({ cmd: _MessagePatterns.signBurnTokenTransaction })
  async signBurnTokenTransaction(@Payload() dto: IPrivateServerBurnTokenTransaction) {
    return this.signingService.signBurnTokenTransaction(dto);
  }

  @MessagePattern({ cmd: _MessagePatterns.signSwapTransaction })
  async signSwapTransaction(@Payload() dto: PrivateServerSignSwapTransactionDto) {
    return this.signingService.signSwapTransaction(dto);
  }
}
