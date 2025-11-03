import { ICustodySignedContractTransaction } from 'rox-custody_common-modules/libs/interfaces/contract-transaction.interface';
import { IPrivateKeyFilledSignContractTransaction } from 'rox-custody_common-modules/libs/interfaces/sign-contract-transaction.interface';
import { IPrivateKeyFilledMintOrBurnTokenTransaction } from 'rox-custody_common-modules/libs/interfaces/sign-mint-token-transaction.interface';
import { ICustodyMintOrBurnTokenTransaction } from 'rox-custody_common-modules/libs/interfaces/mint-transaction.interface';
import { IPrivateKeyFilledTransferNFTTransaction } from 'rox-custody_common-modules/libs/interfaces/sign-transfer-nft-transaction.interface';
import { ICustodyTransferNFTTransaction } from 'rox-custody_common-modules/libs/interfaces/transfer-nft-transaction.interface';

export interface IContractSignerStrategy {
  init(networkId: number): Promise<void>;
  signContractTransaction(
    dto: IPrivateKeyFilledSignContractTransaction,
  ): Promise<ICustodySignedContractTransaction>;
  signMintTokenTransaction(
    dto: IPrivateKeyFilledMintOrBurnTokenTransaction,
  ): Promise<ICustodyMintOrBurnTokenTransaction>;
  signBurnTokenTransaction(
    dto: IPrivateKeyFilledMintOrBurnTokenTransaction,
  ): Promise<ICustodyMintOrBurnTokenTransaction>;
  signTransferNFTTransaction(
    dto: IPrivateKeyFilledTransferNFTTransaction,
  ): Promise<ICustodyTransferNFTTransaction>;
}
