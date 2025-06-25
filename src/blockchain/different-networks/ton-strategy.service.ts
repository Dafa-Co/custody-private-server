import { Injectable, InternalServerErrorException } from "@nestjs/common";
import { IBlockChainPrivateServer, InitBlockChainPrivateServerStrategies, IWalletKeys } from "../interfaces/blockchain.interface";
import { CustodySignedTransaction, SignedTonMessage } from "rox-custody_common-modules/libs/interfaces/custom-signed-transaction.type";
import { PrivateServerSignTransactionDto, SignTransactionDto } from "rox-custody_common-modules/libs/interfaces/sign-transaction.interface";
import { getChainFromNetwork } from "rox-custody_common-modules/blockchain/global-commons/get-network-chain";
import { AssetType, CommonAsset } from "rox-custody_common-modules/libs/entities/asset.entity";
import { Chain } from "viem";
import { internal, SendMode, toNano, TonClient, WalletContractV4 } from "ton";
import { keyPairFromSecretKey, mnemonicNew, mnemonicToPrivateKey, sign } from "ton-crypto";
import { CustodyLogger } from "rox-custody_common-modules/libs/services/logger/custody-logger.service";
import { softJsonStringify } from "rox-custody_common-modules/libs/utils/soft-json-stringify.utils";
import Decimal from "decimal.js";
import BigNumber from 'bignumber.js'


@Injectable()
export class TonStrategyService implements IBlockChainPrivateServer {
    getSignedSwapTransaction(dto: SignTransactionDto, privateKey: string): Promise<CustodySignedTransaction> {
        throw new Error("Method not implemented.");
    }
    private asset: CommonAsset;
    private chain: Chain;
    private host: string;
    private client: TonClient;

    async init(initData: InitBlockChainPrivateServerStrategies): Promise<void> {
        const { asset } = initData;
        const networkObject = getChainFromNetwork(asset.networkId);

        this.asset = asset;
        this.chain = networkObject.chain;
        this.host = this.chain.blockExplorers.default.apiUrl;
        this.client = new TonClient({ endpoint: this.host });
    }

    async createWallet(): Promise<IWalletKeys> {
        // Step 1. Generate a new 24-word mnemonic
        const mnemonic = await mnemonicNew();
        // Step 2: Get the key pair (private + public) from mnemonic
        const keyPair = await mnemonicToPrivateKey(mnemonic);
        // Step 3: Create a v4r2 wallet contract from the public key
        const wallet = WalletContractV4.create({
            workchain: 0,
            publicKey: keyPair.publicKey
        });
        // Step 5: Fetch wallet balance (should be 0 initially)
        const balance = await this.client.getBalance(wallet.address);
        const privateKey = keyPair.secretKey.toString('hex');
        const address = wallet.address.toString();

        return { privateKey, address };
    }

    async getSignedTransaction(
        dto: PrivateServerSignTransactionDto,
        privateKey: string,
        secondPrivateKey: string = null,
    ): Promise<CustodySignedTransaction> {
        const { amount, to, transactionId } = dto;

        try {
            let signedTransaction: SignedTonMessage;

            switch (this.asset.type) {
                case AssetType.COIN:
                    signedTransaction = await this.getSignedTransactionCoin(
                        privateKey,
                        to,
                        amount,
                        secondPrivateKey,
                    );
                    break;
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
        amount: Decimal,
        secondPrivateKey: string,
    ): Promise<SignedTonMessage> {
        const { sender, feePayer } = this.recreateKeypairFromPreviouslyGeneratedSecretKey(privateKey, secondPrivateKey);
        const source = WalletContractV4.create({
            workchain: 0,
            publicKey: sender.publicKey,
        });
        const decimalAmount = new Decimal(amount);
        const testClient = new TonClient({ endpoint: this.host })
        const walletContract = testClient.open(source);
        const seqno = await walletContract.getSeqno();
        const transfer = internal({
            to,
            value: toNano(BigInt(decimalAmount.toString())),
            bounce: false,
        });

        try {
            // Step 1: Create unsigned message
            const unsigned = source.createTransfer({
                seqno,
                secretKey: sender.secretKey,
                sendMode: SendMode.PAY_GAS_SEPARATELY | SendMode.IGNORE_ERRORS,
                messages: [transfer],
            });
    
            // Step 2: Sign it manually
            sign(unsigned.hash(), sender.secretKey);
    
            const base64SignedMessage = unsigned.toBoc().toString('base64');
            const publicKeyBase64 = sender.publicKey.toString('base64');
    
            return {
                base64SignedMessage,
                publicKeyBase64,
            } as SignedTonMessage;
        } catch (error) {
            const logger = new CustodyLogger();

            logger.notification(`Transaction signature not found for ${softJsonStringify(transfer)}`);

            throw new InternalServerErrorException('Error while getting signature');
        }
    }

    private recreateKeypairFromPreviouslyGeneratedSecretKey(privateKey: string, secondPrivateKey: string) {
        const sender = keyPairFromSecretKey(Buffer.from(privateKey, 'hex'));
        let feePayer = null;

        if (secondPrivateKey) {
            feePayer = keyPairFromSecretKey(Buffer.from(secondPrivateKey, 'hex'));
        }

        return {
            sender,
            feePayer
        }
    }
}