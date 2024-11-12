import { forwardRef, Module } from '@nestjs/common';
import { BlockchainFactoriesService } from './blockchain-strategies.service';
import { AccountAbstractionStrategyService } from './different-networks/account-abstraction-strategy.service';
import { BitcoinStrategyService } from './different-networks/bitcoin-strategy.service';
import { KeysManagerModule } from 'src/keys-manager/keys-manager.module';
import { TronStrategyService } from './different-networks/tron-strategy.service';

@Module({
    imports: [
        forwardRef(() => KeysManagerModule),
    ],
    providers: [BlockchainFactoriesService, AccountAbstractionStrategyService, BitcoinStrategyService, TronStrategyService],
    exports: [BlockchainFactoriesService, AccountAbstractionStrategyService, BitcoinStrategyService, TronStrategyService],
})
export class BlockchainModule {}
