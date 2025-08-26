import { Injectable } from '@nestjs/common';
import { getChainFromNetwork } from 'rox-custody_common-modules/blockchain/global-commons/get-network-chain';
import { ICustodySignedSolanaContractTransaction } from 'rox-custody_common-modules/libs/interfaces/contract-transaction.interface';
import { IContractSignerStrategy } from '../contract-signer-strategy.interface';
import { IPrivateKeyFilledSignSolanaContractTransaction } from 'rox-custody_common-modules/libs/interfaces/sign-contract-transaction.interface';
import { SignerTypeEnum } from 'rox-custody_common-modules/libs/enums/signer-type.enum';
import { getSignerFromSigners } from 'src/utils/helpers/get-signer-from-signers.helper';
import { Connection, Keypair, PublicKey, SystemProgram, Transaction, TransactionInstruction } from '@solana/web3.js';
import {
  createCreateMasterEditionV3Instruction,
  createCreateMetadataAccountV3Instruction,
  PROGRAM_ID as TOKEN_METADATA_PROGRAM_ID,
} from "@metaplex-foundation/mpl-token-metadata";
import { createAssociatedTokenAccountInstruction, createInitializeMintInstruction, createMintToInstruction, getAssociatedTokenAddress, getMinimumBalanceForRentExemptMint, MINT_SIZE, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { IPrivateKeyFilledTransactionSigner } from 'rox-custody_common-modules/libs/interfaces/sign-transaction.interface';
import bs58 from 'bs58';
import Decimal from 'decimal.js';

@Injectable()
export class SolanaContractSignerStrategy implements IContractSignerStrategy {
  private connection: Connection;
  constructor() {}

  async init(networkId: number): Promise<void> {
    const networkObject = getChainFromNetwork(networkId);
    const host = networkObject.chain.blockExplorers.default.apiUrl;
    this.connection = new Connection(host, 'confirmed');
  }

  private recreateWalletFromPrivateKey(privateKey: string) {
    return Keypair.fromSecretKey(
      Uint8Array.from(Buffer.from(privateKey, "base64"))
    );
  }

  private createMetadataInstruction(
    dto: IPrivateKeyFilledSignSolanaContractTransaction,
    tokenMintAddress: PublicKey,
    ownerAddress: PublicKey,
    payerAddress: PublicKey
  ) {
    const [metadataPDA] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("metadata"),
        TOKEN_METADATA_PROGRAM_ID.toBuffer(),
        tokenMintAddress.toBuffer(),
      ],
      TOKEN_METADATA_PROGRAM_ID
    );

    return createCreateMetadataAccountV3Instruction(
      {
        metadata: metadataPDA,
        mint: tokenMintAddress,
        mintAuthority: ownerAddress,
        payer: payerAddress,
        updateAuthority: ownerAddress,
      },
      {
        createMetadataAccountArgsV3: {
          data: {
            name: dto.name,
            symbol: dto.symbol,
            uri: dto.metadataURI,
            sellerFeeBasisPoints: 0, // e.g. 500%, creators array will get 5% out of any sale happens in any marketplace (advisory field, they are not required to do this)
            creators: null,
            collection: null,
            uses: null,
          },
          isMutable: false, // false for immutable (perfect for NFTs)
          collectionDetails: null,
        },
      }
    );
  }

  private createMasterEditionInstruction(
    tokenMintAddress: PublicKey,
    ownerAddress: PublicKey,
    payerAddress: PublicKey
  ) {
    const [metadataPDA] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("metadata"),
        TOKEN_METADATA_PROGRAM_ID.toBuffer(),
        tokenMintAddress.toBuffer(),
      ],
      TOKEN_METADATA_PROGRAM_ID
    );

    const [masterEditionPDA] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("metadata"),
        TOKEN_METADATA_PROGRAM_ID.toBuffer(),
        tokenMintAddress.toBuffer(),
        Buffer.from("edition"),
      ],
      TOKEN_METADATA_PROGRAM_ID
    );

    // Master Edition marks it as a Non-Fungible token.
    // maxSupply: set to 0 to make supply non-expandable, typical for 1/1 NFTs, if it is set for example 10, anyone can "fork" the NFT and mint 10 more of them;
    return createCreateMasterEditionV3Instruction(
      {
        metadata: metadataPDA,
        edition: masterEditionPDA,
        mint: tokenMintAddress,
        mintAuthority: ownerAddress,
        payer: payerAddress,
        updateAuthority: ownerAddress,
      },
      {
        createMasterEditionArgs: {
          maxSupply: 0, // Non-expandable; typical for 1/1 NFTs
        },
      }
    );
  }

  private async concatenateTransactionInstructions(dto: IPrivateKeyFilledSignSolanaContractTransaction, payerKeyPair: Keypair, mintKeypair: Keypair, ownerKeyPair: Keypair, requiredLamportsForMint: number) {
    const recipientAddress = new PublicKey(dto.recipientAddress);
    
    let instructions: TransactionInstruction[] = [];
    
    instructions.push(SystemProgram.createAccount({
      fromPubkey: payerKeyPair.publicKey, // to pay for account creation
      newAccountPubkey: mintKeypair.publicKey, // token new address
      space: MINT_SIZE,
      lamports: requiredLamportsForMint,
      programId: TOKEN_PROGRAM_ID,
    }));

    instructions.push(createInitializeMintInstruction(
      mintKeypair.publicKey,
      dto.decimals,
      ownerKeyPair.publicKey,
      ownerKeyPair.publicKey,
      TOKEN_PROGRAM_ID
    ));

    const recipientATAPublicKey = await getAssociatedTokenAddress(
      mintKeypair.publicKey, // mint
      recipientAddress, // owner
      false
    );

    instructions.push(createAssociatedTokenAccountInstruction(
      payerKeyPair.publicKey, // payer
      recipientATAPublicKey, // recipient associated token account
      recipientAddress, // recipient public key (owner of the token account)
      mintKeypair.publicKey // token mint address
    ));

    instructions.push(createMintToInstruction(
      mintKeypair.publicKey,
      recipientATAPublicKey,
      ownerKeyPair.publicKey,
      BigInt(dto.initialSupply.toString()),
    ));

    instructions.push(this.createMetadataInstruction(
      dto,
      mintKeypair.publicKey,
      ownerKeyPair.publicKey,
      payerKeyPair.publicKey
    ));

    if (dto.isNFT)
      instructions.push(this.createMasterEditionInstruction(
        mintKeypair.publicKey,
        ownerKeyPair.publicKey,
        payerKeyPair.publicKey
      ));

    return instructions;
  }

  private prepareSigners(signers: IPrivateKeyFilledTransactionSigner[]) {
    const payer = getSignerFromSigners(signers, SignerTypeEnum.PAYER);
    const owner = getSignerFromSigners(signers, SignerTypeEnum.TOKEN_OWNER);

    const payerKeyPair = this.recreateWalletFromPrivateKey(payer.privateKey);
    const ownerKeyPair = this.recreateWalletFromPrivateKey(owner.privateKey);

    // fungible token or NFT is considered as minting account
    const mintKeyPair = Keypair.generate();

    return { payerKeyPair, ownerKeyPair, mintKeyPair };
  }

  private async buildTransaction(dto: IPrivateKeyFilledSignSolanaContractTransaction, payerKeyPair: Keypair, mintKeyPair: Keypair, ownerKeyPair: Keypair) {
    const requiredLamportsForMint = await getMinimumBalanceForRentExemptMint(
      this.connection
    );

    const instructions = await this.concatenateTransactionInstructions(dto, payerKeyPair, mintKeyPair, ownerKeyPair, requiredLamportsForMint);
    
    const transaction = new Transaction().add(
      ...instructions,
    );

    const { blockhash, lastValidBlockHeight } =
      await this.connection.getLatestBlockhash();

    transaction.recentBlockhash = blockhash;
    transaction.lastValidBlockHeight = lastValidBlockHeight;
    transaction.feePayer = payerKeyPair.publicKey;

    return transaction;
  }

  async signContractTransaction(
    dto: IPrivateKeyFilledSignSolanaContractTransaction,
  ): Promise<ICustodySignedSolanaContractTransaction> {
    const { payerKeyPair, ownerKeyPair, mintKeyPair } = this.prepareSigners(dto.signers);

    const transaction = await this.buildTransaction(dto, payerKeyPair, mintKeyPair, ownerKeyPair);

    transaction.sign(payerKeyPair, mintKeyPair, ownerKeyPair);

    const rawTx = transaction.serialize();

    const sigBase64 = transaction.signature.toString("base64");
    const sigBytes = Buffer.from(sigBase64, "base64");
    const sigBase58 = bs58.encode(new Uint8Array(sigBytes));

    const estimatedFee = await transaction.getEstimatedFee(this.connection);

    return {
      transactionHash: sigBase58,
      contractAddress: mintKeyPair.publicKey.toBase58(),
      signedTransaction: rawTx,
      estimatedFee: new Decimal(estimatedFee),
      error: null,
    };
  }
}
