import { ICustodySignedContractTransaction } from 'rox-custody_common-modules/libs/interfaces/contract-transaction.interface';
import { IPrivateKeyFilledSignContractTransaction } from 'rox-custody_common-modules/libs/interfaces/sign-contract-transaction.interface';
import { IPrivateKeyFilledMintTokenTransaction } from 'rox-custody_common-modules/libs/interfaces/sign-mint-token-transaction.interface';

export interface IContractSignerStrategy {
  init(networkId: number): Promise<void>;
  signContractTransaction(
    dto: IPrivateKeyFilledSignContractTransaction,
  ): Promise<ICustodySignedContractTransaction>;
  signMintTokenTransaction(
    dto: IPrivateKeyFilledMintTokenTransaction,
  ): Promise<ICustodySignedContractTransaction>;
}
