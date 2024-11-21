import { PrivateServerSignTransactionDto, SignTransactionDto } from 'rox-custody_common-modules/libs/interfaces/sign-transaction.interface';
import {
  IBlockChainPrivateServer,
  InitBlockChainPrivateServerStrategies,
  IWalletKeys,
} from '../interfaces/blockchain.interface';

import { TronWeb } from 'tronweb';
import { Chain } from 'viem';
import { getChainFromNetwork } from 'rox-custody_common-modules/blockchain/global-commons/get-network-chain';
import { supportedNetworks } from 'rox-custody_common-modules/blockchain/global-commons/supported-networks.enum';
import { TransientService } from 'utils/decorators/transient.decorator';
import { forwardRef, Inject } from '@nestjs/common';
import { KeysManagerService } from 'src/keys-manager/keys-manager.service';
import { NonceManagerService } from 'src/keys-manager/nonce-manager.service';
import { CustodySignedTransaction } from 'rox-custody_common-modules/libs/interfaces/custom-signed-transaction.type';
import { AssetType, CommonAsset } from 'rox-custody_common-modules/libs/entities/asset.entity';
import { CommonNetwork } from 'rox-custody_common-modules/libs/entities/network.entity';

const tronMainnet = 'https://api.trongrid.io';
const tronShastaTestnet = 'https://api.shasta.trongrid.io';
const tronNileTestnet = 'https://nile.trongrid.io';

@TransientService()
export class TronStrategyService implements IBlockChainPrivateServer {
  private tronWeb;
  private host: string;
  private asset: CommonAsset;
  private network: CommonNetwork;
  private chain: Chain;
  private gasStationPk: string;

  constructor(
    @Inject(forwardRef(() => KeysManagerService))
    private readonly keyManagerService: KeysManagerService,
    private readonly nonceManager: NonceManagerService,
  ) {}

  async init(initData: InitBlockChainPrivateServerStrategies): Promise<void> {
    const { asset, network, privateKey } = initData;
    this.network = network;
    this.asset = asset;
    const networkObject = getChainFromNetwork(network.networkId);

    this.chain = networkObject.chain;

    switch (network.networkId) {
      case supportedNetworks.tron:
        this.host = tronMainnet;
        break;
      case supportedNetworks.shastaTestnet:
        this.host = tronShastaTestnet;
        break;
      case supportedNetworks.nileTestnet:
        this.host = tronNileTestnet;
        break;
    }

    this.tronWeb = new TronWeb({
      fullHost: this.host,
      privateKey: privateKey,
    });
    return;
  }

  async createWallet(): Promise<IWalletKeys> {
    const smartAccount = await this.tronWeb.createAccount();
    const privateKey = smartAccount.privateKey;
    const address = smartAccount.address.base58;
    return { privateKey, address };
  }

  async getSignedTransaction(
    dto: PrivateServerSignTransactionDto,
  ): Promise<CustodySignedTransaction> {
    const { amount, asset, keyId, network, secondHalf, to, corporateId, transactionId } = dto;

    const privateKey = await this.keyManagerService.getFullPrivateKey(
      keyId,
      secondHalf,
      corporateId
    );
    this.tronWeb.setPrivateKey(privateKey);
    const signedTransaction =
      this.asset.type === AssetType.COIN
        ? await this.getSignedTransactionCoin(privateKey, to, amount)
        : await this.getSignedTransactionToken(privateKey, to, amount);

    return {
      bundlerUrl: this.host,
      signedTransaction: signedTransaction,
      error: null,
      transactionId: transactionId,
    };
  }

  async getSignedTransactionCoin(
    privateKey: string,
    to: string,
    amount: number,
  ) {
    const transaction = await this.tronWeb.transactionBuilder.sendTrx(
      to,
      amount * 10 ** this.asset.decimals,
    );
    console.log("Coin")
    return await this.tronWeb.trx.sign(transaction, privateKey);
  }

  async getSignedTransactionToken(
    privateKey: string,
    to: string,
    amount: number,
  ) {
    const contractMethod = 'transfer(address,uint256)';

    const transferOptions = {
      feeLimit: 10_000_000,
    };

    const contractMethodParams = [
      { type: 'address', value: to },
      { type: 'uint256', value: amount * 10 ** this.asset.decimals },
    ];
    
    const transaction =
      await this.tronWeb.transactionBuilder.triggerSmartContract(
        this.asset.contract_address,
        contractMethod,
        transferOptions,
        contractMethodParams,
      );
      console.log("Token")
    return await this.tronWeb.trx.sign(transaction.transaction, privateKey);
  }
}
