import { AssetEntity } from "src/common/entities/asset.entity";
import { NetworkEntity } from "src/common/entities/network.entity";



export class SignTransactionDto {
    to: string;
    amount: number;
    asset: AssetEntity;
    network: NetworkEntity;
    keyId: number;
    secondHalf: string;
}
