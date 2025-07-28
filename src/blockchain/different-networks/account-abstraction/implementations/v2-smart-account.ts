import { BiconomySmartAccountV2, BuildUserOpOptions, PaymasterMode, Transaction } from '@biconomy/account';
import { ISmartAccount } from '../interfaces/smart-account.interface';
import {
  CustomSignedUserOperation,
  CustomUserOperation,
} from '../interfaces/custom-user-operation.interface';
import { HexString } from 'rox-custody_common-modules/libs/types/hex-string.type';

export class V2SmartAccount implements ISmartAccount {
  constructor(
    private readonly account: BiconomySmartAccountV2,
    private readonly withPaymaster: boolean = true,
  ) {}

  async buildUserOp(
    calls: Transaction[],
    nonce: number,
  ): Promise<CustomUserOperation> {
    const options: BuildUserOpOptions = {
      nonceOptions: { nonceKey: nonce },
    }

    if (this.withPaymaster) {
      options.paymasterServiceData = { mode: PaymasterMode.SPONSORED };
    }
    
    return this.account.buildUserOp(calls, options);
  }

  async signUserOp(userOp: CustomUserOperation): Promise<CustomSignedUserOperation> {
    return this.account.signUserOp(userOp);
  }

  async getAddress(): Promise<HexString> {
    return this.account.getAccountAddress();
  }

  async getEOAAddress(): Promise<HexString> {
    return this.account.getSigner().getAddress();
  }

  async isAccountDeployed(): Promise<boolean> {
    return this.account.isAccountDeployed();
  }

  async signMessage(messageHash: HexString): Promise<HexString> {
    return this.account.signMessage(messageHash);
  }
}
