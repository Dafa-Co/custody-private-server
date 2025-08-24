import { BadRequestException, Injectable } from '@nestjs/common';
import { getChainFromNetwork } from 'rox-custody_common-modules/blockchain/global-commons/get-network-chain';
import { NetworkCategory } from 'rox-custody_common-modules/blockchain/global-commons/networks-category';
import { EVMContractSignerStrategy } from './strategies/evm-contract-signer/evm-contract-signer.strategy';
import { IContractSignerStrategy } from './strategies/contract-signer-strategy.interface';
import { SolanaContractSignerStrategy } from './strategies/solana-contract-signer/solana-contract-signer.strategy';

@Injectable()
export class ContractSignerStrategiesService {
  constructor(
    private readonly evmContractSignerStrategy: EVMContractSignerStrategy,
    private readonly solanaContractSignerStrategy: SolanaContractSignerStrategy,
  ) { }

  async getContractSignerStrategy(
    networkId: number,
  ): Promise<IContractSignerStrategy> {
    const network = getChainFromNetwork(networkId);

    let strategy: IContractSignerStrategy;
    switch (network.category) {
      case NetworkCategory.EVM:
        strategy = this.evmContractSignerStrategy;
        break;
      case NetworkCategory.Solana:
        strategy = this.solanaContractSignerStrategy;
        break;
      default:
        throw new BadRequestException('Token type is not supported');
    }

    await strategy.init(networkId);

    return strategy;
  }
}
