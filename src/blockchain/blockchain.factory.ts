import { AssetEntity } from 'src/common/entities/asset.entity';
import {
  IBlockChain,
  ITransferTransactionEnum,
  IWalletKeys,
  ValidateTransactionEnum,
} from './interfaces/blockchain.interface';
import {
  InternalServerErrorException,
} from '@nestjs/common';
import { NetworkEntity } from 'src/common/entities/network.entity';
import { getChainFromNetwork } from 'src/utils/enums/supported-networks.enum';
import { ApiResponse } from 'src/utils/errors/api-response';
import { SignedTransaction } from 'src/utils/types/signed-transaction.type';


export class BlockchainFactory {
  private asset: AssetEntity;
  private network: NetworkEntity;
  private factory: IBlockChain;

  constructor(asset: AssetEntity, network: NetworkEntity) {
    this.asset = asset;
    this.network = network;
    this.factory = this.getFactory();
  }

  private getFactory(): IBlockChain {
    const { networkId } = this.network;
    const chain = getChainFromNetwork(networkId);


    switch (chain.library) {

      // case gaslessLibrary.AccountAbstraction:
      //   return new AccountAbstraction(this.asset, this.network);



      // case LibraryEnum.erc20:
      //   return new Erc20BlockChain(this.asset, this.network);

      // case LibraryEnum.bitcoin:
      //   return new BitcoinBlockChain(this.asset, this.network);

      // case LibraryEnum.stellar:
      //   return new StellarBlockChain(this.asset, this.network);

      // case LibraryEnum.terra:
      //   return new TerraBlockChain(this.asset, this.network);

      // case LibraryEnum.tron:
      //   return new TronBlockChain(this.asset, this.network);

      // case LibraryEnum.polkadot:
      //   return new PolkadotBlockChain(this.asset, this.network);

      // case LibraryEnum.ripple:
      //   return new RippleBlockChain(this.asset, this.network);

      // case LibraryEnum.solana:
      //   return new SolanaBlockChain(this.asset, this.network);

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

  checkBalance(publicAddress: string): Promise<number> {
    return this.factory.checkBalance(publicAddress);
  }

  transfer(privateKey: string, to: string, amount: number): Promise<ITransferTransactionEnum> {
    return this.factory.transfer(privateKey, to, amount);
  }

  async getGasPrice(): Promise<number> {
    return await this.factory.getGasPrice();
  }

  async getMinimumAmount(): Promise<number> {
    return await this.factory.getMinimumAmount();
  }

  async isValidTransaction(
    amount: number,
    balance: number,
  ): Promise<ValidateTransactionEnum> {
    return await this.factory.isValidTransaction(amount, balance);
  }

  async getDollarValue(amount: number): Promise<number> {
    return await this.factory.getDollarValue(amount);
  }

  async ValidateTransactionAmount(
    amount: number,
    balance: number,
  ): Promise<boolean> {
    const validationResult = await this.factory.isValidTransaction(
      amount,
      balance,
    );
    switch (validationResult) {
      case ValidateTransactionEnum.valid:
        return true;
      case ValidateTransactionEnum.dustAmount:
        ApiResponse.errorResponse(
          'Dust amount',
          {
            amount: 'Amount is too small',
          },
          422,
        );
      case ValidateTransactionEnum.insufficientBalance:
        ApiResponse.errorResponse(
          'Insufficient balance',
          {
            amount: 'Insufficient balance',
          },
          422,
        );
      case ValidateTransactionEnum.blockChainError:
        ApiResponse.errorResponse(
          'Insufficient balance',
          {
            amount: 'Insufficient balance',
          },
          422,
        );
    }
  }


  async getSignedTransaction(privateKey: string, to: string, amount: number): Promise<SignedTransaction> {
    return this.factory.getSignedTransaction(privateKey, to, amount);
  }


  async sendSignedTransaction(signedTransaction: SignedTransaction): Promise<ITransferTransactionEnum> {
    return this.factory.sendSignedTransaction(signedTransaction);
  }

}
