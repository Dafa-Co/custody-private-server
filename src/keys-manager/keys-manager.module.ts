import { forwardRef, Module } from '@nestjs/common';
import { KeysManagerController } from './keys-manager.controller';
import { KeysManagerService } from './keys-manager.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PrivateKeys } from './entities/private-key.entity';
import { NonceManagerService } from './nonce-manager.service';
import { PrivateKeyNonce } from './entities/nonce.entity';
import { BlockchainModule } from 'src/blockchain/blockchain.module';
import { CorporatePrivateKeysService } from './corporate-private-keys.service';
import { CorporateKeyEntity } from './entities/corporate-key.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([PrivateKeys, PrivateKeyNonce, CorporateKeyEntity]),
    forwardRef(() => BlockchainModule),
  ],
  controllers: [KeysManagerController],
  providers: [KeysManagerService, NonceManagerService, CorporatePrivateKeysService],
  exports: [KeysManagerService, NonceManagerService],
})
export class KeysManagerModule {}
