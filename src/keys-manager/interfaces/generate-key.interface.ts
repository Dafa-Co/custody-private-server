import { AssetEntity } from "rox-custody_common-modules/libs/entities/asset.entity";
import { NetworkEntity } from "rox-custody_common-modules/libs/entities/network.entity";



export abstract class generateKeyPair {
    asset: AssetEntity;
    network: NetworkEntity;
    shouldSaveFullPrivateKey: boolean = false;
}
