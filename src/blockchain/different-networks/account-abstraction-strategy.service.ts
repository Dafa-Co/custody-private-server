import { Chain, createWalletClient, encodeFunctionData, http } from 'viem';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import { createSmartAccountClient, PaymasterMode } from '@biconomy/account';
import { TransientService } from 'utils/decorators/transient.decorator';
import { AssetEntity, AssetType } from 'src/common/entities/asset.entity';
import { NetworkEntity } from 'src/common/entities/network.entity';
import { IBlockChainPrivateServer, InitBlockChainPrivateServerStrategies, IWalletKeys } from 'src/blockchain/interfaces/blockchain.interface';
import { CustodySignedTransaction, SignedTransaction } from 'src/utils/types/custom-signed-transaction.type';
import { secretsTypes, throwOrReturn } from 'account-abstraction.secret';
import { forwardRef, Inject, InternalServerErrorException } from '@nestjs/common';
import { KeysManagerService } from 'src/keys-manager/keys-manager.service';
import { SignTransactionDto } from 'src/signing-transaction/dtos/sign-transaction.dto';
import { NonceManagerService } from 'src/keys-manager/nonce-manager.service';
import { getChainFromNetwork } from 'rox-custody_common-modules/blockchain/global-commons/get-network-chain';
const abi = require('erc-20-abi');

@TransientService()
export class AccountAbstractionStrategyService implements IBlockChainPrivateServer {
    private asset: AssetEntity;
    private network: NetworkEntity;
    private chain: Chain;
    private bundlerUrl: string;
    private paymasterUrl: string;


    constructor(
      @Inject(forwardRef(() => KeysManagerService))
      private readonly keyManagerService: KeysManagerService,
      private readonly nonceManager: NonceManagerService
    ) {
    }

    async init(initData: InitBlockChainPrivateServerStrategies): Promise<void> {
        const { asset, network } = initData;

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
        nonce: number
      ): Promise<SignedTransaction> {
        const smartAccount = await this.convertPrivateKeyToSmartAccount(privateKey);

        const valueSmallUnit = BigInt(amount * 10 ** this.asset.decimals);

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
            nonceOptions: {
              nonceKey: nonce
            }
          },
        );

        // Sign the transaction
        return await smartAccount.signUserOp(transaction);
      }

      async getSignedTransactionToken(
        privateKey: string,
        to: string,
        amount: number,
        nonce: number
      ): Promise<SignedTransaction> {
        const smartAccount = await this.convertPrivateKeyToSmartAccount(privateKey);

        // Create a contract instance
        const valueSmallUnit = BigInt(amount * 10 ** this.asset.decimals);

        const encodedCall = encodeFunctionData({
          abi: abi,
          functionName: 'transfer',
          args: [to, valueSmallUnit],
        });



        // get account nonce
        const pknonce = await smartAccount.getNonce();


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
            nonceOptions: {
              nonceKey: nonce
            }
          },
        );

        return await smartAccount.signUserOp(transaction);
      }

      async getSignedTransaction(
        dto: SignTransactionDto,
    ): Promise<CustodySignedTransaction> {
        const { amount, asset, keyId, network, secondHalf, to } = dto;

        const [privateKey, nonce] = await Promise.all([
          this.keyManagerService.getFullPrivateKey(keyId, secondHalf),
          this.nonceManager.getNonce(keyId, network.networkId)
        ])


        const signedTransaction = this.asset.type === AssetType.COIN ? await this.getSignedTransactionCoin(privateKey, to, amount, nonce) : await this.getSignedTransactionToken(privateKey, to, amount, nonce);

        return {
          bundlerUrl: this.bundlerUrl,
          signedTransaction
        }
      }
}
