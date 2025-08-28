import { Module } from '@nestjs/common';
import { ContractSignerStrategiesService } from './contract-signer-strategies.service';
import { EVMContractSignerModule } from './strategies/evm-contract-signer/evm-contract-signer.module';
import { SolanaContractSignerModule } from './strategies/solana-contract-signer/solana-contract-signer.module';

@Module({
  imports: [EVMContractSignerModule, SolanaContractSignerModule],
  providers: [ContractSignerStrategiesService],
  exports: [ContractSignerStrategiesService],
})
export class ContractSignerModule {}
