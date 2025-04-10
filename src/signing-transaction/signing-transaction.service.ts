import { Injectable } from '@nestjs/common';
import {
  PrivateServerSignTransactionDto,
  SignTransactionDto,
} from '../../rox-custody_common-modules/libs/interfaces/sign-transaction.interface';
import { CustodySignedTransaction } from 'rox-custody_common-modules/libs/interfaces/custom-signed-transaction.type';
import { BlockchainFactoriesService } from 'src/blockchain/blockchain-strategies.service';
import { KeysManagerService } from 'src/keys-manager/keys-manager.service';

@Injectable()
export class SigningTransactionService {
  constructor(
    private readonly blockchainFactoriesService: BlockchainFactoriesService,
    private readonly keyManagerService: KeysManagerService,
  ) {}

  async signTransaction(
    dto: PrivateServerSignTransactionDto,
  ): Promise<CustodySignedTransaction> {
    const { asset, keyId, keyPart, corporateId } = dto;

    const privateKey = await this.keyManagerService.getFullPrivateKey(
      keyId,
      keyPart,
      corporateId,
    );

    const blockchainFactory = await this.blockchainFactoriesService.getStrategy(
      asset,
    );

    return await blockchainFactory.getSignedTransaction(dto, privateKey);
  }
}
