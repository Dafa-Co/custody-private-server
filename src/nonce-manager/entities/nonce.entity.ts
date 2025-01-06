import { PrivateKeys } from 'src/keys-manager/entities/private-key.entity';
import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';

@Entity()
@Index(['privateKey', 'networkId'], { unique: true }) // Use relation property here
export class PrivateKeyNonce {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'private_key_id' })
  private_key_id: number;

  @ManyToOne(() => PrivateKeys, (privateKey) => privateKey.usageRecords)
  @JoinColumn({ name: 'private_key_id' }) // This creates and manages the privateKeyId column automatically
  privateKey: PrivateKeys;

  @Column()
  networkId: number;

  @Column({ default: 0, unsigned: true })
  nonce: number;
}
