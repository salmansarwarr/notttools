import axios from "axios";
import constants from "../constants";
import {
  Connection,
  Transaction,
  SystemProgram,
  PublicKey,
  TransactionInstruction,
} from "@solana/web3.js";
import {
  // Standard SPL Token
  createInitializeMintInstruction as createInitializeMintInstructionSpl,
  MINT_SIZE,
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  createMintToInstruction,
  createSetAuthorityInstruction,
  AuthorityType,
  ASSOCIATED_TOKEN_PROGRAM_ID,

  // Token-2022
  TOKEN_2022_PROGRAM_ID,
  createInitializeMintInstruction as createInitializeMintInstruction2022,
  createInitializeTransferFeeConfigInstruction,
  createInitializeMetadataPointerInstruction,
  getMintLen,
  ExtensionType,
  TYPE_SIZE,
  LENGTH_SIZE,
} from "@solana/spl-token";
import {
  createInitializeInstruction as createMetadataInitInstruction,
  pack as packTokenMetadata,
  TOKEN_METADATA_DISCRIMINATOR,
} from "@solana/spl-token-metadata";
import { Buffer } from "buffer";

// ---------------------------------------------------------------------------
// Metaplex — standard SPL tokens only
// ---------------------------------------------------------------------------
const TOKEN_METADATA_PROGRAM_ID = new PublicKey(
  "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s"
);

const getConnection = () =>
  new Connection(constants.network.endpoint, {
    commitment: constants.solana.commitment,
  });

const getMetadataAddress = (mint) => {
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

// ---------------------------------------------------------------------------
// Pinata upload
// ---------------------------------------------------------------------------
async function uploadToPinata(data) {
  const res = await fetch("https://api.pinata.cloud/pinning/pinJSONToIPFS", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      pinata_api_key: import.meta.env.VITE_PINATA_API_KEY,
      pinata_secret_api_key: import.meta.env.VITE_PINATA_SECRET_KEY,
    },
    body: JSON.stringify({
      name: data.coinName,
      symbol: data.ticker,
      description: data.description,
      image: data.imageUrl,
      external_url: data.website || "",
      social: { twitter: data.twitter || "", telegram: data.telegram || "" },
    }),
  });
  const json = await res.json();
  return `https://gateway.pinata.cloud/ipfs/${json.IpfsHash}`;
}

// ---------------------------------------------------------------------------
// Metaplex V3 instruction — standard SPL tokens only
// ---------------------------------------------------------------------------
function buildMetaplexMetadataInstruction({
  metadataPda, mintPublicKey, walletPublicKey, name, symbol, metadataUri, revokeUpdate,
}) {
  const nameBytes   = Buffer.from(name, "utf8");
  const symbolBytes = Buffer.from(symbol, "utf8");
  const uriBytes    = Buffer.from(metadataUri, "utf8");
  const data        = Buffer.alloc(1000);
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
  data.writeUInt8(revokeUpdate ? 0 : 1, offset); offset += 1;
  data.writeUInt8(0, offset); offset += 1;
  return new TransactionInstruction({
    keys: [
      { pubkey: metadataPda,            isSigner: false, isWritable: true  },
      { pubkey: mintPublicKey,           isSigner: false, isWritable: false },
      { pubkey: walletPublicKey,         isSigner: true,  isWritable: false },
      { pubkey: walletPublicKey,         isSigner: true,  isWritable: true  },
      { pubkey: walletPublicKey,         isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    programId: TOKEN_METADATA_PROGRAM_ID,
    data: data.slice(0, offset),
  });
}

// ---------------------------------------------------------------------------
// Helper: sign + send + confirm a transaction
// ---------------------------------------------------------------------------
async function sendAndConfirm(connection, transaction, wallet, extraSigners = []) {
  const { blockhash } = await connection.getLatestBlockhash();
  transaction.recentBlockhash = blockhash;
  transaction.feePayer        = wallet.publicKey;
  const signed = await wallet.signTransaction(transaction);
  for (const s of extraSigners) signed.partialSign(s);
  const sig = await connection.sendRawTransaction(signed.serialize(), {
    skipPreflight:       false,
    preflightCommitment: "processed",
  });
  const result = await connection.confirmTransaction(sig, "confirmed");
  if (result.value.err) throw new Error(`Transaction failed: ${JSON.stringify(result.value.err)}`);
  return sig;
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------
export const createTokenWithMetadata = async (
  formData,
  wallet,
  mint,
  commissionData = null
) => {
  try {
    if (!wallet?.publicKey || !wallet?.signTransaction) throw new Error("Wallet not connected");
    if (!mint) throw new Error("Mint keypair not provided");

    const isTaxToken     = !!formData?.isTaxToken;
    const tokenProgramId = isTaxToken ? TOKEN_2022_PROGRAM_ID : TOKEN_PROGRAM_ID;
    const connection     = getConnection();
    const walletPubkey   = wallet.publicKey;
    const decimals       = formData?.decimals ?? 9;
    const initialAmount  = toMintAmount(formData?.totalSupply || 0);

    console.log("Creating token:", mint.publicKey.toBase58(), isTaxToken ? "[Token-2022 + tax]" : "[Standard SPL]");

    // ── Upload metadata to IPFS ───────────────────────────────────────────
    const metadataUri = await uploadToPinata({
      coinName: formData?.coinName, ticker: formData?.ticker?.toUpperCase(),
      description: formData?.description, imageUrl: formData?.imageUrl,
      website: formData?.website, twitter: formData?.twitter, telegram: formData?.telegram,
    });

    const name   = (formData?.coinName || "").substring(0, 32);
    const symbol = (formData?.ticker?.toUpperCase() || "").substring(0, 10);

    let signature;
    let metadataAddress;

    if (isTaxToken) {
      // ────────────────────────────────────────────────────────────────────
      // Token-2022 + TransferFee + embedded metadata
      //
      // CORRECT APPROACH (from official spl-token tokenMetadata/actions.ts):
      //
      //   TX 1 — allocate mint with ONLY fixed extensions (no metadata body):
      //     createAccount(space = getMintLen([TransferFeeConfig, MetadataPointer]))
      //     InitializeTransferFeeConfig
      //     InitializeMetadataPointer  (points at mint itself)
      //     InitializeMint
      //
      //   TX 2 — write metadata (InitializeTokenMetadata reallocs the account):
      //     SystemProgram.transfer(extra rent for metadata bytes → mint account)
      //     InitializeTokenMetadata
      //     createATA + MintTo + revokes
      //
      // InitializeTokenMetadata calls system program realloc internally to
      // extend the mint account. We must pre-fund it with the extra rent.
      // Pre-allocating metadata space in TX1 causes InitializeMint to fail
      // because the metadata TLV slot is zeroed and the program can't tell
      // where valid TLV data ends.
      // ────────────────────────────────────────────────────────────────────

      // ── TX1 space: only fixed extensions ─────────────────────────────────
      const tx1Space = getMintLen([ExtensionType.TransferFeeConfig, ExtensionType.MetadataPointer]);
      const tx1Rent  = await connection.getMinimumBalanceForRentExemption(tx1Space);

      const bps = Math.min(Math.max(parseInt(formData.transferTaxBps, 10) || 100, 0), 10000);
      const maxFeeRaw = formData.taxMaxFee
        ? BigInt(Math.floor(Number(formData.taxMaxFee) * Math.pow(10, decimals)))
        : BigInt("18446744073709551615"); // u64::MAX = no cap
      const withdrawAuthority = new PublicKey(
        formData.taxWithdrawAuthority || walletPubkey.toBase58()
      );

      const tx1 = new Transaction();

      if (commissionData?.amount && commissionData?.walletAddress) {
        tx1.add(SystemProgram.transfer({
          fromPubkey: walletPubkey,
          toPubkey:   new PublicKey(commissionData.walletAddress),
          lamports:   Math.floor(commissionData.amount * 1e9),
        }));
      }

      tx1.add(
        SystemProgram.createAccount({
          fromPubkey:       walletPubkey,
          newAccountPubkey: mint.publicKey,
          space:            tx1Space,
          lamports:         tx1Rent,
          programId:        TOKEN_2022_PROGRAM_ID,
        }),
        // Fixed extensions MUST be initialized before InitializeMint
        createInitializeTransferFeeConfigInstruction(
          mint.publicKey,
          walletPubkey,      // transferFeeConfigAuthority
          withdrawAuthority,
          bps,
          maxFeeRaw,
          TOKEN_2022_PROGRAM_ID
        ),
        createInitializeMetadataPointerInstruction(
          mint.publicKey,
          walletPubkey,    // authority
          mint.publicKey,  // metadataAddress = the mint itself
          TOKEN_2022_PROGRAM_ID
        ),
        createInitializeMintInstruction2022(
          mint.publicKey,
          decimals,
          walletPubkey,
          walletPubkey,
          TOKEN_2022_PROGRAM_ID
        )
      );

      console.log("Sending TX1: createAccount + extensions + InitializeMint, space =", tx1Space);
      await sendAndConfirm(connection, tx1, wallet, [mint]);
      console.log("TX1 confirmed ✓");

      // ── TX2 extra rent: metadata body will realloc the account ───────────
      // pack() gives exact body size; on-chain TLV value = discriminator + body
      const packedMeta    = packTokenMetadata({
        mint:            mint.publicKey,
        updateAuthority: walletPubkey,
        name, symbol,
        uri:             metadataUri,
        additionalMetadata: [],
      });
      const metaExtBytes  = TYPE_SIZE + LENGTH_SIZE + TOKEN_METADATA_DISCRIMINATOR.length + packedMeta.length;
      const tx2Space      = tx1Space + metaExtBytes;
      const tx2Rent       = await connection.getMinimumBalanceForRentExemption(tx2Space);
      const extraLamports = tx2Rent - tx1Rent;

      console.log("Metadata size:", { packedLen: packedMeta.length, metaExtBytes, tx2Space, extraLamports });

      const tx2 = new Transaction();

      // Fund the mint account with extra rent so realloc succeeds
      if (extraLamports > 0) {
        tx2.add(SystemProgram.transfer({
          fromPubkey: walletPubkey,
          toPubkey:   mint.publicKey,
          lamports:   extraLamports,
        }));
      }

      // InitializeTokenMetadata writes the TLV entry (calls realloc internally)
      tx2.add(
        createMetadataInitInstruction({
          programId:       TOKEN_2022_PROGRAM_ID,
          metadata:        mint.publicKey,
          updateAuthority: walletPubkey,
          mint:            mint.publicKey,
          mintAuthority:   walletPubkey,
          name, symbol,
          uri:             metadataUri,
        })
      );

      // ATA + mint supply
      if (initialAmount > 0n) {
        const ata = await getAssociatedTokenAddress(
          mint.publicKey, walletPubkey, false,
          TOKEN_2022_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID
        );
        tx2.add(
          createAssociatedTokenAccountInstruction(
            walletPubkey, ata, walletPubkey, mint.publicKey,
            TOKEN_2022_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID
          ),
          createMintToInstruction(mint.publicKey, ata, walletPubkey, initialAmount, [], TOKEN_2022_PROGRAM_ID)
        );
      }

      if (formData?.revokeMint) {
        tx2.add(createSetAuthorityInstruction(
          mint.publicKey, walletPubkey, AuthorityType.MintTokens, null, [], TOKEN_2022_PROGRAM_ID
        ));
      }
      if (formData?.revokeFreeze) {
        tx2.add(createSetAuthorityInstruction(
          mint.publicKey, walletPubkey, AuthorityType.FreezeAccount, null, [], TOKEN_2022_PROGRAM_ID
        ));
      }

      console.log("Sending TX2: metadata + supply");
      signature       = await sendAndConfirm(connection, tx2, wallet);
      metadataAddress = mint.publicKey.toBase58(); // metadata embedded in mint account
      console.log("TX2 confirmed ✓");

    } else {
      // ── Standard SPL — single transaction ────────────────────────────────
      const rentExemption = await connection.getMinimumBalanceForRentExemption(MINT_SIZE);
      const tx = new Transaction();

      if (commissionData?.amount && commissionData?.walletAddress) {
        tx.add(SystemProgram.transfer({
          fromPubkey: walletPubkey,
          toPubkey:   new PublicKey(commissionData.walletAddress),
          lamports:   Math.floor(commissionData.amount * 1e9),
        }));
      }

      tx.add(
        SystemProgram.createAccount({
          fromPubkey:       walletPubkey,
          newAccountPubkey: mint.publicKey,
          space:            MINT_SIZE,
          lamports:         rentExemption,
          programId:        TOKEN_PROGRAM_ID,
        }),
        createInitializeMintInstructionSpl(mint.publicKey, decimals, walletPubkey, walletPubkey, TOKEN_PROGRAM_ID)
      );

      if (initialAmount > 0n) {
        const ata = await getAssociatedTokenAddress(
          mint.publicKey, walletPubkey, false, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID
        );
        tx.add(
          createAssociatedTokenAccountInstruction(
            walletPubkey, ata, walletPubkey, mint.publicKey, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID
          ),
          createMintToInstruction(mint.publicKey, ata, walletPubkey, initialAmount, [], TOKEN_PROGRAM_ID)
        );
      }

      const splMetadataPda = getMetadataAddress(mint.publicKey);
      try {
        tx.add(buildMetaplexMetadataInstruction({
          metadataPda: splMetadataPda, mintPublicKey: mint.publicKey,
          walletPublicKey: walletPubkey, name, symbol, metadataUri,
          revokeUpdate: formData?.revokeUpdate,
        }));
      } catch (e) { console.error("Metaplex instruction failed:", e); }

      if (formData?.revokeMint) {
        tx.add(createSetAuthorityInstruction(
          mint.publicKey, walletPubkey, AuthorityType.MintTokens, null, [], TOKEN_PROGRAM_ID
        ));
      }
      if (formData?.revokeFreeze) {
        tx.add(createSetAuthorityInstruction(
          mint.publicKey, walletPubkey, AuthorityType.FreezeAccount, null, [], TOKEN_PROGRAM_ID
        ));
      }

      signature       = await sendAndConfirm(connection, tx, wallet, [mint]);
      metadataAddress = splMetadataPda.toBase58();
    }

    const mintAddress = mint.publicKey.toBase58();

    return {
      success: true,
      signature,
      mintAddress,
      metadataAddress,
      isTaxToken,
      tokenData: {
        coinName: formData?.coinName || "", ticker: formData?.ticker || "",
        description: formData?.description || "", website: formData?.website || "",
        twitter: formData?.twitter || "", telegram: formData?.telegram || "",
        mintAddress, metadataAddress, metadataUri,
        totalSupply: initialAmount.toString(), decimals, isTaxToken,
        transferTaxBps:       isTaxToken ? formData.transferTaxBps       : null,
        taxWithdrawAuthority: isTaxToken ? formData.taxWithdrawAuthority : null,
      },
    };

  } catch (error) {
    if (error?.getLogs) {
      try { console.error("Simulation logs:", await error.getLogs()); } catch (_) {}
    }
    console.error("TokenCreator error:", error);
    throw error;
  }
};