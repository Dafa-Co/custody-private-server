import { Module } from '@nestjs/common';
import { KeysManagerController } from './keys-manager.controller';
import { KeysManagerService } from './keys-manager.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PrivateKeys } from './entities/private-key.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([PrivateKeys]),
  ],
  controllers: [KeysManagerController],
  providers: [KeysManagerService]
})
export class KeysManagerModule {}
