import { Injectable, InternalServerErrorException } from "@nestjs/common";
import { IBlockChainPrivateServer, InitBlockChainPrivateServerStrategies, IWalletKeys } from "../interfaces/blockchain.interface";
import { CustodySignedTransaction, SignedXrpTransaction } from "rox-custody_common-modules/libs/interfaces/custom-signed-transaction.type";
import { PrivateServerSignTransactionDto, SignTransactionDto } from "rox-custody_common-modules/libs/interfaces/sign-transaction.interface";
import { getChainFromNetwork } from "rox-custody_common-modules/blockchain/global-commons/get-network-chain";
import { AssetType, CommonAsset } from "rox-custody_common-modules/libs/entities/asset.entity";
import { Chain } from "viem";
import * as xrpl from "xrpl";
import { CustodyLogger } from "rox-custody_common-modules/libs/services/logger/custody-logger.service";
import { softJsonStringify } from "rox-custody_common-modules/libs/utils/soft-json-stringify.utils";

@Injectable()
export class XrpStrategyService implements IBlockChainPrivateServer {
    private asset: CommonAsset;
    private chain: Chain;
    private host: string;
    private client: xrpl.Client;

    async init(initData: InitBlockChainPrivateServerStrategies): Promise<void> {
        const { asset } = initData;
        const networkObject = getChainFromNetwork(asset.networkId);

        this.asset = asset;
        this.chain = networkObject.chain;
        this.host = this.chain.blockExplorers.default.apiUrl;
        this.client = new xrpl.Client(this.host);
        
        await this.client.connect();
    }

    async createWallet(): Promise<IWalletKeys> {
        const wallet = xrpl.Wallet.generate();
        const privateKey = wallet.seed;  
        const address = wallet.classicAddress;         

        return { privateKey, address };
    }

    async getSignedTransaction(
        dto: PrivateServerSignTransactionDto,
        privateKey: string,
        secondPrivateKey: string = null,
    ): Promise<CustodySignedTransaction> {
        const { amount, to, transactionId } = dto;

        try {
            let signedTransaction: SignedXrpTransaction;

            switch (this.asset.type) {
                case AssetType.COIN:
                    signedTransaction = await this.getSignedTransactionCoin(
                        privateKey,
                        to,
                        amount,
                    );
                break;

                default:
                    throw new InternalServerErrorException('Xrp only supports coins');
            }


            return {
                bundlerUrl: this.host,
                signedTransaction: signedTransaction,
                error: null,
                transactionId: transactionId,
            };
        } catch (error) {
            return {
                bundlerUrl: this.host,
                signedTransaction: null,
                error: error.message,
                transactionId: transactionId,
            };
        }
    }

    private async getSignedTransactionCoin(
        privateKey: string,
        to: string,
        amount: string,
    ): Promise<SignedXrpTransaction> {
        const sender = xrpl.Wallet.fromSeed(privateKey);
        
        const transaction: xrpl.Transaction = await this.client.autofill({
            "TransactionType": "Payment",
            "Account": sender.classicAddress,
            "Amount": xrpl.xrpToDrops(amount), // Convert XRP to drops
            "Destination": to,
        });
        
        return await this.signAndReturnXrpTransaction(transaction, sender);
    }

    private async signAndReturnXrpTransaction(transaction: xrpl.Transaction, sender: xrpl.Wallet) {
        // Sign prepared instructions ------------------------------------------------
        const signedTransaction = sender.sign(transaction);

        if(!signedTransaction.hash) {
            const logger = new CustodyLogger();

            logger.notification(`Transaction signature not found for ${softJsonStringify(transaction)}`);

            throw new InternalServerErrorException('Error while getting signature');
        }

        return {
            tx_blob: signedTransaction.tx_blob,
            hash: signedTransaction.hash,
        } as SignedXrpTransaction;
    }

    getSignedSwapTransaction(dto: SignTransactionDto, privateKey: string): Promise<CustodySignedTransaction> {
        throw new Error("Method not implemented.");
    }
}