import { Injectable, InternalServerErrorException } from '@nestjs/common';
import Web3 from 'web3';
import { getChainFromNetwork } from 'rox-custody_common-modules/blockchain/global-commons/get-network-chain';
import { SignContractTransactionDto } from 'rox-custody_common-modules/libs/interfaces/sign-contract-transaction.interface';
import { CustodySignedContractTransaction } from 'rox-custody_common-modules/libs/interfaces/custom-signed-transaction.type';
import { NonceManagerService } from 'src/nonce-manager/nonce-manager.service';
import { ContractSignerStrategy } from '../abstract-contract-signer.strategy';

@Injectable()
export class EVMContractSignerStrategy extends ContractSignerStrategy {
  private web3: Web3;

  constructor(private readonly nonceManager: NonceManagerService) {
    super();
  }

  async init(networkId: number): Promise<void> {
    const network = getChainFromNetwork(networkId);

    this.web3 = new Web3(network.chain.rpcUrls.default.http[0]);
  }

  async signContractTransaction(
    dto: SignContractTransactionDto,
    privateKey: string,
  ): Promise<CustodySignedContractTransaction> {
    const { data, gas, gasPrice } = dto;

    const account = this.web3.eth.accounts.privateKeyToAccount(privateKey);

    const signedTx = await this.web3.eth.accounts.signTransaction(
      {
        data,
        gas,
        gasPrice,
        from: account.address,
      },
      privateKey,
    );

    if (!signedTx.rawTransaction) {
      throw new InternalServerErrorException('Failed to sign transaction');
    }

    return {
      signedTransaction: signedTx.rawTransaction,
      error: null,
    };
  }
}
