import { BigNumberish } from "@biconomy/abstractjs";
import { BytesLike } from "@biconomy/account";
import { HexString } from "rox-custody_common-modules/libs/types/hex-string.type";
import { Address } from "viem";

export interface CustomUserOperation {
  callData?: BytesLike;
  callGasLimit?: BigNumberish;
  factory?: BytesLike;
  factoryData?: BytesLike;
  maxFeePerGas?: BigNumberish;
  maxPriorityFeePerGas?: BigNumberish;
  nonce?: BigNumberish;
  paymasterData?: BytesLike;
  paymasterPostOpGasLimit?: BigNumberish;
  paymasterVerificationGasLimit?: BigNumberish;
  preVerificationGas?: BigNumberish;
  sender?: Address | string;
  verificationGasLimit?: BigNumberish;
};

export interface CustomSignedUserOperation extends CustomUserOperation {
  signature: BytesLike;
};

export interface NexusCustomUserOperation {
  callData: HexString;
  callGasLimit?: bigint;
  factory?: Address | undefined;
  factoryData?: HexString | undefined;
  maxFeePerGas?: bigint;
  maxPriorityFeePerGas?: bigint;
  nonce: bigint;
  paymasterData?: HexString | undefined;
  paymasterPostOpGasLimit?: bigint | undefined;
  paymasterVerificationGasLimit?: bigint | undefined;
  preVerificationGas?: bigint;
  sender: Address;
  verificationGasLimit?: bigint;
};

export interface NexusCustomSignedUserOperation extends NexusCustomUserOperation {
  signature: HexString;
};