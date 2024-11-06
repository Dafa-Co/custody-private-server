import { forwardRef, Module } from '@nestjs/common';
import { BlockchainFactoriesService } from './blockchain-strategies.service';
import { AccountAbstractionStrategyService } from './different-networks/account-abstraction-strategy.service';
import { BitcoinStrategyService } from './different-networks/bitcoin-strategy.service';
import { KeysManagerModule } from 'src/keys-manager/keys-manager.module';

@Module({
    imports: [
        forwardRef(() => KeysManagerModule),
    ],
    providers: [BlockchainFactoriesService, AccountAbstractionStrategyService, BitcoinStrategyService],
    exports: [BlockchainFactoriesService, AccountAbstractionStrategyService, BitcoinStrategyService],
})
export class BlockchainModule {}
