import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { PrivateKeys } from './entities/private-key.entity';
import { Repository } from 'typeorm';

@Injectable()
export class KeysManagerService {

constructor(
    @InjectRepository(PrivateKeys)
    private privateKeyRepository: Repository<PrivateKeys>,
) {}



}
