import { Chain, createWalletClient, encodeFunctionData, http } from 'viem';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import {
  BiconomySmartAccountV2,
  createSmartAccountClient,
  PaymasterMode,
  Transaction,
  UserOperationStruct,
} from '@biconomy/account';
import {
  CommonAsset,
  AssetType,
} from 'rox-custody_common-modules/libs/entities/asset.entity';
import {
  IBlockChainPrivateServer,
  InitBlockChainPrivateServerStrategies,
  IWalletKeys,
} from 'src/blockchain/interfaces/blockchain.interface';
import {
  CustodySignedTransaction,
  SignedTransaction,
} from 'rox-custody_common-modules/libs/interfaces/custom-signed-transaction.type';
import { secretsTypes, throwOrReturn } from 'account-abstraction.secret';
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { PrivateServerSignTransactionDto } from 'rox-custody_common-modules/libs/interfaces/sign-transaction.interface';
import { getChainFromNetwork } from 'rox-custody_common-modules/blockchain/global-commons/get-network-chain';
import { NonceManagerService } from 'src/nonce-manager/nonce-manager.service';
const abi = require('erc-20-abi');
import { Web3 }  from 'web3';

@Injectable()
export class AccountAbstractionStrategyService
  implements IBlockChainPrivateServer
{
  private asset: CommonAsset;
  private chain: Chain;
  private bundlerUrl: string;
  private paymasterUrl: string;
  private web3: Web3;

  constructor(private readonly nonceManager: NonceManagerService) {}

  async init(initData: InitBlockChainPrivateServerStrategies): Promise<void> {
    const { asset } = initData;

    this.asset = asset;
    const networkObject = getChainFromNetwork(asset.networkId);

    this.chain = networkObject.chain;

    const bundlerSecret = networkObject.isTest
      ? throwOrReturn(secretsTypes.bundler, 'testnet')
      : throwOrReturn(secretsTypes.bundler, 'mainnet');
    const paymasterApiKey = throwOrReturn(
      secretsTypes.paymaster,
      asset.networkId.toString(),
    );

    if (!bundlerSecret || !paymasterApiKey) {
      throw new InternalServerErrorException(
        'Bundler secret or paymaster api key not found',
      );
    }

    this.bundlerUrl = `https://bundler.biconomy.io/api/v2/${this.chain.id}/${bundlerSecret}`;
    this.paymasterUrl = `https://paymaster.biconomy.io/api/v1/${this.chain.id}/${paymasterApiKey}`;

    // Initialize Web3 with your RPC provider
    this.web3 = new Web3(new Web3.providers.HttpProvider(this.chain.rpcUrls.default.http[0]));
  }

  async isContractDeployed(address: string): Promise<boolean> {
    try {
      // Check if the address contains contract bytecode
      const code = await this.web3.eth.getCode(address);
      return code !== '0x'; // If bytecode is not '0x', contract is deployed
    } catch (error) {
      console.error('Error checking contract deployment status:', error);
      return true; // Or handle the failure as appropriate
    }
  }

  private convertPrivateKeyToSmartAccount(privateKey: string) {
    const account = privateKeyToAccount(privateKey as any);


    const client = createWalletClient({
      account,
      chain: this.chain,
      transport: http(this.chain.rpcUrls.default.http[0], {
        retryCount: 5,
        retryDelay: 2000,
      }),
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

  private async buildSignedTransaction(
    smartAccount: BiconomySmartAccountV2,
    to: `0x${string}`,
    valueSmallUnit: bigint,
    data: string | null,
    nonce: number,
  ): Promise<SignedTransaction | null> {
    try {
      const tokenTransaction: Transaction = {
        to,
        data,
      };
      const CoinTransaction: Transaction = {
        to,
        value: valueSmallUnit,
      };

      const transactionBody = data ? tokenTransaction : CoinTransaction;

      // Directly build the user operation without retrying here
      const transaction = await this.retryBuildUserOp(
        smartAccount,
        [transactionBody],
        nonce,
      );

      if (!transaction) {
        return null;
      }

      const signedTransaction = await smartAccount.signUserOp(transaction);

      return signedTransaction;
    } catch (error) {
      console.log('Error while building or signing user operations:', error);
      return null; // Or handle the failure as appropriate
    }
  }

  private async retryBuildUserOp(
    smartAccount: BiconomySmartAccountV2,
    transactionBody: Transaction[],
    nonce: number,
    maxRetries: number = 5,
    attempt: number = 0,
  ): Promise<Partial<UserOperationStruct> | null> {
    try {
      const transaction = await smartAccount.buildUserOp(transactionBody, {
        paymasterServiceData: { mode: PaymasterMode.SPONSORED },
        nonceOptions: { nonceKey: nonce },
      });

      return transaction;
    } catch (error) {
      if (attempt < maxRetries) {
        console.log(
          `Retrying buildUserOp... Attempt ${attempt + 1} of ${maxRetries}`,
        );
        return this.retryBuildUserOp(
          smartAccount,
          transactionBody,
          nonce,
          maxRetries,
          attempt + 1,
        );
      } else {
        console.log('Error in buildUserOp after retries:', error);
        return null; // Return null or throw depending on your error handling strategy
      }
    }
  }

  async getSignedTransaction(
    dto: PrivateServerSignTransactionDto,
    privateKey: string,
  ): Promise<CustodySignedTransaction> {
    const { amount, asset, keyId, secondHalf, to, corporateId, transactionId } =
      dto;

      const [nonce] = await Promise.all([
        this.nonceManager.getNonce(keyId, asset.networkId),
      ]);

    const smartAccount = await this.convertPrivateKeyToSmartAccount(privateKey);

    const valueSmallUnit = BigInt(
      Math.floor(amount * 10 ** this.asset.decimals),
    );

    let data: string | null = null;
    if (this.asset.type === AssetType.TOKEN) {
      data = encodeFunctionData({
        abi: abi,
        functionName: 'transfer',
        args: [to, valueSmallUnit],
      });
    }

    const signedTransaction = await this.buildSignedTransaction(
      smartAccount,
      this.asset.type === AssetType.COIN
        ? (to as `0x${string}`)
        : (this.asset.contract_address as `0x${string}`),
      valueSmallUnit,
      data,
      nonce,
    );

    return {
      bundlerUrl: this.bundlerUrl,
      signedTransaction: signedTransaction,
      transactionId: transactionId,
      error: null,
    };
  }
}
