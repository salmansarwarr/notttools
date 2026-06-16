import {
  Connection,
  PublicKey,
  Keypair,
  SystemProgram,
  LAMPORTS_PER_SOL,
  ComputeBudgetProgram,
} from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
} from "@solana/spl-token";
import * as anchor from "@coral-xyz/anchor";
import { Program, AnchorProvider, BN } from "@coral-xyz/anchor";
import constants from "../constants.jsx"; 

// Import your IDL
import idl from "./solana_nft_anchor.json";
import {
  getConfigFromDatabase,
  getConfigInfo,
  resolveNetworkConfig,
} from "./frontend-functions-old.js";

// Program ve network ayarları
const PROGRAM_ID = new PublicKey(constants.network.programId);
const NETWORK = constants.network.endpoint;
const COMMITMENT = constants.solana.commitment;

// Metaplex Token Metadata Program ID
const METADATA_PROGRAM_ID = new PublicKey(
  "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s"
);

/**
 * Connection ve provider setup
 */
export const getConnection = () => {
  return new Connection(NETWORK, COMMITMENT);
};

export const getProvider = (wallet) => {
  if (!wallet) throw new Error("Wallet not connected");

  const connection = getConnection();
  return new AnchorProvider(connection, wallet, {
    commitment: COMMITMENT,
  });
};

/**
 * Get Program instance
 */
export const getProgram = (wallet) => {
  const provider = getProvider(wallet);
  return new Program(idl, provider);
};

/**
 * Helper: Get Metadata PDA
 */
const getMetadataPDA = (mint) => {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from("metadata"),
      METADATA_PROGRAM_ID.toBuffer(),
      mint.toBuffer(),
    ],
    METADATA_PROGRAM_ID
  )[0];
};

/**
 * Helper: Get Master Edition PDA
 */
const getMasterEditionPDA = (mint) => {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from("metadata"),
      METADATA_PROGRAM_ID.toBuffer(),
      mint.toBuffer(),
      Buffer.from("edition"),
    ],
    METADATA_PROGRAM_ID
  )[0];
};

/**
 * PDA hesaplamaları
 */
export const getPDAs = (mintPubkey, userPubkey, programIdParam = PROGRAM_ID) => {
  const programId =
    programIdParam instanceof PublicKey
      ? programIdParam
      : new PublicKey(programIdParam);

  const [configPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("config")],
    programId
  );

  const [vaultPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("vault")],
    programId
  );

  const [feeVaultPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("fee_vault")],
    programId
  );

  const [stakeInfoPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("stake_info"), mintPubkey.toBuffer()],
    programId
  );

  const [userStatsPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("user_stats"), userPubkey.toBuffer()],
    programId
  );

  const [globalStatsPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("global_stats")],
    programId
  );

  return {
    configPda,
    vaultPda,
    feeVaultPda,
    stakeInfoPda,
    userStatsPda,
    globalStatsPda,
  };
};

/**
 * Initialize program config (admin only) - USING IDL
 */
export const initializeConfig = async (
  wallet,
  mintingFee = 0.01,
  maxNftsPerWallet = 5,
  stakingDurationMonths = 3
) => {
  try {
    console.log("🚀 Initializing program config...");

    if (!wallet.publicKey) {
      throw new Error("Wallet not connected");
    }

    const program = getProgram(wallet);
    const mintingFeeLamports = new BN(Math.floor(mintingFee * LAMPORTS_PER_SOL));

    const [configPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("config")],
      PROGRAM_ID
    );

    const tx = await program.methods
      .initializeConfig(mintingFeeLamports, maxNftsPerWallet, stakingDurationMonths)
      .accounts({
        admin: wallet.publicKey,
        config: configPda,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    console.log("✅ Program config initialized successfully!");
    console.log("Transaction:", tx);

    return {
      signature: tx,
      configPda: configPda.toString(),
      explorerUrl: constants.getExplorerUrl(tx),
    };
  } catch (error) {
    console.error("❌ Initialize config error:", error);
    throw error;
  }
};

/**
 * Set Collection Mint (admin only) - NEW
 */
export const setCollectionMint = async (wallet, collectionMintAddress) => {
  try {
    console.log("📦 Setting collection mint...");

    if (!wallet.publicKey) {
      throw new Error("Wallet not connected");
    }

    const program = getProgram(wallet);
    const collectionMint = new PublicKey(collectionMintAddress);

    const [configPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("config")],
      PROGRAM_ID
    );

    const collectionMetadata = getMetadataPDA(collectionMint);

    console.log("📋 Collection Mint:", collectionMint.toString());
    console.log("📋 Collection Metadata:", collectionMetadata.toString());
    console.log("📋 Config PDA:", configPda.toString());

    const tx = await program.methods
      .setCollectionMint(collectionMint)
      .accounts({
        admin: wallet.publicKey,
        config: configPda,
        collectionMint: collectionMint,
        collectionMetadata: collectionMetadata,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    console.log("✅ Collection mint set successfully!");
    console.log("Transaction:", tx);
    console.log("");
    console.log("⚠️  IMPORTANT: You must transfer collection update authority to Config PDA:");
    console.log("   Config PDA:", configPda.toString());

    return {
      signature: tx,
      collectionMint: collectionMint.toString(),
      configPda: configPda.toString(),
      explorerUrl: constants.getExplorerUrl(tx),
    };
  } catch (error) {
    console.error("❌ Set collection mint error:", error);
    throw error;
  }
};

/**
 * NFT MINT - USING IDL WITH COLLECTION SUPPORT
 */
export const mintRandomNFT = async (wallet, collectionMintAddress) => {
  try {
    console.log("🎨 NFT mint başlıyor (IDL kullanarak)...");

    if (!wallet.publicKey) {
      throw new Error("Wallet not connected");
    }

    const { programId, rpcEndpoint } = await resolveNetworkConfig();
    const connection = new Connection(rpcEndpoint, COMMITMENT);
    const provider = new AnchorProvider(connection, wallet, {
      commitment: COMMITMENT,
    });
    const program = new Program(idl, provider);
    const userPubkey = wallet.publicKey;

    console.log("🔑 User:", userPubkey.toString());
    console.log("📋 Program ID:", programId.toString());
    console.log("🌐 RPC:", rpcEndpoint);

    // Get collection mint from config if not provided
    let collectionMint;
    if (collectionMintAddress) {
      collectionMint = new PublicKey(collectionMintAddress);
    } else {
      // Fetch from config
      const config = await getConfigFromDatabase();
      if (!config.collectionMint || config.collectionMint === PublicKey.default.toString()) {
        throw new Error("Collection mint not set in config. Please set it first.");
      }
      collectionMint = new PublicKey(config.collectionMint);
    }

    console.log("📦 Collection Mint:", collectionMint.toString());

    // Generate random NFT metadata
    const randomId = Math.floor(Math.random() * 5000) + 1;
    const name = `NOOT Genesis #${randomId}`;
    const symbol = "NOOT";
    const uri = `https://metadata.noottools.io/metadata/${randomId}.json`;

    console.log("📝 NFT Metadata:");
    console.log("  Name:", name);
    console.log("  Symbol:", symbol);
    console.log("  URI:", uri);

    // Create mint keypair
    const mintKeypair = Keypair.generate();
    const mintPubkey = mintKeypair.publicKey;

    console.log("🎨 New Mint Address:", mintPubkey.toString());

    const pdas = getPDAs(mintPubkey, userPubkey, programId);

    // Token accounts
    const associatedTokenAccount = await getAssociatedTokenAddress(
      mintPubkey,
      userPubkey
    );

    // Metadata accounts for new NFT
    const metadataAccount = getMetadataPDA(mintPubkey);
    const masterEditionAccount = getMasterEditionPDA(mintPubkey);

    // Collection metadata accounts
    const collectionMetadata = getMetadataPDA(collectionMint);
    const collectionMasterEdition = getMasterEditionPDA(collectionMint);

    console.log("📋 Accounts:");
    console.log("  Metadata:", metadataAccount.toString());
    console.log("  Master Edition:", masterEditionAccount.toString());
    console.log("  Collection Metadata:", collectionMetadata.toString());
    console.log("  Collection Master Edition:", collectionMasterEdition.toString());

    console.log("⚡ Sending mint transaction...");

    // 🔥 ADD COMPUTE BUDGET INSTRUCTIONS
    const modifyComputeUnits = ComputeBudgetProgram.setComputeUnitLimit({
      units: 500_000, // Increased for collection verification
    });

    const addPriorityFee = ComputeBudgetProgram.setComputeUnitPrice({
      microLamports: 1,
    });

    // Call mint_nft using IDL
    const tx = await program.methods
      .mintNft(name, symbol, uri)
      .accounts({
        payer: userPubkey,
        config: pdas.configPda,
        userStats: pdas.userStatsPda,
        globalStats: pdas.globalStatsPda,
        mint: mintPubkey,
        associatedTokenAccount: associatedTokenAccount,
        metadataAccount: metadataAccount,
        masterEditionAccount: masterEditionAccount,
        collectionMint: collectionMint, // ✅ Add collection accounts
        collectionMetadata: collectionMetadata,
        collectionMasterEdition: collectionMasterEdition,
        feeVault: pdas.feeVaultPda,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        tokenMetadataProgram: METADATA_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .preInstructions([modifyComputeUnits, addPriorityFee])
      .signers([mintKeypair])
      .rpc();

    console.log("✅ NFT BAŞARIYLA MİNT EDİLDİ! 🎨");
    console.log("🔗 Transaction:", tx);
    console.log("🎨 Mint address:", mintPubkey.toString());

    return {
      signature: tx,
      mintAddress: mintPubkey.toString(),
      nftName: name,
      nftId: randomId,
      nftUri: uri,
      collectionMint: collectionMint.toString(),
      explorerUrl: constants.getExplorerUrl(tx),
      nftExplorerUrl: constants.getExplorerUrl(
        mintPubkey.toString(),
        "address"
      ),
    };
  } catch (error) {
    console.error("❌ Mint error:", error);
    throw error;
  }
};

/**
 * NFT Stake - USING IDL
 */
export const stakeNFT = async (wallet, mintAddress) => {
  try {
    console.log("🔒 Starting NFT stake (IDL kullanarak)...");

    if (!wallet.publicKey) {
      throw new Error("Wallet not connected");
    }

    const program = getProgram(wallet);
    const userPubkey = wallet.publicKey;
    const mintPubkey = new PublicKey(mintAddress);

    // Get PDAs
    const pdas = getPDAs(mintPubkey, userPubkey);

    // Token accounts
    const ownerTokenAccount = await getAssociatedTokenAddress(
      mintPubkey,
      userPubkey
    );

    const vaultTokenAccount = await getAssociatedTokenAddress(
      mintPubkey,
      pdas.vaultPda,
      true
    );

    console.log("⚡ Sending stake transaction...");

    const tx = await program.methods
      .stakeNft()
      .accounts({
        owner: userPubkey,
        config: pdas.configPda,
        stakeInfo: pdas.stakeInfoPda,
        userStats: pdas.userStatsPda,
        globalStats: pdas.globalStatsPda,
        mint: mintPubkey,
        ownerTokenAccount: ownerTokenAccount,
        vaultTokenAccount: vaultTokenAccount,
        vault: pdas.vaultPda,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    console.log("✅ NFT staked successfully!");
    console.log("Transaction:", tx);

    return {
      signature: tx,
      stakeInfoPda: pdas.stakeInfoPda.toString(),
      explorerUrl: constants.getExplorerUrl(tx),
    };
  } catch (error) {
    console.error("❌ Stake error:", error);
    throw error;
  }
};

/**
 * NFT Unstake - USING IDL
 */
export const unstakeNFT = async (wallet, mintAddress) => {
  try {
    console.log("🔓 Starting NFT unstake (IDL kullanarak)...");

    if (!wallet.publicKey) {
      throw new Error("Wallet not connected");
    }

    const program = getProgram(wallet);
    const userPubkey = wallet.publicKey;
    const mintPubkey = new PublicKey(mintAddress);

    // Get PDAs
    const pdas = getPDAs(mintPubkey, userPubkey);

    // Token accounts
    const ownerTokenAccount = await getAssociatedTokenAddress(
      mintPubkey,
      userPubkey
    );

    const vaultTokenAccount = await getAssociatedTokenAddress(
      mintPubkey,
      pdas.vaultPda,
      true
    );

    console.log("⚡ Sending unstake transaction...");

    const tx = await program.methods
      .unstakeNft()
      .accounts({
        owner: userPubkey,
        config: pdas.configPda,
        stakeInfo: pdas.stakeInfoPda,
        userStats: pdas.userStatsPda,
        globalStats: pdas.globalStatsPda,
        mint: mintPubkey,
        ownerTokenAccount: ownerTokenAccount,
        vaultTokenAccount: vaultTokenAccount,
        vault: pdas.vaultPda,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      })
      .rpc();

    console.log("✅ NFT unstaked successfully!");
    console.log("Transaction:", tx);

    return {
      signature: tx,
      explorerUrl: constants.getExplorerUrl(tx),
    };
  } catch (error) {
    console.error("❌ Unstake error:", error);
    throw error;
  }
};

/**
 * Get Config Info - USING IDL
 */
// export const getConfigInfo = async () => {
//   try {
//     console.log("🔧 Fetching config info (IDL kullanarak)...");
//     const connection = getConnection();

//     const [configPda] = PublicKey.findProgramAddressSync(
//       [Buffer.from("config")],
//       PROGRAM_ID
//     );

//     console.log("Config PDA:", configPda.toString());

//     // Create a dummy wallet for reading (no signing needed)
//     const dummyWallet = {
//       publicKey: PROGRAM_ID,
//       signTransaction: async () => { throw new Error("Not implemented"); },
//       signAllTransactions: async () => { throw new Error("Not implemented"); },
//     };

//     const provider = new AnchorProvider(
//       connection,
//       dummyWallet,
//       { commitment: COMMITMENT }
//     );

//     const program = new Program(idl, provider);

//     const configAccount = await program.account.config.fetchNullable(configPda);

//     if (!configAccount) {
//       console.warn("⚠️ Config account not found - program not initialized yet");
//       return {
//         admin: "Unknown",
//         mintingFee: constants.nft.defaultMintPrice,
//         maxNftsPerWallet: constants.nft.maxNftsPerWallet,
//         stakingDurationMonths: constants.nft.stakingDurationMonths,
//         totalMinted: 0,
//         totalStaked: 0,
//         collectionMint: PublicKey.default.toString(),
//         configPda: configPda.toString(),
//       };
//     }

//     console.log("✅ Config fetched successfully");

//     return {
//       admin: configAccount.admin.toString(),
//       mintingFee: configAccount.mintingFee.toNumber() / LAMPORTS_PER_SOL,
//       maxNftsPerWallet: configAccount.maxNftsPerWallet,
//       stakingDurationMonths: configAccount.stakingDurationMonths,
//       totalMinted: configAccount.totalMinted.toNumber(),
//       totalStaked: configAccount.totalStaked.toNumber(),
//       collectionMint: configAccount.collectionMint.toString(), // ✅ Add collection mint
//       configPda: configPda.toString(),
//     };
//   } catch (error) {
//     console.error("❌ Error fetching config:", error);

//     return {
//       admin: "Unknown",
//       mintingFee: constants.nft.defaultMintPrice,
//       maxNftsPerWallet: constants.nft.maxNftsPerWallet,
//       stakingDurationMonths: constants.nft.stakingDurationMonths,
//       totalMinted: 0,
//       totalStaked: 0,
//       collectionMint: PublicKey.default.toString(),
//       configPda: "Unknown",
//     };
//   }
// };

/**
 * Withdraw Fees - USING IDL
 */
export const withdrawFees = async (wallet) => {
  try {
    const config = await getConfigInfo();
    console.log("Admin:", config.admin);
    console.log("💰 Starting fee withdrawal (IDL kullanarak)...");

    if (!wallet.publicKey) {
      throw new Error("Wallet not connected");
    }

    const program = getProgram(wallet);
    const connection = getConnection();

    const [configPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("config")],
      PROGRAM_ID
    );

    const [feeVaultPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("fee_vault")],
      PROGRAM_ID
    );

    const feeVaultBalance = await connection.getBalance(feeVaultPda);
    console.log("💰 Fee Vault Balance:", feeVaultBalance / LAMPORTS_PER_SOL, "SOL");

    if (feeVaultBalance === 0) {
      throw new Error("No funds available in fee vault");
    }

    const adminBalanceBefore = await connection.getBalance(wallet.publicKey);

    console.log("⚡ Sending withdrawal transaction...");

    const tx = await program.methods
      .withdrawFees()
      .accounts({
        admin: wallet.publicKey,
        config: configPda,
        feeVault: feeVaultPda,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const feeVaultBalanceAfter = await connection.getBalance(feeVaultPda);
    const adminBalanceAfter = await connection.getBalance(wallet.publicKey);

    const amountWithdrawn = (feeVaultBalance - feeVaultBalanceAfter) / LAMPORTS_PER_SOL;

    console.log("✅ Withdrawal successful!");
    console.log("💸 Amount Withdrawn:", amountWithdrawn, "SOL");

    return {
      signature: tx,
      feeVaultBalance: feeVaultBalance / LAMPORTS_PER_SOL,
      adminBalanceBefore: adminBalanceBefore / LAMPORTS_PER_SOL,
      adminBalanceAfter: adminBalanceAfter / LAMPORTS_PER_SOL,
      amountWithdrawn,
      explorerUrl: constants.getExplorerUrl(tx),
      message: "Withdrawal completed successfully",
    };
  } catch (error) {
    console.error("❌ Withdraw error:", error);
    throw error;
  }
};

/**
 * Get Fee Vault Info with Withdrawable Amount
 */
export const getFeeVaultInfo = async () => {
  try {
    console.log("🔍 Fetching fee vault info...");
    const connection = getConnection();

    const [feeVaultPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("fee_vault")],
      PROGRAM_ID
    );

    // Get balance
    const feeVaultBalance = await connection.getBalance(feeVaultPda);
    
    // Get rent-exempt minimum (0 bytes data account)
    const rentExemptMinimum = await connection.getMinimumBalanceForRentExemption(0);
    
    // Calculate withdrawable amount (same logic as contract)
    const withdrawableLamports = feeVaultBalance > rentExemptMinimum 
      ? feeVaultBalance - rentExemptMinimum 
      : 0;

    console.log("✅ Fee vault info fetched successfully");
    console.log("   Total Balance:", feeVaultBalance, "lamports");
    console.log("   Rent Exempt:", rentExemptMinimum, "lamports");
    console.log("   Withdrawable:", withdrawableLamports, "lamports");

    return {
      feeVaultPda: feeVaultPda.toString(),
      balance: feeVaultBalance / LAMPORTS_PER_SOL,
      balanceLamports: feeVaultBalance,
      rentExemptMinimum: rentExemptMinimum / LAMPORTS_PER_SOL,
      rentExemptMinimumLamports: rentExemptMinimum,
      withdrawable: withdrawableLamports / LAMPORTS_PER_SOL,
      withdrawableLamports: withdrawableLamports,
      explorerUrl: constants.getExplorerUrl(feeVaultPda.toString(), "address"),
    };
  } catch (error) {
    console.error("❌ Error fetching fee vault info:", error);
    throw error;
  }
};

// Keep the same metadata and NFT functions (they don't use IDL)
export { getNFTMetadata, getUserNFTs, getUserStakes } from "./frontend-functions-old.js";

// Utility functions
export const formatAddress = (address, startChars = 4, endChars = 4) => {
  if (!address) return "";
  if (address.length <= startChars + endChars) return address;
  return `${address.slice(0, startChars)}...${address.slice(-endChars)}`;
};

export const formatDate = (dateString) => {
  return new Date(dateString).toLocaleDateString("tr-TR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export const formatDaysRemaining = (days) => {
  if (days <= 0) return "Unlocked";
  if (days === 1) return "1 day remaining";
  return `${days} days remaining`;
};

export default {
  initializeConfig,
  setCollectionMint, // ✅ NEW
  mintRandomNFT,
  stakeNFT,
  unstakeNFT,
  getConfigInfo,
  withdrawFees,
  getFeeVaultInfo,
  formatAddress,
  formatDate,
  formatDaysRemaining,
  getPDAs,
  getConnection,
  getProvider,
  getProgram,
  getMetadataPDA, // ✅ Export helper
  getMasterEditionPDA, // ✅ Export helper
};