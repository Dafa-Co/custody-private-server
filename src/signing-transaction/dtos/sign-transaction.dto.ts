import { AssetEntity } from "rox-custody_common-modules/libs/entities/asset.entity";
import { NetworkEntity } from "rox-custody_common-modules/libs/entities/network.entity";



export class SignTransactionDto {
    to: string;
    amount: number;
    asset: AssetEntity;
    network: NetworkEntity;
    keyId: number;
    secondHalf: string;
}
