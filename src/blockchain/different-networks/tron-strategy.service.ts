import { PrivateKeyFilledSignTransactionDto, PrivateServerSignTransactionDto } from 'rox-custody_common-modules/libs/interfaces/sign-transaction.interface';
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
import configs from 'src/configs/configs';
import { SignedTransaction as SignedTronTransaction } from 'tronweb/src/types/Transaction';
import { BadRequestException, Injectable } from '@nestjs/common';
import Decimal from 'decimal.js';
import { SignerTypeEnum } from 'rox-custody_common-modules/libs/enums/signer-type.enum';
import { getSignerFromSigners } from 'src/utils/helpers/get-signer-from-signers.helper';
import { split, combine } from "shamirs-secret-sharing";
import { isDefined } from 'class-validator';

const tronHeaders = { 'TRON-PRO-API-KEY': configs.TRON_API_KEY };

@Injectable()
export class TronStrategyService implements IBlockChainPrivateServer {
  private tronWeb: TronWeb;
  private host: string;
  private asset: CommonAsset;
  private chain: Chain;

  constructor(
  ) { }

  async init(initData: InitBlockChainPrivateServerStrategies): Promise<void> {
    const { asset } = initData;
    this.asset = asset;
    const networkObject = getChainFromNetwork(asset.networkId);

    this.chain = networkObject.chain;
    this.host = this.chain.blockExplorers.default.apiUrl;
    this.tronWeb = new TronWeb({
      fullHost: this.host,
      headers: tronHeaders,
    });
  }

  async createWallet(): Promise<IWalletKeys> {
    const smartAccount = await this.tronWeb.createAccount();
    const privateKey = smartAccount.privateKey;
    const address = smartAccount.address.base58;
    return { privateKey, address };
  }

  async getSignedTransaction(
    dto: PrivateKeyFilledSignTransactionDto,
  ): Promise<CustodySignedTransaction> {
    const {
      amount,
      to,
      transactionId,
    } = dto;
    try {
      const sender = getSignerFromSigners(dto.signers, SignerTypeEnum.SENDER, true);

      const privateKey = sender.privateKey;

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
    amount: Decimal,
  ): Promise<SignedTronTransaction> {
    const transaction = await this.tronWeb.transactionBuilder.sendTrx(
      to,
      new Decimal(amount).toFixed(0) as unknown as number,
    );

    // extend expiration time one hour in SECONDS => 3600 seconds = 1 hour  
    const extendedTransaction = await this.tronWeb.transactionBuilder.extendExpiration(transaction, 3600);

    return await this.tronWeb.trx.sign(extendedTransaction, privateKey);
  }

  async getSignedTransactionToken(
    privateKey: string,
    to: string,
    amount: Decimal,
  ): Promise<SignedTronTransaction> {
    const contractMethod: string = 'transfer(address,uint256)';

    const transferOptions: TronTriggerSmartContractOptions = {
      feeLimit: 100_000_000,
    };

    const contractMethodParams: TronSmartContractMethodParams = [
      {
        type: 'address',
        value: to
      },
      {
        type: 'uint256',
        value: new Decimal(amount).toFixed(0)
      },
    ];

    const transaction =
      await this.tronWeb.transactionBuilder.triggerSmartContract(
        this.asset.contract_address,
        contractMethod,
        transferOptions,
        contractMethodParams,
      );

    // extend expiration time one hour in SECONDS => 3600 seconds = 1 hour  
    const extendedTransaction = await this.tronWeb.transactionBuilder.extendExpiration(transaction.transaction, 3600);
    return await this.tronWeb.trx.sign(extendedTransaction, privateKey);
  }

  async getSignedSwapTransaction(
    dto: any,
  ): Promise<any> {
    // Tron does not support swap transactions in the same way as other blockchains.
    throw new Error('Tron does not support swap transactions.');
  }
}
