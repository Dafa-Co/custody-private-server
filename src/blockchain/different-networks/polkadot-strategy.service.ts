import { CustodySignedTransaction, SignedPolkadotTransaction } from "rox-custody_common-modules/libs/interfaces/custom-signed-transaction.type";
import { PrivateKeyFilledSignTransactionDto, PrivateServerSignTransactionDto, SignTransactionDto } from "rox-custody_common-modules/libs/interfaces/sign-transaction.interface";
import { IBlockChainPrivateServer, InitBlockChainPrivateServerStrategies, IWalletKeys } from "../interfaces/blockchain.interface";
import { AssetType, CommonAsset } from "rox-custody_common-modules/libs/entities/asset.entity";
import { Chain } from "viem";
import { getChainFromNetwork } from "rox-custody_common-modules/blockchain/global-commons/get-network-chain";
import {
    cryptoWaitReady,
    mnemonicGenerate,
    mnemonicToMiniSecret,
} from '@polkadot/util-crypto';
import { Keyring } from '@polkadot/keyring';
import { ApiPromise, HttpProvider, WsProvider } from '@polkadot/api';
import { hexToU8a, u8aToHex } from '@polkadot/util';
import Decimal from 'decimal.js';
import BigNumber from 'bignumber.js'
import type { AccountInfo } from '@polkadot/types/interfaces';
import { InternalServerErrorException } from "@nestjs/common";
import { softJsonStringify } from "rox-custody_common-modules/libs/utils/soft-json-stringify.utils";
import { CustodyLogger } from "rox-custody_common-modules/libs/services/logger/custody-logger.service";
import { getSignerFromSigners } from "src/utils/helpers/get-signer-from-signers.helper";
import { SignerTypeEnum } from "rox-custody_common-modules/libs/enums/signer-type.enum";
import { split, combine } from "shamirs-secret-sharing";
import { isDefined } from "class-validator";

export class PolkadotStrategyService implements IBlockChainPrivateServer {
    private asset: CommonAsset;
    private chain: Chain;
    private host: string;
    private api: ApiPromise;
    private keyring: Keyring;

    async init(initData: InitBlockChainPrivateServerStrategies): Promise<void> {
        const { asset } = initData;
        const networkObject = getChainFromNetwork(asset.networkId);

        this.asset = asset;
        this.chain = networkObject.chain;
        this.host = this.chain.blockExplorers.default.apiUrl;

        await cryptoWaitReady();

        const provider = new HttpProvider(this.host);

        this.api = await ApiPromise.create({
            provider,
            noInitWarn: true
        });
        this.keyring = new Keyring({ type: 'sr25519' });
    }

    async createWallet(): Promise<IWalletKeys> {
        const mnemonic = mnemonicGenerate();
        const miniSecret = mnemonicToMiniSecret(mnemonic);
        const pair = this.keyring.addFromUri(mnemonic, {}, 'sr25519');

        return {
            privateKey: u8aToHex(miniSecret),
            address: pair.address,
        };
    }

    async getSignedTransaction(
        dto: PrivateKeyFilledSignTransactionDto,
    ): Promise<CustodySignedTransaction> {
        const { amount, to, transactionId } = dto;

        try {
            let signedTransaction: SignedPolkadotTransaction;
            const sender = getSignerFromSigners(dto.signers, SignerTypeEnum.SENDER, true);

            switch (this.asset.type) {
                case AssetType.COIN:
                    signedTransaction = await this.getSignedTransactionCoin(
                        sender.privateKey,
                        to,
                        amount,
                    );
                    break;

                default:
                    throw new InternalServerErrorException('Polkadot only supports coins');
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
    ): Promise<SignedPolkadotTransaction> {
        const keyring = new Keyring({ type: 'sr25519' });
        // Convert hex to Uint8Array
        const privateKeySeed = hexToU8a(privateKey);
        // Add from seed (assumes it's a valid 32-byte secret seed)
        const sender = keyring.addFromSeed(privateKeySeed);
        const decimalAmount = new Decimal(amount);
        const nonce = await this.api.rpc.system.accountNextIndex(sender.address);
        const transfer = this.api.tx.balances.transferKeepAlive(to, decimalAmount.toJSON());
        const eraPeriod = 64;
        const signedTx = await transfer.signAsync(sender, { nonce, era: eraPeriod });
        const currentBlock = (await this.api.rpc.chain.getHeader()).number.toNumber();
        const validityStart = currentBlock - (currentBlock % eraPeriod);
        const validityEnd = validityStart + eraPeriod;

        if (!signedTx) {
            const logger = new CustodyLogger();

            logger.notification(`Transaction signature not found for ${softJsonStringify(transfer)}`);

            throw new InternalServerErrorException('Error while getting signature');
        }

        console.log(`Current Block: ${currentBlock}, Validity End Block: ${validityEnd}`);


        return {
            hash: signedTx.toHex(),
            currentBlock,
            endBlock: validityEnd
        };
    }

    async getSignedSwapTransaction(
        dto: any,
    ): Promise<any> {
        // Solana does not support swap transactions in the same way as other blockchains.
        throw new Error('Polkadot does not support swap transactions.');
    }

    async splitToShares(privateKey: string, percentageToStoreInCustody: number, backupStorages: number): Promise<string[]> {
        if (isDefined(percentageToStoreInCustody) && percentageToStoreInCustody > 0) {
            backupStorages += 1;
        }

        const privateKeyBuffer = Buffer.from(privateKey.replace(/^0x/, ""), "hex");

        const shares = await await split(
            privateKeyBuffer,
            {
                shares: backupStorages,
                threshold: backupStorages - 1
            }
        );

        return shares
    }

    async combineShares(shares: string[]): Promise<string> {
        const fullPrivateKey = await combine(shares);

        return `0x${fullPrivateKey.toString("hex")}`;
    }
}