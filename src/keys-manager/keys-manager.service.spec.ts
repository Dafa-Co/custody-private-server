import { Test, TestingModule } from '@nestjs/testing';
import { KeysManagerService } from './keys-manager.service';
import { ormConfigs } from '../configs/database';
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';
import configs from '../utils/configs/configs';
import { join } from 'path';
import { PrivateKeys } from './entities/private-key.entity';
import { CommonAsset, AssetStatus, AssetType } from '../../rox-custody_common-modules/libs/entities/asset.entity';
import { CommonNetwork, NetworkStatus, NetworkType } from '../../rox-custody_common-modules/libs/entities/network.entity';

describe('KeysManagerService', () => {
  let service: KeysManagerService;

  const testNetwork: CommonNetwork = {
    assets: [],
    logo: null,
    name: 'Test Network',
    networkId: 1, // ethereum
    status: NetworkStatus.ACTIVE,
    symbol: 'TST',
    type: NetworkType.PUBLIC,
  };

  const testAsset: CommonAsset = {
    contract_address: null,
    logo: null,
    name: 'Test Asset',
    network: testNetwork,
    status: AssetStatus.ACTIVE,
    symbol: 'TST',
    token_decimal: 18,
    type: AssetType.COIN
  };


  beforeEach(async () => {

    const module: TestingModule = await Test.createTestingModule({
      imports:[
        TypeOrmModule.forRoot({
          type: 'mysql',
          logging: configs.NODE_ENV === 'DEVELOPMENT' ? true : false,
          synchronize: true,
          supportBigNumbers: true,
          host: configs.DATABASE_HOST,
          username: configs.DATABASE_USER,
          password: configs.DATABASE_PASSWORD,
          database: 'testing',
          port: +configs.DATABASE_PORT,
          entities: [join(__dirname, '**', '*.entity.{ts,js}')],
        }),
        TypeOrmModule.forFeature([PrivateKeys]),
      ],
      providers: [KeysManagerService],
    }).compile();

    service = module.get<KeysManagerService>(KeysManagerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should generate a key pair', async () => {
    const keyPair = await service.generateKeyPair(testAsset, testNetwork);
    expect(keyPair).toBeDefined();
    expect(keyPair.address).toBeDefined();
    expect(keyPair.HalfOfPrivateKey).toBeDefined();
    expect(keyPair.keyId).toBeDefined();
  });

  it('should return empty string for HalfOfPrivateKey if shouldSaveFullPrivateKey is true', async () => {
    const keyPair = await service.generateKeyPair(testAsset, testNetwork, true);
    expect(keyPair).toBeDefined();
    expect(keyPair.address).toBeDefined();
    expect(keyPair.HalfOfPrivateKey).toBe('');
    expect(keyPair.keyId).toBeDefined();
  })


  it('should return the full private key when call getFullPrivateKey', async () => {
    const keyPair = await service.generateKeyPair(testAsset, testNetwork);
    const fullPrivateKey = await service.getFullPrivateKey(keyPair.keyId, keyPair.HalfOfPrivateKey);
    expect(fullPrivateKey).toBeDefined();
  });

  it('should encrypt and decrypt data', () => {
    const data = 'test data';
    const encryptedData = service.encryptData(data);
    const decryptedData = service.decryptData(encryptedData);
    expect(decryptedData).toBe(data);
  })

});
