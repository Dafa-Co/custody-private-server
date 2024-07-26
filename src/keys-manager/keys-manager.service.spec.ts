import { Test, TestingModule } from '@nestjs/testing';
import { KeysManagerService } from './keys-manager.service';

describe('KeysManagerService', () => {
  let service: KeysManagerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [KeysManagerService],
    }).compile();

    service = module.get<KeysManagerService>(KeysManagerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
