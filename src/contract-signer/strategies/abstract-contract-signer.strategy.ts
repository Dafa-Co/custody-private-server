import { CustodySignedContractTransaction } from 'rox-custody_common-modules/libs/interfaces/custom-signed-transaction.type';
import { SignContractTransactionDto } from 'rox-custody_common-modules/libs/interfaces/sign-contract-transaction.interface';

export abstract class ContractSignerStrategy {
  abstract init(networkId: number): Promise<void>;
  abstract signContractTransaction(
    dto: SignContractTransactionDto,
    privateKey: string,
  ): Promise<CustodySignedContractTransaction>;
}
