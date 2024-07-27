import { NetworkEntity } from "./network.entity";

export enum AssetType {
  COIN,
  TOKEN,
  CUSTOM_TOKEN
}


export enum AssetStatus {
  ACTIVE = 1,
  HOLD = 0,
}


export class AssetEntity {
    name: string;
    symbol: string;
    logo: string;
    contract_address: string;
    status: AssetStatus;
    type: AssetType;
    token_decimal: number;
    network: NetworkEntity;
}
