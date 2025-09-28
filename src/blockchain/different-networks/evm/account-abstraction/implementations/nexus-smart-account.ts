import { Transaction } from '@biconomy/account';
import { ISmartAccount } from '../interfaces/smart-account.interface';
import { HexString } from 'rox-custody_common-modules/libs/types/hex-string.type';
import { NexusClient } from '@biconomy/abstractjs';
import { ContractFunctionExecutionError } from 'viem';
import { UnretriableInternalServerErrorException } from 'rox-custody_common-modules/libs/errors/unretriable-exceptions';
import { softJsonStringify } from 'rox-custody_common-modules/libs/utils/soft-json-stringify.utils';
import { CustomSignedUserOperation, CustomUserOperation } from 'rox-custody_common-modules/libs/interfaces/custom-user-operation.interface';

export class NexusSmartAccount implements ISmartAccount {
  constructor(private readonly account: NexusClient) {}

  async buildUserOp(
    calls: Transaction[],
    nonce: number,
  ): Promise<CustomUserOperation> {
    const userOp = await this.account.prepareUserOperation({
      calls,
      nonce,
    } as any);

    const keys = ["paymasterPostOpGasLimit", "paymasterVerificationGasLimit"];

    for (const key of keys) {
      if (userOp[key] && userOp[key] !== "0x") {
        userOp[key] = `0x${BigInt(userOp[key]).toString(
          16
        )}` as `0x${string}`;
      }
    }

    return userOp;
  }

  async signUserOp(
    userOp: CustomUserOperation,
  ): Promise<CustomSignedUserOperation> {
    const signature = await this.account.account.signUserOperation(
      userOp as any,
    );

    return {
      ...userOp,
      signature,
    };
  }

  getAddress(): HexString {
    return this.account.account.address;
  }

  getEOAAddress(): HexString {
    return this.account.account.signer.address;
  }

  async isAccountDeployed(): Promise<boolean> {
    try {
      await this.account.getInstalledValidators();

      return true;
    } catch (error) {
      if (error instanceof ContractFunctionExecutionError) {
        return false;
      }

      const errorMessage = error instanceof Error ? error.message : softJsonStringify(error);

      throw new UnretriableInternalServerErrorException(errorMessage);
    }
  }

  async signMessage(message: HexString): Promise<HexString> {
    return this.account.account.signMessage({ message });
  }
}
