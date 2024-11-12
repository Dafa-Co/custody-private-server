import { PrivateKeyNonce } from 'src/keys-manager/entities/nonce.entity';
import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class PrivateKeys {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  private_key: string;

  @OneToMany(() => PrivateKeyNonce, (usage) => usage.privateKey)
  usageRecords: PrivateKeyNonce[];
}
