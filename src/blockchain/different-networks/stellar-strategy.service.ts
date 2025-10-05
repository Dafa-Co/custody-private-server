import { BadRequestException, Injectable } from "@nestjs/common";
import { IBlockChainPrivateServer, InitBlockChainPrivateServerStrategies, IWalletKeys } from "../interfaces/blockchain.interface";
import { AssetType, CommonAsset } from "rox-custody_common-modules/libs/entities/asset.entity";
import { Chain } from "viem";
import { CustodySignedTransaction } from "rox-custody_common-modules/libs/interfaces/custom-signed-transaction.type";
import { IPrivateKeyFilledTransactionSigner, PrivateKeyFilledSignSwapTransactionDto, PrivateKeyFilledSignTransactionDto, SignTransactionDto } from "rox-custody_common-modules/libs/interfaces/sign-transaction.interface";
import * as StellarSdk from '@stellar/stellar-sdk';
import { HorizonServer } from "@stellar/stellar-sdk/lib/horizon/server";
import { getChainFromNetwork, networkData } from "rox-custody_common-modules/blockchain/global-commons/get-network-chain";
import { softJsonStringify } from "rox-custody_common-modules/libs/utils/soft-json-stringify.utils";
import { CustodyLogger } from "rox-custody_common-modules/libs/services/logger/custody-logger.service";
import { AccountResponse } from "@stellar/stellar-sdk/lib/horizon";
import { DecimalsHelper } from "rox-custody_common-modules/libs/utils/decimals-helper";
import { SignerTypeEnum } from "rox-custody_common-modules/libs/enums/signer-type.enum";
import { getSignerFromSigners } from "src/utils/helpers/get-signer-from-signers.helper";
import { split, combine } from "shamirs-secret-sharing";
import { isDefined } from "class-validator";


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

    private getPayerPrivateKey(signers: IPrivateKeyFilledTransactionSigner[], isGasless: boolean): string | undefined {
        if (!isGasless) {
            return undefined;
        }

        const payer = getSignerFromSigners(signers, SignerTypeEnum.PAYER, true);

        return payer.privateKey;
    }

    async getSignedTransaction(
        dto: PrivateKeyFilledSignTransactionDto,
    ): Promise<CustodySignedTransaction> {
        const { transactionId, signers, isGasless } = dto;

        try {
            const sender = getSignerFromSigners(signers, SignerTypeEnum.SENDER, true);

            const senderPrivateKey = sender.privateKey;
            const payerPrivateKey = this.getPayerPrivateKey(signers, isGasless);

            const signedTransaction: StellarSdk.FeeBumpTransaction | StellarSdk.Transaction =
                this.asset.type === AssetType.COIN
                    ? await this.getSignedTransactionCoin(dto, senderPrivateKey, payerPrivateKey)
                    : await this.getSignedTransactionToken(dto, senderPrivateKey, payerPrivateKey);

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
        senderPrivateKey: string,
        payerPrivateKey?: string
    ): Promise<StellarSdk.FeeBumpTransaction | StellarSdk.Transaction> {
        const { to } = dto;

        if (await this.isExistingAccount(to)) {
            return await this.getSignedPaymentTransaction(dto, senderPrivateKey, payerPrivateKey);
        } else {
            return await this.getSignedCreateAccountTransaction(dto, senderPrivateKey, payerPrivateKey);
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
        senderPrivateKey: string,
        payerPrivateKey?: string
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

        return await this.buildAndSignFeeBumpTransaction(dto, senderPrivateKey, payerPrivateKey, operation);
    }

    private async buildAndSignFeeBumpTransaction(
        dto: SignTransactionDto,
        senderPrivateKey: string,
        payerPrivateKey: string | null | undefined,
        operation: any
    ): Promise<StellarSdk.FeeBumpTransaction | StellarSdk.Transaction> {
        const senderKey = StellarSdk.Keypair.fromSecret(senderPrivateKey);

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

        // If payerPrivateKey is provided, create a fee-bump transaction
        if (payerPrivateKey && payerPrivateKey !== senderPrivateKey) {
            const gasStationKey = StellarSdk.Keypair.fromSecret(payerPrivateKey);

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

        // Return the single-signed transaction if no payerPrivateKey
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
        dto: PrivateKeyFilledSignTransactionDto,
        senderPrivateKey: string,
        payerPrivateKey?: string
    ): Promise<StellarSdk.FeeBumpTransaction | StellarSdk.Transaction> {
        throw new Error('Tokens in stellar are not supported yet')
    }

    getSignedSwapTransaction(dto: any): Promise<CustodySignedTransaction> {
        throw new Error("Method not implemented.");
    }

    async splitToShares(privateKey: string, percentageToStoreInCustody: number, backupStorages: number): Promise<string[]> {
        if (isDefined(percentageToStoreInCustody) && percentageToStoreInCustody > 0) {
            backupStorages += 1;
        }

        const privateKeyBuffer = Buffer.from(privateKey, "utf8");

        const shares = await await split(
            privateKeyBuffer,
            {
                shares: backupStorages,
                threshold: backupStorages - 1
            }
        );

        return shares;
    }

    async combineShares(shares: string[]): Promise<string> {
        const fullPrivateKey = await combine(shares);

        return fullPrivateKey.toString("utf8");
    }
}
