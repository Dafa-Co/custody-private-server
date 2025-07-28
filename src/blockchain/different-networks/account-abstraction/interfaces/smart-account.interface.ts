import { Transaction } from "@biconomy/account";
import { CustomSignedUserOperation, CustomUserOperation } from "./custom-user-operation.interface";
import { HexString } from "rox-custody_common-modules/libs/types/hex-string.type";

export interface ISmartAccount {
  buildUserOp(calls: Transaction[], nonce: number): Promise<CustomUserOperation>;
  signUserOp(userOp: CustomUserOperation): Promise<CustomSignedUserOperation>;
  getAddress(): HexString | Promise<HexString>;
  getEOAAddress(): HexString | Promise<HexString>;
  isAccountDeployed(): Promise<boolean>;
  signMessage(message: HexString): Promise<HexString>;
}
