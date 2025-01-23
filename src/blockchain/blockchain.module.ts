import { Module } from '@nestjs/common';
import { BlockchainFactoriesService } from './blockchain-strategies.service';
import { AccountAbstractionStrategyService } from './different-networks/account-abstraction-strategy.service';
import { BitcoinStrategyService } from './different-networks/bitcoin-strategy.service';
import { TronStrategyService } from './different-networks/tron-strategy.service';
import { NonceManagerModule } from 'src/nonce-manager/nonce-manager.module';

@Module({
  imports: [NonceManagerModule],
  providers: [
    BlockchainFactoriesService,
    AccountAbstractionStrategyService,
    BitcoinStrategyService,
    TronStrategyService,
  ],
  exports: [
    BlockchainFactoriesService,
    AccountAbstractionStrategyService,
    BitcoinStrategyService,
    TronStrategyService,
  ],
})
export class BlockchainModule {}
