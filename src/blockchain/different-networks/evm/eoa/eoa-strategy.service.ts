import { Injectable, InternalServerErrorException } from "@nestjs/common";
import Decimal from "decimal.js";
import { getChainFromNetwork } from "rox-custody_common-modules/blockchain/global-commons/get-network-chain";
import { AssetType, CommonAsset } from "rox-custody_common-modules/libs/entities/asset.entity";
import { SignerTypeEnum } from "rox-custody_common-modules/libs/enums/signer-type.enum";
import { CustodySignedTransaction, EOASignedTransaction } from "rox-custody_common-modules/libs/interfaces/custom-signed-transaction.type";
import {
    PrivateKeyFilledSignSwapTransactionDto,
    PrivateKeyFilledSignTransactionDto,
} from "rox-custody_common-modules/libs/interfaces/sign-transaction.interface";
import {
    IBlockChainPrivateServer,
    InitBlockChainPrivateServerStrategies,
    IWalletKeys,
} from "src/blockchain/interfaces/blockchain.interface";
import { getSignerFromSigners } from "src/utils/helpers/get-signer-from-signers.helper";
import {
    Chain,
    http,
    createWalletClient,
    createPublicClient,
    encodeFunctionData,
    erc20Abi,
    keccak256,
    toBytes,
} from "viem";
import { privateKeyToAccount, generatePrivateKey } from "viem/accounts";

@Injectable()
export class EoaStrategyService implements IBlockChainPrivateServer {
    private rpcUrl: string;
    private asset: CommonAsset;
    private chain: Chain;

    constructor() { }

    async init(initData: InitBlockChainPrivateServerStrategies): Promise<void> {
        const { asset } = initData;

        this.asset = asset;
        const networkObject = getChainFromNetwork(asset.networkId);
        this.chain = networkObject.chain;
        this.rpcUrl = this.chain.rpcUrls.default.http[0];
    }

    async createWallet(): Promise<IWalletKeys> {
        const result = generatePrivateKey();
        const account = privateKeyToAccount(result);

        return {
            privateKey: result,
            address: account.address,
            eoaAddress: account.address,
        }
    }

    private async getRawSignedTransaction(
        account: ReturnType<typeof privateKeyToAccount>,
        to: `0x${string}`,
        amount: number | string | Decimal,
    ) {
        const client = createWalletClient({
            account,
            chain: this.chain,
            transport: http(this.rpcUrl, { retryCount: 3 }),
        });
        const publicClient = createPublicClient({
            chain: this.chain,
            transport: http(this.rpcUrl, { retryCount: 3 }),
        });
        const nonce = await publicClient.getTransactionCount({ address: account.address });
        console.info('Using nonce:', nonce);

        const isCoin = this.asset.type === AssetType.COIN;

        if (isCoin) {
            const { maxFeePerGas, maxPriorityFeePerGas } = await publicClient.estimateFeesPerGas();
            const gas = await publicClient.estimateGas({
                account: account.address,
                to,
                value: BigInt(amount.toString()),
            });

            return client.signTransaction({
                account,
                to,
                chain: this.chain,
                value: BigInt(amount.toString()),
                maxFeePerGas,
                maxPriorityFeePerGas,
                gas,
                nonce,
            });
        }

        const data = encodeFunctionData({
            abi: erc20Abi,
            functionName: 'transfer',
            args: [to as `0x${string}`, BigInt(amount.toString())],
        });

        const { maxFeePerGas, maxPriorityFeePerGas } = await publicClient.estimateFeesPerGas();
        const gas = await publicClient.estimateGas({
            account: account.address,
            to: this.asset.contract_address as `0x${string}`,
            data,
            value: BigInt(0),
        });

        return client.signTransaction({
            account,
            to: this.asset.contract_address as `0x${string}`,
            chain: this.chain,
            data,
            value: BigInt(0),
            maxFeePerGas,
            maxPriorityFeePerGas,
            gas,
            nonce,
        });
    }

    async getSignedTransaction(dto: PrivateKeyFilledSignTransactionDto): Promise<CustodySignedTransaction> {
        const { amount, to, transactionId, signers } = dto;

        const sender = getSignerFromSigners(signers, SignerTypeEnum.SENDER, true);
        const privateKey = sender.privateKey.startsWith('0x') ? sender.privateKey as `0x${string}` : (`0x${sender.privateKey}` as `0x${string}`);
        const account = privateKeyToAccount(privateKey);
        const rawSignedTransaction = await this.getRawSignedTransaction(account, to as `0x${string}`, amount);

        const txHash = keccak256(toBytes(rawSignedTransaction));
        const signedTransaction: EOASignedTransaction = {
            rawTransaction: rawSignedTransaction,
            txHash,
        }

        return {
            bundlerUrl: this.rpcUrl,
            error: null,
            transactionId,
            signedTransaction,
        };
    }

    getSignedSwapTransaction(dto: PrivateKeyFilledSignSwapTransactionDto): Promise<CustodySignedTransaction> {
        throw new InternalServerErrorException('Swapping is not supported yet for this protocol');
    }
}
