import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { KeysManagerModule } from './keys-manager/keys-manager.module';
import configs from './utils/configs/configs';
import { join } from 'path';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'mysql',
      logging: configs.NODE_ENV === 'DEVELOPMENT' ? true : false,
      synchronize: false,
      supportBigNumbers: true,
      host: configs.DATABASE_HOST,
      username: configs.DATABASE_USER,
      password: configs.DATABASE_PASSWORD,
      database: configs.DATABASE_NAME,
      port: +configs.DATABASE_PORT,
      entities: [join(__dirname, '**', '*.entity.{ts,js}')],
    }),
    KeysManagerModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
