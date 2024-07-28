import { Injectable } from '@nestjs/common';
import { SignTransactionDto } from './dtos/sign-transaction.dto';
import { KeysManagerService } from '../keys-manager/keys-manager.service';
import { BlockchainFactory } from 'src/blockchain/blockchain.factory';
import { SignedTransactionData } from 'src/utils/interfaces/signed-transaction-object.interface';

@Injectable()
export class SigningTransactionService {

    constructor(
        private readonly keyManagerService: KeysManagerService
    ) {}




    async signTransaction(
        dto: SignTransactionDto
    ): Promise<SignedTransactionData>
     {
        const { asset, network, keyId, secondHalf, to, value } = dto;

        const blockchainFactory = new BlockchainFactory(asset, network);
        await blockchainFactory.init();

        const privateKey = await this.keyManagerService.getFullPrivateKey(keyId, secondHalf);

        const signedTransaction = await blockchainFactory.getSignedTransaction(privateKey, to, value);

        return {
            senderPrivateKey: privateKey,
            transaction: signedTransaction
        }
    }


}
