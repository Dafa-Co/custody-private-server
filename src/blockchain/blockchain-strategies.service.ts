import { ModuleRef } from '@nestjs/core';
import { IBlockChainPrivateServer } from 'src/blockchain/interfaces/blockchain.interface';
import { AssetEntity } from 'src/common/entities/asset.entity';
import {
  NetworkCategory,
  NetworkEntity,
} from 'src/common/entities/network.entity';
import { TransientService } from 'utils/decorators/transient.decorator';
import { BitcoinStrategyService } from './different-networks/bitcoin-strategy.service';
import { AccountAbstractionStrategyService } from './different-networks/account-abstraction-strategy.service';
import {
  getChainFromNetwork,
  netowkrsTypes,
} from 'rox-custody_common-modules/blockchain/global-commons/get-network-chain';
import { TronStrategyService } from './different-networks/tron-strategy.service';

@TransientService()
export class BlockchainFactoriesService {
  private asset: AssetEntity;
  private network: NetworkEntity;
  private strategy: IBlockChainPrivateServer;

  constructor(
    private readonly moduleRef: ModuleRef,
    private readonly bitcoinStrategyService: BitcoinStrategyService,
    private readonly accountAbstractionStrategyService: AccountAbstractionStrategyService,
    private readonly tronStrategyService: TronStrategyService,
  ) {}

  async getStrategy(
    asset: AssetEntity,
    network: NetworkEntity,
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

      case NetworkCategory.Tron:
        this.strategy = this.tronStrategyService;
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
