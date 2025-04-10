import { PrivateKeyNonce } from 'src/nonce-manager/entities/nonce.entity';
import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class PrivateKeys {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 4096 })
  private_key: string;

  @OneToMany(() => PrivateKeyNonce, (usage) => usage.privateKey)
  usageRecords: PrivateKeyNonce[];
}
