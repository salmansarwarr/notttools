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
import constants from "../constants.jsx";

// Program ve network ayarları - constants'tan al
const PROGRAM_ID = new PublicKey(constants.network.programId);
const NETWORK = constants.network.endpoint;
const COMMITMENT = constants.solana.commitment;

/**
 * Yardımcı: transaction simülasyonu (debug için)
 */
const simulateTransaction = async (
  connection,
  wallet,
  transaction,
  signers = []
) => {
  try {
    console.log("🧪 Simulating transaction...");

    const latest = await connection.getLatestBlockhash();
    transaction.recentBlockhash = latest.blockhash;
    transaction.feePayer = wallet.publicKey;

    if (signers.length > 0) {
      transaction.partialSign(...signers);
    }

    const simResult = await connection.simulateTransaction(transaction);

    if (simResult.value.err) {
      console.error("❌ Simulation failed:", simResult.value.err);
      console.error("📝 Transaction logs:", simResult.value.logs);
      throw new Error(
        `Simulation failed: ${JSON.stringify(simResult.value.err)}`
      );
    } else {
      console.log("✅ Simulation successful");
      console.log("📝 Transaction logs:", simResult.value.logs);
    }

    return simResult;
  } catch (error) {
    console.error("❌ Simulation error:", error);
    throw error;
  }
};

/**
 * Connection ve provider setup
 */
export const getConnection = () => {
  return new Connection(NETWORK, COMMITMENT);
};

export const getProvider = (wallet) => {
  if (!wallet) throw new Error("Wallet not connected");

  const connection = getConnection();
  return new anchor.AnchorProvider(connection, wallet, {
    commitment: COMMITMENT,
  });
};

/**
 * PDA hesaplamaları
 */
export const getPDAs = (mintPubkey, userPubkey) => {
  const [configPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("config")],
    PROGRAM_ID
  );

  const [vaultPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("vault")],
    PROGRAM_ID
  );

  const [feeVaultPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("fee_vault")],
    PROGRAM_ID
  );

  const [stakeInfoPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("stake_info"), mintPubkey.toBuffer()],
    PROGRAM_ID
  );

  const [userStatsPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("user_stats"), userPubkey.toBuffer()],
    PROGRAM_ID
  );

  const [globalStatsPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("global_stats")],
    PROGRAM_ID
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
 * Initialize program config (admin only)
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

    const connection = getConnection();
    const adminPubkey = wallet.publicKey;

    // Convert SOL to lamports
    const mintingFeeLamports = Math.floor(mintingFee * LAMPORTS_PER_SOL);

    // PDAs
    const [configPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("config")],
      PROGRAM_ID
    );

    // Instruction data (initialize_config discriminator)
    const instructionData = Buffer.alloc(8 + 8 + 1 + 1);
    const discriminator = [208, 127, 21, 1, 194, 190, 196, 70];
    discriminator.forEach((byte, index) => {
      instructionData.writeUInt8(byte, index);
    });

    // Minting fee (8 bytes)
    instructionData.writeBigUInt64LE(BigInt(mintingFeeLamports), 8);

    // Max NFTs per wallet (1 byte)
    instructionData.writeUInt8(maxNftsPerWallet, 16);

    // Staking duration months (1 byte)
    instructionData.writeUInt8(stakingDurationMonths, 17);

    const instruction = new anchor.web3.TransactionInstruction({
      keys: [
        { pubkey: adminPubkey, isSigner: true, isWritable: true },
        { pubkey: configPda, isSigner: false, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      programId: PROGRAM_ID,
      data: instructionData,
    });

    const transaction = new anchor.web3.Transaction().add(instruction);
    const signature = await wallet.sendTransaction(transaction, connection);

    await connection.confirmTransaction(signature, COMMITMENT);

    console.log("✅ Program config initialized successfully!");
    console.log("Transaction:", signature);

    return {
      signature,
      configPda: configPda.toString(),
      explorerUrl: constants.getExplorerUrl(signature),
    };
  } catch (error) {
    console.error("❌ Initialize config error:", error);
    throw error;
  }
};

/**
 * BASIT NFT MINT - Parametresiz, metadata contract'ta otomatik
 */
export const mintRandomNFT = async (wallet) => {
  try {
    console.log("🎨 Basit NFT mint başlıyor...");

    if (!wallet.publicKey) {
      throw new Error("Wallet not connected");
    }

    const connection = getConnection();
    const userPubkey = wallet.publicKey;

    console.log("🔑 User:", userPubkey.toString());
    console.log("📋 Program ID:", PROGRAM_ID.toString());

    // Yeni mint keypair oluştur
    const mintKeypair = Keypair.generate();
    const mintPubkey = mintKeypair.publicKey;

    console.log("🎨 New Mint Address:", mintPubkey.toString());

    // PDA'ları hesapla
    const pdas = getPDAs(mintPubkey, userPubkey);

    // Token accounts
    const associatedTokenAccount = await getAssociatedTokenAddress(
      mintPubkey,
      userPubkey
    );

    // Metadata account addresses
    const [metadataAccount] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("metadata"),
        new PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s").toBuffer(),
        mintPubkey.toBuffer(),
      ],
      new PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s")
    );

    const [masterEditionAccount] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("metadata"),
        new PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s").toBuffer(),
        mintPubkey.toBuffer(),
        Buffer.from("edition"),
      ],
      new PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s")
    );

    // Instruction data (mint_nft discriminator)
    const instructionData = Buffer.alloc(8);
    const discriminator = [211, 57, 6, 167, 15, 219, 35, 251];
    discriminator.forEach((byte, index) => {
      instructionData.writeUInt8(byte, index);
    });

    // Transaction instruction
    const instruction = new anchor.web3.TransactionInstruction({
      keys: [
        { pubkey: userPubkey, isSigner: true, isWritable: true },
        { pubkey: pdas.configPda, isSigner: false, isWritable: true },
        { pubkey: pdas.userStatsPda, isSigner: false, isWritable: true },
        { pubkey: pdas.globalStatsPda, isSigner: false, isWritable: true },
        { pubkey: mintPubkey, isSigner: true, isWritable: true },
        { pubkey: associatedTokenAccount, isSigner: false, isWritable: true },
        { pubkey: metadataAccount, isSigner: false, isWritable: true },
        { pubkey: masterEditionAccount, isSigner: false, isWritable: true },
        { pubkey: pdas.feeVaultPda, isSigner: false, isWritable: true },
        { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
        {
          pubkey: ASSOCIATED_TOKEN_PROGRAM_ID,
          isSigner: false,
          isWritable: false,
        },
        {
          pubkey: new PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s"),
          isSigner: false,
          isWritable: false,
        },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        {
          pubkey: anchor.web3.SYSVAR_RENT_PUBKEY,
          isSigner: false,
          isWritable: false,
        },
      ],
      programId: PROGRAM_ID,
      data: instructionData,
    });

    // Compute budget instruction
    const computeBudgetIx = ComputeBudgetProgram.setComputeUnitLimit({
      units: 400000,
    });

    // Transaction oluştur ve gönder
    const transaction = new anchor.web3.Transaction()
      .add(computeBudgetIx)
      .add(instruction);

    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash(COMMITMENT);
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = wallet.publicKey;

    console.log("⚡ NFT mint ediliyor...");

    const signature = await wallet.sendTransaction(transaction, connection, {
      signers: [mintKeypair],
    });

    // ✅ Update confirmation to use new method:
    await connection.confirmTransaction({
      signature,
      blockhash,
      lastValidBlockHeight,
    }, COMMITMENT);

    console.log("✅ NFT BAŞARIYLA MİNT EDİLDİ! 🎨");
    console.log("🔗 Transaction:", signature);
    console.log("🎨 Mint address:", mintPubkey.toString());

    return {
      signature,
      mintAddress: mintPubkey.toString(),
      source: "Basit Anchor Program",
      explorerUrl: constants.getExplorerUrl(signature),
      nftExplorerUrl: constants.getExplorerUrl(
        mintPubkey.toString(),
        "address"
      ),
    };
  } catch (error) {
    console.error("❌ Basit mint hatası:", error);
    throw error;
  }
};

/**
 * 2. NFT Stake Fonksiyonu
 */
export const stakeNFT = async (wallet, mintAddress) => {
  try {
    console.log("🔒 Starting NFT stake...");

    if (!wallet.publicKey) {
      throw new Error("Wallet not connected");
    }

    const connection = getConnection();
    const userPubkey = wallet.publicKey;
    const mintPubkey = new PublicKey(mintAddress);

    // PDA'ları hesapla
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

    // Instruction data (stake_nft discriminator)
    const instructionData = Buffer.alloc(8);
    const discriminator = [38, 27, 66, 46, 69, 65, 151, 219];
    discriminator.forEach((byte, index) => {
      instructionData.writeUInt8(byte, index);
    });

    // Transaction instruction - matches StakeNFT struct in v2
    const instruction = new anchor.web3.TransactionInstruction({
      keys: [
        { pubkey: userPubkey, isSigner: true, isWritable: true },
        { pubkey: pdas.configPda, isSigner: false, isWritable: false }, // Read-only in v2
        { pubkey: pdas.stakeInfoPda, isSigner: false, isWritable: true },
        { pubkey: pdas.userStatsPda, isSigner: false, isWritable: true },
        { pubkey: pdas.globalStatsPda, isSigner: false, isWritable: true },
        { pubkey: mintPubkey, isSigner: false, isWritable: false },
        { pubkey: ownerTokenAccount, isSigner: false, isWritable: true },
        { pubkey: vaultTokenAccount, isSigner: false, isWritable: true },
        { pubkey: pdas.vaultPda, isSigner: false, isWritable: false }, // Read-only in v2
        { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
        {
          pubkey: ASSOCIATED_TOKEN_PROGRAM_ID,
          isSigner: false,
          isWritable: false,
        },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      programId: PROGRAM_ID,
      data: instructionData,
    });

    // Compute budget instruction
    const computeBudgetIx = ComputeBudgetProgram.setComputeUnitLimit({
      units: 300000,
    });

    // Transaction oluştur ve gönder
    const transaction = new anchor.web3.Transaction()
      .add(computeBudgetIx)
      .add(instruction);

    // Debug için simülasyon
    if (constants.network.isDevelopment) {
      try {
        await simulateTransaction(connection, wallet, transaction);
      } catch (simError) {
        console.error("Simulation failed, but continuing...", simError.message);
      }
    }

    const signature = await wallet.sendTransaction(transaction, connection);
    await connection.confirmTransaction(signature, COMMITMENT);

    console.log("✅ NFT staked successfully!");
    console.log("Transaction:", signature);

    return {
      signature,
      stakeInfoPda: pdas.stakeInfoPda.toString(),
      explorerUrl: constants.getExplorerUrl(signature),
    };
  } catch (error) {
    console.error("❌ Stake error:", error);
    throw error;
  }
};

/**
 * 3. NFT Unstake Fonksiyonu - UPDATED FOR V2
 */
export const unstakeNFT = async (wallet, mintAddress) => {
  try {
    console.log("🔓 Starting NFT unstake...");

    if (!wallet.publicKey) {
      throw new Error("Wallet not connected");
    }

    const connection = getConnection();
    const userPubkey = wallet.publicKey;
    const mintPubkey = new PublicKey(mintAddress);

    // PDA'ları hesapla
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

    // Instruction data (unstake_nft discriminator)
    const instructionData = Buffer.alloc(8);
    const discriminator = [17, 182, 24, 211, 101, 138, 50, 163];
    discriminator.forEach((byte, index) => {
      instructionData.writeUInt8(byte, index);
    });

    // Transaction instruction - matches UnstakeNFT struct in v2
    const instruction = new anchor.web3.TransactionInstruction({
      keys: [
        { pubkey: userPubkey, isSigner: true, isWritable: true },
        { pubkey: pdas.stakeInfoPda, isSigner: false, isWritable: true },
        { pubkey: pdas.userStatsPda, isSigner: false, isWritable: true },
        { pubkey: pdas.globalStatsPda, isSigner: false, isWritable: true },
        { pubkey: mintPubkey, isSigner: false, isWritable: false },
        { pubkey: ownerTokenAccount, isSigner: false, isWritable: true },
        { pubkey: vaultTokenAccount, isSigner: false, isWritable: true },
        { pubkey: pdas.vaultPda, isSigner: false, isWritable: true },
        { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
        {
          pubkey: ASSOCIATED_TOKEN_PROGRAM_ID,
          isSigner: false,
          isWritable: false,
        },
      ],
      programId: PROGRAM_ID,
      data: instructionData,
    });

    // Compute budget instruction
    const computeBudgetIx = ComputeBudgetProgram.setComputeUnitLimit({
      units: 300000,
    });

    // Transaction oluştur ve gönder
    const transaction = new anchor.web3.Transaction()
      .add(computeBudgetIx)
      .add(instruction);

    // Debug için simülasyon
    if (constants.network.isDevelopment) {
      try {
        await simulateTransaction(connection, wallet, transaction);
      } catch (simError) {
        console.error("Simulation failed, but continuing...", simError.message);
      }
    }

    const signature = await wallet.sendTransaction(transaction, connection);
    await connection.confirmTransaction(signature, COMMITMENT);

    console.log("✅ NFT unstaked successfully!");
    console.log("Transaction:", signature);

    return {
      signature,
      explorerUrl: constants.getExplorerUrl(signature),
    };
  } catch (error) {
    console.error("❌ Unstake error:", error);
    throw error;
  }
};

/**
 * NFT Metadata okuma fonksiyonu
 */
export const getNFTMetadata = async (mintAddress) => {
  try {
    console.log("🎨 Fetching metadata for:", mintAddress);
    const connection = getConnection();
    const mintPubkey = new PublicKey(mintAddress);

    const METAPLEX_PROGRAM_ID = new PublicKey(
      "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s"
    );

    const [metadataPDA] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("metadata"),
        METAPLEX_PROGRAM_ID.toBuffer(),
        mintPubkey.toBuffer(),
      ],
      METAPLEX_PROGRAM_ID
    );

    const metadataAccount = await connection.getAccountInfo(metadataPDA);

    if (!metadataAccount) {
      console.log(`No metadata found for ${mintAddress}`);
      return createFallbackMetadata(mintAddress);
    }

    const metadata = parseMetadataAccount(metadataAccount.data, mintAddress);

    if (!metadata) {
      return createFallbackMetadata(mintAddress);
    }

    let image = `https://metadata.noottools.io/metadata/${Math.floor(Math.random() * 5000) + 1
      }.png`;
    let description = constants.metadata.defaultDescription;

    if (metadata.uri && metadata.uri.trim()) {
      try {
        console.log("🌐 Fetching external metadata from:", metadata.uri);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000);

        const response = await fetch(metadata.uri, {
          signal: controller.signal,
          headers: {
            Accept: "application/json",
            "User-Agent": "Noottools/1.0",
          },
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          const externalMetadata = await response.json();
          console.log("📄 External metadata:", externalMetadata);

          if (externalMetadata.image) {
            image = externalMetadata.image;
            console.log("🖼️ Updated image from external metadata:", image);
          }
          if (externalMetadata.description) {
            description = externalMetadata.description;
          }
        } else {
          console.warn(
            "Failed to fetch external metadata:",
            response.status,
            response.statusText
          );
        }
      } catch (externalError) {
        if (externalError.name === "AbortError") {
          console.warn("External metadata fetch timed out for:", metadata.uri);
        } else {
          console.warn(
            "Could not fetch external metadata:",
            externalError.message
          );
        }
        const randomId = Math.floor(Math.random() * 5000) + 1;
        image = `https://metadata.noottools.io/metadata/${randomId}.png`;
      }
    }

    return {
      name: metadata.name || `Noottools NFT #${mintAddress.slice(-4)}`,
      symbol: metadata.symbol || constants.nft.collectionSymbol,
      image,
      description,
      uri: metadata.uri,
    };
  } catch (error) {
    console.error("Error fetching NFT metadata:", error);
    return createFallbackMetadata(mintAddress);
  }
};

/**
 * Parse metadata account
 */
const parseMetadataAccount = (data, mintAddress) => {
  try {
    console.log("🔍 Parsing metadata account directly...");

    if (data.length < 101) {
      console.warn("Buffer too small for metadata account");
      return null;
    }

    let offset = 1;
    offset += 32;
    offset += 32;

    if (offset + 4 > data.length) return null;
    const nameLength = data.readUInt32LE(offset);
    offset += 4;

    if (
      nameLength > 200 ||
      nameLength < 0 ||
      offset + nameLength > data.length
    ) {
      console.warn("Invalid name length:", nameLength);
      return null;
    }

    const name = data
      .slice(offset, offset + nameLength)
      .toString("utf8")
      .replace(/\0/g, "")
      .trim();
    offset += nameLength;

    if (offset + 4 > data.length) return null;
    const symbolLength = data.readUInt32LE(offset);
    offset += 4;

    if (
      symbolLength > 50 ||
      symbolLength < 0 ||
      offset + symbolLength > data.length
    ) {
      console.warn("Invalid symbol length:", symbolLength);
      return null;
    }

    const symbol = data
      .slice(offset, offset + symbolLength)
      .toString("utf8")
      .replace(/\0/g, "")
      .trim();
    offset += symbolLength;

    if (offset + 4 > data.length) return null;
    const uriLength = data.readUInt32LE(offset);
    offset += 4;

    if (uriLength > 2000 || uriLength < 0 || offset + uriLength > data.length) {
      console.warn("Invalid URI length:", uriLength);
      return null;
    }

    const uri = data
      .slice(offset, offset + uriLength)
      .toString("utf8")
      .replace(/\0/g, "")
      .trim();

    console.log("✅ Parsed metadata:", { name, symbol, uri });

    return { name, symbol, uri };
  } catch (error) {
    console.error("Error parsing metadata account:", error);
    return null;
  }
};

/**
 * Create fallback metadata
 */
const createFallbackMetadata = (mintAddress) => {
  const randomId = Math.floor(Math.random() * 5000) + 1;
  return {
    name: `NOOT Genesis #${randomId}`,
    symbol: constants.nft.collectionSymbol,
    image: `https://metadata.noottools.io/metadata/${randomId}.png`,
    description: constants.metadata.defaultDescription,
    uri: `https://metadata.noottools.io/metadata/${randomId}.json`,
  };
};

/**
 * 4. User'ın Tüm NFT'lerini Getir
 */
const processBatch = async (items, batchSize, processor) => {
  const results = [];
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await Promise.allSettled(
      batch.map(processor)
    );
    results.push(...batchResults.map(r => r.status === 'fulfilled' ? r.value : null).filter(Boolean));
  }
  return results;
};

export const getUserNFTs = async (wallet, onProgress) => {
  try {
    console.log("🎨 Fetching user NFTs...");

    if (!wallet.publicKey) {
      throw new Error("Wallet not connected");
    }

    const connection = getConnection();
    const userPubkey = wallet.publicKey;

    console.log("📡 Getting token accounts...");
    const tokenAccounts = await connection.getTokenAccountsByOwner(userPubkey, {
      programId: TOKEN_PROGRAM_ID,
    });

    console.log(`✅ Found ${tokenAccounts.value.length} token accounts`);

    // Update progress
    if (onProgress) {
      onProgress({ current: 0, total: tokenAccounts.value.length });
    }

    const allNFTs = [];
    let processedCount = 0;

    // Process token accounts in batches
    const processTokenAccount = async (tokenAccountInfo, index) => {
      try {
        const tokenAccountData = await connection.getParsedAccountInfo(
          tokenAccountInfo.pubkey
        );
        const parsedInfo = tokenAccountData.value?.data?.parsed?.info;

        if (
          parsedInfo &&
          parsedInfo.tokenAmount?.decimals === 0 &&
          parsedInfo.tokenAmount?.uiAmount === 1
        ) {
          const mintAddress = parsedInfo.mint;
          const mintPubkey = new PublicKey(mintAddress);

          const [stakeInfoPda] = PublicKey.findProgramAddressSync(
            [Buffer.from("stake_info"), mintPubkey.toBuffer()],
            PROGRAM_ID
          );

          console.log(`🎨 Processing NFT ${index + 1}/${tokenAccounts.value.length}: ${mintAddress.slice(0, 8)}...`);
          
          // Fetch metadata with timeout
          const metadata = await Promise.race([
            getNFTMetadata(mintAddress),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error("Metadata timeout")), 3000)
            )
          ]).catch(error => {
            console.warn(`⚠️ Metadata fetch failed for ${mintAddress.slice(0, 8)}:`, error.message);
            return createFallbackMetadata(mintAddress);
          });

          // ✅ FILTER: Only include NFTs with "noot" in the name (case-insensitive)
          if (!metadata.name || !metadata.name.toLowerCase().includes("noot")) {
            console.log(`⏭️ Skipping ${metadata.name || 'Unknown'} - doesn't contain "noot"`);
            return null;
          }

          let nftInfo = {
            mintAddress,
            tokenAccount: tokenAccountInfo.pubkey.toString(),
            name: metadata.name,
            symbol: metadata.symbol,
            image: metadata.image,
            description: metadata.description,
            staked: false,
            stakeDate: null,
            unlockDate: null,
            isLocked: false,
            daysRemaining: 0,
            explorerUrl: constants.getExplorerUrl(mintAddress, "address"),
            stakeInfoPda: stakeInfoPda.toString(),
          };

          // Check stake status
          try {
            const stakeInfoAccount = await connection.getAccountInfo(
              stakeInfoPda,
              "confirmed"
            );

            if (stakeInfoAccount) {
              const stakeInfoData = stakeInfoAccount.data;
              let offset = 8;

              const mint = new PublicKey(
                stakeInfoData.slice(offset, offset + 32)
              ).toString();
              offset += 32;

              const owner = new PublicKey(
                stakeInfoData.slice(offset, offset + 32)
              ).toString();
              offset += 32;

              const stakeTimestamp = stakeInfoData.readBigInt64LE(offset);
              offset += 8;

              const unlockTimestamp = stakeInfoData.readBigInt64LE(offset);
              offset += 8;

              const originalStakeTimestamp = stakeInfoData.readBigInt64LE(offset);
              offset += 8;

              const isStaked = stakeInfoData.readUInt8(offset) === 1;

              if (isStaked && owner === userPubkey.toString()) {
                const stakeDate = new Date(Number(stakeTimestamp) * 1000);
                const unlockDate = new Date(Number(unlockTimestamp) * 1000);
                const now = new Date();

                nftInfo = {
                  ...nftInfo,
                  staked: true,
                  stakeDate: stakeDate.toISOString(),
                  unlockDate: unlockDate.toISOString(),
                  isLocked: now < unlockDate,
                  daysRemaining: Math.max(
                    0,
                    Math.ceil((unlockDate - now) / (1000 * 60 * 60 * 24))
                  ),
                };
              }
            }
          } catch (error) {
            console.warn(`⚠️ Stake check failed for ${mintAddress.slice(0, 8)}:`, error.message);
          }

          return nftInfo;
        }
        return null;
      } catch (error) {
        console.error("Error processing token account:", error);
        return null;
      } finally {
        processedCount++;
        if (onProgress) {
          onProgress({ current: processedCount, total: tokenAccounts.value.length });
        }
      }
    };

    // Process in batches of 10 concurrent requests
    const BATCH_SIZE = 10;
    for (let i = 0; i < tokenAccounts.value.length; i += BATCH_SIZE) {
      const batch = tokenAccounts.value.slice(i, i + BATCH_SIZE);
      const batchResults = await Promise.allSettled(
        batch.map((account, idx) => processTokenAccount(account, i + idx))
      );
      
      const validNFTs = batchResults
        .map(r => r.status === 'fulfilled' ? r.value : null)
        .filter(Boolean);
      
      allNFTs.push(...validNFTs);
    }

    console.log(`✅ Processed ${allNFTs.length} "noot" NFTs from wallet (filtered from ${tokenAccounts.value.length} tokens)`);

    // Check for staked NFTs in vault
    try {
      console.log("📡 Checking for staked NFTs in vault...");
      
      const programAccounts = await Promise.race([
        connection.getProgramAccounts(PROGRAM_ID, {
          filters: [
            {
              memcmp: {
                offset: 8 + 32,
                bytes: userPubkey.toBase58(),
              },
            },
          ],
        }),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Program accounts timeout")), 10000)
        )
      ]);

      for (const accountInfo of programAccounts) {
        try {
          const data = accountInfo.account.data;

          const discriminator = data.slice(0, 8);
          const expectedDiscriminator = [66, 62, 68, 70, 108, 179, 183, 235];

          if (!discriminator.equals(Buffer.from(expectedDiscriminator))) {
            continue;
          }

          let offset = 8;

          const mint = new PublicKey(
            data.slice(offset, offset + 32)
          ).toString();
          offset += 32;

          const owner = new PublicKey(
            data.slice(offset, offset + 32)
          ).toString();
          offset += 32;

          if (owner !== userPubkey.toString()) {
            continue;
          }

          const stakeTimestamp = data.readBigInt64LE(offset);
          offset += 8;

          const unlockTimestamp = data.readBigInt64LE(offset);
          offset += 8;

          const originalStakeTimestamp = data.readBigInt64LE(offset);
          offset += 8;

          const isStaked = data.readUInt8(offset) === 1;

          if (isStaked) {
            const existingNFTIndex = allNFTs.findIndex(
              (nft) => nft.mintAddress === mint
            );

            if (existingNFTIndex === -1) {
              console.log(`🎨 Found staked NFT in vault: ${mint.slice(0, 8)}...`);
              
              const metadata = await Promise.race([
                getNFTMetadata(mint),
                new Promise((_, reject) =>
                  setTimeout(() => reject(new Error("Metadata timeout")), 3000)
                )
              ]).catch(error => {
                console.warn(`⚠️ Metadata fetch failed for ${mint.slice(0, 8)}:`, error.message);
                return createFallbackMetadata(mint);
              });

              // ✅ FILTER: Only include NFTs with "noot" in the name
              if (!metadata.name || !metadata.name.toLowerCase().includes("noot")) {
                console.log(`⏭️ Skipping staked ${metadata.name || 'Unknown'} - doesn't contain "noot"`);
                continue;
              }

              const stakeDate = new Date(Number(stakeTimestamp) * 1000);
              const unlockDate = new Date(Number(unlockTimestamp) * 1000);
              const now = new Date();

              allNFTs.push({
                mintAddress: mint,
                tokenAccount: null,
                name: metadata.name,
                symbol: metadata.symbol,
                image: metadata.image,
                description: metadata.description,
                staked: true,
                stakeDate: stakeDate.toISOString(),
                unlockDate: unlockDate.toISOString(),
                isLocked: now < unlockDate,
                daysRemaining: Math.max(
                  0,
                  Math.ceil((unlockDate - now) / (1000 * 60 * 60 * 24))
                ),
                explorerUrl: constants.getExplorerUrl(mint, "address"),
                stakeInfoPda: accountInfo.pubkey.toString(),
              });
            }
          }
        } catch (error) {
          console.warn("Error parsing stake info account:", error.message);
          continue;
        }
      }
    } catch (error) {
      console.warn("⚠️ Error fetching program accounts (staked NFTs):", error.message);
    }

    console.log(`✅ Found ${allNFTs.length} "noot" NFTs total (${allNFTs.filter(n => n.staked).length} staked)`);

    return allNFTs.sort((a, b) => {
      if (a.staked && !b.staked) return -1;
      if (!a.staked && b.staked) return 1;
      if (a.staked && b.staked) {
        return new Date(b.stakeDate) - new Date(a.stakeDate);
      }
      return 0;
    });
  } catch (error) {
    console.error("❌ Error fetching user NFTs:", error);
    throw error;
  }
};

/**
 * 5. User'ın Stake'lerini Getir
 */
export const getUserStakes = async (wallet) => {
  try {
    console.log("📊 Fetching user stakes...");

    if (!wallet.publicKey) {
      throw new Error("Wallet not connected");
    }

    const connection = getConnection();
    const userPubkey = wallet.publicKey;

    const [userStatsPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("user_stats"), userPubkey.toBuffer()],
      PROGRAM_ID
    );

    let userStatsAccount;
    try {
      userStatsAccount = await connection.getAccountInfo(userStatsPda);
    } catch (error) {
      console.log("User stats account not found, user hasn't minted yet");
      return {
        nftsMinted: 0,
        nftsStaked: 0,
        userNFTs: [],
        stakes: [],
      };
    }

    if (!userStatsAccount) {
      return {
        nftsMinted: 0,
        nftsStaked: 0,
        userNFTs: [],
        stakes: [],
      };
    }

    const userNFTs = await getUserNFTs(wallet);

    const stakes = userNFTs
      .filter((nft) => nft.staked)
      .map((nft) => ({
        mintAddress: nft.mintAddress,
        stakeInfoPda: nft.stakeInfoPda,
        stakeDate: nft.stakeDate,
        unlockDate: nft.unlockDate,
        isLocked: nft.isLocked,
        daysRemaining: nft.daysRemaining,
        explorerUrl: nft.explorerUrl,
      }));

    const userStatsData = userStatsAccount.data;
    let offset = 8;

    offset += 32;
    const nftsMinted = userStatsData.readUInt8(offset);
    offset += 1;
    const nftsStaked = userStatsData.readUInt8(offset);

    console.log("✅ User stakes fetched successfully!");

    return {
      nftsMinted,
      nftsStaked,
      userNFTs,
      stakes: stakes.sort(
        (a, b) => new Date(b.stakeDate) - new Date(a.stakeDate)
      ),
    };
  } catch (error) {
    console.error("❌ Error fetching user stakes:", error);
    throw error;
  }
};

let cachedNetworkConfig = null;

/**
 * Resolve program ID from database (preferred) and RPC from VITE_RPC_URL.
 * Program ID in DB fixes local/prod drift; RPC always comes from env (Helius).
 */
export const resolveNetworkConfig = async (dbConfigResult = null) => {
  if (cachedNetworkConfig && !dbConfigResult) {
    return cachedNetworkConfig;
  }

  const dbConfig = dbConfigResult ?? (await getConfigFromDatabase());

  let programId = PROGRAM_ID;
  let source = "constants";

  if (dbConfig.source === "database" && dbConfig.programId) {
    if (dbConfig.programId !== constants.network.programId) {
      console.warn(
        `⚠️ Program mismatch: build uses ${constants.network.programId}, database uses ${dbConfig.programId}. Using database program ID.`,
      );
    }
    programId = new PublicKey(dbConfig.programId);
    source = "database";
  }

  const resolved = {
    programId,
    rpcEndpoint: NETWORK,
    source,
  };

  if (!dbConfigResult) {
    cachedNetworkConfig = resolved;
  }

  return resolved;
};

export const getResolvedConnection = async () => {
  const { rpcEndpoint } = await resolveNetworkConfig();
  return new Connection(rpcEndpoint, COMMITMENT);
};

/**
 * Fetch config from database API (NEW)
 */
export const getConfigFromDatabase = async () => {
  try {
    console.log("🔧 Fetching config from database API...");
    
    const response = await fetch('/api/get-nft-config', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error || 'Failed to fetch config from database');
    }

    console.log("✅ Config fetched from database:", data.config);

    return {
      admin: data.config.admin_wallet || null,
      mintingFee: data.config.minting_fee_sol,
      mintingFeeLamports: data.config.minting_fee_lamports,
      maxNftsPerWallet: data.config.max_nfts_per_wallet,
      stakingDurationMonths: data.config.staking_duration_months,
      collectionMint: data.config.collection_mint,
      programId: data.config.program_id,
      rpcEndpoint: data.config.rpc_endpoint,
      isActive: data.config.is_active,
      updatedAt: data.config.updated_at,
      source: 'database', // Indicate this came from database
    };
  } catch (error) {
    console.error("❌ Error fetching config from database:", error);
    
    // Return error object
    return {
      source: 'error',
      error: error.message,
    };
  }
};

/**
 * 6. Get config info - HYBRID: Database + Blockchain fallback
 */
export const getConfigInfo = async () => {
  try {
    console.log("🔧 Fetching config info (hybrid mode)...");

    const dbConfigResult = await getConfigFromDatabase();
    const { programId, rpcEndpoint } =
      await resolveNetworkConfig(dbConfigResult);

    const connection = new Connection(rpcEndpoint, COMMITMENT);
    const [configPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("config")],
      programId,
    );

    const [dbConfig, blockchainConfig] = await Promise.allSettled([
      Promise.resolve(dbConfigResult),
      connection.getAccountInfo(configPda),
    ]);

    // Parse blockchain config if available
    let blockchainData = null;
    if (blockchainConfig.status === 'fulfilled' && blockchainConfig.value) {
      const configData = blockchainConfig.value.data;
      let offset = 8;

      const admin = new PublicKey(configData.slice(offset, offset + 32)).toString();
      offset += 32;

      const mintingFeeLamports = configData.readBigUInt64LE(offset);
      offset += 8;

      const maxNftsPerWallet = configData.readUInt8(offset);
      offset += 1;

      const stakingDurationMonths = configData.readUInt8(offset);
      offset += 1;

      const totalMinted = configData.readBigUInt64LE(offset);
      offset += 8;

      const totalStaked = configData.readBigUInt64LE(offset);

      blockchainData = {
        admin,
        mintingFee: Number(mintingFeeLamports) / LAMPORTS_PER_SOL,
        mintingFeeLamports: Number(mintingFeeLamports),
        maxNftsPerWallet,
        stakingDurationMonths,
        totalMinted: Number(totalMinted),
        totalStaked: Number(totalStaked),
        configPda: configPda.toString(),
      };

      console.log("✅ Blockchain config fetched:", blockchainData);
    } else {
      console.warn("⚠️ Blockchain config not available");
    }

    // Build final config with fallback logic
    let finalConfig = {
      configPda: configPda.toString(),
      source: 'hybrid',
    };

    // Priority: Database -> Blockchain -> Constants
    if (dbConfig.status === 'fulfilled' && dbConfig.value.source === 'database') {
      console.log("✅ Database config available");
      const db = dbConfig.value;
      
      finalConfig = {
        ...finalConfig,
        admin: db.admin || blockchainData?.admin || "Unknown",
        mintingFee: db.mintingFee ?? blockchainData?.mintingFee ?? constants.nft.defaultMintPrice,
        mintingFeeLamports: db.mintingFeeLamports ?? blockchainData?.mintingFeeLamports ?? (constants.nft.defaultMintPrice * LAMPORTS_PER_SOL),
        maxNftsPerWallet: db.maxNftsPerWallet ?? blockchainData?.maxNftsPerWallet ?? constants.nft.maxNftsPerWallet,
        stakingDurationMonths: db.stakingDurationMonths ?? blockchainData?.stakingDurationMonths ?? constants.nft.stakingDurationMonths,
        collectionMint: db.collectionMint,
        programId: db.programId,
        rpcEndpoint: db.rpcEndpoint,
        isActive: db.isActive,
        updatedAt: db.updatedAt,
        // Always use blockchain for real-time stats
        totalMinted: blockchainData?.totalMinted ?? 0,
        totalStaked: blockchainData?.totalStaked ?? 0,
      };
    } else if (blockchainData) {
      console.log("⚠️ Database unavailable, using blockchain config");
      finalConfig = {
        ...finalConfig,
        ...blockchainData,
        source: 'blockchain',
      };
    } else {
      console.warn("⚠️ Both sources unavailable, using constants");
      finalConfig = {
        ...finalConfig,
        admin: "Unknown",
        mintingFee: constants.nft.defaultMintPrice,
        mintingFeeLamports: constants.nft.defaultMintPrice * LAMPORTS_PER_SOL,
        maxNftsPerWallet: constants.nft.maxNftsPerWallet,
        stakingDurationMonths: constants.nft.stakingDurationMonths,
        totalMinted: 0,
        totalStaked: 0,
        source: 'constants',
      };
    }

    console.log("✅ Final hybrid config:", finalConfig);
    return finalConfig;

  } catch (error) {
    console.error("❌ Error fetching config:", error);

    return {
      admin: "Unknown",
      mintingFee: constants.nft.defaultMintPrice,
      mintingFeeLamports: constants.nft.defaultMintPrice * LAMPORTS_PER_SOL,
      maxNftsPerWallet: constants.nft.maxNftsPerWallet,
      stakingDurationMonths: constants.nft.stakingDurationMonths,
      totalMinted: 0,
      totalStaked: 0,
      configPda: "Unknown",
      source: 'error',
      error: error.message,
    };
  }
};

/**
 * 7. Utility fonksiyonları
 */
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

/**
 * 8. Admin Withdraw Fees Fonksiyonu - UPDATED FOR V2
 */
export const withdrawFees = async (wallet) => {
  try {
    console.log("💰 Starting fee withdrawal...");

    if (!wallet.publicKey) {
      throw new Error("Wallet not connected");
    }

    const connection = getConnection();
    const adminPubkey = wallet.publicKey;

    // PDAs
    const [configPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("config")],
      PROGRAM_ID
    );

    const [feeVaultPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("fee_vault")],
      PROGRAM_ID
    );

    console.log("💰 Fee Vault PDA:", feeVaultPda.toString());

    const feeVaultBalance = await connection.getBalance(feeVaultPda);
    console.log(
      "💰 Fee Vault Balance:",
      feeVaultBalance / LAMPORTS_PER_SOL,
      "SOL"
    );

    if (feeVaultBalance === 0) {
      throw new Error("No funds available in fee vault to withdraw");
    }

    const adminBalanceBefore = await connection.getBalance(adminPubkey);
    console.log(
      "👤 Admin Balance Before:",
      adminBalanceBefore / LAMPORTS_PER_SOL,
      "SOL"
    );

    // Instruction data (withdraw_fees discriminator)
    const instructionData = Buffer.alloc(8);
    const discriminator = [106, 158, 232, 248, 164, 251, 230, 188];
    discriminator.forEach((byte, index) => {
      instructionData.writeUInt8(byte, index);
    });

    // Transaction instruction - matches WithdrawFees struct in v2
    const instruction = new anchor.web3.TransactionInstruction({
      keys: [
        { pubkey: adminPubkey, isSigner: true, isWritable: true },
        { pubkey: configPda, isSigner: false, isWritable: false }, // Added config account
        { pubkey: feeVaultPda, isSigner: false, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      programId: PROGRAM_ID,
      data: instructionData,
    });

    // Compute budget instruction
    const computeBudgetIx = ComputeBudgetProgram.setComputeUnitLimit({
      units: 200000,
    });

    const transaction = new anchor.web3.Transaction()
      .add(computeBudgetIx)
      .add(instruction);

    console.log("🚀 Sending withdrawal transaction...");

    const signature = await wallet.sendTransaction(transaction, connection);
    await connection.confirmTransaction(signature, COMMITMENT);

    const feeVaultBalanceAfter = await connection.getBalance(feeVaultPda);
    const adminBalanceAfter = await connection.getBalance(adminPubkey);

    const amountWithdrawn =
      (feeVaultBalance - feeVaultBalanceAfter) / LAMPORTS_PER_SOL;

    console.log("✅ Withdrawal successful!");
    console.log("💸 Amount Withdrawn:", amountWithdrawn, "SOL");

    return {
      signature,
      feeVaultBalance: feeVaultBalance / LAMPORTS_PER_SOL,
      adminBalanceBefore: adminBalanceBefore / LAMPORTS_PER_SOL,
      adminBalanceAfter: adminBalanceAfter / LAMPORTS_PER_SOL,
      amountWithdrawn,
      explorerUrl: constants.getExplorerUrl(signature),
      message: "Withdrawal completed successfully",
    };
  } catch (error) {
    console.error("❌ Withdraw error:", error);
    throw error;
  }
};

/**
 * 9. Get Fee Vault Info
 */
export const getFeeVaultInfo = async () => {
  try {
    console.log("🔍 Fetching fee vault info...");
    const connection = getConnection();

    const [feeVaultPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("fee_vault")],
      PROGRAM_ID
    );

    console.log("💰 Fee Vault PDA:", feeVaultPda.toString());

    const feeVaultBalance = await connection.getBalance(feeVaultPda);

    console.log("✅ Fee vault info fetched successfully");

    return {
      feeVaultPda: feeVaultPda.toString(),
      balance: feeVaultBalance / LAMPORTS_PER_SOL,
      balanceLamports: feeVaultBalance,
      explorerUrl: constants.getExplorerUrl(feeVaultPda.toString(), "address"),
    };
  } catch (error) {
    console.error("❌ Error fetching fee vault info:", error);
    throw error;
  }
};

// Export all functions
export default {
  initializeConfig,
  mintRandomNFT,
  stakeNFT,
  unstakeNFT,
  getUserNFTs,
  getUserStakes,
  getNFTMetadata,
  getConfigInfo,
  withdrawFees,
  getFeeVaultInfo,
  formatAddress,
  formatDate,
  formatDaysRemaining,
  getPDAs,
  getConnection,
  getProvider,
  getConfigFromDatabase
};