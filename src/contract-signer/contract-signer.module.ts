import { Module } from '@nestjs/common';
import { ContractSignerStrategiesService } from './contract-signer-strategies.service';
import { EVMContractSignerModule } from './strategies/evm-contract-signer/evm-contract-signer.module';

@Module({
  imports: [EVMContractSignerModule],
  providers: [ContractSignerStrategiesService],
  exports: [ContractSignerStrategiesService],
})
export class ContractSignerModule {}
