import { supportedNetworks } from 'rox-custody_common-modules/blockchain/global-commons/supported-networks.enum';
import { PrivateKeys } from 'src/keys-manager/entities/private-key.entity';
import { Column, Entity, ManyToOne, JoinColumn, PrimaryColumn } from 'typeorm';

@Entity()
export class PrivateKeyVersion {
  @PrimaryColumn()
  privateKeyId: number;

  @ManyToOne(() => PrivateKeys, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'privateKeyId' })
  privateKey: PrivateKeys;

  @Column({ default: 0, type: 'tinyint' }) // For EVMS: 0 => v2, 1 => nexus
  version: number;
}
