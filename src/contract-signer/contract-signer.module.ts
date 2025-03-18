import { Module } from '@nestjs/common';
import { ContractSignerFactory } from './contract-signer.factory';
import { EVMContractSignerModule } from './strategies/evm-contract-signer/evm-contract-signer.module';

@Module({
  imports: [EVMContractSignerModule],
  providers: [ContractSignerFactory],
  exports: [ContractSignerFactory],
})
export class ContractSignerModule {}
