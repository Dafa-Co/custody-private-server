import { TransactionStatus } from "../../utils/enums/transaction.enum";
import { SignedTransaction } from "../../utils/types/custom-signed-transaction.type";

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
      fees: number;
      blockchain_transaction_id: string;
      encoded_payload: string;
      error?: string;
    }
}

export interface IBlockChain {
    init(): Promise<void>;
    createWallet(): Promise<IWalletKeys>;
    checkBalance(publicAddress: string): Promise<number>;
    // TODO: need to return ITransferTransactionEnum from the transfer function
    transfer(privateKey: string, to: string, amount: number): Promise<ITransferTransactionEnum> ;
    getGasPrice(): Promise<number>;
    // getMinerFee(): Promise<number>;
    getMinimumAmount(): Promise<number>;
    isValidTransaction(amount: number, balance: number): Promise<ValidateTransactionEnum>;
    isValidAddress(address: string): boolean;
    getDollarValue(amount: number): Promise<number>;
    // disconnect(): void;
    getSignedTransaction(privateKey: string, to: string, amount: number): Promise<SignedTransaction>;
    sendSignedTransaction(signedTransaction: SignedTransaction): Promise<ITransferTransactionEnum>;
}


export const validateTransactionResponse = (amount: number, balance: number, gas: number = 0, minimumAmount: number = (0)): ValidateTransactionEnum => {
    if (
        amount >= minimumAmount &&
        amount + gas <= balance
      ) {
        return ValidateTransactionEnum.valid;
      }
      if (amount < minimumAmount) {
        return ValidateTransactionEnum.dustAmount;
      } else if (amount + gas > balance) {
        return ValidateTransactionEnum.insufficientBalance;
      } else {
        return ValidateTransactionEnum.blockChainError;
      }
}
