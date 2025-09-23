import { Injectable, InternalServerErrorException } from '@nestjs/common';
import {
    IBlockChainPrivateServer,
    InitBlockChainPrivateServerStrategies,
    IWalletKeys,
} from '../interfaces/blockchain.interface';
import {
    CustodySignedTransaction,
    SignedSuiTransaction,
} from 'rox-custody_common-modules/libs/interfaces/custom-signed-transaction.type';
import {
    PrivateKeyFilledSignTransactionDto,
    PrivateKeyFilledSignSwapTransactionDto,
} from 'rox-custody_common-modules/libs/interfaces/sign-transaction.interface';
import { getChainFromNetwork } from 'rox-custody_common-modules/blockchain/global-commons/get-network-chain';
import {
    AssetType,
    CommonAsset,
} from 'rox-custody_common-modules/libs/entities/asset.entity';
import { Chain } from 'viem';
import { CustodyLogger } from 'rox-custody_common-modules/libs/services/logger/custody-logger.service';
import { softJsonStringify } from 'rox-custody_common-modules/libs/utils/soft-json-stringify.utils';
import Decimal from 'decimal.js';
import { SignerTypeEnum } from 'rox-custody_common-modules/libs/enums/signer-type.enum';
import { getSignerFromSigners } from 'src/utils/helpers/get-signer-from-signers.helper';
import { SuiClient } from '@mysten/sui/client';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { Transaction } from '@mysten/sui/transactions';
import { generateMnemonic } from 'bip39';
import { decodeSuiPrivateKey } from '@mysten/sui/cryptography';
import { toBase64 } from '@mysten/sui/utils';

@Injectable()
export class SuiStrategyService implements IBlockChainPrivateServer {
    private asset: CommonAsset;
    private chain: Chain;
    private host: string;
    private suiClient: SuiClient;


    async init(initData: InitBlockChainPrivateServerStrategies): Promise<void> {
        const { asset } = initData;
        const networkObject = getChainFromNetwork(asset.networkId); 

        this.asset = asset;
        this.chain = networkObject.chain;
        this.host = this.chain.blockExplorers.default.apiUrl;
        this.suiClient = new SuiClient({ url: this.host });
    }

    async createWallet(): Promise<IWalletKeys> {
        // Default Sui derivation path per SLIP-44 (coin type 784 for Sui). You can bump the last index for more accounts. (Key algo Ed25519Keypair)
        const DEFAULT_DERIVATION_PATH = "m/44'/784'/0'/0'/0'";
        // 1) Generate mnemonic (12 words). Use 24 if you want stronger entropy.
        const mnemonic = generateMnemonic(128); // 128 bits -> 12 words
        // 2) Derive Ed25519 keypair from mnemonic
        const keypair = Ed25519Keypair.deriveKeypair(mnemonic, DEFAULT_DERIVATION_PATH);
        const address = keypair.getPublicKey().toSuiAddress();
        // NOTE: Don't log secrets in real apps. This is for demo parity with your Polka script.
        const secretKeyB64 = Buffer.from(keypair.getSecretKey()).toString('base64');

        return { privateKey: secretKeyB64, address };
    }

    async getSignedTransaction(
        dto: PrivateKeyFilledSignTransactionDto,
    ): Promise<CustodySignedTransaction> {
        const { amount, to, transactionId, signers } = dto;

        try {
            const sender = getSignerFromSigners(signers, SignerTypeEnum.SENDER, true);
            const senderPrivateKey = sender.privateKey;

            const payer = getSignerFromSigners(signers, SignerTypeEnum.PAYER);
            const payerPrivateKey = payer ? payer.privateKey : undefined;

            let signedTransaction: SignedSuiTransaction;

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
                    signedTransaction = await this.getSignedTransactionToken(
                        senderPrivateKey,
                        to,
                        amount,
                        payerPrivateKey,
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

    async getSignedTransactionCoin(
        privateKey: string,
        to: string,
        amount: Decimal,
        secondPrivateKey: string,
    ): Promise<SignedSuiTransaction> {
        return await this.buildAndSignTransfer(privateKey, to, amount, secondPrivateKey, '0x2::sui::SUI');
    }


    async getSignedTransactionToken(
        privateKey: string,
        to: string,
        amount: Decimal,
        secondPrivateKey: string,
    ): Promise<SignedSuiTransaction> {
        return await this.buildAndSignTransfer(privateKey, to, amount, secondPrivateKey, this.asset.contract_address);
    }

    private recreateKeypairFromPreviouslyGeneratedSecretKey(privateKey: string, secondPrivateKey: string) {
        const senderBech32 = Buffer.from(privateKey, 'base64').toString('utf8');
        const { secretKey: senderSecretKey } = decodeSuiPrivateKey(senderBech32);
        const sender = Ed25519Keypair.fromSecretKey(senderSecretKey);
        let feePayer = null;

        if (secondPrivateKey) {
            const feePayerBech32 = Buffer.from(secondPrivateKey, 'base64').toString('utf8');
            const { secretKey: feePayerSecretKey } = decodeSuiPrivateKey(feePayerBech32);
            feePayer = Ed25519Keypair.fromSecretKey(feePayerSecretKey);
        }

        return {
            sender,
            feePayer
        }
    }

    private async signAndReturnSuiTransaction(
        transaction: Transaction, 
        sender: Ed25519Keypair, 
        feePayer: Ed25519Keypair | null
    ): Promise<SignedSuiTransaction> {
        try {
            // 3) set roles: sender = tx sender, gas owner = sponsor
            transaction.setSender(sender.getPublicKey().toSuiAddress());
            // Set the fee payer if provided
            if (feePayer) {
                transaction.setGasOwner(feePayer.getPublicKey().toSuiAddress());
            }

            // 4) build once; both must sign THE SAME bytes
            const builtTx = await transaction.build({ client: this.suiClient });
            const senderSig  = await sender.signTransaction(builtTx);   // moves sender's coin
            const sponsorSig = await feePayer.signTransaction(builtTx); // pays gas

            if (!senderSig.signature || !sponsorSig.signature) {
                const logger = new CustodyLogger();
                logger.notification(`Transaction signature not found for ${softJsonStringify(transaction)}`);
                throw new InternalServerErrorException('Error while getting signature');
            }

            const signedTransaction: SignedSuiTransaction = {
                digest: await transaction.getDigest(),
                buildTx: toBase64(builtTx),
                senderSignature: senderSig.signature,
                sponsorSignature: sponsorSig.signature,
            }

            return signedTransaction;
        } catch (error) {
            const logger = new CustodyLogger();
            logger.error(`Error signing Sui transaction: ${error.message}`);
            throw new InternalServerErrorException(`Failed to sign Sui transaction: ${error.message}`);
        }
    }

    async getSignedSwapTransaction(
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        dto: PrivateKeyFilledSignSwapTransactionDto,
    ): Promise<CustodySignedTransaction> {
        // Sui does not support swap transactions in the same way as other blockchains.
        throw new Error('Sui does not support swap transactions.');
    }

    private async buildAndSignTransfer(
        privateKey: string,
        to: string,
        amount: Decimal,
        secondPrivateKey: string,
        coinType: string
    ): Promise<SignedSuiTransaction> {
        const { sender, feePayer } = this.recreateKeypairFromPreviouslyGeneratedSecretKey(privateKey, secondPrivateKey);
        const senderAddr  = sender.getPublicKey().toSuiAddress();

        // 1) pick a SENDER coin to split (NOT tx.gas)
        const coins = await this.suiClient.getCoins({ owner: senderAddr, coinType });
        const convertedAmount = BigInt(amount.toString());

        const coinWithEnough = coins.data.find(c => BigInt(c.balance) >= convertedAmount) ?? coins.data[0]; // simple pick
        const senderCoinId = coinWithEnough.coinObjectId;

        // Create transaction
        const tx = new Transaction();
        const [outCoin] = tx.splitCoins(tx.object(senderCoinId), [amount.toString()]);
        tx.transferObjects([outCoin], to);
        

        return await this.signAndReturnSuiTransaction(tx, sender, feePayer);
    }
}