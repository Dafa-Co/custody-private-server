import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';
import { CorporateKeyEntity } from './entities/corporate-key.entity';
import { InvalidPartOfPrivateKey } from 'rox-custody_common-modules/libs/custom-errors/invalid-part-of-private-key.exception';

@Injectable()
export class CorporatePrivateKeysService {
  constructor(
    @InjectRepository(CorporateKeyEntity)
    private readonly corporateRepository: Repository<CorporateKeyEntity>,
  ) {}

  // Function to generate key pair
  async generateKeyPair(): Promise<{
    privateKey: string;
    publicKey: string;
  }> {
    return new Promise((resolve, reject) => {
      crypto.generateKeyPair(
        'rsa',
        {
          modulusLength: 2048,
          publicKeyEncoding: { type: 'spki', format: 'pem' },
          privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
        },
        (err, publicKey, privateKey) => {
          if (err) reject(err);
          resolve({ privateKey, publicKey });
        },
      );
    });
  }

  // Function to ensure keys exist for a corporate ID
  private async ensureKeysExist(
    corporateId: number,
  ): Promise<CorporateKeyEntity> {
    let corporate = await this.corporateRepository.findOne({
      where: { corporateId },
    });

    if (!corporate) {
      // Generate key pair
      const { privateKey, publicKey } = await this.generateKeyPair();

      // Save to database
      corporate = this.corporateRepository.create({
        corporateId,
        privateKey,
        publicKey,
      });
      await this.corporateRepository.insert(corporate);
    }

    return corporate;
  }

  // Encrypt data using public key
  async encryptData(corporateId: number, data: string): Promise<string> {
    const corporate = await this.ensureKeysExist(corporateId);

    const encryptedData = crypto.publicEncrypt(
      corporate.publicKey,
      Buffer.from(data, 'utf8'),
    );

    return encryptedData.toString('base64');
  }

  // Decrypt data using private key
  async decryptData(
    corporateId: number,
    encryptedData: string,
  ): Promise<string> {

    // if the string is empty return an empty string
    if (!encryptedData) {
      return '';
    }

    try {
      const corporate = await this.ensureKeysExist(corporateId);

      console.log("corporate", corporate.privateKey);

      const decryptedData = crypto.privateDecrypt(
        {
          key: corporate.privateKey,
        },
        Buffer.from(encryptedData, 'base64'),
      );

      return decryptedData.toString('utf8');
    } catch (error) {
      console.log("error", error);
      throw new InvalidPartOfPrivateKey();
    }
  }
}
