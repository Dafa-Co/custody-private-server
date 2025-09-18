import { ICustodySignedContractTransaction } from 'rox-custody_common-modules/libs/interfaces/contract-transaction.interface';
import { IPrivateKeyFilledSignContractTransaction } from 'rox-custody_common-modules/libs/interfaces/sign-contract-transaction.interface';
import { IPrivateKeyFilledMintTokenTransaction } from 'rox-custody_common-modules/libs/interfaces/sign-mint-token-transaction.interface';
import { IPrivateKeyFilledBurnTokenTransaction } from 'rox-custody_common-modules/libs/interfaces/sign-burn-token-transaction.interface';
import { ICustodyBurnTokenTransaction } from 'rox-custody_common-modules/libs/interfaces/burn-transaction.interface';
import { ICustodyMintOrBurnTokenTransaction } from 'rox-custody_common-modules/libs/interfaces/mint-transaction.interface';

export interface IContractSignerStrategy {
  init(networkId: number): Promise<void>;
  signContractTransaction(
    dto: IPrivateKeyFilledSignContractTransaction,
  ): Promise<ICustodySignedContractTransaction>;
  signMintTokenTransaction(
    dto: IPrivateKeyFilledMintTokenTransaction,
  ): Promise<ICustodyMintOrBurnTokenTransaction>;
  signBurnTokenTransaction(
    dto: IPrivateKeyFilledBurnTokenTransaction,
  ): Promise<ICustodyBurnTokenTransaction>;
}
