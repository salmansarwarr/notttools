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

export const getUserNFTs = async (wallet, options = {}) => {
  try {
    const {
      limit = 20,
      offset = 0,
      onProgress = null,
      filterName = "NOOT".toLowerCase(), // ✅ Filter parameter
    } = options;

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

    // ✅ We need to process ALL to filter by name (since name is in metadata)
    // But we'll do it in batches
    const batchSize = 10;
    const startIdx = offset;
    const endIdx = Math.min(startIdx + batchSize, tokenAccounts.value.length);
    const batch = tokenAccounts.value.slice(startIdx, endIdx);

    console.log(`📦 Processing batch: ${startIdx}-${endIdx} of ${tokenAccounts.value.length}`);

    const nftPromises = batch.map(async (tokenAccountInfo, index) => {
      try {
        if (onProgress) {
          onProgress({
            current: startIdx + index + 1,
            total: tokenAccounts.value.length,
            status: 'processing'
          });
        }

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

          console.log(`🎨 Processing NFT: ${mintAddress.slice(0, 8)}...`);
          
          // Get metadata
          const metadata = await Promise.race([
            getNFTMetadata(mintAddress),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error("Metadata timeout")), 2000)
            )
          ]).catch(error => {
            console.warn(`⚠️ Metadata fetch failed for ${mintAddress.slice(0, 8)}`);
            return createFallbackMetadata(mintAddress);
          });

          // ✅ FILTER BY NAME - Skip if doesn't contain "NOOT"
          if (!metadata.name || !metadata.name.toUpperCase().includes(filterName.toUpperCase())) {
            console.log(`⏭️ Skipping ${metadata.name} (not a NOOT NFT)`);
            return null;
          }

          console.log(`✅ Found NOOT NFT: ${metadata.name}`);

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
            console.warn(`⚠️ Stake check failed for ${mintAddress.slice(0, 8)}`);
          }

          return nftInfo;
        }
        return null;
      } catch (error) {
        console.error("Error processing token account:", error);
        return null;
      }
    });

    const batchResults = await Promise.all(nftPromises);
    const validNFTs = batchResults.filter(nft => nft !== null);

    console.log(`✅ Found ${validNFTs.length} NOOT NFTs in this batch`);

    // Check for staked NOOT NFTs in vault (only on first load)
    let stakedInVault = [];
    if (offset === 0) {
      try {
        console.log("📡 Checking for staked NOOT NFTs in vault...");
        
        const programAccountsPromise = connection.getProgramAccounts(PROGRAM_ID, {
          filters: [
            {
              memcmp: {
                offset: 8 + 32,
                bytes: userPubkey.toBase58(),
              },
            },
          ],
        });

        const programAccounts = await Promise.race([
          programAccountsPromise,
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Program accounts timeout")), 8000)
          )
        ]);

        const stakedPromises = programAccounts.map(async (accountInfo) => {
          try {
            const data = accountInfo.account.data;
            const discriminator = data.slice(0, 8);
            const expectedDiscriminator = [66, 62, 68, 70, 108, 179, 183, 235];

            if (!discriminator.equals(Buffer.from(expectedDiscriminator))) {
              return null;
            }

            let offset = 8;
            const mint = new PublicKey(data.slice(offset, offset + 32)).toString();
            offset += 32;
            const owner = new PublicKey(data.slice(offset, offset + 32)).toString();
            offset += 32;

            if (owner !== userPubkey.toString()) {
              return null;
            }

            const stakeTimestamp = data.readBigInt64LE(offset);
            offset += 8;
            const unlockTimestamp = data.readBigInt64LE(offset);
            offset += 8;
            const originalStakeTimestamp = data.readBigInt64LE(offset);
            offset += 8;
            const isStaked = data.readUInt8(offset) === 1;

            if (!isStaked) return null;

            // Check if already in validNFTs
            if (validNFTs.some(nft => nft.mintAddress === mint)) {
              return null;
            }

            console.log(`🎨 Found staked NFT in vault: ${mint.slice(0, 8)}...`);
            
            const metadata = await Promise.race([
              getNFTMetadata(mint),
              new Promise((_, reject) =>
                setTimeout(() => reject(new Error("Metadata timeout")), 2000)
              )
            ]).catch(() => createFallbackMetadata(mint));

            // ✅ FILTER BY NAME - Skip if doesn't contain "NOOT"
            if (!metadata.name || !metadata.name.toUpperCase().includes(filterName.toUpperCase())) {
              console.log(`⏭️ Skipping staked ${metadata.name} (not a NOOT NFT)`);
              return null;
            }

            console.log(`✅ Found staked NOOT NFT: ${metadata.name}`);

            const stakeDate = new Date(Number(stakeTimestamp) * 1000);
            const unlockDate = new Date(Number(unlockTimestamp) * 1000);
            const now = new Date();

            return {
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
            };
          } catch (error) {
            return null;
          }
        });

        const stakedResults = await Promise.all(stakedPromises);
        stakedInVault = stakedResults.filter(nft => nft !== null);
        
        console.log(`✅ Found ${stakedInVault.length} staked NOOT NFTs in vault`);
      } catch (error) {
        console.warn("⚠️ Error fetching staked NFTs:", error.message);
      }
    }

    const allNFTs = [...validNFTs, ...stakedInVault];

    return {
      nfts: allNFTs.sort((a, b) => {
        if (a.staked && !b.staked) return -1;
        if (!a.staked && b.staked) return 1;
        if (a.staked && b.staked) {
          return new Date(b.stakeDate) - new Date(a.stakeDate);
        }
        return 0;
      }),
      hasMore: endIdx < tokenAccounts.value.length,
      totalAccounts: tokenAccounts.value.length,
      processedAccounts: endIdx,
      nootNFTsFound: allNFTs.length,
      nextOffset: endIdx,
    };
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

/**
 * 6. Config bilgilerini getir
 */
export const getConfigInfo = async () => {
  try {
    console.log("🔧 Fetching config info...");
    const connection = getConnection();

    const [configPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("config")],
      PROGRAM_ID
    );

    console.log("Config PDA:", configPda.toString());

    const configAccount = await connection.getAccountInfo(configPda);

    if (!configAccount) {
      console.warn("⚠️ Config account not found - program not initialized yet");
      return {
        admin: "Unknown",
        mintingFee: constants.nft.defaultMintPrice,
        maxNftsPerWallet: constants.nft.maxNftsPerWallet,
        stakingDurationMonths: constants.nft.stakingDurationMonths,
        totalMinted: 0,
        totalStaked: 0,
        configPda: configPda.toString(),
      };
    }

    console.log("✅ Config account found, parsing data...");

    const configData = configAccount.data;
    let offset = 8;

    const admin = new PublicKey(
      configData.slice(offset, offset + 32)
    ).toString();
    offset += 32;

    const mintingFee = configData.readBigUInt64LE(offset);
    offset += 8;

    const maxNftsPerWallet = configData.readUInt8(offset);
    offset += 1;

    const stakingDurationMonths = configData.readUInt8(offset);
    offset += 1;

    const totalMinted = configData.readBigUInt64LE(offset);
    offset += 8;

    const totalStaked = configData.readBigUInt64LE(offset);

    const result = {
      admin,
      mintingFee: Number(mintingFee) / LAMPORTS_PER_SOL,
      maxNftsPerWallet,
      stakingDurationMonths,
      totalMinted: Number(totalMinted),
      totalStaked: Number(totalStaked),
      configPda: configPda.toString(),
    };

    console.log("✅ Config parsed successfully:", result);
    return result;
  } catch (error) {
    console.error("❌ Error fetching config:", error);

    return {
      admin: "Unknown",
      mintingFee: constants.nft.defaultMintPrice,
      maxNftsPerWallet: constants.nft.maxNftsPerWallet,
      stakingDurationMonths: constants.nft.stakingDurationMonths,
      totalMinted: 0,
      totalStaked: 0,
      configPda: "Unknown",
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
};