import { Module } from '@nestjs/common';
import { NonceManagerModule } from 'src/nonce-manager/nonce-manager.module';
import { EVMContractSignerStrategy } from './evm-contract-signer.strategy';

@Module({
  imports: [NonceManagerModule],
  providers: [EVMContractSignerStrategy],
  exports: [EVMContractSignerStrategy],
})
export class EVMContractSignerModule {}
