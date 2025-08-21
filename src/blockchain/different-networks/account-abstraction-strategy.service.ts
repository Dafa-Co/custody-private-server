import { Chain, createWalletClient, encodeFunctionData, hashTypedData, http } from 'viem';
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
import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { PrivateKeyFilledSignSwapTransactionDto, PrivateKeyFilledSignTransactionDto } from 'rox-custody_common-modules/libs/interfaces/sign-transaction.interface';
import { getChainFromNetwork } from 'rox-custody_common-modules/blockchain/global-commons/get-network-chain';
import { NonceManagerService } from 'src/nonce-manager/nonce-manager.service';
const abi = require('erc-20-abi');
import { Web3 } from 'web3';
import { EvmHelper } from 'src/utils/helpers/evm.helper';
import { CustodyLogger } from 'rox-custody_common-modules/libs/services/logger/custody-logger.service';
import { HexString } from 'rox-custody_common-modules/libs/types/hex-string.type';
import { SignerTypeEnum } from 'rox-custody_common-modules/libs/enums/signer-type.enum';
import { getSignerFromSigners } from 'src/utils/helpers/get-signer-from-signers.helper';

@Injectable()
export class AccountAbstractionStrategyService
  implements IBlockChainPrivateServer {
  private asset: CommonAsset;
  private chain: Chain;
  private bundlerUrl: string;
  private paymasterUrl: string;
  private web3: Web3;

  constructor(
    private readonly nonceManager: NonceManagerService,
    private readonly logger: CustodyLogger
  ) { }

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
      this.logger.error('Error checking contract deployment status:', error);
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

    const { address: eoaAddress } = this.web3.eth.accounts.privateKeyToAccount(privateKey);

    return {
      privateKey,
      address,
      eoaAddress,
    };
  }

  private async buildSignedTransaction(
    smartAccount: BiconomySmartAccountV2,
    to: HexString,
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
      this.logger.notification('Error while building or signing user operations:', error);
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
        return this.retryBuildUserOp(
          smartAccount,
          transactionBody,
          nonce,
          maxRetries,
          attempt + 1,
        );
      } else {
        this.logger.error(`Error in buildUserOp after retries: ${error.stack ?? error.message}`);
        return null; // Return null or throw depending on your error handling strategy
      }
    }
  }

  async getSignedTransaction(
    dto: PrivateKeyFilledSignTransactionDto,
  ): Promise<CustodySignedTransaction> {
    const { amount, asset, to, transactionId, signers } =
      dto;

    const sender = getSignerFromSigners(signers, SignerTypeEnum.SENDER, true);

    const keyId = sender.keyId;
    const privateKey = sender.privateKey;

    const [nonce] = await Promise.all([
      this.nonceManager.getNonce(keyId, asset.networkId),
    ]);

    const smartAccount = await this.convertPrivateKeyToSmartAccount(privateKey);

    const valueSmallUnit = BigInt(amount.toString());

    let data: string | null = null;
    if (this.asset.type === AssetType.TOKEN || this.asset.type === AssetType.CUSTOM_TOKEN) {
      data = encodeFunctionData({
        abi: abi,
        functionName: 'transfer',
        args: [to, valueSmallUnit],
      });
    }

    const signedTransaction = await this.buildSignedTransaction(
      smartAccount,
      this.asset.type === AssetType.COIN
        ? (to as HexString)
        : (this.asset.contract_address as HexString),
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


  async getSignedSwapTransaction(
    dto: PrivateKeyFilledSignSwapTransactionDto,
  ): Promise<CustodySignedTransaction> {
    try {
      const { transactionId, swapTransaction, signers } = dto;
      const { permit2 } = swapTransaction;

      const sender = getSignerFromSigners(signers, SignerTypeEnum.SENDER, true);

      const keyId = sender.keyId;
      const privateKey = sender.privateKey;

      // Extract transaction parameters
      const txParams = this.extractTransactionParams(swapTransaction);

      // Get nonce and smart account
      const { nonce, smartAccount } = await this.prepareSwapAccountData(keyId, privateKey);

      // Handle permit2 signature and prepare final transaction data
      const finalTxData = await this.prepareTransactionData(txParams.data, permit2, privateKey);

      // Build and sign the swap transaction
      const signedTransaction = await this.buildAndSignSwapTransaction(
        smartAccount,
        txParams,
        finalTxData,
        nonce
      );

      // Return success response
      return this.createSwapTransactionResponse(signedTransaction, transactionId, null);

    } catch (error) {
      this.logger.notification('Error in getSignedSwapTransaction:', error);
      return this.createSwapTransactionResponse(null, dto.transactionId, error.message || 'Unknown error occurred');
    }
  }

  // Extract transaction parameters from txToSign
  private extractTransactionParams(txToSign: any) {
    const { to, data, gas, gasPrice, value } = txToSign;
    return {
      to: to as HexString,
      data,
      gas: BigInt(gas),
      gasPrice: BigInt(gasPrice),
      value: BigInt(value)
    };
  }

  // Prepare nonce and smart account
  private async prepareSwapAccountData(keyId: number, privateKey: string): Promise<{ nonce: number, smartAccount: BiconomySmartAccountV2 }> {
    const [nonce] = await Promise.all([
      this.nonceManager.getNonce(keyId, this.asset.networkId),
    ]);

    const smartAccount = await this.convertPrivateKeyToSmartAccount(privateKey);

    return {
      nonce,
      smartAccount
    };
  }

  // Handle permit2 signature and prepare final transaction data
  private async prepareTransactionData(
    data: string,
    permit2: any,
    privateKey: string
  ): Promise<string> {
    if (permit2?.eip712) {
      const permit2Signature = await this.signPermit2MessageWithSmartAccount(permit2.eip712, privateKey);

      return this.appendSignatureToTxData(
        data as HexString,
        permit2Signature
      );
    }

    return data;
  }

  // Build and sign the swap transaction
  private async buildAndSignSwapTransaction(
    smartAccount: BiconomySmartAccountV2,
    txParams: any,
    finalTxData: string,
    nonce: number
  ): Promise<SignedTransaction | null> {
    // Create transaction object
    const transaction = this.createSwapTransactionObject(txParams, finalTxData);

    // Build user operation without paymaster
    const userOp = await this.buildUserOpForSwap(smartAccount, transaction, nonce);

    if (!userOp) {
      return null;
    }

    // Sign the user operation
    return await smartAccount.signUserOp(userOp);
  }

  // Create the transaction object
  private createSwapTransactionObject(txParams: any, finalTxData: string): Transaction {
    return {
      to: txParams.to,
      data: finalTxData,
      value: txParams.value,
    };
  }

  // Build user operation for swap
  private async buildUserOpForSwap(
    smartAccount: BiconomySmartAccountV2,
    transaction: Transaction,
    nonce: number,
  ): Promise<Partial<UserOperationStruct> | null> {
    return await this.retryBuildUserOpWithoutPaymaster(
      smartAccount,
      [transaction],
      nonce,
    );
  }

  // Create response object
  private createSwapTransactionResponse(signedTransaction: SignedTransaction | null, transactionId: number, error: string | null) {
    return {
      bundlerUrl: this.bundlerUrl,
      signedTransaction: signedTransaction,
      transactionId: transactionId,
      error: error,
    };
  }

  // Refactored retryBuildUserOpWithoutPaymaster with smaller functions
  private async retryBuildUserOpWithoutPaymaster(
    smartAccount: BiconomySmartAccountV2,
    transactionBody: Transaction[],
    nonce: number,
    maxRetries: number = 5,
    attempt: number = 0,
  ): Promise<Partial<UserOperationStruct> | null> {
    try {
      return await this.buildUserOpWithoutPaymaster(smartAccount, transactionBody, nonce);
    } catch (error) {
      return await this.handleBuildUserOpRetry(
        smartAccount,
        transactionBody,
        nonce,
        maxRetries,
        attempt,
        error
      );
    }
  }

  // Build user operation without paymaster
  private async buildUserOpWithoutPaymaster(
    smartAccount: BiconomySmartAccountV2,
    transactionBody: Transaction[],
    nonce: number
  ): Promise<Partial<UserOperationStruct>> {
    return await smartAccount.buildUserOp(transactionBody, {
      nonceOptions: { nonceKey: nonce },
    });
  }

  // Handle retry logic for building user operation
  private async handleBuildUserOpRetry(
    smartAccount: BiconomySmartAccountV2,
    transactionBody: Transaction[],
    nonce: number,
    maxRetries: number,
    attempt: number,
    error: any
  ): Promise<Partial<UserOperationStruct> | null> {
    if (attempt < maxRetries) {
      this.logger.error(
        `Retrying buildUserOpWithoutPaymaster... Attempt ${attempt + 1} of ${maxRetries}`,
      );
      return this.retryBuildUserOpWithoutPaymaster(
        smartAccount,
        transactionBody,
        nonce,
        maxRetries,
        attempt + 1,
      );
    } else {
      this.logger.error('Error in buildUserOpWithoutPaymaster after retries:', error);
      return null;
    }
  }

  // Refactored signature appending functions
  private appendSignatureToTxData(
    transactionData: HexString,
    signature: HexString
  ): HexString {
    const signatureLengthInHex = this.convertSignatureLengthToHex(signature);
    return this.concatenateTransactionDataWithSignature(transactionData, signatureLengthInHex, signature);
  }


  private async signPermit2MessageWithSmartAccount(eip712Data: any, privateKey: string): Promise<HexString> {
    const smartAccount = await this.convertPrivateKeyToSmartAccount(privateKey);

    try {
      // Hash the EIP-712 data first
      const messageHash = this.callHashTypedData(eip712Data);
      return await smartAccount.signMessage(messageHash);
    } catch (error) {
      this.logger.notification('Error signing with smart account:', error);
    }
  }

  private callHashTypedData(eip712Data: any): HexString {
    const { domain, types, message, primaryType } = eip712Data;

    return hashTypedData({
      domain,
      types,
      primaryType,
      message,
    });
  }

  // Convert signature length to hex
  private convertSignatureLengthToHex(signature: HexString): HexString {
    return EvmHelper.numberToHex(signature.length / 2 - 1, {
      size: 32,
      signed: false
    });
  }

  // Concatenate transaction data with signature
  private concatenateTransactionDataWithSignature(
    transactionData: HexString,
    signatureLengthInHex: HexString,
    signature: HexString
  ): HexString {
    return EvmHelper.concatHex([transactionData, signatureLengthInHex, signature]);
  }
}