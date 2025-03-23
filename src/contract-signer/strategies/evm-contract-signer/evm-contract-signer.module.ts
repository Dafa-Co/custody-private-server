import { Module } from '@nestjs/common';
import { EVMContractSignerStrategy } from './evm-contract-signer.strategy';

@Module({
  imports: [],
  providers: [EVMContractSignerStrategy],
  exports: [EVMContractSignerStrategy],
})
export class EVMContractSignerModule {}
