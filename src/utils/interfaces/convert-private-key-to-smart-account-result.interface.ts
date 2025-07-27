import { NexusClient } from "@biconomy/abstractjs";
import { BiconomySmartAccountV2 } from "@biconomy/account";
import { BiconomyAccountTypeEnum } from "../enums/biconomy-account-type.enum";

export interface IConvertPrivateKeyToSmartAccountResult {
    account: BiconomySmartAccountV2 | NexusClient;
    type: BiconomyAccountTypeEnum;
    shouldMigrate?: boolean;
}