import { Injectable } from '@nestjs/common';
import {
  IPrivateKeyFilledTransactionSigner,
  IPrivateServerTransactionSigner,
  PrivateServerSignSwapTransactionDto,
  PrivateServerSignTransactionDto,
} from '../../rox-custody_common-modules/libs/interfaces/sign-transaction.interface';
import {
  CustodySignedTransaction,
} from 'rox-custody_common-modules/libs/interfaces/custom-signed-transaction.type';
import { BlockchainFactoriesService } from 'src/blockchain/blockchain-strategies.service';
import { KeysManagerService } from 'src/keys-manager/keys-manager.service';
import { ContractSignerStrategiesService } from 'src/contract-signer/contract-signer-strategies.service';
import { ICustodySignedContractTransaction } from 'rox-custody_common-modules/libs/interfaces/contract-transaction.interface';
import { IPrivateServerSignContractTransaction } from 'rox-custody_common-modules/libs/interfaces/sign-contract-transaction.interface';
import { CustodyLogger } from 'rox-custody_common-modules/libs/services/logger/custody-logger.service';

@Injectable()
export class SigningTransactionService {
  constructor(
    private readonly blockchainFactoriesService: BlockchainFactoriesService,
    private readonly contractSignerFactory: ContractSignerStrategiesService,
    private readonly keyManagerService: KeysManagerService,
    private readonly logger: CustodyLogger,
  ) { }

  private async fillSignersPrivateKeys(
    signers: IPrivateServerTransactionSigner[],
    corporateId: number,
  ): Promise<IPrivateKeyFilledTransactionSigner[]> {
    this.logger.debug(`signers: ${JSON.stringify(signers)}`);
    return Promise.all(
      signers.map(async (signer) => {
        const privateKey = await this.keyManagerService.getFullPrivateKey(
          signer.keyId,
          signer.keyPart,
          corporateId,
        );

        return {
          ...signer,
          privateKey,
        };
      }),
    );
  }

  async signTransaction(
    dto: PrivateServerSignTransactionDto,
  ): Promise<CustodySignedTransaction> {
    const { asset, corporateId } = dto;

    const signers = await this.fillSignersPrivateKeys(dto.signers, corporateId);

    const blockchainFactory =
      await this.blockchainFactoriesService.getStrategy(asset);

    return await blockchainFactory.getSignedTransaction({
      ...dto,
      signers,
    });
  }

  async signContractTransaction(
    dto: IPrivateServerSignContractTransaction,
  ): Promise<ICustodySignedContractTransaction> {
    const { corporateId, networkId } = dto;

    const signers = await this.fillSignersPrivateKeys(dto.signers, corporateId);

    const contractSignerStrategy =
      await this.contractSignerFactory.getContractSignerStrategy(networkId);

    return await contractSignerStrategy.signContractTransaction(
      {
        ...dto,
        signers,
      }
    );
  }

  async signSwapTransaction(
    dto: PrivateServerSignSwapTransactionDto,
  ): Promise<CustodySignedTransaction> {
    const { asset, corporateId } = dto;

    const signers = await this.fillSignersPrivateKeys(dto.signers, corporateId);

    const blockchainFactory =
      await this.blockchainFactoriesService.getStrategy(asset);

    return await blockchainFactory.getSignedSwapTransaction({
      ...dto,
      signers,
    });
  }
}
