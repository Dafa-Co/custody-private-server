import { BadRequestException, Injectable } from '@nestjs/common';
import { ContractSignerStrategy } from './strategies/abstract-contract-signer.strategy';
import { getChainFromNetwork } from 'rox-custody_common-modules/blockchain/global-commons/get-network-chain';
import { NetworkCategory } from 'rox-custody_common-modules/blockchain/global-commons/networks-gategory';
import { EVMContractSignerStrategy } from './strategies/evm-contract-signer/evm-contract-signer.strategy';

@Injectable()
export class ContractSignerStrategiesService {
  constructor(
    private readonly evmContractSignerStrategy: EVMContractSignerStrategy,
  ) {}

  async getContractSignerStrategy(
    networkId: number,
  ): Promise<ContractSignerStrategy> {
    const network = getChainFromNetwork(networkId);

    let strategy: ContractSignerStrategy;
    switch (network.category) {
      case NetworkCategory.EVM:
        strategy = this.evmContractSignerStrategy;
        break;
      default:
        throw new BadRequestException('Token type is not supported');
    }

    await strategy.init(networkId);

    return strategy;
  }
}
