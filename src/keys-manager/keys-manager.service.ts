import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { PrivateKeys } from './entities/private-key.entity';
import { DataSource, Repository } from 'typeorm';
import { BlockchainFactoriesService } from 'src/blockchain/blockchain-strategies.service';
import { GenerateKeyPairBridge } from 'rox-custody_common-modules/libs/interfaces/generate-key.interface';
import { CorporatePrivateKeysService } from './corporate-private-keys.service';
import { IGenerateKeyPairResponse } from 'rox-custody_common-modules/libs/interfaces/generate-ket-pair.interface';
import { IdempotentKeyEntity } from './entities/idempotent-key.entity';
import { isDefined } from 'class-validator';
import { v4 as uuidv4 } from 'uuid';
import { CustodyLogger } from 'rox-custody_common-modules/libs/services/logger/custody-logger.service';

@Injectable()
export class KeysManagerService {
  constructor(
    @InjectRepository(PrivateKeys)
    private privateKeyRepository: Repository<PrivateKeys>,
    @InjectRepository(IdempotentKeyEntity)
    private readonly idempotentKeyRepository: Repository<IdempotentKeyEntity>,
    private readonly blockchainFactoriesService: BlockchainFactoriesService,
    private corporateKey: CorporatePrivateKeysService,
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly logger: CustodyLogger,
  ) { }

  private getKeysParts(
    percentageToStoreInCustody: number,
    encryptedPrivateKey: string,
  ) {
    const custodyPartLength = Math.floor(encryptedPrivateKey.length * (percentageToStoreInCustody / 100));
    const custodyPart = encryptedPrivateKey.substring(0, custodyPartLength);
    const backupStoragePrivateKey = encryptedPrivateKey.substring(custodyPartLength);

    return {
      backupStoragesPart: backupStoragePrivateKey,
      custodyPart,
    }
  }

  async generateKeyPair(
    dto: GenerateKeyPairBridge,
  ): Promise<IGenerateKeyPairResponse> {
    const {
      asset,
      corporateId,
      apiApprovalEssential: { percentageToStoreInCustody },
      idempotentKey: idk,
      protocol,
    } = dto;

    const idempotentKey = idk ?? uuidv4();

    await this.idempotentKeyRepository
      .createQueryBuilder()
      .insert()
      .values({
        idempotentKey,
      })
      .orUpdate(['idempotentKey'])
      .execute();

    const blockchainFactory = await this.blockchainFactoriesService.getStrategy(asset, protocol);
    const wallet = await blockchainFactory.createWallet();
    const { address, privateKey, eoaAddress } = wallet;

    const encryptedPrivateKey = await this.corporateKey.encryptData(corporateId, privateKey);

    const keysParts = this.getKeysParts(
      percentageToStoreInCustody,
      encryptedPrivateKey,
    );

    return this.dataSource.transaction(async (manager) => {
      // lock the row with FOR UPDATE
      const lockedRow = await manager
        .getRepository(IdempotentKeyEntity)
        .createQueryBuilder('idempotent')
        .setLock('pessimistic_write')
        .where('idempotent.idempotentKey = :idempotentKey', { idempotentKey })
        .getOne();

      if (isDefined(lockedRow.keyId))
        return {
          address: lockedRow.address,
          keyId: lockedRow.keyId,
          eoaAddress: lockedRow.eoaAddress,
          alreadyGenerated: true,
        };

      const savedPrivateKey = await manager.getRepository(PrivateKeys)
        .createQueryBuilder('private_key')
        .insert()
        .values({
          private_key: keysParts.custodyPart,
        })
        .execute();

      await manager
        .getRepository(IdempotentKeyEntity)
        .createQueryBuilder()
        .update()
        .set({
          keyId: savedPrivateKey.identifiers[0].id,
          address,
          eoaAddress,
        })
        .where('idempotentKey = :idempotentKey', { idempotentKey })
        .execute();

      return {
        address,
        keyId: savedPrivateKey.identifiers[0].id,
        eoaAddress,
        backupStoragesPart: keysParts.backupStoragesPart,
      };
    });
  }

  async getFullPrivateKey(keyId: number, keyPart: string, corporateId: number): Promise<string> {
    const privateKey = await this.privateKeyRepository.findOne({
      where: {
        id: keyId,
      },
    });

    if (!privateKey) {
      throw new BadRequestException('Private key not found');
    }

    const encryptedPrivateKey = privateKey.private_key + keyPart;

    return await this.corporateKey.decryptData(corporateId, encryptedPrivateKey);
  }

  async cleanUpPrivateKey(keyId: number): Promise<void> {
    await this.privateKeyRepository
      .createQueryBuilder()
      .delete()
      .from(PrivateKeys)
      .where('id = :keyId', { keyId })
      .andWhere('createdAt < NOW() + INTERVAL 10 MINUTE')
      .execute();
  }
}
