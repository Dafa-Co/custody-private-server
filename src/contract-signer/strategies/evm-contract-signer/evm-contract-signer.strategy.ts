/* eslint-disable @typescript-eslint/no-unused-vars */
import { Injectable, InternalServerErrorException, NotImplementedException } from '@nestjs/common';
import Web3 from 'web3';
import { getChainFromNetwork } from 'rox-custody_common-modules/blockchain/global-commons/get-network-chain';
import { ICustodySignedEVMContractTransaction } from 'rox-custody_common-modules/libs/interfaces/contract-transaction.interface';
import { IContractSignerStrategy } from '../contract-signer-strategy.interface';
import { IPrivateKeyFilledSignEVMContractTransaction } from 'rox-custody_common-modules/libs/interfaces/sign-contract-transaction.interface';
import { SignerTypeEnum } from 'rox-custody_common-modules/libs/enums/signer-type.enum';
import { getSignerFromSigners } from 'src/utils/helpers/get-signer-from-signers.helper';
import { ICustodyMintOrBurnTokenTransaction } from 'rox-custody_common-modules/libs/interfaces/mint-transaction.interface';
import { IPrivateKeyFilledMintOrBurnTokenTransaction } from 'rox-custody_common-modules/libs/interfaces/sign-mint-token-transaction.interface';
import { CustodyLogger } from 'rox-custody_common-modules/libs/services/logger/custody-logger.service';

@Injectable()
export class EVMContractSignerStrategy implements IContractSignerStrategy {
  private web3: Web3;

  constructor(
    private readonly logger: CustodyLogger,
  ) {}

  signBurnTokenTransaction(dto: IPrivateKeyFilledMintOrBurnTokenTransaction): Promise<ICustodyMintOrBurnTokenTransaction> {
    throw new NotImplementedException('Method not implemented.');
  }
  signMintTokenTransaction(dto: IPrivateKeyFilledMintOrBurnTokenTransaction): Promise<ICustodyMintOrBurnTokenTransaction> {
    throw new NotImplementedException('Method not implemented');
  }

  async init(networkId: number): Promise<void> {
    const network = getChainFromNetwork(networkId);

    this.web3 = new Web3(network.chain.rpcUrls.default.http[0]);
  }

  async signContractTransaction(
    dto: IPrivateKeyFilledSignEVMContractTransaction,
  ): Promise<ICustodySignedEVMContractTransaction> {
    const { data, gas, gasPrice } = dto;

    this.logger.info(`Signing EVM contract transaction, gas: ${gas}, gasPrice: ${gasPrice}`);

    const sender = getSignerFromSigners(dto.signers, SignerTypeEnum.PAYER, true);

    const privateKey = sender.privateKey;

    const account = this.web3.eth.accounts.privateKeyToAccount(privateKey);

    this.logger.info(`Signing transaction from account: ${account.address}`);

    const signedTx = await this.web3.eth.accounts.signTransaction(
      {
        data,
        gas: BigInt(gas.toString()),
        gasPrice: BigInt(gasPrice.toString()),
        from: account.address,
      },
      privateKey,
    );

    this.logger.info(`Signed transaction: ${JSON.stringify(signedTx)}`);

    if (!signedTx.rawTransaction || !signedTx.transactionHash) {
      throw new InternalServerErrorException('Failed to sign transaction');
    }

    return {
      signedTransaction: signedTx.rawTransaction,
      transactionHash: signedTx.transactionHash,
      error: null,
    };
  }
}
