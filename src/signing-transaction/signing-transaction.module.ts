import { Module } from '@nestjs/common';
import { SigningTransactionController } from './signing-transaction.controller';
import { SigningTransactionService } from './signing-transaction.service';
import { KeysManagerModule } from 'src/keys-manager/keys-manager.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PrivateKeyNonce } from '../keys-manager/entities/nonce.entity';
import { BlockchainModule } from 'src/blockchain/blockchain.module';

@Module({
  imports: [
    KeysManagerModule,
    TypeOrmModule.forFeature([PrivateKeyNonce]),
    BlockchainModule
  ],
  controllers: [SigningTransactionController],
  providers: [SigningTransactionService]
})
export class SigningTransactionModule {}
