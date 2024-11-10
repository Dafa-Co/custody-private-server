import { Transaction, UserOperationStruct } from "@biconomy/account";
import { SignedTransaction as TronSignedTransaction} from 'node_modules/tronweb/src/types/Transaction.js';

export type BitcoinTransaction = {
    fees: number;
    signedTransaction: string;
}

export type SignedTransaction = UserOperationStruct | BitcoinTransaction | TronSignedTransaction ;



export class CustodySignedTransaction {
    signedTransaction: SignedTransaction;
    bundlerUrl: string;
}
