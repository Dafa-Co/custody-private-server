import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export class PrivateKeys {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  private_key: string;
}
