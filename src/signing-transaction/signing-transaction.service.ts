import { Injectable } from '@nestjs/common';
import { SignTransactionDto } from './dtos/sign-transaction.dto';
import { KeysManagerService } from '../keys-manager/keys-manager.service';
import { BlockchainFactory } from 'src/blockchain/blockchain.factory';
import { CustodySignedTransaction, SignedTransaction } from 'src/utils/types/custom-signed-transaction.type';
import { TronBlockchain } from '../blockchain/diffrent-networks/tron-blockchain';

@Injectable()
export class SigningTransactionService {

    constructor(
        private readonly keyManagerService: KeysManagerService
    ) {}


    async signTransaction(
        dto: SignTransactionDto
    ): Promise<CustodySignedTransaction>
     {
        const { asset, network, keyId, secondHalf, to, amount, gasStationWalletKeyId } = dto;
          const privateKey = await this.keyManagerService.getFullPrivateKey(keyId, secondHalf);
          const blockchainFactory = new BlockchainFactory(asset, network);
          await blockchainFactory.init(privateKey);
          const signedTrx = await blockchainFactory.getSignedTransaction(privateKey, to, amount);
          return signedTrx
    }
}
