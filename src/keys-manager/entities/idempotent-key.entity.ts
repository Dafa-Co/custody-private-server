import { Exclude } from 'class-transformer';
import { Column, CreateDateColumn, Entity, JoinColumn, OneToOne, PrimaryColumn } from 'typeorm';
import { PrivateKeys } from './private-key.entity';

@Entity()
export class IdempotentKeyEntity {
  @PrimaryColumn({ type: 'varchar' })
  idempotentKey: string;

  @Column({ type: 'integer', nullable: true })
  keyId?: number;

  @OneToOne(() => PrivateKeys, (key) => key.id, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'keyId' })
  key?: PrivateKeys;

  @Column({ type: 'varchar', nullable: true })
  address?: string;

  @Column({ type: 'varchar', nullable: true })
  eoaAddress?: string;

  @Exclude()
  @CreateDateColumn({ 
    default: () => 'CURRENT_TIMESTAMP(6)',
  })
  createdAt: Date;
}
