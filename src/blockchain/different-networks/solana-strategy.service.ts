import { Injectable } from "@nestjs/common";
import { IBlockChainPrivateServer, InitBlockChainPrivateServerStrategies, IWalletKeys } from "../interfaces/blockchain.interface";
import { CustodySignedTransaction, SignedSolanaTransaction } from "rox-custody_common-modules/libs/interfaces/custom-signed-transaction.type";
import { PrivateServerSignTransactionDto, SignTransactionDto } from "rox-custody_common-modules/libs/interfaces/sign-transaction.interface";
import { getChainFromNetwork } from "rox-custody_common-modules/blockchain/global-commons/get-network-chain";
import { AssetType, CommonAsset } from "rox-custody_common-modules/libs/entities/asset.entity";
import { Chain } from "viem";
import {
    Connection,
    Keypair,
    LAMPORTS_PER_SOL,
    PublicKey,
    SystemProgram,
    Transaction,
} from '@solana/web3.js';
import {
    getAssociatedTokenAddress,
    createAssociatedTokenAccountInstruction,
    createTransferCheckedInstruction
} from '@solana/spl-token';

@Injectable()
export class SolanaStrategyService implements IBlockChainPrivateServer {
    private asset: CommonAsset;
    private chain: Chain;
    private solana: Keypair;
    private host: string;

    async init(initData: InitBlockChainPrivateServerStrategies): Promise<void> {
        const { asset } = initData;
        const networkObject = getChainFromNetwork(asset.networkId);
        console.log("networkObject",networkObject);

        this.asset = asset;
        this.chain = networkObject.chain;
        this.host = this.chain.blockExplorers.default.apiUrl;
        
        
    }

    async createWallet(): Promise<IWalletKeys> {
        const sollanaWallet = Keypair.generate();
        console.log(sollanaWallet);
        const privateKey = Buffer.from(sollanaWallet.secretKey).toString('base64');
        const address = sollanaWallet.publicKey.toBase58();
        console.log({ privateKey, address });
        return { privateKey, address };
    }

    async getSignedTransaction(
        dto: PrivateServerSignTransactionDto,
        privateKey: string,
        secondPrivateKey: string
    ): Promise<CustodySignedTransaction> {
        const {
            amount,
            to,
            transactionId,
        } = dto;
        try {
            const signedTransaction = 
                this.asset.type === AssetType.COIN 
                ? await this.getSignedTransactionCoin(privateKey, to, amount, secondPrivateKey)
                : await this.getSignedTransactionToken(privateKey, to, amount, secondPrivateKey);
    
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
    
    async getSignedTransactionCoin(
        privateKey: string,
        to: string,
        amount: number,
        secondPrivateKey: string
    ): Promise<SignedSolanaTransaction> {
        const connection = new Connection(this.host, "confirmed");
        const sender = Keypair.fromSecretKey(
            Uint8Array.from(Buffer.from(privateKey, 'base64'))
        );
        const feePayer = Keypair.fromSecretKey(
            Uint8Array.from(Buffer.from(secondPrivateKey, 'base64'))
        );    
        // Recipient public key
        const toPubkey = new PublicKey(to);
        // Create transaction
        const transaction = new Transaction().add(
            SystemProgram.transfer({
                fromPubkey: sender.publicKey,
                toPubkey: toPubkey,
                lamports: Math.floor(amount * LAMPORTS_PER_SOL), // Convert SOL to lamports
            })
        );
        // Get recent blockhash and last valid block height
        // TODO look at latest block hash expiration
        const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
    
        transaction.recentBlockhash = blockhash;
        transaction.lastValidBlockHeight = lastValidBlockHeight;
        transaction.feePayer = feePayer.publicKey;
        // Both accounts must sign:
        // 1. Fee payer signs to pay fees
        // 2. Sender signs to authorize the transfer
        transaction.sign(feePayer, sender);
    
        const rawTx = transaction.serialize();

        await connection.sendRawTransaction(rawTx, {
            skipPreflight: false,
            preflightCommitment: "confirmed"
        });

        // Serialize and return
        return {
            rawTransaction: transaction.serialize(),
            signature: transaction.signature?.toString('base64') || ''
        };
    }
    
    async getSignedTransactionToken(
        privateKey: string,
        to: string,
        amount: number,
        secondPrivateKey: string
    ): Promise<SignedSolanaTransaction> {
        const connection = new Connection(this.host, "confirmed");
        const sender = Keypair.fromSecretKey(Uint8Array.from(Buffer.from(privateKey, 'base64')));
        const feePayer = Keypair.fromSecretKey(
            Uint8Array.from(Buffer.from(secondPrivateKey, 'base64'))
        ); 
        // Token mint address
        const tokenMint = new PublicKey(this.asset.contract_address);
        // Get source token account
        const sourceTokenAccount = await getAssociatedTokenAddress(
            tokenMint,
            sender.publicKey,
            false
        );           
        // Handle Destination Account
        const receiverAddress = new PublicKey(to);
        const destinationTokenAccount = await getAssociatedTokenAddress(
            tokenMint,
            receiverAddress,
            false
        );
        // Check if destination token account exists
        const destinationAccountInfo = await connection.getAccountInfo(destinationTokenAccount);
        // Create transaction
        const transaction = new Transaction();
        
        // Add creation instruction if destination account doesn't exist
        if (!destinationAccountInfo) {
            transaction.add(
                createAssociatedTokenAccountInstruction(
                    sender.publicKey,
                    destinationTokenAccount,
                    receiverAddress,
                    tokenMint
                )
            );
        }
        
        // Add transfer instruction
        amount = Math.round(amount * 10 ** this.asset.decimals); // token amount
        transaction.add(
            createTransferCheckedInstruction(
                sourceTokenAccount,
                tokenMint,
                destinationTokenAccount,
                sender.publicKey,
                amount,
                this.asset.decimals
            )
        );

        // Set transaction parameters
        const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();

        transaction.recentBlockhash = blockhash;
        transaction.feePayer = feePayer.publicKey;
        // Both accounts must sign:
        // 1. Fee payer signs to pay fees
        // 2. Sender signs to authorize the transfer
        transaction.sign(feePayer, sender);

        const rawTx = transaction.serialize();
        const txId = await connection.sendRawTransaction(rawTx, {
            skipPreflight: false,
            preflightCommitment: "confirmed"
        });
        
        // Confirm transaction
        await connection.confirmTransaction({
            signature: txId,
            blockhash,
            lastValidBlockHeight
        });

        // Serialize and return
        return {
            rawTransaction: transaction.serialize(),
            signature: transaction.signature?.toString('base64') || ''
        };
    }

}