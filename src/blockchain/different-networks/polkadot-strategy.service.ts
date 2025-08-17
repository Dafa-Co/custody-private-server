import { CustodySignedTransaction, SignedPolkadotTransaction } from "rox-custody_common-modules/libs/interfaces/custom-signed-transaction.type";
import { PrivateServerSignTransactionDto, SignTransactionDto } from "rox-custody_common-modules/libs/interfaces/sign-transaction.interface";
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
        dto: PrivateServerSignTransactionDto,
        privateKey: string,
        secondPrivateKey: string = null,
    ): Promise<CustodySignedTransaction> {
        const { amount, to, transactionId, keyId } = dto;

        try {
            let signedTransaction: SignedPolkadotTransaction;

            switch (this.asset.type) {
                case AssetType.COIN:
                    signedTransaction = await this.getSignedTransactionCoin(
                        privateKey,
                        to,
                        amount,
                        keyId
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
        keyId: number
    ): Promise<SignedPolkadotTransaction> {
        const keyring = new Keyring({ type: 'sr25519' });
        // Convert hex to Uint8Array
        const privateKeySeed = hexToU8a(privateKey);
        // Add from seed (assumes it's a valid 32-byte secret seed)
        const sender = keyring.addFromSeed(privateKeySeed);
        const decimalAmount = new Decimal(amount);
        const transfer = this.api.tx.balances.transferKeepAlive(to, (new BigNumber(decimalAmount.toJSON())).toString());
        const accountInfo = await this.api.query.system.account(sender.address);
        const { nonce } = accountInfo as AccountInfo;
        const signedTx = await transfer.signAsync(sender, { nonce });
        const currentBlock = (await this.api.rpc.chain.getHeader()).number.toNumber();
        const eraPeriod = 64;
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

    getSignedSwapTransaction(dto: SignTransactionDto, privateKey: string): Promise<CustodySignedTransaction> {
        throw new Error("Method not implemented.");
    }
}