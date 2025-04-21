import { IBlockChainPrivateServer } from 'src/blockchain/interfaces/blockchain.interface';
import { CommonAsset } from 'rox-custody_common-modules/libs/entities/asset.entity';
import { BitcoinStrategyService } from './different-networks/bitcoin-strategy.service';
import { AccountAbstractionStrategyService } from './different-networks/account-abstraction-strategy.service';
import {
  getChainFromNetwork,
  netowkrsTypes,
} from 'rox-custody_common-modules/blockchain/global-commons/get-network-chain';
import { TronStrategyService } from './different-networks/tron-strategy.service';
import { NetworkCategory } from 'rox-custody_common-modules/blockchain/global-commons/networks-gategory';
import { NonceManagerService } from 'src/nonce-manager/nonce-manager.service';
import { Injectable } from '@nestjs/common';

@Injectable()
export class BlockchainFactoriesService {
  private asset: CommonAsset;

  constructor(private readonly nonceManager: NonceManagerService) {}

  async getStrategy(asset: CommonAsset): Promise<IBlockChainPrivateServer> {
    this.asset = asset;
    let strategy: IBlockChainPrivateServer;

    const { networkId } = asset;

    const chain = getChainFromNetwork(networkId);

    const { category } = chain;

    switch (category) {
      case NetworkCategory.EVM:
        strategy = new AccountAbstractionStrategyService(this.nonceManager);
        break;

      case NetworkCategory.BitCoin:
      case NetworkCategory.BitcoinTest:
        strategy = new BitcoinStrategyService();
        break;

      case NetworkCategory.Tron:
        strategy = new TronStrategyService();
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
