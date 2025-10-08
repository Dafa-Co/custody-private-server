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
import { split, combine } from "shamirs-secret-sharing";
import { supportedNetworks } from 'rox-custody_common-modules/blockchain/global-commons/supported-networks.enum';
import { get } from 'http';
import { getChain } from '@biconomy/account';
import { getChainFromNetwork } from 'rox-custody_common-modules/blockchain/global-commons/get-network-chain';
import { NetworkCategory } from 'rox-custody_common-modules/blockchain/global-commons/networks-category';

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
    encryptedPrivateKeyShares: string[],
  ) {
    const shouldStoreInCustody =
      isDefined(percentageToStoreInCustody) && percentageToStoreInCustody > 0;

    const shares = Array.isArray(encryptedPrivateKeyShares)
      ? [...encryptedPrivateKeyShares]
      : [];

    if (!shouldStoreInCustody) {
      return {
        backupStoragesParts: shares,
        custodyPart: '',
      };
    }

    const custodyPart = shares.shift() ?? '';

    return {
      backupStoragesParts: shares,
      custodyPart,
    };
  }

  async generateKeyPair(
    dto: GenerateKeyPairBridge,
  ): Promise<IGenerateKeyPairResponse> {
    const {
      asset,
      corporateId,
      apiApprovalEssential: { percentageToStoreInCustody, backupStoragesIds },
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

    const shares = await this.splitKeyToShares(
      privateKey,
      percentageToStoreInCustody,
      backupStoragesIds.length,
      asset.networkId
    );

    const encryptedPrivateKeyShares = await this.corporateKey.encryptData(corporateId, shares);

    const { custodyPart, backupStoragesParts } = this.getKeysParts(
      percentageToStoreInCustody,
      encryptedPrivateKeyShares,
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
          private_key: custodyPart,
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
        backupStoragesParts,
      };
    });
  }

  async getFullPrivateKey(keyId: number, keyParts: string[], corporateId: number, networkId: number): Promise<string> {
    const sharesToReturnPrivateKey: string[] = [];

    const custodyShare = await this.privateKeyRepository.findOne({
      where: {
        id: keyId,
      },
    });

    if (!custodyShare) {
      throw new BadRequestException('Private key not found');
    }

    sharesToReturnPrivateKey.push(custodyShare.private_key);

    if (isDefined(keyParts) && keyParts.length > 0) {
      sharesToReturnPrivateKey.push(...keyParts);
    }

    const decryptedShares = await this.corporateKey.decryptData(corporateId, sharesToReturnPrivateKey);

    return await this.combineSharesToFullPrivateKey(decryptedShares, networkId);
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

  async splitKeyToShares(
    privateKey: string,
    percentageToStoreInCustody: number,
    backupStorages: number,
    networkId: number
  ): Promise<string[]> {
    if ((!isDefined(backupStorages) || backupStorages == 0)) {
      backupStorages = 1
    } else if (isDefined(percentageToStoreInCustody) && percentageToStoreInCustody > 0) {
      backupStorages += 1;
    }

    const fullNetworkData = getChainFromNetwork(networkId);
    const networkCategory = fullNetworkData.category;

    switch (networkCategory) {
      case NetworkCategory.EVM:
      case NetworkCategory.Polkadot: {
        return await this.generateCustodySharesFromHex(privateKey, backupStorages);
      }

      case NetworkCategory.BitCoin:
      case NetworkCategory.BitcoinTest:
      case NetworkCategory.Tron:
      case NetworkCategory.Solana:
      case NetworkCategory.Xrp:
      case NetworkCategory.Stellar:
      case NetworkCategory.RoxChain: {
        return await this.generateCustodySharesFromUtf8(privateKey, backupStorages);
      }

      default:
        throw new Error('Unsupported network')
        break;
    }
  }

  private async generateCustodySharesFromHex(
    privateKey: string,
    backupStorages: number
  ) {
    const privateKeyBuffer = Buffer.from(privateKey.replace(/^0x/, ""), "hex");

    const shares: Buffer[] = await split(
      privateKeyBuffer,
      {
        shares: backupStorages,
        threshold: backupStorages - 1 == 0 ? 1 : backupStorages - 1
      }
    );

    const stringShares = shares.map((share: Buffer) => share.toString("base64"));

    return stringShares
  }

  private async generateCustodySharesFromUtf8(
    privateKey: string,
    backupStorages: number
  ) {
    const privateKeyBuffer = Buffer.from(privateKey, "utf8");

    const shares: Buffer[] = await split(
      privateKeyBuffer,
      {
        shares: backupStorages,
        threshold: backupStorages - 1 == 0 ? 1 : backupStorages - 1
      }
    );

    const stringShares = shares.map((share: Buffer) => share.toString("base64"));

    return stringShares
  }

  private async combinePrivateKeyFromHexShares(shares: string[]) {
    const shareBuffers = shares.map((share) => Buffer.from(share, "base64"));
    const fullPrivateKey = await combine(shareBuffers);

    return `0x${fullPrivateKey.toString("hex")}`;
  }

  private async combinePrivateKeyFromUtf8Shares(shares: string[]) {
    const shareBuffers = shares.map((share) => Buffer.from(share, "base64"));
    const fullPrivateKey = await combine(shareBuffers);

    return fullPrivateKey.toString("utf8");
  }

  async combineSharesToFullPrivateKey(shares: string[], networkId: number): Promise<string> {
    const fullNetworkData = getChainFromNetwork(networkId);
    const networkCategory = fullNetworkData.category;

    switch (networkCategory) {
      case NetworkCategory.EVM:
      case NetworkCategory.Polkadot: {
        return await this.combinePrivateKeyFromHexShares(shares);
      }

      case NetworkCategory.BitCoin:
      case NetworkCategory.BitcoinTest:
      case NetworkCategory.Tron:
      case NetworkCategory.Solana:
      case NetworkCategory.Xrp:
      case NetworkCategory.Stellar:
      case NetworkCategory.RoxChain: {
        return await this.combinePrivateKeyFromUtf8Shares(shares);
      }

      default:
        throw new Error('Unsupported network')
        break;
    }
  }
}
