import { Module } from '@nestjs/common';
import { SigningTransactionService } from './signing-transaction.service';
import { KeysManagerModule } from 'src/keys-manager/keys-manager.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PrivateKeyNonce } from '../nonce-manager/entities/nonce.entity';
import { BlockchainModule } from 'src/blockchain/blockchain.module';
import { SigningTransactionRmqController } from './signing-transaction.controller.rmq';
import { ContractSignerModule } from 'src/contract-signer/contract-signer.module';

@Module({
  imports: [
    KeysManagerModule,
    TypeOrmModule.forFeature([PrivateKeyNonce]),
    BlockchainModule,
    ContractSignerModule,
  ],
  controllers: [SigningTransactionRmqController],
  providers: [SigningTransactionService],
})
export class SigningTransactionModule {}
