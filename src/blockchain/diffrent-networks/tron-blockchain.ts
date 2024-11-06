import {
  factoryInitParameter,
  IBlockChainPrivateServer,
  ITransferTransactionEnum,
  IWalletKeys,
  ValidateTransactionEnum,
} from '../interfaces/blockchain.interface';

import * as TronWeb from 'tronweb';
import * as bip39 from 'bip39'; // For mnemonic generation
import * as hdkey from 'hdkey'; // For key derivation
import { Chain } from 'viem';
import { getChainFromNetwork, supportedNetworks } from '../../utils/enums/supported-networks.enum';
import { CustodySignedTransaction } from 'src/utils/types/custom-signed-transaction.type';
import { AssetEntity, AssetType } from 'src/common/entities/asset.entity';
import { NetworkEntity } from 'src/common/entities/network.entity';

const tronApiKey = '6f398b6c-d47d-4d65-b846-cf83a73cf6a6';
const pk = '1b8d29eb428a44261236f1b45ecdd185edee61a4670cd52f5d627f458f6e133a';
export const headers = {
  TRON_PRO_API_KEY: tronApiKey,
};

const tronMainnet = 'https://api.trongrid.io';
const tronShastaTestnet = 'https://api.shasta.trongrid.io';
const tronNileTestnet = 'https://nile.trongrid.io';

export class TronBlockchain implements IBlockChainPrivateServer {
  private tronWeb: any;
  private host: string;
  private asset: AssetEntity;
  private network: NetworkEntity;
  private chain: Chain;
  private gasStationPk: string;


  constructor(asset: AssetEntity, network: NetworkEntity) {
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
  }

  async init(privateKey: factoryInitParameter): Promise<void> {
    const walletPk: string = privateKey ? privateKey[0] : null;
    this.gasStationPk = privateKey ? privateKey[1] : null;
    this.tronWeb = privateKey?.length > 0
    ? new TronWeb.TronWeb({
      fullHost: this.host,
      privateKey: walletPk
    })
    : new TronWeb.TronWeb({
      fullHost: this.host
    })
    return;
  }

  async createWallet(): Promise<IWalletKeys> {
    const smartAccount = await this.tronWeb.createAccount();
    const privateKey = smartAccount.privateKey;
    const address = smartAccount.address.base58;
    return { privateKey, address };
  }

  async getSignedTransaction(
    privateKey: string,
    to: string,
    amount: number,
  ): Promise<CustodySignedTransaction> {
    const signedTransaction = this.asset.type === AssetType.COIN 
    ? await this.getSignedTransactionCoin(privateKey, to, amount) 
    : await this.getSignedTransactionToken(privateKey, to, amount);

    return {
      bundlerUrl: "this['bundlerUrl']",
      signedTransaction: signedTransaction
    }
  }

  async getSignedTransactionCoin(privateKey: string, to: string, amount: number) {
    const transaction = await this.tronWeb.transactionBuilder.sendTrx(
      to,
      this.tronWeb.toSun(amount),
      this.tronWeb.defaultAddress.base58,
    );
    const signedTransaction = await this.tronWeb.trx.sign(transaction, privateKey);
    return signedTransaction;
  }

  async signWithGasStation(transaction: any) {
    return await this.tronWeb.trx.sign(transaction);
  }

  async getSignedTransactionToken(privateKey: string, to: string, amount: number) {
    const signedTransaction = await this.tronWeb.transactionBuilder.sendToken(
      to,
      this.tronWeb.toSun(amount),
      this.asset.contract_address,
      {
        privateKey
      }
    );
    return signedTransaction;
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

