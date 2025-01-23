import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { PrivateKeyNonce } from "src/nonce-manager/entities/nonce.entity";
import { NonceManagerService } from "./nonce-manager.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([PrivateKeyNonce]),
  ],
  providers: [NonceManagerService],
  exports: [NonceManagerService],
})
export class NonceManagerModule {}
