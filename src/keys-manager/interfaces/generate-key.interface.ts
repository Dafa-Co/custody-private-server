import { CommonAsset } from "rox-custody_common-modules/libs/entities/asset.entity";
import { CommonNetwork } from "rox-custody_common-modules/libs/entities/network.entity";



export abstract class generateKeyPair {
    asset: CommonAsset;
    network: CommonNetwork;
    shouldSaveFullPrivateKey: boolean = false;
}
