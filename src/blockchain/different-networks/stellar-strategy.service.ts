import { Injectable } from "@nestjs/common";
import { IBlockChainPrivateServer, InitBlockChainPrivateServerStrategies, IWalletKeys } from "../interfaces/blockchain.interface";
import { AssetType, CommonAsset } from "rox-custody_common-modules/libs/entities/asset.entity";
import { Chain } from "viem";
import { CustodySignedTransaction } from "rox-custody_common-modules/libs/interfaces/custom-signed-transaction.type";
import { SignTransactionDto } from "rox-custody_common-modules/libs/interfaces/sign-transaction.interface";
import * as StellarSdk from '@stellar/stellar-sdk';
import { HorizonServer } from "@stellar/stellar-sdk/lib/horizon/server";
import { getChainFromNetwork, networkData } from "rox-custody_common-modules/blockchain/global-commons/get-network-chain";
import { softJsonStringify } from "rox-custody_common-modules/libs/utils/soft-json-stringify.utils";
import { CustodyLogger } from "rox-custody_common-modules/libs/services/logger/custody-logger.service";
import { AccountResponse } from "@stellar/stellar-sdk/lib/horizon";
import { DecimalsHelper } from "rox-custody_common-modules/libs/utils/decimals-helper";


@Injectable()
export class StellarStrategyService implements IBlockChainPrivateServer {
    private host: string;
    private asset: CommonAsset;
    private networkObject: networkData;
    private chain: Chain;
    private horizonServer: HorizonServer

    constructor(
        private readonly logger: CustodyLogger
    ) { }
    async init(initData: InitBlockChainPrivateServerStrategies): Promise<void> {
        this.asset = initData.asset;
        this.networkObject = getChainFromNetwork(initData.asset.networkId);
        this.chain = this.networkObject.chain;
        this.host = this.chain.rpcUrls.default.http[0];
        this.horizonServer = new StellarSdk.Horizon.Server(this.host);
    }

    async createWallet(): Promise<IWalletKeys> {
        const pair = StellarSdk.Keypair.random();
        return {
            privateKey: pair.secret(),
            address: pair.publicKey(),
        };
    }

    async getSignedTransaction(
        dto: SignTransactionDto,
        privateKey: string,
        secondPrivateKey?: string
    ): Promise<CustodySignedTransaction> {
        const { transactionId } = dto;

        try {
            const signedTransaction: StellarSdk.FeeBumpTransaction | StellarSdk.Transaction =
                this.asset.type === AssetType.COIN
                    ? await this.getSignedTransactionCoin(dto, privateKey, secondPrivateKey)
                    : await this.getSignedTransactionToken(dto, privateKey, secondPrivateKey);

            // Convert the transaction to XDR string for safe JSON serialization
            const transactionXdr = signedTransaction.toXDR();

            return {
                bundlerUrl: this.host,
                signedTransaction: {
                    transactionXdr,
                    transactionHash: signedTransaction.hash().toString('hex'),
                },
                error: null,
                transactionId: transactionId,
            };

        } catch (error) {
            this.logger.error(`Stellar Transaction Signing error: ${error?.stack ?? error?.message}`)
            return {
                bundlerUrl: this.host,
                signedTransaction: null,
                error: error.message,
                transactionId: transactionId,
            };
        }
    }

    async getSignedTransactionCoin(
        dto: SignTransactionDto,
        privateKey: string,
        secondPrivateKey?: string
    ): Promise<StellarSdk.FeeBumpTransaction | StellarSdk.Transaction> {
        const { to } = dto;

        if (await this.isExistingAccount(to)) {
            return await this.getSignedPaymentTransaction(dto, privateKey, secondPrivateKey);
        } else {
            return await this.getSignedCreateAccountTransaction(dto, privateKey, secondPrivateKey);
        }
    }

    async getSignedCreateAccountTransaction(
        dto: SignTransactionDto,
        privateKey: string,
        secondPrivateKey?: string
    ): Promise<StellarSdk.FeeBumpTransaction | StellarSdk.Transaction> {
        const { amount, to } = dto;

        const operation = StellarSdk.Operation.createAccount({
            destination: to,
            startingBalance: DecimalsHelper.divide(
                amount,
                DecimalsHelper.pow(10, this.asset.decimals)
            ).toString(),
        });

        return await this.buildAndSignFeeBumpTransaction(dto, privateKey, secondPrivateKey, operation);
    }

    async getSignedPaymentTransaction(
        dto: SignTransactionDto,
        privateKey: string,
        secondPrivateKey?: string
    ): Promise<StellarSdk.FeeBumpTransaction | StellarSdk.Transaction> {
        const { amount, to } = dto;

        const operation = StellarSdk.Operation.payment({
            destination: to,
            asset: StellarSdk.Asset.native(),
            amount: DecimalsHelper.divide(
                amount,
                DecimalsHelper.pow(10, this.asset.decimals)
            ).toString(),
        });

        return await this.buildAndSignFeeBumpTransaction(dto, privateKey, secondPrivateKey, operation);
    }

    private async buildAndSignFeeBumpTransaction(
        dto: SignTransactionDto,
        privateKey: string,
        secondPrivateKey: string | null | undefined,
        operation: any
    ): Promise<StellarSdk.FeeBumpTransaction | StellarSdk.Transaction> {
        const senderKey = StellarSdk.Keypair.fromSecret(privateKey);

        // Load the source account
        const senderAccount: StellarSdk.Account = await this.horizonServer.loadAccount(senderKey.publicKey());

        // Build the transaction
        const transactionBuilder = new StellarSdk.TransactionBuilder(senderAccount, {
            fee: StellarSdk.BASE_FEE,
            networkPassphrase: this.networkObject.isTest ? StellarSdk.Networks.TESTNET : StellarSdk.Networks.PUBLIC,
        })
            .addOperation(operation)
            .setTimeout(60 * 5); // 5 minutes in seconds

        const transaction = transactionBuilder.build();

        // Sign the transaction with the source account's secret key
        transaction.sign(senderKey);

        // If secondPrivateKey is provided, create a fee-bump transaction
        if (secondPrivateKey) {
            const gasStationKey = StellarSdk.Keypair.fromSecret(secondPrivateKey);

            // Create fee-bump transaction
            const feeBumpTransaction = StellarSdk.TransactionBuilder.buildFeeBumpTransaction(
                gasStationKey.publicKey(),
                StellarSdk.BASE_FEE,
                transaction,
                this.networkObject.isTest ? StellarSdk.Networks.TESTNET : StellarSdk.Networks.PUBLIC
            );

            // Gas station signs the fee-bump transaction
            feeBumpTransaction.sign(gasStationKey);

            return feeBumpTransaction;
        }

        // Return the single-signed transaction if no secondPrivateKey
        return transaction;
    }

    //  if the account does not exist, it is a create account operation
    //  if the account exists, it is a payment operation
    async isExistingAccount(receiverAddress: string) {
        let response: AccountResponse = null;
        try {
            response = await this.horizonServer.loadAccount(receiverAddress);

            return response.id.toLowerCase() === receiverAddress.toLowerCase();
        } catch (error) {
            if (error.response.status == 404) {
                return false;
            }

            this.logger.notification(`Error in checking existing account on stellar ${error.stack ?? error.message} - ${softJsonStringify(error)} `)
            throw error;
        }
    }

    async getSignedTransactionToken(
        dto: SignTransactionDto,
        privateKey: string,
        secondPrivateKey?: string
    ): Promise<StellarSdk.FeeBumpTransaction | StellarSdk.Transaction> {
        throw new Error('Tokens in stellar are not supported yet')
    }

    getSignedSwapTransaction(dto: SignTransactionDto, privateKey: string): Promise<CustodySignedTransaction> {
        throw new Error("Method not implemented.");
    }
}
