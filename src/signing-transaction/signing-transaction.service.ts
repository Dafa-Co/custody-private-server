import { Injectable } from '@nestjs/common';
import { SignTransactionDto } from './dtos/sign-transaction.dto';
import { KeysManagerService } from '../keys-manager/keys-manager.service';
import { BlockchainFactory } from 'src/blockchain/blockchain.factory';
import { CustodySignedTransaction } from 'src/utils/types/custom-signed-transaction.type';

@Injectable()
export class SigningTransactionService {

    constructor(
        private readonly keyManagerService: KeysManagerService
    ) {}


    async signTransaction(
        dto: SignTransactionDto
    ): Promise<CustodySignedTransaction>
     {
        const { asset, network, keyId, secondHalf, to, amount } = dto;

        const blockchainFactory = new BlockchainFactory(asset, network);
        await blockchainFactory.init();

        const privateKey = await this.keyManagerService.getFullPrivateKey(keyId, secondHalf);

        return await blockchainFactory.getSignedTransaction(privateKey, to, amount);
    }


}
