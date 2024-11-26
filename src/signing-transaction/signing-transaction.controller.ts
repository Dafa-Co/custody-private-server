import { Controller, UseFilters } from '@nestjs/common';
import { SigningTransactionService } from './signing-transaction.service';
import { _MessagePatterns } from 'src/utils/microservice-constants';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { PrivateServerSignTransactionDto } from '../../rox-custody_common-modules/libs/interfaces/sign-transaction.interface';
import { RpcExceptionsFilter } from 'rox-custody_common-modules/libs/filters/RPCFilter.filter';

@Controller('signing-transaction')
export class SigningTransactionController {
  constructor(private readonly signingService: SigningTransactionService) {}
    @MessagePattern({ cmd: _MessagePatterns.signTransaction })
    @UseFilters(RpcExceptionsFilter)
    async generateKey(@Payload() dto: PrivateServerSignTransactionDto) {
      return this.signingService.signTransaction(dto);
    }
}
