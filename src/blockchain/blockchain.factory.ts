import { AssetEntity } from '../common/entities/asset.entity';
import {
  factoryInitParameter,
  IBlockChainPrivateServer,
  ITransferTransactionEnum,
  IWalletKeys,
  ValidateTransactionEnum,
} from './interfaces/blockchain.interface';
import { InternalServerErrorException } from '@nestjs/common';
import { NetworkEntity } from '../common/entities/network.entity';
import {
  gaslessLibrary,
  GasNetworkType,
  getChainFromNetwork,
} from '..//utils/enums/supported-networks.enum';
import {
  CustodySignedTransaction,
} from '../utils/types/custom-signed-transaction.type';
import { AccountAbstraction } from './diffrent-networks/account-abstraction';
import { withGasLibrary } from 'utils/enums/supported-networks.enum';
import { BitCoinFactory } from './diffrent-networks/bitcoin';
import { TronBlockchain } from './diffrent-networks/tron-blockchain';

export class BlockchainFactory {
  private readonly asset: AssetEntity;
  private readonly network: NetworkEntity;
  private factory: IBlockChainPrivateServer;

  constructor(asset: AssetEntity, network: NetworkEntity) {
    this.asset = asset;
    this.network = network;
    this.factory = this.getFactory();
  }

  private getFactory(): IBlockChainPrivateServer {
    const { networkId } = this.network;

    const chain = getChainFromNetwork(networkId);

    const { library, type } = chain;

    switch (type) {
      case GasNetworkType.withGas:
        return this.getWithGasNetworkLibrary(
          library as unknown as withGasLibrary,
        );
      case GasNetworkType.gasless:
        return this.getGaslessNetworkLibrary(library as gaslessLibrary);
    }
  }

  private getWithGasNetworkLibrary(
    library: withGasLibrary,
  ): IBlockChainPrivateServer {
    switch (library) {
      case withGasLibrary.bitcoin:
        return new BitCoinFactory(this.asset, this.network);

      default:
        throw new InternalServerErrorException('Invalid wallet type');
    }
  }

  private getGaslessNetworkLibrary(
    library: gaslessLibrary,
  ): IBlockChainPrivateServer {
    switch (library) {
      case gaslessLibrary.AccountAbstraction:
        return new AccountAbstraction(this.asset, this.network);

      case gaslessLibrary.Tron:
        return new TronBlockchain(this.asset, this.network);

      default:
        throw new InternalServerErrorException('Invalid wallet type');
    }
  }

  async init(object: factoryInitParameter): Promise<void> {
    await this.factory.init(object);
    return;
  }

  createWallet(): Promise<IWalletKeys> {
    return this.factory.createWallet();
  }

  async getSignedTransaction(
    privateKey: string,
    to: string,
    amount: number,
  ): Promise<CustodySignedTransaction> {
    return this.factory.getSignedTransaction(privateKey, to, amount);
  }
}
