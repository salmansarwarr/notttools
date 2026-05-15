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
  createSetAuthorityInstruction,
  AuthorityType,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { Buffer } from "buffer";

const TOKEN_METADATA_PROGRAM_ID = new PublicKey(
  "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s"
);

const getConnection = () =>
  new Connection(constants.network.endpoint, {
    commitment: constants.solana.commitment,
  });

const getMetadataAddress = (mint) => {
  if (!mint) throw new Error("Invalid mint");
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

const toMintAmount = (n) => {
  const x = typeof n === "string" ? Number(n) : n ?? 0;
  if (!Number.isFinite(x) || x <= 0) return 0n;
  return BigInt(Math.floor(x * 1e9));
};

async function uploadToPinata(formData) {
  const PINATA_API_KEY = import.meta.env.VITE_PINATA_API_KEY;
  const PINATA_SECRET_KEY = import.meta.env.VITE_PINATA_SECRET_KEY;

  const metadata = {
    name: formData.coinName,
    symbol: formData.ticker,
    description: formData.description,
    image: formData.imageUrl,
    external_url: formData.website || "",
    social: {
      twitter: formData.twitter || "",
      telegram: formData.telegram || "",
    },
  };

  const metadataResponse = await fetch(
    "https://api.pinata.cloud/pinning/pinJSONToIPFS",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        pinata_api_key: PINATA_API_KEY,
        pinata_secret_api_key: PINATA_SECRET_KEY,
      },
      body: JSON.stringify(metadata),
    }
  );

  const metadataData = await metadataResponse.json();
  return `https://gateway.pinata.cloud/ipfs/${metadataData.IpfsHash}`;
}

// -----------------------------------------------------------------------------
// mint is now passed in — found externally via useVanityMint hook
// -----------------------------------------------------------------------------
export const createTokenWithMetadata = async (
  formData,
  wallet,
  mint,           // ← Keypair from useVanityMint
  commissionData = null
) => {
  try {
    if (!wallet || !wallet.publicKey || !wallet.signTransaction) {
      throw new Error("Wallet not connected");
    }
    if (!mint) {
      throw new Error("Mint keypair not provided");
    }

    const connection = getConnection();
    const walletPublicKey = wallet.publicKey;

    console.log("Creating token with wallet:", walletPublicKey.toBase58());
    console.log("Using mint:", mint.publicKey.toBase58());

    const rentExemption = await getMinimumBalanceForRentExemptMint(connection);
    const transaction = new Transaction();

    // --- Commission Payment FIRST ---
    if (commissionData?.amount && commissionData?.walletAddress) {
      const commissionLamports = Math.floor(commissionData.amount * 1e9);
      const commissionWallet = new PublicKey(commissionData.walletAddress);
      transaction.add(
        SystemProgram.transfer({
          fromPubkey: walletPublicKey,
          toPubkey: commissionWallet,
          lamports: commissionLamports,
        })
      );
    }

    // --- Mint account + initialize ---
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
        formData?.decimals || 9,
        walletPublicKey,
        walletPublicKey,
        TOKEN_PROGRAM_ID
      )
    );

    // --- Optional initial supply ---
    const initialAmount = toMintAmount(formData?.totalSupply || 0);

    if (initialAmount > 0n) {
      const ata = await getAssociatedTokenAddress(
        mint.publicKey,
        walletPublicKey,
        false,
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
      );

      transaction.add(
        createAssociatedTokenAccountInstruction(
          walletPublicKey,
          ata,
          walletPublicKey,
          mint.publicKey,
          TOKEN_PROGRAM_ID,
          ASSOCIATED_TOKEN_PROGRAM_ID
        ),
        createMintToInstruction(mint.publicKey, ata, walletPublicKey, initialAmount)
      );
    }


    // --- Metadata ---
    const metadataPda = getMetadataAddress(mint.publicKey);
    const metadataUri = await uploadToPinata({
      coinName: formData?.coinName,
      ticker: formData?.ticker?.toUpperCase(),
      description: formData?.description,
      imageUrl: formData?.imageUrl,
      website: formData?.website,
      twitter: formData?.twitter,
      telegram: formData?.telegram,
    });

    const name = (formData?.coinName || "").substring(0, 32);
    const symbol = (formData?.ticker?.toUpperCase() || "").substring(0, 10);

    try {
      const nameBytes = Buffer.from(name, "utf8");
      const symbolBytes = Buffer.from(symbol, "utf8");
      const uriBytes = Buffer.from(metadataUri, "utf8");

      const data = Buffer.alloc(1000);
      let offset = 0;

      data.writeUInt8(33, offset); offset += 1;

      data.writeUInt32LE(nameBytes.length, offset); offset += 4;
      nameBytes.copy(data, offset); offset += nameBytes.length;

      data.writeUInt32LE(symbolBytes.length, offset); offset += 4;
      symbolBytes.copy(data, offset); offset += symbolBytes.length;

      data.writeUInt32LE(uriBytes.length, offset); offset += 4;
      uriBytes.copy(data, offset); offset += uriBytes.length;

      data.writeUInt16LE(0, offset); offset += 2;

      data.writeUInt8(1, offset); offset += 1;
      data.writeUInt32LE(1, offset); offset += 4;
      walletPublicKey.toBuffer().copy(data, offset); offset += 32;
      data.writeUInt8(1, offset); offset += 1;
      data.writeUInt8(100, offset); offset += 1;

      data.writeUInt8(0, offset); offset += 1;
      data.writeUInt8(0, offset); offset += 1;
      data.writeUInt8(formData?.revokeUpdate ? 0 : 1, offset); offset += 1;
      data.writeUInt8(0, offset); offset += 1;

      const finalData = data.slice(0, offset);

      transaction.add(
        new TransactionInstruction({
          keys: [
            { pubkey: metadataPda, isSigner: false, isWritable: true },
            { pubkey: mint.publicKey, isSigner: false, isWritable: false },
            { pubkey: walletPublicKey, isSigner: true, isWritable: false },
            { pubkey: walletPublicKey, isSigner: true, isWritable: true },
            { pubkey: walletPublicKey, isSigner: false, isWritable: false },
            { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
          ],
          programId: TOKEN_METADATA_PROGRAM_ID,
          data: finalData,
        })
      );
    } catch (metaError) {
      console.error("Metadata instruction creation failed:", metaError);
    }

    // --- Revoke authorities (Moved to end) ---
    if (formData?.revokeMint) {
      transaction.add(
        createSetAuthorityInstruction(
          mint.publicKey,
          walletPublicKey,
          AuthorityType.MintTokens,
          null
        )
      );
    }

    if (formData?.revokeFreeze) {
      transaction.add(
        createSetAuthorityInstruction(
          mint.publicKey,
          walletPublicKey,
          AuthorityType.FreezeAccount,
          null
        )
      );
    }

    // --- Sign & send ---
    const { blockhash } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = walletPublicKey;

    let signedTx = await wallet.signTransaction(transaction);
    signedTx.partialSign(mint);

    const signature = await connection.sendRawTransaction(signedTx.serialize(), {
      skipPreflight: false,
      preflightCommitment: "processed",
    });

    const confirmation = await connection.confirmTransaction(signature, "confirmed");

    if (confirmation.value.err) {
      throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
    }

    return {
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
        totalSupply: initialAmount.toString(),
        decimals: formData?.decimals || 9,
      },
    };
  } catch (error) {
    console.error("TokenCreator error:", error);
    throw error;
  }
};