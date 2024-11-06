import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { PrivateKeyNonce } from './entities/nonce.entity';

@Injectable()
export class NonceManagerService {
  constructor(
    @InjectRepository(PrivateKeyNonce)
    private privateKeyNonceRepository: Repository<PrivateKeyNonce>,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  async getNonce(keyId: number, networkId: number): Promise<number> {
    return await this.dataSource.transaction(
      async (transactionalEntityManager) => {
        // Attempt to increment the nonce if the record exists
        const updateResult = await transactionalEntityManager
          .createQueryBuilder()
          .update(PrivateKeyNonce)
          .set({ nonce: () => 'nonce + 1' })
          .where('private_key_id = :keyId AND networkId = :networkId', {
            keyId,
            networkId,
          })
          .execute();


        // If the update was successful (record exists), fetch the updated nonce
        if (updateResult.affected && updateResult.affected > 0) {
          const updatedRecord = await transactionalEntityManager.findOneBy(PrivateKeyNonce, {
            privateKey: { id: keyId },
            networkId,
          });
          return updatedRecord.nonce; // Return the updated nonce
        }

        // If no record exists, insert a new one with nonce = 1
        await transactionalEntityManager.insert(PrivateKeyNonce, {
          private_key_id: keyId,
          networkId,
          nonce: 1
        });

        return 1; // Return 1 as this is the initial nonce for a new record
      },
    );
  }}
