import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { KeysManagerModule } from './keys-manager/keys-manager.module';
import { ormConfigs } from './configs/database';
import { SigningTransactionModule } from './signing-transaction/signing-transaction.module';
import envVarsSchema from './configs/validate-config';
import { ConfigModule } from '@nestjs/config';
import { BlockchainModule } from './blockchain/blockchain.module';
import { NonceManagerModule } from './nonce-manager/nonce-manager.module';
import { CustodyLoggerModule } from 'rox-custody_common-modules/libs/services/logger/custody-logger.module';


@Module({
  imports: [
    TypeOrmModule.forRoot(ormConfigs),
    ConfigModule.forRoot({ isGlobal: true, validationSchema: envVarsSchema }),
    KeysManagerModule,
    SigningTransactionModule,
    BlockchainModule,
    NonceManagerModule,
    CustodyLoggerModule
  ],
  controllers: [],
})
export class AppModule { }
