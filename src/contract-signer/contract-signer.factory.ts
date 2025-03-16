import { BadRequestException, Injectable } from '@nestjs/common';
import { NonceManagerService } from 'src/nonce-manager/nonce-manager.service';
import { ContractSignerStrategy } from './strategies/abstract-contract-signer.strategy';
import { getChainFromNetwork } from 'rox-custody_common-modules/blockchain/global-commons/get-network-chain';
import { NetworkCategory } from 'rox-custody_common-modules/blockchain/global-commons/networks-gategory';
import { EVMContractSignerStrategy } from './strategies/evm-contract-signer.strategy';

@Injectable()
export class ContractSignerFactory {
  constructor(private readonly nonceManager: NonceManagerService) {}

  async getContractSignerStrategy(
    networkId: number,
  ): Promise<ContractSignerStrategy> {
    const network = getChainFromNetwork(networkId);

    let strategy: ContractSignerStrategy;
    switch (network.category) {
      case NetworkCategory.EVM:
        strategy = new EVMContractSignerStrategy(this.nonceManager);
        break;
      default:
        throw new BadRequestException('Token type is not supported');
    }

    await strategy.init(networkId);

    return strategy;
  }
}
