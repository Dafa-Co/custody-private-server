import { InternalServerErrorException } from '@nestjs/common';
import { AssetEntity, AssetType } from '../../common/entities/asset.entity';
import { NetworkEntity } from '../../common/entities/network.entity';
import { getChainFromNetwork } from '../../utils/enums/supported-networks.enum';
import { Chain, createPublicClient, createWalletClient, encodeFunctionData, http, isAddress } from 'viem';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import { IBlockChainPrivateServer, ITransferTransactionEnum, IWalletKeys, ValidateTransactionEnum, validateTransactionResponse } from '../interfaces/blockchain.interface';
import { createSmartAccountClient, PaymasterMode, Transaction } from '@biconomy/account';
import { CustodySignedTransaction, SignedTransaction } from '../../utils/types/custom-signed-transaction.type';
import { secretsTypes, throwOrReturn } from 'account-abstraction.secret';
const abi = require('erc-20-abi');

export class AccountAbstraction implements IBlockChainPrivateServer {
  private asset: AssetEntity;
  private network: NetworkEntity;
  private chain: Chain;
  private bundlerUrl: string;
  private paymasterUrl: string;

  constructor(asset: AssetEntity, network: NetworkEntity) {
    this.network = network;
    this.asset = asset;
    const networkObject = getChainFromNetwork(network.networkId);


    this.chain = networkObject.chain;

    const bundlerSecret = networkObject.isTest ? throwOrReturn(secretsTypes.bundler, 'testnet') : throwOrReturn(secretsTypes.bundler, 'mainnet') ;
    const paymasterApiKey = throwOrReturn(secretsTypes.paymaster, network.networkId.toString());

    if (!bundlerSecret || !paymasterApiKey) {
      throw new InternalServerErrorException(
        'Bundler secret or paymaster api key not found',
      );
    }

    this.bundlerUrl = `https://bundler.biconomy.io/api/v2/${this.chain.id}/${bundlerSecret}`;
    this.paymasterUrl = `https://paymaster.biconomy.io/api/v1/${this.chain.id}/${paymasterApiKey}`;
  }

  init(): Promise<void> {
    return;
  }

  private convertPrivateKeyToSmartAccount(privateKey: string) {
    const account = privateKeyToAccount(privateKey as any);

    const client = createWalletClient({
      account,
      chain: this.chain,
      transport: http(),
      pollingInterval: 2000,
    });

    const smartAccount = createSmartAccountClient({
      signer: client,
      bundlerUrl: this.bundlerUrl,
      paymasterUrl: this.paymasterUrl,
    });

    return smartAccount;
  }

  async createWallet(): Promise<IWalletKeys> {
    const privateKey = generatePrivateKey();

    const smartAccount = await this.convertPrivateKeyToSmartAccount(privateKey);

    const address = await smartAccount.getAccountAddress();

    return {
      privateKey,
      address,
    };
  }

  async getSignedTransactionCoin(
    privateKey: string,
    to: string,
    amount: number,
  ): Promise<SignedTransaction> {
    const smartAccount = await this.convertPrivateKeyToSmartAccount(privateKey);

    const valueSmallUnit = BigInt(amount * 10 ** this.chain.nativeCurrency.decimals);

    // Create a transaction object
    const transaction = await smartAccount.buildUserOp(
      [
        {
          to: to,
          value: valueSmallUnit,
        },
      ],
      {
        paymasterServiceData: { mode: PaymasterMode.SPONSORED },
      },
    );

    // Sign the transaction
    return await smartAccount.signUserOp(transaction);
  }

  async getSignedTransactionToken(
    privateKey: string,
    to: string,
    amount: number,
  ): Promise<SignedTransaction> {
    const smartAccount = await this.convertPrivateKeyToSmartAccount(privateKey);

    // Create a contract instance
    const valueSmallUnit = BigInt(amount * 10 ** this.chain.nativeCurrency.decimals);

    const encodedCall = encodeFunctionData({
      abi: abi,
      functionName: 'transfer',
      args: [to, valueSmallUnit],
    });

    // Create a transaction object
    const transaction = await smartAccount.buildUserOp(
      [
        {
          to: this.asset.contract_address,
          data: encodedCall,
        },
      ],
      {
        paymasterServiceData: { mode: PaymasterMode.SPONSORED },
      },
    );

    return await smartAccount.signUserOp(transaction);
  }

  async getSignedTransaction(
    privateKey: string,
    to: string,
    amount: number,
  ): Promise<CustodySignedTransaction> {
    const signedTransaction = this.asset.type === AssetType.COIN ? await this.getSignedTransactionCoin(privateKey, to, amount) : await this.getSignedTransactionToken(privateKey, to, amount);

    return {
      bundlerUrl: this.bundlerUrl,
      signedTransaction
    }
  }
}
