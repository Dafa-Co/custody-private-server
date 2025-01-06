import { Chain, createWalletClient, encodeFunctionData, http } from 'viem';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import {
  BiconomySmartAccountV2,
  createSmartAccountClient,
  PaymasterMode,
  Transaction,
} from '@biconomy/account';
import { CommonAsset, AssetType } from 'rox-custody_common-modules/libs/entities/asset.entity';
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
import {
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrivateServerSignTransactionDto } from 'rox-custody_common-modules/libs/interfaces/sign-transaction.interface';
import { getChainFromNetwork } from 'rox-custody_common-modules/blockchain/global-commons/get-network-chain';
import { NonceManagerService } from 'src/nonce-manager/nonce-manager.service';
const abi = require('erc-20-abi');

@Injectable()
export class AccountAbstractionStrategyService
  implements IBlockChainPrivateServer
{
  private asset: CommonAsset;
  private chain: Chain;
  private bundlerUrl: string;
  private paymasterUrl: string;

  constructor(
    private readonly nonceManager: NonceManagerService,
  ) {}

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

  private async buildSignedTransaction(
    smartAccount: BiconomySmartAccountV2,
    to: `0x${string}`,
    valueSmallUnit: bigint,
    data: string | null,
    nonce: number,
  ): Promise<SignedTransaction> {
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

      const transaction = await smartAccount.buildUserOp([transactionBody], {
        paymasterServiceData: { mode: PaymasterMode.SPONSORED },
        nonceOptions: { nonceKey: nonce },
      });

      // if this is not the first nonce make the initCode With 0x
      if (nonce > 1) {
        transaction.initCode = '0x';
      }

      return smartAccount.signUserOp(transaction);
    } catch (error) {
      console.log("error", error);
    }
  }

  async getSignedTransaction(
    dto: PrivateServerSignTransactionDto,
    privateKey: string,
  ): Promise<CustodySignedTransaction> {
    const { amount, asset, keyId, secondHalf, to, corporateId, transactionId } = dto;

    const [nonce] = await Promise.all([
      this.nonceManager.getNonce(keyId, asset.networkId),
    ]);

    const smartAccount = await this.convertPrivateKeyToSmartAccount(privateKey);

    const valueSmallUnit = BigInt(Math.floor(amount * 10 ** this.asset.decimals));

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

    return { bundlerUrl: this.bundlerUrl, signedTransaction, transactionId: transactionId, error: null };
  }
}
