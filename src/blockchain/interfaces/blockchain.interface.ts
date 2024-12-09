import { CommonAsset } from "rox-custody_common-modules/libs/entities/asset.entity";
import { CustodySignedTransaction } from "../../../rox-custody_common-modules/libs/interfaces/custom-signed-transaction.type";
import { CommonNetwork } from "rox-custody_common-modules/libs/entities/network.entity";
import { SignTransactionDto } from "rox-custody_common-modules/libs/interfaces/sign-transaction.interface";

export interface IWalletKeys {
    privateKey: string;
    address: string;
}

export interface InitBlockChainPrivateServerStrategies {
  asset: CommonAsset;
  network: CommonNetwork;
}

export interface IBlockChainPrivateServer {
  init(initData: InitBlockChainPrivateServerStrategies): Promise<void>;
  createWallet(): Promise<IWalletKeys>;
  getSignedTransaction(
    dto: SignTransactionDto,
    privateKey: string,
  ): Promise<CustodySignedTransaction>;
}

