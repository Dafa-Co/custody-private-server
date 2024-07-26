import { Test, TestingModule } from '@nestjs/testing';
import { KeysManagerController } from './keys-manager.controller';

describe('KeysManagerController', () => {
  let controller: KeysManagerController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [KeysManagerController],
    }).compile();

    controller = module.get<KeysManagerController>(KeysManagerController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
