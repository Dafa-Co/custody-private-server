import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { PrivateKeys } from './entities/private-key.entity';
import { Repository } from 'typeorm';
import { BlockchainFactoriesService } from 'src/blockchain/blockchain-strategies.service';
import { GenerateKeyPairBridge } from 'rox-custody_common-modules/libs/interfaces/generate-key.interface';
import { CorporatePrivateKeysService } from './corporate-private-keys.service';
import { IGenerateKeyPairResponse } from 'rox-custody_common-modules/libs/interfaces/generate-ket-pair.interface';

@Injectable()
export class KeysManagerService {
  constructor(
    @InjectRepository(PrivateKeys)
    private privateKeyRepository: Repository<PrivateKeys>,
    private readonly blockchainFactoriesService: BlockchainFactoriesService,
    private corporateKey: CorporatePrivateKeysService
  ) {
  }

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
    } = dto;

    const blockchainFactory = await this.blockchainFactoriesService.getStrategy(asset);
    const wallet = await blockchainFactory.createWallet();
    const { address, privateKey } = wallet;

    const encryptedPrivateKey = await this.corporateKey.encryptData(corporateId, privateKey);

    const keysParts = this.getKeysParts(
      percentageToStoreInCustody,
      encryptedPrivateKey,
    );

    const SavedPrivateKey = await this.privateKeyRepository.insert(
      this.privateKeyRepository.create({
        private_key: keysParts.custodyPart,
      })
    );

    return {
      address,
      keyId: SavedPrivateKey.identifiers[0].id,
      backupStoragesPart: keysParts.backupStoragesPart,
    };
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
