import { AssetEntity } from "src/common/entities/asset.entity";
import { NetworkEntity } from "src/common/entities/network.entity";



export abstract class generateKeyPair {
    asset: AssetEntity;
    network: NetworkEntity;
    shouldSaveFullPrivateKey: boolean = false;
}
