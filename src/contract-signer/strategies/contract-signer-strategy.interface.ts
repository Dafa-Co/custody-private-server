import { ICustodySignedContractTransaction } from 'rox-custody_common-modules/libs/interfaces/contract-transaction.interface';
import { SignContractTransactionDto } from 'rox-custody_common-modules/libs/interfaces/sign-contract-transaction.interface';

export interface IContractSignerStrategy {
  init(networkId: number): Promise<void>;
  signContractTransaction(
    dto: SignContractTransactionDto,
    privateKey: string,
  ): Promise<ICustodySignedContractTransaction>;
}
