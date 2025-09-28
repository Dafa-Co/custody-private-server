import { Module } from '@nestjs/common';
import { BlockchainFactoriesService } from './blockchain-strategies.service';
import { BitcoinStrategyService } from './different-networks/bitcoin-strategy.service';
import { TronStrategyService } from './different-networks/tron-strategy.service';
import { NonceManagerModule } from 'src/nonce-manager/nonce-manager.module';
import { AccountAbstractionStrategyService } from './different-networks/account-abstraction/account-abstraction-strategy.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PrivateKeyVersion } from 'src/keys-manager/entities/private-key-version.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([PrivateKeyVersion]),
    NonceManagerModule
  ],
  providers: [
    BlockchainFactoriesService,
  ],
  exports: [
    BlockchainFactoriesService,
  ],
})
export class BlockchainModule {}
