import { ISmartAccount } from "src/blockchain/different-networks/evm/account-abstraction/interfaces/smart-account.interface";
import { BiconomyAccountTypeEnum } from "../enums/biconomy-account-type.enum";

export interface IConvertPrivateKeyToSmartAccountResult {
    account: ISmartAccount;
    type: BiconomyAccountTypeEnum;
    shouldMigrate?: boolean;
}