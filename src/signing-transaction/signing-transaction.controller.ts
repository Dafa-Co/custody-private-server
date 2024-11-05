import { Controller } from '@nestjs/common';
import { SigningTransactionService } from './signing-transaction.service';
import { _MessagePatterns } from 'src/utils/microservice-constants';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { SignTransactionDto } from './dtos/sign-transaction.dto';

@Controller('signing-transaction')
export class SigningTransactionController {
  constructor(private readonly signingService: SigningTransactionService) {}

  @MessagePattern({ cmd: _MessagePatterns.signTransaction })
  async generateKey(@Payload() dto: SignTransactionDto) {
    return this.signingService.signTransaction(dto);
  }
}
