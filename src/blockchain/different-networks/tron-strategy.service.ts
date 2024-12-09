import { PrivateServerSignTransactionDto } from 'rox-custody_common-modules/libs/interfaces/sign-transaction.interface';
import {
  IBlockChainPrivateServer,
  InitBlockChainPrivateServerStrategies,
  IWalletKeys,
} from '../interfaces/blockchain.interface';

import { TronWeb } from 'tronweb';
import { Chain } from 'viem';
import { getChainFromNetwork } from 'rox-custody_common-modules/blockchain/global-commons/get-network-chain';
import {
  CustodySignedTransaction, TronSmartContractMethodParams, TronTriggerSmartContractOptions,
} from 'rox-custody_common-modules/libs/interfaces/custom-signed-transaction.type';
import { AssetType, CommonAsset } from 'rox-custody_common-modules/libs/entities/asset.entity';
import { CommonNetwork } from 'rox-custody_common-modules/libs/entities/network.entity';
import configs from 'src/configs/configs';
import { SignedTransaction as SignedTronTransaction } from 'tronweb/src/types/Transaction';
import { Injectable } from '@nestjs/common';

const tronHeaders = { 'TRON-PRO-API-KEY': configs.TRON_API_KEY };

@Injectable()
export class TronStrategyService implements IBlockChainPrivateServer {
  private tronWeb: TronWeb;
  private host: string;
  private asset: CommonAsset;
  private network: CommonNetwork;
  private chain: Chain;

  constructor(
  ) {}

  async init(initData: InitBlockChainPrivateServerStrategies): Promise<void> {
    const { asset, network } = initData;
    this.network = network;
    this.asset = asset;
    const networkObject = getChainFromNetwork(network.networkId);

    this.chain = networkObject.chain;
    this.host = this.chain.blockExplorers.default.apiUrl;
    this.tronWeb = new TronWeb({
      fullHost: this.host,
      headers: tronHeaders,
    });
    return;
  }

  async createWallet(): Promise<IWalletKeys> {
    const smartAccount = await this.tronWeb.createAccount();
    const privateKey = smartAccount.privateKey;
    const address = smartAccount.address.base58;
    return { privateKey, address };
  }

  async getSignedTransaction(
    dto: PrivateServerSignTransactionDto,
    privateKey: string,
  ): Promise<CustodySignedTransaction> {
    const {
      amount,
      to,
      transactionId,
    } = dto;
    try {
      this.tronWeb.setPrivateKey(privateKey);
      const signedTransaction =
        this.asset.type === AssetType.COIN
          ? await this.getSignedTransactionCoin(privateKey, to, amount)
          : await this.getSignedTransactionToken(privateKey, to, amount);

      return {
        bundlerUrl: this.host,
        signedTransaction: signedTransaction,
        error: null,
        transactionId: transactionId,
      };

    } catch (error) {

      return {
        bundlerUrl: this.host,
        signedTransaction: null,
        error: error.message,
        transactionId: transactionId,
      };
    }
  }

  async getSignedTransactionCoin(
    privateKey: string,
    to: string,
    amount: number,
  ): Promise<SignedTronTransaction> {
    const transaction = await this.tronWeb.transactionBuilder.sendTrx(
      to,
      amount * 10 ** this.asset.decimals,
    );
    return await this.tronWeb.trx.sign(transaction, privateKey);
  }

  async getSignedTransactionToken(
    privateKey: string,
    to: string,
    amount: number,
  ): Promise<SignedTronTransaction> {
    const contractMethod: string = 'transfer(address,uint256)';

    const transferOptions: TronTriggerSmartContractOptions = {
      feeLimit: 30_000_000,
    };

    const contractMethodParams: TronSmartContractMethodParams = [
      { type: 'address', value: to },
      { type: 'uint256', value: amount * 10 ** this.asset.decimals },
    ];

    const transaction =
      await this.tronWeb.transactionBuilder.triggerSmartContract(
        this.asset.contract_address,
        contractMethod,
        transferOptions,
        contractMethodParams,
      );
    return await this.tronWeb.trx.sign(transaction.transaction, privateKey);
  }
}
