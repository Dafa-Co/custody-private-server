import { Injectable, InternalServerErrorException } from '@nestjs/common';
import Web3 from 'web3';
import { getChainFromNetwork } from 'rox-custody_common-modules/blockchain/global-commons/get-network-chain';
import { SignContractTransactionDto } from 'rox-custody_common-modules/libs/interfaces/sign-contract-transaction.interface';
import { ICustodySignedContractTransaction } from 'rox-custody_common-modules/libs/interfaces/contract-transaction.interface';
import { IContractSignerStrategy } from '../contract-signer-strategy.interface';

@Injectable()
export class EVMContractSignerStrategy implements IContractSignerStrategy {
  private web3: Web3;

  constructor() {}

  async init(networkId: number): Promise<void> {
    const network = getChainFromNetwork(networkId);

    this.web3 = new Web3(network.chain.rpcUrls.default.http[0]);
  }

  async signContractTransaction(
    dto: SignContractTransactionDto,
    privateKey: string,
  ): Promise<ICustodySignedContractTransaction> {
    const { data, gas, gasPrice } = dto;

    const account = this.web3.eth.accounts.privateKeyToAccount(privateKey);

    const signedTx = await this.web3.eth.accounts.signTransaction(
      {
        data,
        gas: BigInt(gas.toString()),
        gasPrice: BigInt(gasPrice.toString()),
        from: account.address,
      },
      privateKey,
    );

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
