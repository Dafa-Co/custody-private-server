import { Module } from '@nestjs/common';
import { KeysManagerService } from './keys-manager.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PrivateKeys } from './entities/private-key.entity';
import { PrivateKeyNonce } from '../nonce-manager/entities/nonce.entity';
import { BlockchainModule } from 'src/blockchain/blockchain.module';
import { CorporatePrivateKeysService } from './corporate-private-keys.service';
import { CorporateKeyEntity } from './entities/corporate-key.entity';
import { KeysManagerRmqController } from './keys-manager.controller.rmq';
import { IdempotentKeyEntity } from './entities/idempotent-key.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([PrivateKeys, PrivateKeyNonce, CorporateKeyEntity, IdempotentKeyEntity]),
    BlockchainModule
  ],
  controllers: [KeysManagerRmqController],
  providers: [KeysManagerService, CorporatePrivateKeysService],
  exports: [KeysManagerService],
})
export class KeysManagerModule { }
