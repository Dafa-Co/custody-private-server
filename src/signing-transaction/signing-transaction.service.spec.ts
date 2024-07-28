import { Test, TestingModule } from '@nestjs/testing';
import { SigningTransactionService } from './signing-transaction.service';

describe('SigningTransactionService', () => {
  let service: SigningTransactionService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SigningTransactionService],
    }).compile();

    service = module.get<SigningTransactionService>(SigningTransactionService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
