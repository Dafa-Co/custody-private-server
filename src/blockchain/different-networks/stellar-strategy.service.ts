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
            const signedTransaction: StellarSdk.FeeBumpTransaction =
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
    ): Promise<StellarSdk.FeeBumpTransaction> {
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
    ): Promise<StellarSdk.FeeBumpTransaction> {
        const { amount, to } = dto;

        const senderKey = StellarSdk.Keypair.fromSecret(privateKey);
        const gasStationKey = StellarSdk.Keypair.fromSecret(secondPrivateKey);

        const senderAccount: StellarSdk.Account = await this.horizonServer.loadAccount(senderKey.publicKey());

        // Step 1: User builds and signs the inner transaction with minimal fee
        const innerTransaction = new StellarSdk.TransactionBuilder(
            senderAccount,
            {
                fee: StellarSdk.BASE_FEE, // Minimal fee
                networkPassphrase: this.networkObject.isTest ? StellarSdk.Networks.TESTNET : StellarSdk.Networks.PUBLIC,
            }
        ).addOperation(
            StellarSdk.Operation.createAccount({
                destination: to,
                startingBalance: DecimalsHelper.divide(
                    amount,
                    DecimalsHelper.pow(10, this.asset.decimals)
                ).toString(),
            })
        ).setTimeout(60 * 5); // 5 minutes in seconds

        const builtInnerTransaction = innerTransaction.build();

        // User signs the inner transaction
        builtInnerTransaction.sign(senderKey);

        // Step 2: Gas station creates fee-bump transaction
        const feeBumpTransaction = StellarSdk.TransactionBuilder.buildFeeBumpTransaction(
            gasStationKey.publicKey(),
            StellarSdk.BASE_FEE,
            builtInnerTransaction,
            this.networkObject.isTest ? StellarSdk.Networks.TESTNET : StellarSdk.Networks.PUBLIC
        );

        // Gas station signs the fee-bump transaction
        feeBumpTransaction.sign(gasStationKey);

        return feeBumpTransaction;
    }

    async getSignedPaymentTransaction(
        dto: SignTransactionDto,
        privateKey: string,
        secondPrivateKey?: string
    ) {
        const { amount, to } = dto;
        const senderKey = StellarSdk.Keypair.fromSecret(privateKey);
        const gasStationKey = StellarSdk.Keypair.fromSecret(secondPrivateKey);

        const senderAccount: StellarSdk.Account = await this.horizonServer.loadAccount(senderKey.publicKey());

        // Step 1: User builds and signs the inner transaction with minimal fee
        const innerTransaction = new StellarSdk.TransactionBuilder(senderAccount, {
            fee: StellarSdk.BASE_FEE,
            networkPassphrase: this.networkObject.isTest ? StellarSdk.Networks.TESTNET : StellarSdk.Networks.PUBLIC,
        })
            .addOperation(
                StellarSdk.Operation.payment({
                    destination: to,
                    asset: StellarSdk.Asset.native(),
                    amount: DecimalsHelper.divide(
                        amount,
                        DecimalsHelper.pow(10, this.asset.decimals)
                    ).toString(),
                })
            )
            .setTimeout(60 * 5); // 5 minutes in seconds

        const builtInnerTransaction = innerTransaction.build();

        // User signs the inner transaction
        builtInnerTransaction.sign(senderKey);

        // Step 2: Gas station creates fee-bump transaction
        const feeBumpTransaction = StellarSdk.TransactionBuilder.buildFeeBumpTransaction(
            gasStationKey.publicKey(),
            StellarSdk.BASE_FEE,
            builtInnerTransaction,
            this.networkObject.isTest ? StellarSdk.Networks.TESTNET : StellarSdk.Networks.PUBLIC
        );

        // Gas station signs the fee-bump transaction
        feeBumpTransaction.sign(gasStationKey);

        return feeBumpTransaction;
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
        }
    }

    async getSignedTransactionToken(
        dto: SignTransactionDto,
        privateKey: string,
        secondPrivateKey?: string
    ) {
        return null;
    }

    getSignedSwapTransaction(dto: SignTransactionDto, privateKey: string): Promise<CustodySignedTransaction> {
        throw new Error("Method not implemented.");
    }
}
