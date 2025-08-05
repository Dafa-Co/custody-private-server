import { BiconomyAccountTypeEnum } from "../enums/biconomy-account-type.enum";
import { ISmartAccount } from "src/blockchain/different-networks/account-abstraction/interfaces/smart-account.interface";

export interface IConvertPrivateKeyToSmartAccountResult {
    account: ISmartAccount;
    type: BiconomyAccountTypeEnum;
    shouldMigrate?: boolean;
}