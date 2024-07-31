import { TransactionStatus } from "../../utils/enums/transaction.enum";
import { CustodySignedTransaction, SignedTransaction } from "../../utils/types/custom-signed-transaction.type";

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

export interface IBlockChainPrivateServer {
  init(): Promise<void>;
  createWallet(): Promise<IWalletKeys>;
  getSignedTransaction(
    privateKey: string,
    to: string,
    amount: number,
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
