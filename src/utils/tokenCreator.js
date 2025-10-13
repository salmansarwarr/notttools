// createToken.js
import axios from "axios";
import constants from "../constants";
import {
  Connection,
  Transaction,
  Keypair,
  SystemProgram,
  PublicKey,
  TransactionInstruction,
} from "@solana/web3.js";
import {
  createInitializeMintInstruction,
  getMinimumBalanceForRentExemptMint,
  MINT_SIZE,
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  createMintToInstruction,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { Buffer } from "buffer";

// Hard-coded Token Metadata Program ID for future use
const TOKEN_METADATA_PROGRAM_ID = new PublicKey(
  "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s"
);

// -----------------------------------------------------------------------------
// Config
// -----------------------------------------------------------------------------

const getConnection = () =>
  new Connection(constants.network.endpoint, {
    commitment: constants.solana.commitment,
  });

// PDA: ['metadata', metadata_program_id, mint] - Manual creation for reliability
const getMetadataAddress = (mint) => {
  if (!mint) {
    throw new Error("Invalid mint");
  }

  const [pda] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("metadata"),
      TOKEN_METADATA_PROGRAM_ID.toBytes(),
      mint.toBytes(),
    ],
    TOKEN_METADATA_PROGRAM_ID
  );
  return pda;
};

// 9 ondalık için güvenli amount (bigint)
const toMintAmount = (n) => {
  const x = typeof n === "string" ? Number(n) : n ?? 0;
  if (!Number.isFinite(x) || x <= 0) return 0n;
  return BigInt(Math.floor(x * 1e9));
};

// -----------------------------------------------------------------------------
// Public API
// -----------------------------------------------------------------------------
export const createTokenWithMetadata = async (
  formData,
  wallet,
  commissionData = null
) => {
  try {
    if (!wallet || !wallet.publicKey || !wallet.signTransaction) {
      throw new Error("Wallet not connected");
    }

    const connection = getConnection();
    const walletPublicKey = wallet.publicKey;

    console.log("Creating token with wallet:", walletPublicKey.toBase58());

    // --- Create Mint Account ---
    const mint = Keypair.generate();
    const rentExemption = await getMinimumBalanceForRentExemptMint(connection);

    console.log("Generated mint address:", mint.publicKey.toBase58());

    // Create Legacy Transaction (Phantom's recommended approach)
    const transaction = new Transaction();

    // --- Commission Payment FIRST (if required) - Anti-spam strategy ---
    if (
      commissionData &&
      commissionData.amount &&
      commissionData.walletAddress
    ) {
      console.log(
        "Adding commission payment FIRST (Legacy Transaction):",
        commissionData
      );

      const commissionLamports = Math.floor(commissionData.amount * 1e9);
      const commissionWallet = new PublicKey(commissionData.walletAddress);

      transaction.add(
        SystemProgram.transfer({
          fromPubkey: walletPublicKey,
          toPubkey: commissionWallet,
          lamports: commissionLamports,
        })
      );

      console.log(
        `Commission instruction added FIRST: ${commissionData.amount} SOL to ${commissionData.walletAddress}`
      );
    }

    // Add token creation instructions
    transaction.add(
      SystemProgram.createAccount({
        fromPubkey: walletPublicKey,
        newAccountPubkey: mint.publicKey,
        space: MINT_SIZE,
        lamports: rentExemption,
        programId: TOKEN_PROGRAM_ID,
      }),
      createInitializeMintInstruction(
        mint.publicKey,
        9,
        walletPublicKey,
        walletPublicKey,
        TOKEN_PROGRAM_ID
      )
    );

    // --- Optional initial supply ---
    const initialAmount = toMintAmount(formData?.initialSupply);
    let ata;

    console.log("Initial amount:", initialAmount.toString());

    if (initialAmount > 0n) {
      ata = await getAssociatedTokenAddress(
        mint.publicKey,
        walletPublicKey,
        false,
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
      );

      console.log("ATA address:", ata.toBase58());

      transaction.add(
        createAssociatedTokenAccountInstruction(
          walletPublicKey, // payer
          ata, // ATA
          walletPublicKey, // owner
          mint.publicKey, // mint
          TOKEN_PROGRAM_ID,
          ASSOCIATED_TOKEN_PROGRAM_ID
        ),
        createMintToInstruction(
          mint.publicKey,
          ata,
          walletPublicKey,
          initialAmount
        )
      );
    }

    // --- Enhanced Metadata for staked NFT holders ---
    console.log("Mint object:", mint);
    console.log("Mint public key:", mint.publicKey?.toBase58());
    console.log(
      "TOKEN_METADATA_PROGRAM_ID:",
      TOKEN_METADATA_PROGRAM_ID.toBase58()
    );

    if (!mint?.publicKey) {
      throw new Error("Mint public key is undefined");
    }

    if (!TOKEN_METADATA_PROGRAM_ID) {
      throw new Error("TOKEN_METADATA_PROGRAM_ID is undefined");
    }

    // Temporarily comment out metadata PDA creation
    const metadataPda = getMetadataAddress(mint.publicKey);
    console.log("Metadata PDA:", metadataPda.toBase58());

    // console.log("Skipping metadata PDA creation for testing");

    // Form'dan metadata JSON oluştur - Staked NFT holders için özel
    const metadataJson = {
      name: formData?.coinName || "",
      symbol: formData?.ticker?.toUpperCase() || "",
      description: formData?.description || "",
      image: `https://via.placeholder.com/400x400.png?text=${encodeURIComponent(
        formData?.coinName || "TOKEN"
      )}`,
      external_url: formData?.website || "",
      properties: {
        category: "Token",
        files: [
          {
            uri: `https://via.placeholder.com/400x400.png?text=${encodeURIComponent(
              formData?.coinName || "TOKEN"
            )}`,
            type: "image/png",
          },
        ],
        creators: [
          {
            address: walletPublicKey.toBase58(), // Bu JSON için string olmalı
            verified: true,
            share: 100,
          },
        ],
      },
      attributes: [
        {
          trait_type: "Network",
          value: "Solana " + constants.SOLANA_NETWORK,
        },
        {
          trait_type: "Creator Type",
          value: "Staked NFT Holder",
        },
        {
          trait_type: "Creation Platform",
          value: "Noottools",
        },
        {
          trait_type: "Token Standard",
          value: "SPL-Token",
        },
        {
          trait_type: "Decimals",
          value: "9",
        },
        ...(formData?.website
          ? [{ trait_type: "Website", value: formData.website }]
          : []),
        ...(formData?.twitter
          ? [{ trait_type: "Twitter", value: formData.twitter }]
          : []),
        ...(formData?.telegram
          ? [{ trait_type: "Telegram", value: formData.telegram }]
          : []),
      ],
      collection: {
        name: "Noottools Created Tokens",
        family: "Noottools",
      },
    };

    // Enhanced metadata URI with base64 encoding
    const metadataUri = `data:application/json;base64,${btoa(
      JSON.stringify(metadataJson, null, 2)
    )}`;

    const name = (formData?.coinName || "").substring(0, 32);
    const symbol = (formData?.ticker?.toUpperCase() || "").substring(0, 10);

    console.log("Enhanced metadata data:", {
      name,
      symbol,
      uri: metadataUri.slice(0, 50) + "...",
      metadata: metadataJson,
    });

    // For now, skip metadata creation to test basic token functionality
    console.log("Creating metadata with v2 instruction");

    // Doğru Borsh serialization ile metadata instruction oluştur
    console.log("Creating metadata with correct Borsh serialization");

    try {
      // CreateMetadataAccountV3 için doğru data format
      const nameBytes = Buffer.from(name, "utf8");
      const symbolBytes = Buffer.from(symbol, "utf8");
      const uriBytes = Buffer.from(metadataUri.slice(0, 200), "utf8");

      // Borsh serialization for CreateMetadataAccountV3
      const data = Buffer.alloc(1000); // Yeterince büyük buffer
      let offset = 0;

      // Instruction discriminator (33 = CreateMetadataAccountV3)
      data.writeUInt8(33, offset);
      offset += 1;

      // DataV2 struct
      // Name (String)
      data.writeUInt32LE(nameBytes.length, offset);
      offset += 4;
      nameBytes.copy(data, offset);
      offset += nameBytes.length;

      // Symbol (String)
      data.writeUInt32LE(symbolBytes.length, offset);
      offset += 4;
      symbolBytes.copy(data, offset);
      offset += symbolBytes.length;

      // URI (String)
      data.writeUInt32LE(uriBytes.length, offset);
      offset += 4;
      uriBytes.copy(data, offset);
      offset += uriBytes.length;

      // Seller fee basis points (u16)
      data.writeUInt16LE(0, offset);
      offset += 2;

      // Creators (Option<Vec<Creator>>)
      data.writeUInt8(1, offset); // Some
      offset += 1;
      data.writeUInt32LE(1, offset); // Vec length = 1
      offset += 4;

      // Creator struct
      walletPublicKey.toBuffer().copy(data, offset); // address (32 bytes)
      offset += 32;
      data.writeUInt8(1, offset); // verified = true
      offset += 1;
      data.writeUInt8(100, offset); // share = 100
      offset += 1;

      // Collection (Option<Collection>) - None
      data.writeUInt8(0, offset);
      offset += 1;

      // Uses (Option<Uses>) - None
      data.writeUInt8(0, offset);
      offset += 1;

      // IsMutable (bool)
      data.writeUInt8(1, offset);
      offset += 1;

      // CollectionDetails (Option<CollectionDetails>) - None
      data.writeUInt8(0, offset);
      offset += 1;

      const finalData = data.slice(0, offset);

      const metaIx = new TransactionInstruction({
        keys: [
          { pubkey: metadataPda, isSigner: false, isWritable: true },
          { pubkey: mint.publicKey, isSigner: false, isWritable: false },
          { pubkey: walletPublicKey, isSigner: true, isWritable: false },
          { pubkey: walletPublicKey, isSigner: true, isWritable: true },
          { pubkey: walletPublicKey, isSigner: false, isWritable: false },
          {
            pubkey: SystemProgram.programId,
            isSigner: false,
            isWritable: false,
          },
        ],
        programId: TOKEN_METADATA_PROGRAM_ID,
        data: finalData,
      });

      console.log(
        "Correct Borsh metadata instruction created, data length:",
        finalData.length
      );
      transaction.add(metaIx);
    } catch (metaError) {
      console.error("Metadata instruction creation failed:", metaError);
      console.log("Continuing without metadata...");
    }

    // --- Set transaction properties ---
    const { blockhash } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = walletPublicKey;

    console.log(
      "Using Phantom's EXACT recommended signing pattern from support response..."
    );

    // Phantom's EXACT recommended approach from their support response:
    // "Phantom wallet signs first"
    let signedTx = await wallet.signTransaction(transaction);

    // "Additional signers sign afterward"
    signedTx.partialSign(mint);

    console.log("Transaction signed following Phantom's exact pattern");

    // 3. Send the signed transaction manually
    const signature = await connection.sendRawTransaction(
      signedTx.serialize(),
      {
        skipPreflight: false,
        preflightCommitment: "processed",
      }
    );

    console.log(
      "Transaction sent with manual sendRawTransaction, signature:",
      signature
    );

    // Transaction confirmation bekle
    const confirmation = await connection.confirmTransaction(
      signature,
      "confirmed"
    );

    console.log("Transaction confirmed:", confirmation);

    if (confirmation.value.err) {
      throw new Error(
        `Transaction failed: ${JSON.stringify(confirmation.value.err)}`
      );
    }

    // Başarılı response döndür
    const result = {
      success: true,
      signature,
      mintAddress: mint.publicKey.toBase58(),
      metadataAddress: metadataPda.toBase58(),
      tokenData: {
        coinName: formData?.coinName || "",
        ticker: formData?.ticker || "",
        description: formData?.description || "",
        website: formData?.website || "",
        twitter: formData?.twitter || "",
        telegram: formData?.telegram || "",
        mintAddress: mint.publicKey.toBase58(),
        metadataAddress: metadataPda.toBase58(),
        metadataUri,
        initialSupply: initialAmount.toString(),
        decimals: 9,
      },
    };

    console.log("Token created successfully:", result);
    return result;
  } catch (error) {
    console.error("TokenCreator error:", error);
    throw error;
  }
};
