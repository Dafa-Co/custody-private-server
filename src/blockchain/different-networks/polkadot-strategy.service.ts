import { CustodySignedTransaction } from "rox-custody_common-modules/libs/interfaces/custom-signed-transaction.type";
import { PrivateServerSignTransactionDto, SignTransactionDto } from "rox-custody_common-modules/libs/interfaces/sign-transaction.interface";
import { IBlockChainPrivateServer, InitBlockChainPrivateServerStrategies, IWalletKeys } from "../interfaces/blockchain.interface";
import { CommonAsset } from "rox-custody_common-modules/libs/entities/asset.entity";
import { Chain } from "viem";
import { getChainFromNetwork } from "rox-custody_common-modules/blockchain/global-commons/get-network-chain";
import {
    cryptoWaitReady,
    mnemonicGenerate,
    mnemonicToMiniSecret,
} from '@polkadot/util-crypto';
import { Keyring } from '@polkadot/keyring';
import { ApiPromise, WsProvider } from '@polkadot/api';
import { hexToU8a, u8aToHex } from '@polkadot/util';
import Decimal from 'decimal.js';
import BigNumber from 'bignumber.js'
import type { AccountInfo } from '@polkadot/types/interfaces';

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

        const provider = new WsProvider(this.host);

        this.api = await ApiPromise.create({ provider });
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
        const { amount, to, transactionId } = dto;

        try {
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

            return {
                bundlerUrl: this.host,
                signedTransaction: signedTx.toHex(),
                error: null,
                transactionId,
            };
        } catch (error) {
            return {
                bundlerUrl: this.host,
                signedTransaction: null,
                error: error.message,
                transactionId,
            };
        }
    }

    getSignedSwapTransaction(dto: SignTransactionDto, privateKey: string): Promise<CustodySignedTransaction> {
        throw new Error("Method not implemented.");
    }
}