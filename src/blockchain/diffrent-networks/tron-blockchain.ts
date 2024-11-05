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
    let walletPk: string = privateKey[0];
    this.gasStationPk = privateKey[1] ?? null;
    this.tronWeb = privateKey.length > 0
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
    const signedTransaction = this.asset.type === AssetType.COIN ? await this.getSignedTransactionCoin(privateKey, to, amount) : await this.getSignedTransactionToken(privateKey, to, amount);
    let signedGasStation
    if(privateKey != this.gasStationPk) {
       signedGasStation =  await this.signWithGasStation(signedTransaction);
    }

    return {
      bundlerUrl: "this['bundlerUrl']",
      signedTransaction: signedGasStation ? signedGasStation : signedTransaction
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

  async getSignedTransactionToken(privateKey: string, to: string, amount: number) {}
}

/* constructor() {
  this.tronWeb = new TronWeb({
    fullHost: 'https://api.trongrid.io', // Use testnet if needed
    privateKey: 'YOUR_GAS_STATION_PRIVATE_KEY', // Set your gas station account private key
  });
}

async freezeTRXForEnergy(amount: number) {
  try {
    return await this.tronWeb.transactionBuilder.freezeBalance(
      amount, // amount in SUN (1 TRX = 1,000,000 SUN)
      3, // Freeze duration in days (minimum 3)
      'ENERGY',
      this.tronWeb.defaultAddress.base58,
    );
  } catch (error) {
    console.error('Error freezing TRX for Energy:', error);
  }
}

async sendTransaction(signedTransaction) {
  try {
    return await this.tronWeb.trx.sendRawTransaction(signedTransaction);
  } catch (error) {
    console.error('Error sending transaction:', error);
  }
} 

async executeMetaTransaction(
    to: string,
    value: number,
    data: string,
    nonce: number,
    signature: string,
  ) {
    const contract = await this.tronWeb.contract().at('YOUR_CONTRACT_ADDRESS');
    return await contract.executeMetaTransaction(
      to,
      value,
      data,
      nonce,
      signature,
    ).send({
      from: this.tronWeb.defaultAddress.base58,
      feeLimit: 1000000, // Set an appropriate fee limit
    });

*/


/*
import { Injectable } from '@nestjs/common';
import TronWeb from 'tronweb';
import * as bip39 from 'bip39'; // For mnemonic generation
import * as hdkey from 'hdkey'; // For key derivation
import {
  BroadcastReceipt,
  SignedTronTransaction,
  TronAccountIdentifiers, TronEstimateEnergyParameter,
  UnsignedTronTransaction,
} from './tron.interface'; // To generate seed for HD wallet

const DATA_HEX_PROTOBUF_EXTRA = 3;
const MAX_RESULT_SIZE_IN_TX = 64;
const A_SIGNATURE = 67;

@Injectable()
export class TronService {
  private tronNode = 'https://api.shasta.trongrid.io';
  private solidityNode = 'https://api.shasta.trongrid.io';
  private tronWeb: TronWeb;

  constructor() {
    this.tronWeb = new TronWeb(this.tronNode, this.solidityNode);
  }

  async createAccountWithoutActivation(): Promise<TronAccountIdentifiers> {
    return await this.tronWeb.createAccount();
  }

  async getAccountResources(address: string) {
    const resources = await this.tronWeb.trx.getAccountResources(address);
    resources.freeBandwithBalance =
      resources.freeNetLimit - resources.freeNetUsed;
    // Bandwidth balance obtained by staking TRX = NetLimit - NetUsed
    return resources;
  }

  async activateAccount(
    privateKey: string,
    newAccountAddress: string,
    amount: number = 1,
  ) {
    const senderAddress = this.tronWeb.address.fromPrivateKey(privateKey);

    try {
      // Send the amount of TRX to the new account
      const transaction = await this.tronWeb.transactionBuilder.sendTrx(
        newAccountAddress,
        this.tronWeb.toSun(amount),
        senderAddress,
      );

      // Sign the transaction
      const signedTransaction = await this.tronWeb.trx.sign(
        transaction,
        privateKey,
      );

      // Broadcast the transaction to the Tron network
      await this.tronWeb.trx.sendRawTransaction(signedTransaction);
    } catch (error) {
      console.error('Error activating account:', error);
      throw new Error('Account activation failed.');
    }
  }

  async getPrivateKeyFromMnemonic(mnemonic: string): Promise<string> {
    try {
      // Step 1: Validate the mnemonic
      if (!bip39.validateMnemonic(mnemonic)) {
        throw new Error('Invalid mnemonic');
      }

      // Step 2: Convert mnemonic to seed
      const seed = await bip39.mnemonicToSeed(mnemonic);

      // Step 3: Create an HD wallet from the seed
      const root = hdkey.fromMasterSeed(seed);

      // Step 4: Derive the first account using Tron HD Path (m/44'/195'/0'/0/0)
      const tronHDPath = "m/44'/195'/0'/0/0";
      const derivedNode = root.derive(tronHDPath);

      // Step 5: Get the private key
      return derivedNode.privateKey.toString('hex');
    } catch (error) {
      console.error('Error deriving private key from mnemonic:', error);
      throw new Error('Failed to derive private key from mnemonic');
    }
  }

  async createAccount() {
    const account = await this.createAccountWithoutActivation();
    const privateKey = await this.getPrivateKeyFromMnemonic(
      'gesture uphold left win cook risk mimic print child spread pupil elbow',
    );
    await this.activateAccount(privateKey, account.address.base58, 0.1);
    return account;
  }

  async createTransaction(
    to: string,
    amount: number,
    from: string,
  ): Promise<UnsignedTronTransaction> {
    return await this.tronWeb.transactionBuilder.sendTrx(
      to,
      this.tronWeb.toSun(amount),
      from,
    );
  }

  async signTransaction(
    unsignedTransaction: string,
    privateKey: string,
  ): Promise<SignedTronTransaction> {
    return await this.tronWeb.trx.sign(unsignedTransaction, privateKey);
  }

  async broadcastTransaction(
    signedTransaction: string,
  ): Promise<BroadcastReceipt> {
    return await this.tronWeb.trx.sendRawTransaction(signedTransaction);
  }

  async isTransactionConfirmed(txId: string): Promise<boolean> {
    const transactionInfo = await this.tronWeb.trx.getTransactionInfo(txId);

    // If transaction info is returned, it means it's confirmed
    return !!transactionInfo;
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

  // private tronWeb: TronWeb;
  // private fullNode: string;
  // private solidityNode: string;
  // private eventServer: string;
  // private privateKey: string;
  //
  // constructor() {
  //   // Connect to testnet or mainnet based on environment
  //   const fullNode =
  //     process.env.TRON_FULL_NODE || 'https://api.shasta.trongrid.io'; // Shasta testnet
  //   const solidityNode =
  //     process.env.TRON_SOLIDITY_NODE || 'https://api.shasta.trongrid.io';
  //   const eventServer =
  //     process.env.TRON_EVENT_SERVER || 'https://api.shasta.trongrid.io';
  //   const privateKey =
  //     '1b8d29eb428a44261236f1b45ecdd185edee61a4670cd52f5d627f458f6e133a';
  //
  //   this.tronWeb = new TronWeb(fullNode, solidityNode, eventServer, privateKey);
  // }
  //
  // async generateWallet(): Promise<any> {
  //   // Step 1: Generate a random mnemonic (seed phrase)
  //   // const mnemonic = bip39.generateMnemonic();
  //   const mnemonic = "gesture uphold left win cook risk mimic print child spread pupil elbow"
  //
  //   // Step 2: Convert mnemonic to seed
  //   const seed = await bip39.mnemonicToSeed(mnemonic);
  //
  //   // Step 3: Create an HD wallet from the seed
  //   const root = hdkey.fromMasterSeed(seed);
  //
  //   // Step 4: Derive the first account (m/44'/195'/0'/0/0 for Tron)
  //   // 44' refers to the BIP44 specification for hierarchical wallets.
  //   // 195' is the Tron coin type.
  //   // 0'/0/0 refers to the first account in the HD wallet.
  //   const tronHDPath = "m/44'/195'/0'/0/0";
  //   const derivedNode = root.derive(tronHDPath);
  //
  //   // Step 5: Get the private key and generate Tron address
  //   const privateKey = derivedNode.privateKey.toString('hex');
  //   const publicKey = derivedNode.publicKey.toString('hex');
  //
  //   // Step 6: Use TronWeb to generate the wallet address
  //   const wallet_address = this.tronWeb.address.fromPrivateKey(privateKey);
  //
  //   return {
  //     mnemonic,
  //     privateKey,
  //     publicKey,
  //     wallet_address,
  //   };
  // }
  //
  // /**
  //  * Create a new Tron wallet
  //  /
// async createWallet(): Promise<{ privateKey: string; address: string }> {
//   // Generate a new account
//   const account = await this.tronWeb.createAccount();
//   return {
//     privateKey: account.privateKey,
//     address: account.address.base58, // The public address in base58 format
//   }
// }
//
/**
 * Get wallet balance
 * @param address Tron wallet address
 /
async getBalance(address: string): Promise<number> {
  const balance = await this.tronWeb.trx.getBalance(address);
  return this.tronWeb.fromSun(balance); // Convert from Sun to TRX
}

/**
 * Interact with smart contracts to get details
 * @param contractAddress Address of the smart contract
 * @param functionName Function name on the contract
 * @param params Parameters to pass to the contract method
 /
async getContractDetails(
  contractAddress: string,
  functionName: string,
  params: any[] = [],
) {
  const contract = await this.tronWeb.contract().at(contractAddress);
  return await contract[functionName](...params).call();
}
//
// /**
//  * Sign a transaction manually (if needed for custom operations)
//  * @param transaction Transaction object to sign
//  /
// async signTransaction(transaction: any): Promise<any> {
//   return await this.tronWeb.trx.sign(transaction);
// }
}

*/

