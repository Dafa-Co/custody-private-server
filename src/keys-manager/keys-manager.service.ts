import {
  BadRequestException,
  Injectable,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { PrivateKeys } from './entities/private-key.entity';
import { Repository } from 'typeorm';
import { IGenerateKeyPairResponse } from '../utils/interfaces/generate-ket-pair.interface';
import { BlockchainFactoriesService } from 'src/blockchain/blockchain-strategies.service';
import { GenerateKeyPairBridge } from 'rox-custody_common-modules/libs/interfaces/generate-key.interface';
import { CorporatePrivateKeysService } from './corporate-private-keys.service';

@Injectable()
export class KeysManagerService {

  constructor(
    @InjectRepository(PrivateKeys)
    private privateKeyRepository: Repository<PrivateKeys>,
    private readonly blockchainFactoriesService : BlockchainFactoriesService,
    private corporateKey: CorporatePrivateKeysService
  ) {
    // this.waer();
  }


  // async waer() {

  //   const secondHalf = "E4UCIqiTcUhIEP2BD6THmFdXa0kYRTzUjsv1WjBhPQtYwPlLcO4wOpYHYEfK3A1Sjy3rd0yO2AlTGfAZBsz5GZORvILOI7kbDojQex0meRqxkdTQVdLVVbPquvzOjaZYmMaKRECnhSv6V0E/crC+Ku6oSE9d92SkCk26/zE9VybxXC+yrgRgRGkg7+PCGN7DpQq6K8Pa1CKeTJAqlczhME7IsP1/lUAMB4lMkIAdB/+dg4PrsCFNYQGb/xioDGqvfrn0MgiFkRvoiyjikjXLdLWc+K0vF9ME/WeQqxzCRK601w1eK4uPowBj6GRZm6KgBfEC92wxJMpsutfafDlPyQ==";
  //   const corporateId = 78;
  //   const keyId = 109;
  //   const privateKey = await this.getFullPrivateKey(keyId, secondHalf, corporateId);

  //   console.log(privateKey);


  //   // const keyy =  await this.generateKeyPair({
  //   //   asset: {
  //   //     name: 'ETH',
  //   //     symbol: 'ETH',
  //   //     contract_address: null,
  //   //     decimals: 18,
  //   //     logo: 'https://s3.amazonaws.com/rox-custody-assets/eth.png',
  //   //     type: AssetType.COIN,
  //   //     network: null,
  //   //   },
  //   //   network: {
  //   //       name: 'ETH',
  //   //       assets: [],
  //   //       logo: 'https://s3.amazonaws.com/rox-custody-assets/eth.png',
  //   //       networkId: 0,
  //   //       symbol: 'ETH'
  //   //     },
  //   //   shouldSaveFullPrivateKey: false,
  //   //   apiApprovalEssential: null,
  //   //   corporateId: 78,
  //   //   vaultId: 1,
  //   // })


  //   // console.log(keyy);


  // }


  async generateKeyPair(
    dto: GenerateKeyPairBridge
  ): Promise<IGenerateKeyPairResponse> {
    const { asset, network, shouldSaveFullPrivateKey, corporateId } = dto;
    const blockchainFactory = await this.blockchainFactoriesService.getStrategy(asset, network);
    const wallet = await blockchainFactory.createWallet();
    const { address, privateKey } = wallet;

    console.log("privateKey", privateKey);


    // split the private key into two parts
    const midpoint = Math.ceil(privateKey.length / 2);
    const firstHalf = privateKey.substring(0, midpoint);
    const secondHalf = privateKey.substring(midpoint);


    console.log("firstHalf", firstHalf);

    console.log("secondHalf", secondHalf);


    const encryptedSecondHalf = await this.corporateKey.encryptData(corporateId, secondHalf);

    console.log("encryptedSecondHalf", encryptedSecondHalf);


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


    console.log("privateKey", privateKey);

    if (!privateKey) {
      throw new BadRequestException('Private key not found');
    }

    const decryptedSecondHalf = await this.corporateKey.decryptData(corporateId, secondHalf);

    const fullPrivateKey = privateKey.private_key + decryptedSecondHalf;

    return fullPrivateKey;
  }
}
