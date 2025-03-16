import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ContractSignerStrategy } from './abstract-contract-signer.strategy';
import Web3 from 'web3';
import { getChainFromNetwork } from 'rox-custody_common-modules/blockchain/global-commons/get-network-chain';
import { secretsTypes, throwOrReturn } from 'account-abstraction.secret';
import { NonceManagerService } from 'src/nonce-manager/nonce-manager.service';
import { SignContractTransactionDto } from 'rox-custody_common-modules/libs/interfaces/sign-contract-transaction.interface';
import { CustodySignedTransaction } from 'rox-custody_common-modules/libs/interfaces/custom-signed-transaction.type';

@Injectable()
export class EVMContractSignerStrategy extends ContractSignerStrategy {
  private bundlerUrl: string;
  private web3: Web3;

  constructor(private readonly nonceManager: NonceManagerService) {
    super();
  }

  async init(networkId: number): Promise<void> {
    const network = getChainFromNetwork(networkId);

    const bundlerSecret = network.isTest
      ? throwOrReturn(secretsTypes.bundler, 'testnet')
      : throwOrReturn(secretsTypes.bundler, 'mainnet');

    if (!bundlerSecret) {
      throw new InternalServerErrorException('Bundler secret not found');
    }

    this.bundlerUrl = `https://bundler.biconomy.io/api/v2/${network.chain.id}/${bundlerSecret}`;
    this.web3 = new Web3(network.chain.rpcUrls.default.http[0]);
  }

  async signContractTransaction(
    dto: SignContractTransactionDto,
    privateKey: string,
  ): Promise<CustodySignedTransaction> {
    const { keyId, transactionId, data, gas, gasPrice } = dto;

    const [nonce] = await Promise.all([
      this.nonceManager.getNonce(keyId, dto.networkId),
    ]);

    const account = this.web3.eth.accounts.privateKeyToAccount(privateKey);

    const signedTx = await this.web3.eth.accounts.signTransaction(
      {
        data,
        gas,
        gasPrice,
        from: account.address,
        nonce,
      },
      privateKey,
    );

    if (!signedTx.rawTransaction) {
      throw new Error('Failed to sign transaction');
    }

    return {
      bundlerUrl: this.bundlerUrl,
      signedTransaction: signedTx.rawTransaction,
      transactionId: transactionId,
      error: null,
    };
  }
}
