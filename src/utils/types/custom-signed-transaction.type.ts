import { Transaction, UserOperationStruct } from "@biconomy/account";



export type BitcoinTransaction = {
    fees: number;
    signedTransaction: string;
}

export type SignedTransaction = UserOperationStruct | BitcoinTransaction;



export class CustodySignedTransaction {
    signedTransaction: SignedTransaction;
    bundlerUrl: string;
}
