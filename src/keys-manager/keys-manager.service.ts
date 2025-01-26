import {
  BadRequestException,
  Injectable,
} from '@nestjs/common';
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
    private readonly blockchainFactoriesService : BlockchainFactoriesService,
    private corporateKey: CorporatePrivateKeysService
  ) {
  }

  async generateKeyPair(
    dto: GenerateKeyPairBridge
  ): Promise<IGenerateKeyPairResponse> {
    const { asset, shouldSaveFullPrivateKey, corporateId } = dto;
    const blockchainFactory = await this.blockchainFactoriesService.getStrategy(asset);
    const wallet = await blockchainFactory.createWallet();
    const { address, privateKey } = wallet;

    // split the private key into two parts
    const midpoint = Math.ceil(privateKey.length / 2);
    const firstHalf = privateKey.substring(0, midpoint);
    const secondHalf = privateKey.substring(midpoint);


    const encryptedSecondHalf = await this.corporateKey.encryptData(corporateId, secondHalf);


    const SavedPrivateKey = await this.privateKeyRepository.insert(
      this.privateKeyRepository.create({
        private_key: shouldSaveFullPrivateKey ? privateKey : firstHalf,
      }),
    );


    const keyData: IGenerateKeyPairResponse = {
      address,
      HalfOfPrivateKey: shouldSaveFullPrivateKey ? '' : encryptedSecondHalf,
      keyId: SavedPrivateKey.identifiers[0].id,
    };

    return keyData;
  }

  async getFullPrivateKey(keyId: number, secondHalf: string, corporateId: number): Promise<string> {
    const privateKey = await this.privateKeyRepository.findOne({
      where: {
        id: keyId,
      },
    });


    if (!privateKey) {
      throw new BadRequestException('Private key not found');
    }

    const decryptedSecondHalf = await this.corporateKey.decryptData(corporateId, secondHalf);

    const fullPrivateKey = privateKey.private_key + decryptedSecondHalf;

    return fullPrivateKey;
  }
}
