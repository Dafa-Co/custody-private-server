import { Entity, Column, PrimaryColumn } from 'typeorm';

@Entity()
export class CorporateKeyEntity {
  @PrimaryColumn({ unique: true })
  corporateId: number;

  @Column({ type: 'text' })
  privateKey: string;

  @Column({ type: 'text' })
  publicKey: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;
}
