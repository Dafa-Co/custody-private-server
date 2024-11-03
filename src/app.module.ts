import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { KeysManagerModule } from './keys-manager/keys-manager.module';
import { ormConfigs } from './configs/database';
import { SigningTransactionModule } from './signing-transaction/signing-transaction.module';
import envVarsSchema from './configs/validate-config';
import { ConfigModule } from '@nestjs/config';


@Module({
  imports: [
    TypeOrmModule.forRoot(ormConfigs),
    ConfigModule.forRoot({ isGlobal: true, validationSchema: envVarsSchema }),
    KeysManagerModule,
    SigningTransactionModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
