import { InternalServerErrorException } from '@nestjs/common';
import { AssetEntity, AssetType } from '../../common/entities/asset.entity';
import { NetworkEntity } from '../../common/entities/network.entity';
import { getChainFromNetwork } from '../../utils/enums/supported-networks.enum';
import { Chain, createPublicClient, createWalletClient, encodeFunctionData, http, isAddress } from 'viem';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import { IBlockChain, ITransferTransactionEnum, IWalletKeys, ValidateTransactionEnum, validateTransactionResponse } from '../interfaces/blockchain.interface';
import { createSmartAccountClient, PaymasterMode, Transaction } from '@biconomy/account';
import { SignedTransaction } from '../../utils/types/custom-signed-transaction.type';
import { TransactionStatus } from '../../utils/enums/transaction.enum';
const abi = require('erc-20-abi');


export class AccountAbstraction implements IBlockChain {
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
      const bundlerSecret = networkObject.isTest
        ? 'nJPK7B3ru.dd7f7861-190d-41bd-af80-6877f74b8f44'
        : 'dewj2189.wh1289hU-7E49-78td-af80-f9RbQ2mJs';
      const paymasterApiKey = 'cUsHXoBCk.245e4e2c-91a3-4518-ad78-e83c5fbdb829'; //secrets.paymaster[network.networkId];

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

    async checkBalance(publicAddress: string): Promise<number> {
      const publicClient = createPublicClient({
        chain: this.chain,
        transport: http(),
      });

      const balance = await publicClient.getBalance({
        address: publicAddress as any,
      });

      return Number(balance);
    }

    async transferTokens(
      privateKey: string,
      to: string,
      amount: number,
    ): Promise<ITransferTransactionEnum> {
      const smartAccount = await this.convertPrivateKeyToSmartAccount(privateKey);

      // Create a contract instance
      const encodedCall = encodeFunctionData({
        abi: abi,
        functionName: 'transfer',
        args: [to, amount],
      });

      const transaction: Transaction = {
        to: this.asset.contract_address,
        data: encodedCall,
      };

      const userOpResponse = await smartAccount.sendTransaction(transaction, {
        paymasterServiceData: { mode: PaymasterMode.SPONSORED },
        simulationType: 'validation_and_execution',
      });
      const { transactionHash } = await userOpResponse.waitForTxHash();
      console.log('Transaction Hash', transactionHash);
      const userOpReceipt = await userOpResponse.wait();

      const feesInNumber = parseInt(userOpReceipt.actualGasUsed, 16);
      return {
        status:
          userOpReceipt.success == 'true'
            ? TransactionStatus.COMPLETED
            : TransactionStatus.ERROR,
        data: {
          fees: feesInNumber,
          blockchain_transaction_id: transactionHash,
          encoded_payload: '',
          error: userOpReceipt.reason,
        },
      };
    }

    async transferCoins(
      privateKey: string,
      to: string,
      amount: number,
    ): Promise<ITransferTransactionEnum> {
      const smartAccount = await this.convertPrivateKeyToSmartAccount(privateKey);

      const transaction: Transaction = await this.getSignedTransactionCoin(
        privateKey,
        to,
        amount,
      );

      // Send the transaction and get the transaction hash
      const userOpResponse = await smartAccount.sendTransaction(transaction, {
        paymasterServiceData: { mode: PaymasterMode.SPONSORED },
      });

      const { transactionHash, state, userOperationReceipt } =
        await userOpResponse.waitForTxHash();
      console.log('Transaction Hash', transactionHash);
      console.log('State', state);
      console.log('User Operation Receipt', userOperationReceipt);
      const userOpReceipt = await userOpResponse.wait();
      console.log('UserOp receipt', userOpReceipt);
      console.log('Transaction receipt', userOpReceipt.receipt);

      const feesInNumber = parseInt(userOpReceipt.actualGasUsed, 16);
      return {
        status:
          userOpReceipt.success == 'true'
            ? TransactionStatus.COMPLETED
            : TransactionStatus.ERROR,
        data: {
          fees: feesInNumber,
          blockchain_transaction_id: transactionHash,
          encoded_payload: '',
          error: userOpReceipt.reason,
        },
      };
    }

    transfer(
      privateKey: string,
      to: string,
      amount: number,
    ): Promise<ITransferTransactionEnum> {
      if (this.asset.type === AssetType.COIN) {
        return this.transferCoins(privateKey, to, amount);
      } else {
        return this.transferTokens(privateKey, to, amount);
      }
    }

    async getSignedTransactionCoin(
      privateKey: string,
      to: string,
      amount: number,
    ): Promise<SignedTransaction> {
      const smartAccount = await this.convertPrivateKeyToSmartAccount(privateKey);

      const valueSmallUnit = amount * this.chain.nativeCurrency.decimals;

      const transaction: Transaction = {
        to: to,
        value: valueSmallUnit,
      };

      return transaction;
    }

    async getSignedTransactionToken(
      privateKey: string,
      to: string,
      amount: number,
    ): Promise<SignedTransaction> {
      const smartAccount = await this.convertPrivateKeyToSmartAccount(privateKey);

      // Create a contract instance
      const encodedCall = encodeFunctionData({
        abi: abi,
        functionName: 'transfer',
        args: [to, amount],
      });

      const transaction: Transaction = {
        to: this.asset.contract_address,
        data: encodedCall,
      };



      return transaction;
    }

    getSignedTransaction(
      privateKey: string,
      to: string,
      amount: number,
    ): Promise<SignedTransaction> {
      if (this.asset.type === AssetType.COIN) {
        return this.getSignedTransactionCoin(privateKey, to, amount);
      } else {
        return this.getSignedTransactionToken(privateKey, to, amount);
      }
    }

    async sendSignedTransaction(signedTransaction: SignedTransaction): Promise<ITransferTransactionEnum> {
      return null;
    }

    async getGasPrice(): Promise<number> {
      const publicClient = createPublicClient({
        chain: this.chain,
        transport: http(),
      });

      let gasPrice =
        Number(await publicClient.getGasPrice()) /
        10 ** this.chain.nativeCurrency.decimals;

      return gasPrice;
    }

    getMinimumAmount(): Promise<number> {
      return this.getGasPrice();
    }

    async isValidTransaction(
      amount: number,
      balance: number,
    ): Promise<ValidateTransactionEnum> {
      return validateTransactionResponse(amount, balance);
    }

    isValidAddress(address: string): boolean {
      return isAddress(address);
    }

    async getDollarValue(amount: number): Promise<number> {
      return 0;
    }
  }
