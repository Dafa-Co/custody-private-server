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
import { ICustodyMintTokenTransaction } from 'rox-custody_common-modules/libs/interfaces/mint-transaction.interface';
import { IPrivateServerMintTokenTransaction } from 'rox-custody_common-modules/libs/interfaces/sign-mint-token-transaction.interface';
import { IPrivateServerBurnTokenTransaction } from 'rox-custody_common-modules/libs/interfaces/sign-burn-token-transaction.interface';
import { ICustodyBurnTokenTransaction } from 'rox-custody_common-modules/libs/interfaces/burn-transaction.interface';

@Injectable()
export class SigningTransactionService {
  constructor(
    private readonly blockchainFactoriesService: BlockchainFactoriesService,
    private readonly contractSignerFactory: ContractSignerStrategiesService,
    private readonly keyManagerService: KeysManagerService,
  ) { }

  private async fillSignersPrivateKeys(
    signers: IPrivateServerTransactionSigner[],
    corporateId: number,
  ): Promise<IPrivateKeyFilledTransactionSigner[]> {
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
    const { asset, corporateId, protocol } = dto;

    const signers = await this.fillSignersPrivateKeys(dto.signers, corporateId);

    const blockchainFactory =
      await this.blockchainFactoriesService.getStrategy(asset, protocol);

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

  async signMintTokenTransaction(
    dto: IPrivateServerMintTokenTransaction,
  ): Promise<ICustodyMintTokenTransaction> {
    const { corporateId, networkId } = dto;

    const signers = await this.fillSignersPrivateKeys(dto.signers, corporateId);

    const contractSignerStrategy =
      await this.contractSignerFactory.getContractSignerStrategy(networkId);

    return await contractSignerStrategy.signMintTokenTransaction(
      {
        ...dto,
        signers,
      }
    );
  }

  async signBurnTokenTransaction(
    dto: IPrivateServerBurnTokenTransaction,
  ): Promise<ICustodyBurnTokenTransaction> {
    const { corporateId, networkId } = dto;

    const signers = await this.fillSignersPrivateKeys(dto.signers, corporateId);

    const contractSignerStrategy =
      await this.contractSignerFactory.getContractSignerStrategy(networkId);

    return await contractSignerStrategy.signBurnTokenTransaction(
      {
        ...dto,
        signers,
      }
    );
  }

  async signSwapTransaction(
    dto: PrivateServerSignSwapTransactionDto,
  ): Promise<CustodySignedTransaction> {
    const { asset, corporateId, protocol } = dto;

    const signers = await this.fillSignersPrivateKeys(dto.signers, corporateId);

    const blockchainFactory =
      await this.blockchainFactoriesService.getStrategy(asset, protocol);

    return await blockchainFactory.getSignedSwapTransaction({
      ...dto,
      signers,
    });
  }
}
