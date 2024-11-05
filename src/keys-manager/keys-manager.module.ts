import { forwardRef, Module } from '@nestjs/common';
import { KeysManagerController } from './keys-manager.controller';
import { KeysManagerService } from './keys-manager.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PrivateKeys } from './entities/private-key.entity';
import { NonceManagerService } from './nonce-manager.service';
import { PrivateKeyNonce } from './entities/nonce.entity';
import { BlockchainModule } from 'src/blockchain/blockchain.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([PrivateKeys, PrivateKeyNonce]),
    forwardRef(() => BlockchainModule),
  ],
  controllers: [KeysManagerController],
  providers: [KeysManagerService, NonceManagerService],
  exports: [KeysManagerService, NonceManagerService],
})
export class KeysManagerModule {}
