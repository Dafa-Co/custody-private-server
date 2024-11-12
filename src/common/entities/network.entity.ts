import { supportedNetworks } from "rox-custody_common-modules/blockchain/global-commons/supported-networks.enum";
import { AssetEntity } from "./asset.entity";

export enum NetworkType {
  PUBLIC ,
  PRIVATE,
}

export enum NetworkStatus {
  ACTIVE = 1 ,
  HOLD = 0,
}

export enum NetworkCategory {
  EVM = 0,
  BitCoin,
  BitcoinTest,
  Tron
}
export class NetworkEntity {
  name: string;
  logo: string;
  type: NetworkType;
  status: NetworkStatus;
  symbol: string;
  assets: AssetEntity[];
  networkId: supportedNetworks;
}
