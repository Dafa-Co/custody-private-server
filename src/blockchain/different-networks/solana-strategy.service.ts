import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import {
    IBlockChainPrivateServer,
    InitBlockChainPrivateServerStrategies,
    IWalletKeys,
} from '../interfaces/blockchain.interface';
import {
    CustodySignedTransaction,
    SignedSolanaTransaction,
} from 'rox-custody_common-modules/libs/interfaces/custom-signed-transaction.type';
import {
    IPrivateKeyFilledTransactionSigner,
    PrivateKeyFilledSignTransactionDto,
    PrivateServerSignTransactionDto,
} from 'rox-custody_common-modules/libs/interfaces/sign-transaction.interface';
import { getChainFromNetwork } from 'rox-custody_common-modules/blockchain/global-commons/get-network-chain';
import {
    AssetType,
    CommonAsset,
} from 'rox-custody_common-modules/libs/entities/asset.entity';
import { Chain } from 'viem';
import {
    Commitment,
    Connection,
    Keypair,
    PublicKey,
    SystemProgram,
    Transaction,
} from '@solana/web3.js';
import {
    getAssociatedTokenAddress,
    createAssociatedTokenAccountInstruction,
    createTransferCheckedInstruction,
} from '@solana/spl-token';
import { CustodyLogger } from 'rox-custody_common-modules/libs/services/logger/custody-logger.service';
import { softJsonStringify } from 'rox-custody_common-modules/libs/utils/soft-json-stringify.utils';
import Decimal from 'decimal.js';
import { SignerTypeEnum } from 'rox-custody_common-modules/libs/enums/signer-type.enum';
import { getSignerFromSigners } from 'src/utils/helpers/get-signer-from-signers.helper';

@Injectable()
export class SolanaStrategyService implements IBlockChainPrivateServer {
    private asset: CommonAsset;
    private chain: Chain;
    private host: string;
    private commitment: Commitment = 'finalized';
    private connection: Connection;

    constructor(
        private readonly logger: CustodyLogger
    ) { }

    async init(initData: InitBlockChainPrivateServerStrategies): Promise<void> {
        const { asset } = initData;
        const networkObject = getChainFromNetwork(asset.networkId);

        this.asset = asset;
        this.chain = networkObject.chain;
        this.host = this.chain.blockExplorers.default.apiUrl;
        this.connection = new Connection(this.host, this.commitment);
    }

    async createWallet(): Promise<IWalletKeys> {
        const sollanaWallet = Keypair.generate();
        const privateKey = Buffer.from(sollanaWallet.secretKey).toString('base64');
        const address = sollanaWallet.publicKey.toBase58();

        return { privateKey, address };
    }

    private getPayerPrivateKey(signers: IPrivateKeyFilledTransactionSigner[], isGasless: boolean): string {
        if (!isGasless) {
            return null;
        }

        const payer = getSignerFromSigners(signers, SignerTypeEnum.PAYER, true);

        return payer.privateKey;
    }

    async getSignedTransaction(
        dto: PrivateKeyFilledSignTransactionDto,
    ): Promise<CustodySignedTransaction> {
        const { amount, to, transactionId, signers } = dto;

        try {
            const sender = getSignerFromSigners(signers, SignerTypeEnum.SENDER, true);

            const senderPrivateKey = sender.privateKey;

            const payerPrivateKey = this.getPayerPrivateKey(signers, dto.isGasless);

            let signedTransaction: SignedSolanaTransaction;

            switch (this.asset.type) {
                case AssetType.COIN:
                    signedTransaction = await this.getSignedTransactionCoin(
                        senderPrivateKey,
                        to,
                        amount,
                        payerPrivateKey,
                    );
                    break;
                case AssetType.TOKEN:
                case AssetType.CUSTOM_TOKEN:
                    signedTransaction = await this.getSignedTransactionToken(
                        senderPrivateKey,
                        to,
                        amount,
                        payerPrivateKey,
                    );
                    break;
                default:
                    throw new BadRequestException(
                        `Unsupported asset type for Solana: ${this.asset.type}`,
                    );
            }


            return {
                bundlerUrl: this.host,
                signedTransaction: signedTransaction,
                error: null,
                transactionId: transactionId,
            };
        } catch (error) {
            this.logger.error(`Solana Transaction Signing error: ${error?.stack ?? error?.message}`);
            return {
                bundlerUrl: this.host,
                signedTransaction: null,
                error: error.message,
                transactionId: transactionId,
            };
        }
    }

    async getSignedTransactionCoin(
        privateKey: string,
        to: string,
        amount: Decimal,
        secondPrivateKey: string,
    ): Promise<SignedSolanaTransaction> {
        const { sender, feePayer } = this.recreateKeypairFromPreviouslyGeneratedSecretKey(privateKey, secondPrivateKey);

        // Recipient public key
        const toPubkey = new PublicKey(to);
        // Create transaction
        const transaction = new Transaction().add(
            SystemProgram.transfer({
                fromPubkey: sender.publicKey,
                toPubkey: toPubkey,
                lamports: BigInt(amount.toString()),
            }),
        );

        return await this.signAndReturnSolanaTransaction(transaction, feePayer, sender);
    }

    private recreateKeypairFromPreviouslyGeneratedSecretKey(privateKey: string, secondPrivateKey: string) {
        const sender = Keypair.fromSecretKey(
            Uint8Array.from(Buffer.from(privateKey, 'base64')),
        );
        let feePayer = null;

        if (secondPrivateKey) {
            feePayer = Keypair.fromSecretKey(
                Uint8Array.from(Buffer.from(secondPrivateKey, 'base64')),
            );
        }

        return {
            sender,
            feePayer
        }
    }

    async getSignedTransactionToken(
        privateKey: string,
        to: string,
        amount: Decimal,
        secondPrivateKey: string,
    ): Promise<SignedSolanaTransaction> {
        const { sender, feePayer } = this.recreateKeypairFromPreviouslyGeneratedSecretKey(privateKey, secondPrivateKey);
        // Token mint address ( contract address )
        const tokenMint = new PublicKey(this.asset.contract_address);
        // Get source token account
        const sourceTokenAccount = await getAssociatedTokenAddress(
            tokenMint,
            sender.publicKey,
            false,
        );
        // Handle Destination Account
        const receiverAddress = new PublicKey(to);
        const receiverTokenAccount = await getAssociatedTokenAddress(
            tokenMint,
            receiverAddress,
            false,
        );
        // Check if destination token account exists
        const destinationAccountInfo = await this.connection.getAccountInfo(
            receiverTokenAccount,
        );
        // Create transaction
        const transaction = new Transaction();

        // Add creation instruction if destination account doesn't exist
        if (!destinationAccountInfo) {
            transaction.add(
                createAssociatedTokenAccountInstruction(
                    feePayer ? feePayer.publicKey : sender.publicKey,
                    receiverTokenAccount,
                    receiverAddress,
                    tokenMint,
                ),
            );
        }

        // Add transfer instruction
        transaction.add(
            createTransferCheckedInstruction(
                sourceTokenAccount,
                tokenMint,
                receiverTokenAccount,
                sender.publicKey,
                BigInt(amount.toString()),
                this.asset.decimals,
            ),
        );

        return await this.signAndReturnSolanaTransaction(transaction, feePayer, sender);
    }

    private async signAndReturnSolanaTransaction(transaction: Transaction, feePayer: Keypair | null, sender: Keypair) {
        // Get recent blockhash and last valid block height
        const { blockhash, lastValidBlockHeight } = await this.connection.getLatestBlockhash();

        transaction.recentBlockhash = blockhash;
        transaction.lastValidBlockHeight = lastValidBlockHeight;
        transaction.feePayer = feePayer ? feePayer.publicKey : sender.publicKey;

        // Both accounts must sign:
        if (feePayer) {
            // 1. Fee payer signs to pay fees
            // 2. Sender signs to authorize the transfer
            transaction.sign(feePayer, sender);
        } else {
            transaction.sign(sender);
        }

        if (!transaction.signature) {
            const logger = new CustodyLogger();

            logger.notification(`Transaction signature not found for ${softJsonStringify(transaction)}`);

            throw new InternalServerErrorException('Error while getting signature');
        }

        const rawTx = transaction.serialize();

        return {
            rawTransaction: rawTx,
            signature: transaction.signature?.toString('base64'),
        } as SignedSolanaTransaction;
    }

    async getSignedSwapTransaction(
        dto: any,
    ): Promise<any> {
        // Solana does not support swap transactions in the same way as other blockchains.
        throw new Error('Solana does not support swap transactions.');
    }
}
