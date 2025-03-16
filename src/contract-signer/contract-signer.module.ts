import { Module } from '@nestjs/common';
import { NonceManagerModule } from 'src/nonce-manager/nonce-manager.module';
import { ContractSignerFactory } from './contract-signer.factory';
import { EVMContractSignerStrategy } from './strategies/evm-contract-signer.strategy';

@Module({
  imports: [NonceManagerModule],
  providers: [ContractSignerFactory, EVMContractSignerStrategy],
  exports: [ContractSignerFactory, EVMContractSignerStrategy],
})
export class ContractSignerModule {}
