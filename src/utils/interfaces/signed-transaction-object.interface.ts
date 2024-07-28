import { SignedTransaction } from "../types/custom-signed-transaction.type";


export class SignedTransactionData {
    transaction : SignedTransaction;
    senderPrivateKey : string;
}
