import { Injectable } from '@nestjs/common';
import { SignTransactionDto } from './dtos/sign-transaction.dto';
import { KeysManagerService } from '../keys-manager/keys-manager.service';
import { CustodySignedTransaction } from 'src/utils/types/custom-signed-transaction.type';
import { BlockchainFactoriesService } from 'src/blockchain/blockchain-strategies.service';

@Injectable()
export class SigningTransactionService {

    constructor(
        private readonly blockchainFactoriesService : BlockchainFactoriesService,
    ) {}


    async signTransaction(
        dto: SignTransactionDto
    ): Promise<CustodySignedTransaction>
     {
        const { asset, network, keyId, secondHalf, to, amount } = dto;

        const blockchainFactory = await this.blockchainFactoriesService.getStrategy(asset, network);

        return await blockchainFactory.getSignedTransaction(dto);
    }
}
