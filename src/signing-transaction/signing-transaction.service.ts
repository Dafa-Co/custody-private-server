import { Injectable } from '@nestjs/common';
import { PrivateServerSignTransactionDto, SignTransactionDto } from '../../rox-custody_common-modules/libs/interfaces/sign-transaction.interface';
import { CustodySignedTransaction } from 'rox-custody_common-modules/libs/interfaces/custom-signed-transaction.type';
import { BlockchainFactoriesService } from 'src/blockchain/blockchain-strategies.service';

@Injectable()
export class SigningTransactionService {

    constructor(
        private readonly blockchainFactoriesService : BlockchainFactoriesService,
    ) {}


    async signTransaction(
        dto: PrivateServerSignTransactionDto
    ): Promise<CustodySignedTransaction>
     {
        const { asset, network, keyId, secondHalf, to, amount } = dto;

        const blockchainFactory = await this.blockchainFactoriesService.getStrategy(asset, network);

        return await blockchainFactory.getSignedTransaction(dto);
    }


}
