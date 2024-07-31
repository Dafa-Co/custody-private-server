import { AssetEntity } from '../common/entities/asset.entity';
import {
  IBlockChainPrivateServer,
  ITransferTransactionEnum,
  IWalletKeys,
  ValidateTransactionEnum,
} from './interfaces/blockchain.interface';
import {
  InternalServerErrorException,
} from '@nestjs/common';
import { NetworkEntity } from '../common/entities/network.entity';
import { gaslessLibrary, getChainFromNetwork } from '..//utils/enums/supported-networks.enum';
import { ApiResponse } from '../utils/errors/api-response';
import { CustodySignedTransaction, SignedTransaction } from '../utils/types/custom-signed-transaction.type';
import { AccountAbstraction } from './diffrent-networks/account-abstraction';



export class BlockchainFactory {
  private asset: AssetEntity;
  private network: NetworkEntity;
  private factory: IBlockChainPrivateServer;

  constructor(asset: AssetEntity, network: NetworkEntity) {
    this.asset = asset;
    this.network = network;
    this.factory = this.getFactory();
  }

  private getFactory(): IBlockChainPrivateServer {
    const { networkId } = this.network;
    const chain = getChainFromNetwork(networkId);


    switch (chain.library) {

      case gaslessLibrary.AccountAbstraction:
        return new AccountAbstraction(this.asset, this.network);

      default:
        throw new InternalServerErrorException('Invalid wallet type');
    }
  }

  async init(): Promise<void> {
    await this.factory.init();
    return;
  }

  createWallet(): Promise<IWalletKeys> {
    return  this.factory.createWallet();
  }

  async getSignedTransaction(privateKey: string, to: string, amount: number): Promise<CustodySignedTransaction> {
    return this.factory.getSignedTransaction(privateKey, to, amount);
  }
}
