import {
  Chain,
  createWalletClient,
  encodeAbiParameters,
  encodeFunctionData,
  hashTypedData,
  http,
  PrivateKeyAccount,
} from 'viem';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import {
  createSmartAccountClient as createV2Client,
  Transaction,
} from '@biconomy/account';
import {
  createBicoPaymasterClient,
  createSmartAccountClient as createNexusClient,
  toNexusAccount,
} from '@biconomy/abstractjs';
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
import {
  PrivateServerSignSwapTransactionDto,
  PrivateServerSignTransactionDto,
} from 'rox-custody_common-modules/libs/interfaces/sign-transaction.interface';
import { getChainFromNetwork } from 'rox-custody_common-modules/blockchain/global-commons/get-network-chain';
import { NonceManagerService } from 'src/nonce-manager/nonce-manager.service';
const abi = require('erc-20-abi');
import { Web3 } from 'web3';
import { EvmHelper } from 'src/utils/helpers/evm-helper';
import { CustodyLogger } from 'rox-custody_common-modules/libs/services/logger/custody-logger.service';
import { HexString } from 'rox-custody_common-modules/libs/types/hex-string.type';
import { BiconomyAccountTypeEnum } from 'src/utils/enums/biconomy-account-type.enum';
import { ISmartAccount } from './interfaces/smart-account.interface';
import { V2SmartAccount } from './implementations/v2-smart-account';
import { NexusSmartAccount } from './implementations/nexus-smart-account';
import { IConvertPrivateKeyToSmartAccountResult } from 'src/utils/interfaces/convert-private-key-to-smart-account-result.interface';
import {
  ENTRY_POINT_ADDRESS_V6,
  ENTRY_POINT_ADDRESS_V7,
  NEXUS_BOOTSTRAP_ADDRESS,
  NEXUS_IMPLEMENTATION_ADDRESS,
  NEXUS_SUPPORTED_NETWORK_IDS,
  V2_FACTORY_ADDRESS,
} from './constants/nexus.constants';
import { isDefined } from 'class-validator';
import { CustomUserOperation } from 'rox-custody_common-modules/libs/interfaces/custom-user-operation.interface';
import { convertBigIntsToStrings } from 'src/utils/helpers/convert-big-ints-to-strings';
import { Repository } from 'typeorm';
import { PrivateKeyVersion } from 'src/keys-manager/entities/private-key-version.entity';
import { InjectRepository } from '@nestjs/typeorm';

@Injectable()
export class AccountAbstractionStrategyService
  implements IBlockChainPrivateServer
{
  private asset: CommonAsset;
  private chain: Chain;
  private v2BundlerUrl: string;
  private v3BundlerUrl: string;
  private v1PaymasterUrl: string;
  private v2PaymasterUrl: string;
  private web3: Web3;

  constructor(
    private readonly nonceManager: NonceManagerService,
    private readonly logger: CustodyLogger,
    @InjectRepository(PrivateKeyVersion)
    private readonly privateKeyVersionRepository: Repository<PrivateKeyVersion>,
  ) {}

  async init(initData: InitBlockChainPrivateServerStrategies): Promise<void> {
    const { asset } = initData;

    this.asset = asset;
    const networkObject = getChainFromNetwork(asset.networkId);

    this.chain = networkObject.chain;

    const v2BundlerApiKey = networkObject.isTest
      ? throwOrReturn(secretsTypes.v2Bundler, 'testnet')
      : throwOrReturn(secretsTypes.v2Bundler, 'mainnet');
    const v3BundlerApiKey = throwOrReturn(
      secretsTypes.v3Bundler,
      asset.networkId.toString(),
    );
    const v1PaymasterApiKey = throwOrReturn(
      secretsTypes.v1Paymaster,
      asset.networkId.toString(),
    );
    const v2PaymasterApiKey = throwOrReturn(
      secretsTypes.v2Paymaster,
      asset.networkId.toString(),
    );

    this.v2BundlerUrl = `https://bundler.biconomy.io/api/v2/${this.chain.id}/${v2BundlerApiKey}`;
    this.v3BundlerUrl = `https://bundler.biconomy.io/api/v3/${this.chain.id}/${v3BundlerApiKey}`;
    this.v1PaymasterUrl = `https://paymaster.biconomy.io/api/v1/${this.chain.id}/${v1PaymasterApiKey}`;
    this.v2PaymasterUrl = `https://paymaster.biconomy.io/api/v2/${this.chain.id}/${v2PaymasterApiKey}`;

    // Initialize Web3 with your RPC provider
    this.web3 = new Web3(
      new Web3.providers.HttpProvider(this.chain.rpcUrls.default.http[0]),
    );
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

  private async createNexusClient(
    eoaAccount: PrivateKeyAccount,
    withPaymaster: boolean = true,
    v2Address?: HexString,
  ) {
    const nexusAccount = await toNexusAccount({
      signer: eoaAccount,
      chain: this.chain,
      transport: http(this.chain.rpcUrls.default.http[0], {
        retryCount: 5,
        retryDelay: 2000,
      }),
      accountAddress: v2Address, // will be undefined when not passed
      pollingInterval: 2000,
    });

    const nexusClient = createNexusClient({
      account: nexusAccount,
      transport: http(this.v3BundlerUrl),
      paymaster: withPaymaster
        ? createBicoPaymasterClient({
            transport: http(this.v2PaymasterUrl),
          })
        : undefined,
    });

    return nexusClient;
  }

  private async convertPrivateKeyToSmartAccount(
    privateKey: string,
    privateKeyId?: number,
    withPaymaster: boolean = true,
  ): Promise<IConvertPrivateKeyToSmartAccountResult> {
    const eoaAccount = privateKeyToAccount(privateKey as any);

    const client = createWalletClient({
      account: eoaAccount,
      chain: this.chain,
      transport: http(this.chain.rpcUrls.default.http[0], {
        retryCount: 5,
        retryDelay: 2000,
      }),
      pollingInterval: 2000,
    });

    const v2Account = await createV2Client({
      signer: client,
      bundlerUrl: this.v2BundlerUrl,
      paymasterUrl: withPaymaster ? this.v1PaymasterUrl : undefined,
    });

    const v2SmartAccount = new V2SmartAccount(v2Account, withPaymaster);

    const v2AccountAddress = await v2SmartAccount.getAddress();

    if (!NEXUS_SUPPORTED_NETWORK_IDS.includes(this.asset.networkId)) {
      return {
        account: v2SmartAccount,
        type: BiconomyAccountTypeEnum.smartAccountV2,
      };
    }

    const isV2Deployed = await v2SmartAccount.isAccountDeployed();

    if (!isV2Deployed && isDefined(privateKeyId)) {
      const privateKeyVersion =
        await this.privateKeyVersionRepository.findOneBy({
          privateKeyId,
        });

      if (!isDefined(privateKeyVersion) || privateKeyVersion.version === 0) {
        return {
          account: v2SmartAccount,
          type: BiconomyAccountTypeEnum.smartAccountV2,
        };
      }
    }

    const nexusClient = await this.createNexusClient(
      eoaAccount,
      withPaymaster,
      isV2Deployed ? v2AccountAddress : undefined,
    );

    const nexusSmartAccount = new NexusSmartAccount(nexusClient);

    if (!isV2Deployed) {
      return {
        account: nexusSmartAccount,
        type: BiconomyAccountTypeEnum.nexusAccount,
      };
    } else {
      const isNexusDeployed = await nexusSmartAccount.isAccountDeployed();

      if (isNexusDeployed) {
        return {
          account: nexusSmartAccount,
          type: BiconomyAccountTypeEnum.nexusAccount,
        };
      } else {
        return {
          account: v2SmartAccount,
          type: BiconomyAccountTypeEnum.smartAccountV2,
          shouldMigrate: true,
        };
      }
    }
  }

  private async getSmartAccount(privateKey: string) {
    // TODO: remove unused vars
    const { account, type, shouldMigrate } =
      await this.convertPrivateKeyToSmartAccount(privateKey);

    return {
      account,
      version: type === BiconomyAccountTypeEnum.smartAccountV2 ? 0 : 1,
    };
  }

  async createWallet(): Promise<IWalletKeys> {
    const privateKey = generatePrivateKey();

    const { account, version } = await this.getSmartAccount(privateKey);

    const address = await account.getAddress();

    const eoaAddress = await account.getEOAAddress();

    return {
      privateKey,
      address,
      eoaAddress,
      version,
    };
  }

  private async buildSignedUserOp(
    account: ISmartAccount,
    calls: Transaction[],
    nonce: number,
  ): Promise<SignedTransaction | null> {
    try {
      // Directly build the user operation without retrying here
      const userOp = await this.retryBuildUserOp(account, calls, nonce);

      if (!userOp) {
        return null;
      }

      const signedUserOp = await account.signUserOp(userOp);

      return signedUserOp;
    } catch (error) {
      this.logger.error(
        'Error while building or signing user operations:',
        error,
      );
      return null; // Or handle the failure as appropriate
    }
  }

  private async retryBuildUserOp(
    account: ISmartAccount,
    calls: Transaction[],
    nonce: number,
    maxRetries: number = 5,
    attempt: number = 0,
  ): Promise<Partial<CustomUserOperation> | null> {
    try {
      return await account.buildUserOp(calls, nonce);
    } catch (error) {
      console.error(error);
      if (attempt < maxRetries) {
        return this.retryBuildUserOp(
          account,
          calls,
          nonce,
          maxRetries,
          attempt + 1,
        );
      } else {
        this.logger.error('Error in buildUserOp after retries:', error);
        return null; // Return null or throw depending on your error handling strategy
      }
    }
  }

  private addNexusMigrationCalls(
    calls: Transaction[],
    v2AccountAddress: HexString,
    eoaAddress: HexString,
  ) {
    const updateImplementationCalldata = encodeFunctionData({
      abi: [
        {
          name: 'updateImplementation',
          type: 'function',
          stateMutability: 'nonpayable',
          inputs: [{ type: 'address', name: 'newImplementation' }],
          outputs: [],
        },
      ],
      functionName: 'updateImplementation',
      args: [NEXUS_IMPLEMENTATION_ADDRESS],
    });

    const updateImplementationTransaction = {
      to: v2AccountAddress,
      data: updateImplementationCalldata,
    };

    const initData = encodeFunctionData({
      abi: [
        {
          name: 'initNexusWithDefaultValidator',
          type: 'function',
          stateMutability: 'nonpayable',
          inputs: [{ type: 'bytes', name: 'data' }],
          outputs: [],
        },
      ],
      functionName: 'initNexusWithDefaultValidator',
      args: [eoaAddress as HexString],
    });

    const initDataWithBootstrap = encodeAbiParameters(
      [
        { name: 'bootstrap', type: 'address' },
        { name: 'initData', type: 'bytes' },
      ],
      [NEXUS_BOOTSTRAP_ADDRESS, initData],
    );

    // Create initializeAccount calldata
    const initializeNexusCalldata = encodeFunctionData({
      abi: [
        {
          name: 'initializeAccount',
          type: 'function',
          stateMutability: 'nonpayable',
          inputs: [{ type: 'bytes', name: 'data' }],
          outputs: [],
        },
      ],
      functionName: 'initializeAccount',
      args: [initDataWithBootstrap],
    });

    const initializeNexusTransaction = {
      to: v2AccountAddress,
      data: initializeNexusCalldata,
    };

    return [
      updateImplementationTransaction,
      initializeNexusTransaction,
      ...calls,
    ];
  }

  private async migrateToNexusAccountIfNeeded(
    account: ISmartAccount,
    calls: Transaction[],
    type: BiconomyAccountTypeEnum,
    shouldMigrate?: boolean,
  ) {
    if (shouldMigrate) {
      if (type === BiconomyAccountTypeEnum.nexusAccount) {
        throw new InternalServerErrorException(
          'Account is already migrated to Nexus',
        );
      }

      const v2AccountAddress = await account.getAddress();
      const eoaAddress = await account.getEOAAddress();

      this.logger.info(
        `Migrating account ${v2AccountAddress} to Nexus account`,
      );

      calls = this.addNexusMigrationCalls(calls, v2AccountAddress, eoaAddress);
    }

    return calls;
  }

  async getSignedTransaction(
    dto: PrivateServerSignTransactionDto,
    privateKey: string,
  ): Promise<CustodySignedTransaction> {
    const { amount, asset, keyId, to, transactionId } = dto;

    const [nonce] = await Promise.all([
      this.nonceManager.getNonce(keyId, asset.networkId),
    ]);

    const { account, type, shouldMigrate } =
      await this.convertPrivateKeyToSmartAccount(privateKey, keyId);

    const valueSmallUnit = BigInt(amount.toString());

    let actualTo = to as HexString;
    let actualValue = valueSmallUnit;
    let data: string = undefined;

    if (
      this.asset.type === AssetType.TOKEN ||
      this.asset.type === AssetType.CUSTOM_TOKEN
    ) {
      actualTo = this.asset.contract_address as HexString;
      actualValue = undefined;
      data = encodeFunctionData({
        abi: abi,
        functionName: 'transfer',
        args: [to, valueSmallUnit],
      });
    }

    let calls: Transaction[] = [
      {
        to: actualTo,
        value: actualValue,
        data,
      },
    ];

    calls = await this.migrateToNexusAccountIfNeeded(
      account,
      calls,
      type,
      shouldMigrate,
    );

    const signedUserOp = await this.buildSignedUserOp(account, calls, nonce);

    const parsedSignedUserOp = convertBigIntsToStrings(signedUserOp);

    return {
      bundlerUrl:
        type === BiconomyAccountTypeEnum.nexusAccount
          ? this.v3BundlerUrl
          : this.v2BundlerUrl,
      signedTransaction: parsedSignedUserOp,
      transactionId: transactionId,
      entryPointAddress:
        type === BiconomyAccountTypeEnum.nexusAccount
          ? ENTRY_POINT_ADDRESS_V7
          : ENTRY_POINT_ADDRESS_V6,
      error: null,
    };
  }

  async getSignedSwapTransaction(
    dto: PrivateServerSignSwapTransactionDto,
    privateKey: string,
  ): Promise<CustodySignedTransaction> {
    try {
      const { keyId, transactionId, swapTransaction } = dto;
      const { permit2 } = swapTransaction;
      // Extract transaction parameters
      const txParams = this.extractTransactionParams(swapTransaction);

      // Get nonce and smart account
      const { nonce, account, type, shouldMigrate } =
        await this.prepareSwapAccountData(keyId, privateKey);

      // Handle permit2 signature and prepare final transaction data
      const finalTxData = await this.prepareTransactionData(
        keyId,
        txParams.data,
        permit2,
        privateKey,
      );

      // Build and sign the swap transaction
      const signedUserOp = await this.buildAndSignSwapTransaction(
        account,
        txParams,
        finalTxData,
        nonce,
        type,
        shouldMigrate,
      );

      const parsedSignedUserOp = convertBigIntsToStrings(signedUserOp);

      // Return success response
      return this.createSwapTransactionResponse(
        parsedSignedUserOp,
        transactionId,
        null,
        type,
      );
    } catch (error) {
      this.logger.error('Error in getSignedSwapTransaction:', error);
      return this.createSwapTransactionResponse(
        null,
        dto.transactionId,
        error.message || 'Unknown error occurred',
      );
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
      value: BigInt(value),
    };
  }

  // Prepare nonce and smart account
  private async prepareSwapAccountData(keyId: number, privateKey: string) {
    const [nonce] = await Promise.all([
      this.nonceManager.getNonce(keyId, this.asset.networkId),
    ]);

    const { account, type, shouldMigrate } =
      await this.convertPrivateKeyToSmartAccount(privateKey, keyId, false); // without paymaster

    return {
      nonce,
      account,
      type,
      shouldMigrate,
    };
  }

  // Handle permit2 signature and prepare final transaction data
  private async prepareTransactionData(
    privateKeyId: number,
    data: string,
    permit2: any,
    privateKey: string,
  ): Promise<string> {
    if (permit2?.eip712) {
      const permit2Signature = await this.signPermit2MessageWithSmartAccount(
        privateKeyId,
        permit2.eip712,
        privateKey,
      );

      return this.appendSignatureToTxData(data as HexString, permit2Signature);
    }

    return data;
  }

  // Build and sign the swap transaction
  private async buildAndSignSwapTransaction(
    account: ISmartAccount,
    txParams: any,
    finalTxData: string,
    nonce: number,
    type: BiconomyAccountTypeEnum,
    shouldMigrate: boolean,
  ): Promise<SignedTransaction | null> {
    // Create call object
    const call = this.createSwapTransactionObject(txParams, finalTxData);

    let calls: Transaction[] = [call];

    calls = await this.migrateToNexusAccountIfNeeded(
      account,
      calls,
      type,
      shouldMigrate,
    );

    return this.buildSignedUserOp(account, calls, nonce);
  }

  // Create the transaction object
  private createSwapTransactionObject(
    txParams: any,
    finalTxData: string,
  ): Transaction {
    return {
      to: txParams.to,
      data: finalTxData,
      value: txParams.value,
    };
  }

  // Create response object
  private createSwapTransactionResponse(
    signedTransaction: SignedTransaction | null,
    transactionId: number,
    error: string | null,
    type?: BiconomyAccountTypeEnum,
  ) {
    return {
      bundlerUrl:
        isDefined(type) && type === BiconomyAccountTypeEnum.nexusAccount
          ? this.v3BundlerUrl
          : this.v2BundlerUrl,
      signedTransaction: signedTransaction,
      transactionId: transactionId,
      entryPointAddress:
        isDefined(type) && type === BiconomyAccountTypeEnum.nexusAccount
          ? ENTRY_POINT_ADDRESS_V7
          : ENTRY_POINT_ADDRESS_V6,
      error: error,
    };
  }

  // Refactored signature appending functions
  private appendSignatureToTxData(
    transactionData: HexString,
    signature: HexString,
  ): HexString {
    const signatureLengthInHex = this.convertSignatureLengthToHex(signature);
    return this.concatenateTransactionDataWithSignature(
      transactionData,
      signatureLengthInHex,
      signature,
    );
  }

  private async signPermit2MessageWithSmartAccount(
    privateKeyId: number,
    eip712Data: any,
    privateKey: string,
  ): Promise<HexString> {
    const { account } = await this.convertPrivateKeyToSmartAccount(
      privateKey,
      privateKeyId,
      false,
    );

    try {
      // Hash the EIP-712 data first
      const messageHash = this.callHashTypedData(eip712Data);
      return await account.signMessage(messageHash);
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
      signed: false,
    });
  }

  // Concatenate transaction data with signature
  private concatenateTransactionDataWithSignature(
    transactionData: HexString,
    signatureLengthInHex: HexString,
    signature: HexString,
  ): HexString {
    return EvmHelper.concatHex([
      transactionData,
      signatureLengthInHex,
      signature,
    ]);
  }
}
