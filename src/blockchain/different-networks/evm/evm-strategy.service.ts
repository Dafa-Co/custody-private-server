import {
    IBlockChainPrivateServer,
    InitBlockChainPrivateServerStrategies,
    IWalletKeys,
} from 'src/blockchain/interfaces/blockchain.interface';
import { CustodySignedTransaction } from 'rox-custody_common-modules/libs/interfaces/custom-signed-transaction.type';
import { Injectable } from '@nestjs/common';
import { PrivateKeyFilledSignSwapTransactionDto, PrivateKeyFilledSignTransactionDto } from 'rox-custody_common-modules/libs/interfaces/sign-transaction.interface';
import { NonceManagerService } from 'src/nonce-manager/nonce-manager.service';
import { CustodyLogger } from 'rox-custody_common-modules/libs/services/logger/custody-logger.service';
import { EvmProtocols, WalletProtocols } from 'rox-custody_common-modules/libs/enums/wallets-protocols.enum';
import { AccountAbstractionStrategyService } from './account-abstraction/account-abstraction-strategy.service';
import { EoaStrategyService } from './eoa/eoa-strategy.service';

@Injectable()
export class EVMStrategyService implements IBlockChainPrivateServer {
    private strategy: IBlockChainPrivateServer;

    constructor(
        private readonly nonceManager: NonceManagerService,
        private readonly logger: CustodyLogger,
        private readonly protocol: WalletProtocols,
    ) {
        switch (this.protocol) {
            case EvmProtocols.ERC_4337:
                this.strategy = new AccountAbstractionStrategyService(this.nonceManager, this.logger);
                break;
            case EvmProtocols.EOA:
                console.log('Using EOA strategy');
                this.strategy = new EoaStrategyService();
                break;
            default:
                throw new Error('This protocol is not supported yet');
        }
    }

    async init(initData: InitBlockChainPrivateServerStrategies): Promise<void> {
        return this.strategy.init(initData);
    }

    async createWallet(): Promise<IWalletKeys> {
        return this.strategy.createWallet();
    }

    getSignedSwapTransaction(dto: PrivateKeyFilledSignSwapTransactionDto): Promise<CustodySignedTransaction> {
        return this.strategy.getSignedSwapTransaction(dto);
    }

    getSignedTransaction(dto: PrivateKeyFilledSignTransactionDto): Promise<CustodySignedTransaction> {
        return this.strategy.getSignedTransaction(dto);
    }

    async splitToShares(privateKey: string, percentageToStoreInCustody: number, backupStorages: number): Promise<string[]> {
        return this.strategy.splitToShares(privateKey, percentageToStoreInCustody, backupStorages);
    }

    async combineShares(shares: string[]): Promise<string> {
        return this.strategy.combineShares(shares);
    }
}