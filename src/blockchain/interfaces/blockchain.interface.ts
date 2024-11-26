import { CommonAsset } from "rox-custody_common-modules/libs/entities/asset.entity";
import { TransactionStatus } from "../../utils/enums/transaction.enum";
import { CustodySignedTransaction, SignedTransaction } from "../../../rox-custody_common-modules/libs/interfaces/custom-signed-transaction.type";
import { CommonNetwork } from "rox-custody_common-modules/libs/entities/network.entity";
import { SignTransactionDto } from "rox-custody_common-modules/libs/interfaces/sign-transaction.interface";

export interface IWalletKeys {
    privateKey: string;
    address: string;
}

export enum ValidateTransactionEnum {
 valid = 1,
 dustAmount = 2,
 insufficientBalance = 3,
 blockChainError = 4,
}

export interface ITransferTransactionEnum {
    status: TransactionStatus;
    data: {
      fees?: number;
      blockchain_transaction_id?: string;
      error?: string;
    }
}

export interface InitBlockChainPrivateServerStrategies {
  asset: CommonAsset;
  network: CommonNetwork;
}

export interface IBlockChainPrivateServer {
  init(initData: InitBlockChainPrivateServerStrategies): Promise<void>;
  createWallet(): Promise<IWalletKeys>;
  getSignedTransaction(
    dto: SignTransactionDto
  ): Promise<CustodySignedTransaction>;
}

export const validateTransactionResponse = (
  amount: number,
  balance: number,
  gas: number = 0,
  minimumAmount: number = 0,
): ValidateTransactionEnum => {
  if (amount >= minimumAmount && amount + gas <= balance) {
    return ValidateTransactionEnum.valid;
  }
  if (amount < minimumAmount) {
    return ValidateTransactionEnum.dustAmount;
  } else if (amount + gas > balance) {
    return ValidateTransactionEnum.insufficientBalance;
  } else {
    return ValidateTransactionEnum.blockChainError;
  }
};
