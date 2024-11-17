import { ModuleRef } from '@nestjs/core';
import { IBlockChainPrivateServer } from 'src/blockchain/interfaces/blockchain.interface';
import { CommonAsset } from 'rox-custody_common-modules/libs/entities/asset.entity';
import {
  CommonNetwork,
} from 'rox-custody_common-modules/libs/entities/network.entity';
import { TransientService } from 'utils/decorators/transient.decorator';
import { BitcoinStrategyService } from './different-networks/bitcoin-strategy.service';
import { AccountAbstractionStrategyService } from './different-networks/account-abstraction-strategy.service';
import {
  getChainFromNetwork,
  netowkrsTypes,
} from 'rox-custody_common-modules/blockchain/global-commons/get-network-chain';
import { NetworkCategory } from 'rox-custody_common-modules/blockchain/global-commons/networks-gategory';

@TransientService()
export class BlockchainFactoriesService {
  private asset: CommonAsset;
  private network: CommonNetwork;
  private strategy: IBlockChainPrivateServer;

  constructor(
    private readonly moduleRef: ModuleRef,
    private readonly bitcoinStrategyService: BitcoinStrategyService,
    private readonly accountAbstractionStrategyService: AccountAbstractionStrategyService,
  ) {}

  async getStrategy(
    asset: CommonAsset,
    network: CommonNetwork,
  ): Promise<IBlockChainPrivateServer> {
    this.asset = asset;
    this.network = network;

    const { networkId } = network;

    const chain = getChainFromNetwork(networkId);

    const { category } = chain;

    switch (category) {
      case NetworkCategory.EVM:
        this.strategy = this.accountAbstractionStrategyService;
        break;

      case NetworkCategory.BitCoin:
      case NetworkCategory.BitcoinTest:
        this.strategy = this.bitcoinStrategyService;
        break;
    }

    if (!this.strategy) {
      throw new Error('wallet library not exist');
    }

    await this.strategy.init({
      asset,
      network,
    });

    return this.strategy;
  }
}
