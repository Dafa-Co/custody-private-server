import { Transaction, UserOperationStruct } from "@biconomy/account";



export type SignedTransaction = UserOperationStruct | string;


export class CustodySignedTransaction {
    signedTransaction: SignedTransaction;
    bundlerUrl: string;
}
