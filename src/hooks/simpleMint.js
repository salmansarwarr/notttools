import {
  Connection,
  PublicKey,
  Keypair,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
} from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
} from "@solana/spl-token";
import { Program, AnchorProvider, web3, BN } from "@coral-xyz/anchor";
import {
  findMetadataPda,
  findMasterEditionPda,
  MPL_TOKEN_METADATA_PROGRAM_ID,
} from "@metaplex-foundation/mpl-token-metadata";
import constants from "../constants.jsx";

// Network konfigürasyonu - Constants'tan al
const NETWORK_TYPE = constants.network.type;
const NETWORK_ENDPOINT = constants.network.endpoint;
const COMMITMENT = constants.solana.commitment;
const PROGRAM_ID = constants.network.programId;

console.log(`🎨 Simple Mint konfigürasyonu:`, {
  network: NETWORK_TYPE,
  programId: PROGRAM_ID,
  endpoint: NETWORK_ENDPOINT,
});

// Program IDL (basit hali - gerçek IDL'i buraya ekleyin)
const IDL = {
  version: "0.1.0",
  name: "solana_nft_anchor",
  instructions: [
    {
      name: "mintNft",
      accounts: [
        { name: "payer", isMut: true, isSigner: true },
        { name: "config", isMut: false, isSigner: false },
        { name: "userStats", isMut: true, isSigner: false },
        { name: "globalStats", isMut: true, isSigner: false },
        { name: "mint", isMut: true, isSigner: true },
        { name: "associatedTokenAccount", isMut: true, isSigner: false },
        { name: "metadataAccount", isMut: true, isSigner: false },
        { name: "masterEditionAccount", isMut: true, isSigner: false },
        { name: "feeVault", isMut: true, isSigner: false },
        { name: "tokenProgram", isMut: false, isSigner: false },
        { name: "associatedTokenProgram", isMut: false, isSigner: false },
        { name: "tokenMetadataProgram", isMut: false, isSigner: false },
        { name: "systemProgram", isMut: false, isSigner: false },
        { name: "rent", isMut: false, isSigner: false },
      ],
      args: [],
    },
  ],
};

/**
 * Anchor Provider oluştur
 */
const createAnchorProvider = (wallet) => {
  const connection = new Connection(NETWORK_ENDPOINT, COMMITMENT);
  return new AnchorProvider(connection, wallet, {
    commitment: COMMITMENT,
  });
};

/**
 * Program instance oluştur
 */
const createProgramInstance = (provider) => {
  return new Program(IDL, PROGRAM_ID, provider);
};

/**
 * PDA'ları hesapla
 */
const getPDAs = (userPublicKey, programId, mintPublicKey) => {
  const [configPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("config")],
    new PublicKey(programId)
  );

  const [globalStatsPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("global_stats")],
    new PublicKey(programId)
  );

  const [feeVaultPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("fee_vault")],
    new PublicKey(programId)
  );

  const [userStatsPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("user_stats"), userPublicKey.toBuffer()],
    new PublicKey(programId)
  );

  // Metadata PDAs
  const [metadataAccount] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("metadata"),
      new PublicKey(MPL_TOKEN_METADATA_PROGRAM_ID).toBuffer(),
      mintPublicKey.toBuffer(),
    ],
    new PublicKey(MPL_TOKEN_METADATA_PROGRAM_ID)
  );

  const [masterEditionAccount] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("metadata"),
      new PublicKey(MPL_TOKEN_METADATA_PROGRAM_ID).toBuffer(),
      mintPublicKey.toBuffer(),
      Buffer.from("edition"),
    ],
    new PublicKey(MPL_TOKEN_METADATA_PROGRAM_ID)
  );

  return {
    configPda,
    globalStatsPda,
    feeVaultPda,
    userStatsPda,
    metadataAccount,
    masterEditionAccount,
  };
};

/**
 * BASİT NFT MINT - ANCHOR PROGRAM
 * Metadata contract içinde otomatik counter ile işleniyor
 */
export const mintSimpleNFT = async (wallet) => {
  try {
    console.log("🎨 Basit NFT mint başlıyor...");
    console.log(`🌐 Network: ${NETWORK_TYPE.toUpperCase()}`);

    if (!wallet.publicKey) {
      throw new Error("Wallet bağlı değil");
    }

    // Anchor provider ve program oluştur
    const provider = createAnchorProvider(wallet);
    const program = createProgramInstance(provider);

    console.log("🔑 User:", wallet.publicKey.toString());
    console.log("📝 Program ID:", PROGRAM_ID);

    // Yeni mint keypair oluştur
    const mint = Keypair.generate();
    console.log("🎨 New Mint Address:", mint.publicKey.toString());

    // Associated token account hesapla
    const associatedTokenAccount = await getAssociatedTokenAddress(
      mint.publicKey,
      wallet.publicKey
    );

    // PDA'ları hesapla
    const pdas = getPDAs(wallet.publicKey, PROGRAM_ID, mint.publicKey);

    console.log("🔄 PDAs hesaplandı...");
    console.log("🎯 Config PDA:", pdas.configPda.toString());
    console.log("📊 User Stats PDA:", pdas.userStatsPda.toString());

    // Basit mint işlemi (parametresiz)
    console.log("⚡ NFT mint ediliyor...");
    const tx = await program.methods
      .mintNft() // Parametresiz, metadata contract'ta otomatik
      .accounts({
        payer: wallet.publicKey,
        config: pdas.configPda,
        userStats: pdas.userStatsPda,
        globalStats: pdas.globalStatsPda,
        mint: mint.publicKey,
        associatedTokenAccount: associatedTokenAccount,
        metadataAccount: pdas.metadataAccount,
        masterEditionAccount: pdas.masterEditionAccount,
        feeVault: pdas.feeVaultPda,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        tokenMetadataProgram: MPL_TOKEN_METADATA_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        rent: SYSVAR_RENT_PUBKEY,
      })
      .signers([mint])
      .rpc();

    console.log("✅ BASİT NFT BAŞARIYLA MİNT EDİLDİ! 🎨");
    console.log("🔗 Transaction:", tx);
    console.log("🎨 NFT Address:", mint.publicKey.toString());

    // Explorer URL'sini network'e göre oluştur
    const explorerCluster =
      NETWORK_TYPE === "mainnet-beta" ? "" : `?cluster=${NETWORK_TYPE}`;

    // User stats kontrol et
    let userStats, globalStats;
    try {
      userStats = await program.account.userStats.fetch(pdas.userStatsPda);
      globalStats = await program.account.globalStats.fetch(
        pdas.globalStatsPda
      );
      console.log("📊 User NFTs minted:", userStats.nftsMinted.toString());
      console.log(
        "📊 Global total minted:",
        globalStats.totalMinted.toString()
      );
    } catch (statsError) {
      console.log(
        "⚠️ Stats fetch hatası (normal olabilir):",
        statsError.message
      );
    }

    return {
      success: true,
      signature: tx,
      mintAddress: mint.publicKey.toString(),
      network: NETWORK_TYPE,
      source: "Simple Anchor Program",
      explorerUrl: `https://explorer.solana.com/tx/${tx}${explorerCluster}`,
      nftExplorerUrl: `https://explorer.solana.com/address/${mint.publicKey.toString()}${explorerCluster}`,
      programId: PROGRAM_ID,
      userStats: userStats
        ? {
            nftsMinted: userStats.nftsMinted.toString(),
            nftsStaked: userStats.nftsStaked.toString(),
            lastMintTimestamp: userStats.lastMintTimestamp.toString(),
          }
        : null,
      globalStats: globalStats
        ? {
            totalMinted: globalStats.totalMinted.toString(),
            totalStaked: globalStats.totalStaked.toString(),
          }
        : null,
      metadataUrl: `https://metadata.noottools.io/metadata/${
        globalStats ? globalStats.totalMinted.toString() : "unknown"
      }.json`,
    };
  } catch (error) {
    console.error("❌ Basit mint hatası:", error);
    throw new Error(`Mint işlemi başarısız: ${error.message}`);
  }
};

/**
 * Program stats bilgilerini getir
 */
export const getProgramStats = async (wallet) => {
  try {
    if (!wallet.publicKey) {
      throw new Error("Wallet bağlı değil");
    }

    const provider = createAnchorProvider(wallet);
    const program = createProgramInstance(provider);

    const pdas = getPDAs(
      wallet.publicKey,
      PROGRAM_ID,
      Keypair.generate().publicKey
    );

    const [userStats, globalStats] = await Promise.all([
      program.account.userStats.fetch(pdas.userStatsPda).catch(() => null),
      program.account.globalStats.fetch(pdas.globalStatsPda).catch(() => null),
    ]);

    return {
      programId: PROGRAM_ID,
      network: NETWORK_TYPE,
      userStats: userStats
        ? {
            nftsMinted: Number(userStats.nftsMinted),
            nftsStaked: Number(userStats.nftsStaked),
            lastMintTimestamp: Number(userStats.lastMintTimestamp),
          }
        : null,
      globalStats: globalStats
        ? {
            totalMinted: Number(globalStats.totalMinted),
            totalStaked: Number(globalStats.totalStaked),
          }
        : null,
    };
  } catch (error) {
    console.error("❌ Program stats alma hatası:", error);
    return null;
  }
};

export default {
  mintSimpleNFT,
  getProgramStats,
};
