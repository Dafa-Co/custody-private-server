import { Test, TestingModule } from '@nestjs/testing';
import { SigningTransactionController } from './signing-transaction.controller';

describe('SigningTransactionController', () => {
  let controller: SigningTransactionController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SigningTransactionController],
    }).compile();

    controller = module.get<SigningTransactionController>(SigningTransactionController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
