import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { KeysManagerModule } from './keys-manager/keys-manager.module';
import { ormConfigs } from './configs/database';
import { SigningTransactionModule } from './signing-transaction/signing-transaction.module';

@Module({
  imports: [
    TypeOrmModule.forRoot(ormConfigs),
    KeysManagerModule,
    SigningTransactionModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}