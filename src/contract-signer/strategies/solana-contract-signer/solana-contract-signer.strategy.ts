import { Injectable } from '@nestjs/common';
import { getChainFromNetwork } from 'rox-custody_common-modules/blockchain/global-commons/get-network-chain';
import { ICustodySignedSolanaContractTransaction } from 'rox-custody_common-modules/libs/interfaces/contract-transaction.interface';
import { IContractSignerStrategy } from '../contract-signer-strategy.interface';
import { IPrivateKeyFilledSignSolanaContractTransaction } from 'rox-custody_common-modules/libs/interfaces/sign-contract-transaction.interface';
import { SignerTypeEnum } from 'rox-custody_common-modules/libs/enums/signer-type.enum';
import { getSignerFromSigners } from 'src/utils/helpers/get-signer-from-signers.helper';
import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
} from '@solana/web3.js';
import {
  createCreateMasterEditionV3Instruction,
  createCreateMetadataAccountV3Instruction,
  createVerifyCollectionInstruction,
  PROGRAM_ID as TOKEN_METADATA_PROGRAM_ID,
} from '@metaplex-foundation/mpl-token-metadata';
import {
  createAssociatedTokenAccountInstruction,
  createInitializeMintInstruction,
  createMintToInstruction,
  createBurnInstruction,
  getAssociatedTokenAddress,
  getMinimumBalanceForRentExemptMint,
  MINT_SIZE,
  TOKEN_PROGRAM_ID,
  createTransferCheckedInstruction,
} from '@solana/spl-token';
import { IPrivateKeyFilledTransactionSigner } from 'rox-custody_common-modules/libs/interfaces/sign-transaction.interface';
import bs58 from 'bs58';
import Decimal from 'decimal.js';
import { IPrivateKeyFilledMintOrBurnSolanaTokenTransaction } from 'rox-custody_common-modules/libs/interfaces/sign-mint-token-transaction.interface';
import { ICustodyMintOrBurnSolanaTokenTransaction } from 'rox-custody_common-modules/libs/interfaces/mint-transaction.interface';
import { InstructionType } from 'rox-custody_common-modules/libs/enums/contract-instruction-type.enum';
import { DecimalsHelper } from 'rox-custody_common-modules/libs/utils/decimals-helper';
import { isDefined } from 'class-validator';
import { IPrivateKeyFilledTransferSolanaNFTTransaction } from 'rox-custody_common-modules/libs/interfaces/sign-transfer-nft-transaction.interface';
import { ICustodyTransferSolanaNFTTransaction } from 'rox-custody_common-modules/libs/interfaces/transfer-nft-transaction.interface';

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
      Uint8Array.from(Buffer.from(privateKey, 'base64')),
    );
  }

  private createMetadataInstruction(
    dto: IPrivateKeyFilledSignSolanaContractTransaction,
    tokenMintAddress: PublicKey,
    ownerAddress: PublicKey,
    payerAddress: PublicKey,
  ) {
    const [metadataPDA] = PublicKey.findProgramAddressSync(
      [
        Buffer.from('metadata'),
        TOKEN_METADATA_PROGRAM_ID.toBuffer(),
        tokenMintAddress.toBuffer(),
      ],
      TOKEN_METADATA_PROGRAM_ID,
    );

    const collectionField = isDefined(dto.parentTokenAddress)
      ? { key: new PublicKey(dto.parentTokenAddress), verified: false }
      : null;

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
            creators: [
              {
                address: ownerAddress,
                verified: true,
                share: 100,
              },
            ],
            collection: collectionField,
            uses: null,
          },
          isMutable: dto.isCollection,
          collectionDetails: null,
        },
      },
    );
  }

  private createMasterEditionInstruction(
    tokenMintAddress: PublicKey,
    ownerAddress: PublicKey,
    payerAddress: PublicKey,
  ) {
    const [metadataPDA] = PublicKey.findProgramAddressSync(
      [
        Buffer.from('metadata'),
        TOKEN_METADATA_PROGRAM_ID.toBuffer(),
        tokenMintAddress.toBuffer(),
      ],
      TOKEN_METADATA_PROGRAM_ID,
    );

    const [masterEditionPDA] = PublicKey.findProgramAddressSync(
      [
        Buffer.from('metadata'),
        TOKEN_METADATA_PROGRAM_ID.toBuffer(),
        tokenMintAddress.toBuffer(),
        Buffer.from('edition'),
      ],
      TOKEN_METADATA_PROGRAM_ID,
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
      },
    );
  }

  private createVerifyCollectionItemInstruction(
    nftMintAddress: PublicKey,
    collectionMintAddress: PublicKey,
    collectionAuthorityAddress: PublicKey,
    payerPubkey: PublicKey,
  ) {
    const [nftMetadataPDA] = PublicKey.findProgramAddressSync(
      [
        Buffer.from('metadata'),
        TOKEN_METADATA_PROGRAM_ID.toBuffer(),
        nftMintAddress.toBuffer(),
      ],
      TOKEN_METADATA_PROGRAM_ID,
    );

    const [collectionMetadataPDA] = PublicKey.findProgramAddressSync(
      [
        Buffer.from('metadata'),
        TOKEN_METADATA_PROGRAM_ID.toBuffer(),
        collectionMintAddress.toBuffer(),
      ],
      TOKEN_METADATA_PROGRAM_ID,
    );

    const [collectionMasterEditionPDA] = PublicKey.findProgramAddressSync(
      [
        Buffer.from('metadata'),
        TOKEN_METADATA_PROGRAM_ID.toBuffer(),
        collectionMintAddress.toBuffer(),
        Buffer.from('edition'),
      ],
      TOKEN_METADATA_PROGRAM_ID,
    );

    return createVerifyCollectionInstruction({
      metadata: nftMetadataPDA,
      collectionAuthority: collectionAuthorityAddress,
      payer: payerPubkey,
      collectionMint: collectionMintAddress,
      collection: collectionMetadataPDA,
      collectionMasterEditionAccount: collectionMasterEditionPDA,
    });
  }

  private async concatenateTransactionInstructions(
    dto: IPrivateKeyFilledSignSolanaContractTransaction,
    payerKeyPair: Keypair,
    mintKeypair: Keypair,
    ownerKeyPair: Keypair,
    requiredLamportsForMint: number,
  ) {
    const recipientAddress = new PublicKey(dto.recipientAddress);

    const instructions: TransactionInstruction[] = [];

    // create mint account (token account), with required balance (in lamports) for a token account
    instructions.push(
      SystemProgram.createAccount({
        fromPubkey: payerKeyPair.publicKey, // to pay for account creation
        newAccountPubkey: mintKeypair.publicKey, // token new address
        space: MINT_SIZE,
        lamports: requiredLamportsForMint,
        programId: TOKEN_PROGRAM_ID,
      }),
    );

    // initialize the token, passing the token program ID (also an account), to bind this account to it (in order to be recognized as a token)
    instructions.push(
      createInitializeMintInstruction(
        mintKeypair.publicKey,
        dto.decimals,
        ownerKeyPair.publicKey,
        ownerKeyPair.publicKey,
        TOKEN_PROGRAM_ID,
      ),
    );

    if (DecimalsHelper.isFirstGreaterThanSecond(dto.initialSupply, 0)) {
      // mathematically derive recipient Associated Token Account public key from the token public address and recipient public key
      const recipientATAPublicKey = await getAssociatedTokenAddress(
        mintKeypair.publicKey, // mint
        recipientAddress, // owner
        false,
      );

      // create recipient Associated Token Account
      instructions.push(
        createAssociatedTokenAccountInstruction(
          payerKeyPair.publicKey, // payer
          recipientATAPublicKey, // recipient associated token account
          recipientAddress, // recipient public key (owner of the token account)
          mintKeypair.publicKey, // token mint address
        ),
      );

      // create mint to instruction, passing the owner key pair as the mint authority, minting initial suuply to the recipient
      instructions.push(
        createMintToInstruction(
          mintKeypair.publicKey,
          recipientATAPublicKey,
          ownerKeyPair.publicKey,
          BigInt(dto.initialSupply.toString()),
        ),
      );
    }

    // create metadata instruction to add name, symbol, and JSON URI (includes description and image)
    // metaplex integrates with solana explorers to show this metadata in the token page
    instructions.push(
      this.createMetadataInstruction(
        dto,
        mintKeypair.publicKey,
        ownerKeyPair.publicKey,
        payerKeyPair.publicKey,
      ),
    );

    if (dto.isNFT) {
      // create master edition instruction, required for NFT token to mark it as NFT with max supply 1
      instructions.push(
        this.createMasterEditionInstruction(
          mintKeypair.publicKey,
          ownerKeyPair.publicKey,
          payerKeyPair.publicKey,
        ),
      );

      if (isDefined(dto.parentTokenAddress)) {
        instructions.push(
          this.createVerifyCollectionItemInstruction(
            mintKeypair.publicKey,
            new PublicKey(dto.parentTokenAddress),
            ownerKeyPair.publicKey,
            payerKeyPair.publicKey,
          )
        )
      }
    }

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

  private async buildTransaction(
    dto: IPrivateKeyFilledSignSolanaContractTransaction,
    payerKeyPair: Keypair,
    mintKeyPair: Keypair,
    ownerKeyPair: Keypair,
  ) {
    const requiredLamportsForMint = await getMinimumBalanceForRentExemptMint(
      this.connection,
    );

    const instructions = await this.concatenateTransactionInstructions(
      dto,
      payerKeyPair,
      mintKeyPair,
      ownerKeyPair,
      requiredLamportsForMint,
    );

    const transaction = new Transaction().add(...instructions);

    const { blockhash, lastValidBlockHeight } =
      await this.connection.getLatestBlockhash();

    transaction.recentBlockhash = blockhash;
    transaction.lastValidBlockHeight = lastValidBlockHeight;
    transaction.feePayer = payerKeyPair.publicKey;

    return transaction;
  }

  private async buildMintToExistingTransaction(
    mintAddress: PublicKey,
    recipientAddress: string,
    amount: Decimal,
    payerKeyPair: Keypair,
    ownerKeyPair: Keypair,
  ) {
    return await this.buildTokenInstruction(
      mintAddress,
      recipientAddress,
      InstructionType.MINT,
      payerKeyPair,
      amount,
      ownerKeyPair,
    );
  }

  private async buildBurnFromExistingTransaction(
    mintAddress: PublicKey,
    recipientAddress: string,
    amount: Decimal,
    payerKeyPair: Keypair,
    ownerKeyPair: Keypair,
  ) {
    return await this.buildTokenInstruction(
      mintAddress,
      recipientAddress,
      InstructionType.BURN,
      payerKeyPair,
      amount,
      ownerKeyPair,
    );
  }

  private async buildTokenInstruction(
    mintAddress: PublicKey,
    targetAddress: string,
    type: InstructionType,
    payerKeyPair: Keypair,
    amount: Decimal,
    ownerKeyPair: Keypair,
  ) {
    const targetPubKey = new PublicKey(targetAddress);
    const transaction = new Transaction();

    const targetATAPublicKey = await getAssociatedTokenAddress(
      mintAddress,
      targetPubKey,
      false,
    );

    // ensure ATA exists (burn requires source account)
    const ataInfo = await this.connection.getAccountInfo(targetATAPublicKey);

    if (!ataInfo) {
      transaction.add(
        createAssociatedTokenAccountInstruction(
          payerKeyPair.publicKey,
          targetATAPublicKey,
          targetPubKey,
          mintAddress,
        ),
      );
    }

    if (type == InstructionType.BURN) {
      // Burn tokens from target's ATA
      transaction.add(
        createBurnInstruction(
          targetATAPublicKey,
          mintAddress,
          targetPubKey,
          BigInt(amount.toString()),
        ),
      );
    } else {
      transaction.add(
        createMintToInstruction(
          mintAddress,
          targetATAPublicKey,
          ownerKeyPair.publicKey,
          BigInt(amount.toString()),
        ),
      );
    }

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
    const { payerKeyPair, ownerKeyPair, mintKeyPair } = this.prepareSigners(
      dto.signers,
    );

    const transaction = await this.buildTransaction(
      dto,
      payerKeyPair,
      mintKeyPair,
      ownerKeyPair,
    );

    transaction.sign(payerKeyPair, mintKeyPair, ownerKeyPair);

    const rawTx = transaction.serialize();

    const sigBase64 = transaction.signature.toString('base64');
    const sigBytes = Buffer.from(sigBase64, 'base64');
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

  async signMintTokenTransaction(
    dto: IPrivateKeyFilledMintOrBurnSolanaTokenTransaction,
  ): Promise<ICustodyMintOrBurnSolanaTokenTransaction> {
    const { payerKeyPair, ownerKeyPair } = this.prepareSigners(dto.signers);

    return await this.signTokenTransaction(
      payerKeyPair,
      ownerKeyPair,
      dto.contractAddress,
      dto.recipientAddress,
      dto.amount,
      InstructionType.MINT,
    );
  }

  async signBurnTokenTransaction(
    dto: IPrivateKeyFilledMintOrBurnSolanaTokenTransaction,
  ): Promise<ICustodyMintOrBurnSolanaTokenTransaction> {
    const { payerKeyPair, ownerKeyPair } = this.prepareSigners(dto.signers);

    return await this.signTokenTransaction(
      payerKeyPair,
      ownerKeyPair,
      dto.contractAddress,
      dto.recipientAddress,
      dto.amount,
      InstructionType.BURN,
    );
  }

  private async signTokenTransaction(
    payerKeyPair: Keypair,
    ownerKeyPair: Keypair,
    contractAddress: string,
    recipientAddress: string,
    amount: Decimal,
    type: InstructionType,
  ) {
    let transaction: Transaction;
    if (type == InstructionType.MINT) {
      transaction = await this.buildMintToExistingTransaction(
        new PublicKey(contractAddress),
        recipientAddress,
        amount,
        payerKeyPair,
        ownerKeyPair,
      );
    } else {
      transaction = await this.buildBurnFromExistingTransaction(
        new PublicKey(contractAddress),
        recipientAddress,
        amount,
        payerKeyPair,
        ownerKeyPair,
      );
    }

    transaction.sign(payerKeyPair, ownerKeyPair);

    const rawTx = transaction.serialize();

    const sigBase64 = transaction.signature.toString('base64');
    const sigBytes = Buffer.from(sigBase64, 'base64');
    const sigBase58 = bs58.encode(new Uint8Array(sigBytes));

    const estimatedFee = await transaction.getEstimatedFee(this.connection);

    return {
      transactionHash: sigBase58,
      contractAddress: contractAddress,
      signedTransaction: rawTx,
      estimatedFee: new Decimal(estimatedFee),
      error: null,
    };
  }

  private async buildTransferNFTTransaction(
    mintAddress: PublicKey,
    recipientAddress: string,
    payerKeyPair: Keypair,
    ownerKeyPair: Keypair,
  ) {
    const targetPubKey = new PublicKey(recipientAddress);
    const transaction = new Transaction();

    const ownerATAPublicKey = await getAssociatedTokenAddress(
      mintAddress,
      ownerKeyPair.publicKey,
      false,
    );

    const targetATAPublicKey = await getAssociatedTokenAddress(
      mintAddress,
      targetPubKey,
      false,
    );

    // ensure ATA exists (burn requires source account)
    const ataInfo = await this.connection.getAccountInfo(targetATAPublicKey);

    if (!ataInfo) {
      transaction.add(
        createAssociatedTokenAccountInstruction(
          payerKeyPair.publicKey,
          targetATAPublicKey,
          targetPubKey,
          mintAddress,
        ),
      );
    }

    transaction.add(
      createTransferCheckedInstruction(
        ownerATAPublicKey,
        mintAddress,
        targetATAPublicKey,
        ownerKeyPair.publicKey,
        1,
        0,
      ),
    );

    const { blockhash, lastValidBlockHeight } =
      await this.connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.lastValidBlockHeight = lastValidBlockHeight;
    transaction.feePayer = payerKeyPair.publicKey;

    return transaction;
  }

  async signTransferNFTTransaction(
    dto: IPrivateKeyFilledTransferSolanaNFTTransaction,
  ): Promise<ICustodyTransferSolanaNFTTransaction> {
    const { contractAddress, recipientAddress } = dto;
    const { payerKeyPair, ownerKeyPair } = this.prepareSigners(dto.signers);

    const transaction = await this.buildTransferNFTTransaction(
        new PublicKey(contractAddress),
        recipientAddress,
        payerKeyPair,
        ownerKeyPair,
      );

    transaction.sign(payerKeyPair, ownerKeyPair);

    const rawTx = transaction.serialize();

    const sigBase64 = transaction.signature.toString('base64');
    const sigBytes = Buffer.from(sigBase64, 'base64');
    const sigBase58 = bs58.encode(new Uint8Array(sigBytes));

    const estimatedFee = await transaction.getEstimatedFee(this.connection);

    return {
      transactionHash: sigBase58,
      contractAddress: contractAddress,
      signedTransaction: rawTx,
      estimatedFee: new Decimal(estimatedFee),
      error: null,
    };
  }
}
