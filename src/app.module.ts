import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { KeysManagerModule } from './keys-manager/keys-manager.module';
import { ormConfigs } from './configs/database';
import { SigningTransactionModule } from './signing-transaction/signing-transaction.module';
import envVarsSchema from './configs/validate-config';
import { ConfigModule } from '@nestjs/config';
import { BlockchainModule } from './blockchain/blockchain.module';


@Module({
  imports: [
    TypeOrmModule.forRoot(ormConfigs),
    ConfigModule.forRoot({ isGlobal: true, validationSchema: envVarsSchema }),
    KeysManagerModule,
    SigningTransactionModule,
    BlockchainModule,
  ],
  controllers: [],
})
export class AppModule {}
