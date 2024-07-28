import { Module } from '@nestjs/common';
import { SigningTransactionController } from './signing-transaction.controller';
import { SigningTransactionService } from './signing-transaction.service';
import { KeysManagerModule } from 'src/keys-manager/keys-manager.module';

@Module({
  imports: [
    KeysManagerModule
  ],
  controllers: [SigningTransactionController],
  providers: [SigningTransactionService]
})
export class SigningTransactionModule {}
