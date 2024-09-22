import { NetworkEntity } from 'src/common/entities/network.entity';
import { AssetEntity } from 'src/common/entities/asset.entity';
import { CustodySignedTransaction } from 'src/utils/types/custom-signed-transaction.type';
import {
  IBlockChainPrivateServer,
  IWalletKeys,
} from '../interfaces/blockchain.interface';
import { networks, payments, Psbt, Signer } from 'bitcoinjs-lib';
import { getChainFromNetwork } from '../../utils/enums/supported-networks.enum';
import { ECPairAPI, ECPairFactory, ECPairInterface } from "ecpair";
import * as ecc from 'tiny-secp256k1';
import axios, { AxiosInstance } from 'axios';
import { UTXO } from 'src/utils/types/utxos';

export class BitCoinFactory implements IBlockChainPrivateServer {
  private asset: AssetEntity;
  private network: NetworkEntity;
  private NetworkString: string;
  private bitcoinNetwork: networks.Network;
  private ECPair: ECPairAPI;
  private api: AxiosInstance;

  constructor(asset: AssetEntity, network: NetworkEntity) {
    this.ECPair = ECPairFactory(ecc);
    this.asset = asset;
    this.network = network;
    const networkObject = getChainFromNetwork(network.networkId);

    this.NetworkString = networkObject.isTest ? 'testnet' : 'main';
    console.log("NetworkString", this.NetworkString)



    this.bitcoinNetwork = networkObject.isTest
      ? networks.testnet
      : networks.bitcoin;

    // Initialize the API instance
    this.api = axios.create({
      baseURL: `https://blockstream.info/${this.NetworkString}/api/`,
    });
  }

  init(): Promise<void> {
    return;
  }

  async createWallet(): Promise<IWalletKeys> {
    // Generate a random key pair using the specified network
    const keyPair = this.ECPair.makeRandom({ network: this.bitcoinNetwork });

    // Get the private key in Wallet Import Format (WIF)
    const privateKeyWIF = keyPair.toWIF();

    // Derive the address from the public key
    const { address } = payments.p2pkh({
      pubkey: keyPair.publicKey,
      network: this.bitcoinNetwork,
    });

    // Return the private key and address as a resolved Promise
    return {
      privateKey: privateKeyWIF,
      address: address!,
    };
  }

  async getSignedTransaction(
    privateKey: string,
    to: string,
    amount: number, // amount in satoshis
  ): Promise<CustodySignedTransaction> {
    try {
      // Step 1: Reconstruct the key pair from the private key
      const keyPair = this.ECPair.fromWIF(privateKey, this.bitcoinNetwork);

      // Step 2: Derive the sender's address (fromAddress)
      const { address: fromAddress } = payments.p2pkh({
        pubkey: keyPair.publicKey,
        network: this.bitcoinNetwork,
      });

      // Step 3: Fetch UTXOs for the sender's address
      const utxos = await this.fetchUTXOs(fromAddress);

      if (utxos.length === 0) {
        throw new Error('No UTXOs available for the address.');
      }

      // Step 4: Create a new Psbt (Partially Signed Bitcoin Transaction)
      const psbt = new Psbt({ network: this.bitcoinNetwork });

      let inputSum = 0;

      // Step 5: Add inputs (UTXOs) to the Psbt
      for (const utxo of utxos) {
        const txHex = await this.fetchTransactionHex(utxo.txid);
        psbt.addInput({
          hash: utxo.txid,
          index: utxo.vout,
          nonWitnessUtxo: Buffer.from(txHex, 'hex'),
        });
        inputSum += utxo.value;
      }

      // Step 6: Estimate the transaction fee
      const feeRate = 1; // Satoshis per byte (adjust as needed)
      const inputCount = utxos.length;
      let outputCount = 2; // Assuming a change output
      let estimatedTxSize = inputCount * 148 + outputCount * 34 + 10;
      let fee = feeRate * estimatedTxSize;

      // Step 7: Calculate the change amount
      let change = inputSum - amount - fee;
      const dustLimit = 546; // Minimum amount for change output

      if (change < dustLimit) {
        // If change is too small, add it to the fee
        fee += change;
        change = 0;
        outputCount = 1; // Only the recipient output
        estimatedTxSize = inputCount * 148 + outputCount * 34 + 10;
        fee = feeRate * estimatedTxSize;
        if (inputSum < amount + fee) {
          throw new Error('Insufficient funds after adjusting for dust.');
        }
      }

      // Step 8: Add outputs to the Psbt
      // Add recipient output
      psbt.addOutput({
        address: to,
        value: amount,
      });

      // Add change output if applicable
      if (change > 0) {
        psbt.addOutput({
          address: fromAddress,
          value: change,
        });
      }

      // Step 9: Create a custom Signer object
      const signer: Signer = {
        publicKey: Buffer.from(keyPair.publicKey),
        sign: (hash: Buffer): Buffer => {
          return keyPair.sign(hash);
        },
      };

      // Step 10: Sign each input using the custom signer
      for (let i = 0; i < utxos.length; i++) {
        psbt.signInput(i, signer);
      }

      // Step 11: Validate signatures
      const validator = (
        pubkey: Buffer,
        msghash: Buffer,
        signature: Buffer,
      ): boolean => {
        return ecc.verify(msghash, pubkey, signature);
      };

      const isValid = psbt.validateSignaturesOfAllInputs(validator);

      if (!isValid) {
        throw new Error('Signature validation failed.');
      }

      // Step 12: Finalize the transaction
      psbt.finalizeAllInputs();

      // Step 13: Extract the raw transaction hex
      const txHex = psbt.extractTransaction().toHex();

      // Step 15: Return the signed transaction
      const signedTx: CustodySignedTransaction = {
        signedTransaction: txHex,
        bundlerUrl: null,
      };

      return signedTx;
    } catch (error) {
      console.error('Error in getSignedTransaction:', error);
      throw error;
    }
  }

  // Helper method to fetch UTXOs
  private async fetchUTXOs(address: string): Promise<UTXO[]> {
    try {
      const response = await this.api.get(`address/${address}/utxo`);
      return response.data.map((utxo: any) => ({
        txid: utxo.txid,
        vout: utxo.vout,
        status: utxo.status,
        value: utxo.value,
      }));
    } catch (error) {
      console.error('Error fetching UTXOs:', error);
      throw error;
    }
  }

  // Helper method to fetch raw transaction hex
  private async fetchTransactionHex(txid: string): Promise<string> {
    try {
      const response = await this.api.get(`tx/${txid}/hex`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching transaction hex for txid ${txid}:`, error);
      throw error;
    }
  }
}


