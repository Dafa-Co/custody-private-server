import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { PrivateKeys } from './entities/private-key.entity';
import { Repository } from 'typeorm';
import { AssetEntity } from '../common/entities/asset.entity';
import { NetworkEntity } from '../common/entities/network.entity';
import { IGenerateKeyPairResponse } from '../utils/interfaces/generate-ket-pair.interface';
import { privateDecrypt, publicEncrypt } from 'crypto';
import { BlockchainFactory } from '../blockchain/blockchain.factory';
import { join } from 'path';
import * as fs from 'fs';
import { generateKeyPair } from './interfaces/generate-key.interface';


@Injectable()
export class KeysManagerService {
  private keys: { publicKey: string; privateKey: string; passphrase: string };


  constructor(
    @InjectRepository(PrivateKeys)
    private privateKeyRepository: Repository<PrivateKeys>,
  ) {
    this.loadKeys();
  }

  private loadKeys() {
    const keysPath = join(process.cwd(), 'src/../', 'keys.json'); // Adjust the path as needed
    const keysData = fs.readFileSync(keysPath, 'utf8');
    this.keys = JSON.parse(keysData);
  }

  async generateKeyPair(
    dto: generateKeyPair
  ): Promise<IGenerateKeyPairResponse> {
    const { asset, network, shouldSaveFullPrivateKey  } = dto;
    const blockchainFactory = new BlockchainFactory(asset, network);
    await blockchainFactory.init();
    const wallet = await blockchainFactory.createWallet();
    const { address, privateKey } = wallet;

    // split the private key into two parts
    const midpoint = Math.ceil(privateKey.length / 2);
    const firstHalf = privateKey.substring(0, midpoint);
    const secondHalf = privateKey.substring(midpoint);
    const encryptedSecondHalf = this.encryptData(secondHalf);

    const SavedPrivateKey = await this.privateKeyRepository.save(
      this.privateKeyRepository.create({
        private_key: shouldSaveFullPrivateKey ? privateKey : firstHalf,
      }),
    );

    return {
      address,
      HalfOfPrivateKey: shouldSaveFullPrivateKey ? '' : encryptedSecondHalf,
      keyId: SavedPrivateKey.id,
    };
  }

  async getFullPrivateKey(keyId: number, secondHalf: string): Promise<string> {
    const privateKey = await this.privateKeyRepository.findOne({
      where: {
        id: keyId,
      },
    });

    if (!privateKey) {
      throw new BadRequestException('Private key not found');
    }

    const decryptedSecondHalf = this.decryptData(secondHalf);

    const fullPrivateKey = privateKey.private_key + decryptedSecondHalf;
    return fullPrivateKey;
  }

  encryptData(data: string): string {
    const publicKey = this.keys.publicKey
    const buffer = Buffer.from(data, 'utf8');
    const encrypted = publicEncrypt(publicKey, buffer);
    return encrypted.toString('base64');
  }

  decryptData(encryptedData: string): string {
    const buffer = Buffer.from(encryptedData, 'base64');
    const decrypted = privateDecrypt(
      {
        key: this.keys.privateKey,
        passphrase: this.keys.passphrase, // Use the passphrase from JSON
      },
      buffer
    );
    return decrypted.toString('utf8');
  }

}