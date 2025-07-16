import { IBlockChainPrivateServer } from 'src/blockchain/interfaces/blockchain.interface';
import { CommonAsset } from 'rox-custody_common-modules/libs/entities/asset.entity';
import { BitcoinStrategyService } from './different-networks/bitcoin-strategy.service';
import { AccountAbstractionStrategyService } from './different-networks/account-abstraction-strategy.service';
import {
  getChainFromNetwork,
} from 'rox-custody_common-modules/blockchain/global-commons/get-network-chain';
import { TronStrategyService } from './different-networks/tron-strategy.service';
import { NetworkCategory } from 'rox-custody_common-modules/blockchain/global-commons/networks-gategory';
import { NonceManagerService } from 'src/nonce-manager/nonce-manager.service';
import { Injectable } from '@nestjs/common';
import { SolanaStrategyService } from './different-networks/solana-strategy.service';
import { XrpStrategyService } from './different-networks/xrp-strategy.service';
import { TonStrategyService } from './different-networks/ton-strategy.service';
import { CustodyLogger } from 'rox-custody_common-modules/libs/services/logger/custody-logger.service';

@Injectable()
export class BlockchainFactoriesService {
  private asset: CommonAsset;

  constructor(
    private readonly nonceManager: NonceManagerService,
    private readonly logger: CustodyLogger
  ) { }

  async getStrategy(asset: CommonAsset): Promise<IBlockChainPrivateServer> {
    this.asset = asset;
    let strategy: IBlockChainPrivateServer;

    const { networkId } = asset;

    const chain = getChainFromNetwork(networkId);

    const { category } = chain;

    switch (category) {
      case NetworkCategory.EVM:
        strategy = new AccountAbstractionStrategyService(this.nonceManager, this.logger);
        break;

      case NetworkCategory.BitCoin:
      case NetworkCategory.BitcoinTest:
        strategy = new BitcoinStrategyService();
        break;

      case NetworkCategory.Tron:
        strategy = new TronStrategyService();
        break;

      case NetworkCategory.Solana:
        strategy = new SolanaStrategyService();
        break;

      case NetworkCategory.Xrp:
        strategy = new XrpStrategyService();
        break;

      case NetworkCategory.Ton:
        strategy = new TonStrategyService();
        break;
    }

    if (!strategy) {
      throw new Error('wallet library not exist');
    }

    await strategy.init({
      asset,
    });

    return strategy;
  }
}
