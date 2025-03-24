import { Injectable } from '@nestjs/common';
import { PrivateServerSignTransactionDto } from '../../rox-custody_common-modules/libs/interfaces/sign-transaction.interface';
import {
  CustodySignedTransaction,
} from 'rox-custody_common-modules/libs/interfaces/custom-signed-transaction.type';
import { BlockchainFactoriesService } from 'src/blockchain/blockchain-strategies.service';
import { KeysManagerService } from 'src/keys-manager/keys-manager.service';
import { SignContractTransactionDto } from 'rox-custody_common-modules/libs/interfaces/sign-contract-transaction.interface';
import { ContractSignerStrategiesService } from 'src/contract-signer/contract-signer-strategies.service';
import { ICustodySignedContractTransaction } from 'rox-custody_common-modules/libs/interfaces/contract-transaction.interface';

@Injectable()
export class SigningTransactionService {
  constructor(
    private readonly blockchainFactoriesService: BlockchainFactoriesService,
    private readonly contractSignerFactory: ContractSignerStrategiesService,
    private readonly keyManagerService: KeysManagerService,
  ) {}

  async signTransaction(
    dto: PrivateServerSignTransactionDto,
  ): Promise<CustodySignedTransaction> {
    const { asset, keyId, secondHalf, corporateId } = dto;

    const privateKey = await this.keyManagerService.getFullPrivateKey(
      keyId,
      secondHalf,
      corporateId,
    );

    const blockchainFactory =
      await this.blockchainFactoriesService.getStrategy(asset);

    return await blockchainFactory.getSignedTransaction(dto, privateKey);
  }

  async signContractTransaction(
    dto: SignContractTransactionDto,
  ): Promise<ICustodySignedContractTransaction> {
    const { keyId, corporateId, networkId } = dto;

    const privateKey = await this.keyManagerService.getFullPrivateKey(
      keyId,
      '',
      corporateId,
    );

    const contractSignerStrategy =
      await this.contractSignerFactory.getContractSignerStrategy(networkId);

    return await contractSignerStrategy.signContractTransaction(
      dto,
      privateKey,
    );
  }
}
