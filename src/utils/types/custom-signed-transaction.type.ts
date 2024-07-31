import { Transaction, UserOperationStruct } from "@biconomy/account";



export type SignedTransaction = UserOperationStruct;


export class CustodySignedTransaction {
    signedTransaction: SignedTransaction;
    bundlerUrl: string;
}
