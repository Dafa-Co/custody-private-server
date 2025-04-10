import { Exclude } from 'class-transformer';
import { PrivateKeyNonce } from 'src/nonce-manager/entities/nonce.entity';
import { Column, CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class PrivateKeys {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 4096 })
  private_key: string;

  @OneToMany(() => PrivateKeyNonce, (usage) => usage.privateKey)
  usageRecords: PrivateKeyNonce[];

  @Exclude()
  @CreateDateColumn({ 
    default: () => 'CURRENT_TIMESTAMP(6)',
  })
  public createdAt: Date;
}
