import {
  IBlockChainPrivateServer,
  InitBlockChainPrivateServerStrategies,
  IWalletKeys,
} from '../interfaces/blockchain.interface';

import { TronWeb } from 'tronweb';
import { Chain } from 'viem';
import { CustodySignedTransaction } from 'src/utils/types/custom-signed-transaction.type';
import { AssetEntity, AssetType } from 'src/common/entities/asset.entity';
import { NetworkEntity } from 'src/common/entities/network.entity';
import { getChainFromNetwork } from 'rox-custody_common-modules/blockchain/global-commons/get-network-chain';
import { supportedNetworks } from 'rox-custody_common-modules/blockchain/global-commons/supported-networks.enum';
import { TransientService } from 'utils/decorators/transient.decorator';
import { forwardRef, Inject } from '@nestjs/common';
import { KeysManagerService } from 'src/keys-manager/keys-manager.service';
import { NonceManagerService } from 'src/keys-manager/nonce-manager.service';
import { SignTransactionDto } from 'src/signing-transaction/dtos/sign-transaction.dto';

const tronMainnet = 'https://api.trongrid.io';
const tronShastaTestnet = 'https://api.shasta.trongrid.io';
const tronNileTestnet = 'https://nile.trongrid.io';

@TransientService()
export class TronStrategyService implements IBlockChainPrivateServer {
  private tronWeb: TronWeb;
  private host: string;
  private asset: AssetEntity;
  private network: NetworkEntity;
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
    dto: SignTransactionDto
  ): Promise<CustodySignedTransaction> {
    const { amount, asset, keyId, network, secondHalf, to } = dto;

    const privateKey = await this.keyManagerService.getFullPrivateKey(keyId, secondHalf)

    const signedTransaction =
      this.asset.type === AssetType.COIN
        ? await this.getSignedTransactionCoin(privateKey, to, amount)
        : await this.getSignedTransactionToken(privateKey, to, amount);

    return {
      bundlerUrl: this.host,
      signedTransaction: signedTransaction,
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

    return await this.tronWeb.trx.sign(transaction, privateKey);
  }

  async getSignedTransactionToken(
    privateKey: string,
    to: string,
    amount: number,
  ) {
    const transaction = await this.tronWeb.transactionBuilder.sendToken(
      to,
      amount * 10 ** this.asset.decimals,
      this.asset.contract_address,
    );
    return await this.tronWeb.trx.sign(transaction, privateKey);
  }
}

/*


  async getAccountResources(address: string) {
    const resources = await this.tronWeb.trx.getAccountResources(address);
    resources.freeBandwithBalance =
      resources.freeNetLimit - resources.freeNetUsed;
    // Bandwidth balance obtained by staking TRX = NetLimit - NetUsed
    return resources;
  }

  estimateBandwidth(transaction: SignedTronTransaction): number {
    let len =
      transaction.raw_data_hex.length / 2 +
      DATA_HEX_PROTOBUF_EXTRA +
      MAX_RESULT_SIZE_IN_TX;
    const signatureListSize = transaction.signature.length;
    console.log(signatureListSize);
    for (let i = 0; i < signatureListSize; i++) {
      len += A_SIGNATURE;
    }
    return len;
  }

  async estimateEnergy(
    contractAddress: string,
    functionSelector: string, //'transfer(address,uint256)'
    parameter: TronEstimateEnergyParameter[],
    senderAddress = null,
  ): Promise<number> {
    try {
      // Call estimateEnergy to get the energy estimate
      const result = await this.tronWeb.transactionBuilder.estimateEnergy(
        contractAddress,
        functionSelector,
        {}, // options object is empty for estimateEnergy
        parameter,
        senderAddress,
      );

      if (result && result.result && result.energy_required) {
        return result.energy_required as number;
      } else {
        throw new Error('Failed to estimate energy');
      }
    } catch (error) {
      console.error('Error estimating energy:', error);
      throw error;
    }
  }

  
async getBalance(address: string): Promise<number> {
  const balance = await this.tronWeb.trx.getBalance(address);
  return this.tronWeb.fromSun(balance); // Convert from Sun to TRX
}


*/
