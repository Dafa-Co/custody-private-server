import { CommonAsset } from "rox-custody_common-modules/libs/entities/asset.entity";
import { CommonNetwork } from "rox-custody_common-modules/libs/entities/network.entity";



export class SignTransactionDto {
    to: string;
    amount: number;
    asset: CommonAsset;
    network: CommonNetwork;
    keyId: number;
    secondHalf: string;
}
