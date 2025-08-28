import { Module } from '@nestjs/common';
import { SolanaContractSignerStrategy } from './solana-contract-signer.strategy';

@Module({
  imports: [],
  providers: [SolanaContractSignerStrategy],
  exports: [SolanaContractSignerStrategy],
})
export class SolanaContractSignerModule {}
