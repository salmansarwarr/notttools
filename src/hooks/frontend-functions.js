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
    const instructionData = Buffer.alloc(8 + 8 + 1 + 1); // discriminator + fee + max_nfts + duration
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
        { pubkey: adminPubkey, isSigner: true, isWritable: true }, // admin
        { pubkey: configPda, isSigner: false, isWritable: true }, // config
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }, // system_program
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
    console.log("� Program ID:", PROGRAM_ID.toString());

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

    // Instruction data (mint_nft discriminator - parametresiz)
    const instructionData = Buffer.alloc(8);
    const discriminator = [211, 57, 6, 167, 15, 219, 35, 251]; // mint_nft discriminator
    discriminator.forEach((byte, index) => {
      instructionData.writeUInt8(byte, index);
    });

    // Transaction instruction (Parametresiz basit mint)
    const instruction = new anchor.web3.TransactionInstruction({
      keys: [
        { pubkey: userPubkey, isSigner: true, isWritable: true }, // payer
        { pubkey: pdas.configPda, isSigner: false, isWritable: true }, // config
        { pubkey: pdas.userStatsPda, isSigner: false, isWritable: true }, // user_stats
        { pubkey: pdas.globalStatsPda, isSigner: false, isWritable: true }, // global_stats
        { pubkey: mintPubkey, isSigner: true, isWritable: true }, // mint
        { pubkey: associatedTokenAccount, isSigner: false, isWritable: true }, // associated_token_account
        { pubkey: metadataAccount, isSigner: false, isWritable: true }, // metadata_account
        { pubkey: masterEditionAccount, isSigner: false, isWritable: true }, // master_edition_account
        { pubkey: pdas.feeVaultPda, isSigner: false, isWritable: true }, // fee_vault
        { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false }, // token_program
        {
          pubkey: ASSOCIATED_TOKEN_PROGRAM_ID,
          isSigner: false,
          isWritable: false,
        }, // associated_token_program
        {
          pubkey: new PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s"),
          isSigner: false,
          isWritable: false,
        }, // token_metadata_program
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }, // system_program
        {
          pubkey: anchor.web3.SYSVAR_RENT_PUBKEY,
          isSigner: false,
          isWritable: false,
        }, // rent
      ],
      programId: PROGRAM_ID,
      data: instructionData,
    });

    // Compute budget instruction'ı ekle
    const computeBudgetIx = ComputeBudgetProgram.setComputeUnitLimit({
      units: 400000,
    });

    // Transaction oluştur ve gönder
    const transaction = new anchor.web3.Transaction()
      .add(computeBudgetIx)
      .add(instruction);

    console.log("⚡ NFT mint ediliyor...");

    const signature = await wallet.sendTransaction(transaction, connection, {
      signers: [mintKeypair],
    });

    await connection.confirmTransaction(signature, COMMITMENT);

    console.log("✅ BASİT NFT BAŞARIYLA MİNT EDİLDİ! 🎨");
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
      true // allowOwnerOffCurve for PDA
    );

    // Instruction data (stake_nft discriminator)
    const instructionData = Buffer.alloc(8);
    const discriminator = [38, 27, 66, 46, 69, 65, 151, 219];
    discriminator.forEach((byte, index) => {
      instructionData.writeUInt8(byte, index);
    });

    // Transaction instruction
    const instruction = new anchor.web3.TransactionInstruction({
      keys: [
        { pubkey: userPubkey, isSigner: true, isWritable: true }, // owner
        { pubkey: pdas.configPda, isSigner: false, isWritable: true }, // config - WRITABLE yapıldı
        { pubkey: pdas.stakeInfoPda, isSigner: false, isWritable: true }, // stake_info
        { pubkey: pdas.userStatsPda, isSigner: false, isWritable: true }, // user_stats
        { pubkey: pdas.globalStatsPda, isSigner: false, isWritable: true }, // global_stats
        { pubkey: mintPubkey, isSigner: false, isWritable: false }, // mint
        { pubkey: ownerTokenAccount, isSigner: false, isWritable: true }, // owner_token_account
        { pubkey: vaultTokenAccount, isSigner: false, isWritable: true }, // vault_token_account
        { pubkey: pdas.vaultPda, isSigner: false, isWritable: true }, // vault - WRITABLE yapıldı
        { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false }, // token_program
        {
          pubkey: ASSOCIATED_TOKEN_PROGRAM_ID,
          isSigner: false,
          isWritable: false,
        }, // associated_token_program
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }, // system_program
      ],
      programId: PROGRAM_ID,
      data: instructionData,
    });

    // Compute budget instruction'ı ekle
    const computeBudgetIx = ComputeBudgetProgram.setComputeUnitLimit({
      units: 300000,
    });

    // Transaction oluştur ve gönder
    const transaction = new anchor.web3.Transaction()
      .add(computeBudgetIx)
      .add(instruction);

    // Debug için simülasyon yap
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
 * 3. NFT Unstake Fonksiyonu
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

    // Transaction instruction
    const instruction = new anchor.web3.TransactionInstruction({
      keys: [
        { pubkey: userPubkey, isSigner: true, isWritable: true }, // owner
        { pubkey: pdas.configPda, isSigner: false, isWritable: true }, // config - EKLENDI
        { pubkey: pdas.stakeInfoPda, isSigner: false, isWritable: true }, // stake_info
        { pubkey: pdas.userStatsPda, isSigner: false, isWritable: true }, // user_stats
        { pubkey: pdas.globalStatsPda, isSigner: false, isWritable: true }, // global_stats
        { pubkey: mintPubkey, isSigner: false, isWritable: false }, // mint
        { pubkey: ownerTokenAccount, isSigner: false, isWritable: true }, // owner_token_account
        { pubkey: vaultTokenAccount, isSigner: false, isWritable: true }, // vault_token_account
        { pubkey: pdas.vaultPda, isSigner: false, isWritable: true }, // vault
        { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false }, // token_program
        {
          pubkey: ASSOCIATED_TOKEN_PROGRAM_ID,
          isSigner: false,
          isWritable: false,
        }, // associated_token_program
      ],
      programId: PROGRAM_ID,
      data: instructionData,
    });

    // Compute budget instruction'ı ekle
    const computeBudgetIx = ComputeBudgetProgram.setComputeUnitLimit({
      units: 300000,
    });

    // Transaction oluştur ve gönder
    const transaction = new anchor.web3.Transaction()
      .add(computeBudgetIx)
      .add(instruction);

    // Debug için simülasyon yap
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
 * NFT Metadata okuma fonksiyonu - Doğrudan metadata account parsing
 */
export const getNFTMetadata = async (mintAddress) => {
  try {
    console.log("🎨 Fetching metadata for:", mintAddress);
    const connection = getConnection();
    const mintPubkey = new PublicKey(mintAddress);

    // Metaplex metadata account PDA
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

    // Fetch metadata account
    const metadataAccount = await connection.getAccountInfo(metadataPDA);

    if (!metadataAccount) {
      console.log(`No metadata found for ${mintAddress}`);
      return createFallbackMetadata(mintAddress);
    }

    // Try to parse the metadata directly
    const metadata = parseMetadataAccount(metadataAccount.data, mintAddress);

    if (!metadata) {
      return createFallbackMetadata(mintAddress);
    }

    // Default values
    let image = `https://metadata.noottools.io/metadata/${
      Math.floor(Math.random() * 5000) + 1
    }.png`;
    let description = constants.metadata.defaultDescription;

    // Try to fetch external metadata if URI exists
    if (metadata.uri && metadata.uri.trim()) {
      try {
        console.log("🌐 Fetching external metadata from:", metadata.uri);

        // Add timeout to fetch request (reduced to 2 seconds for faster loading)
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000); // 2 second timeout

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
        // Use fallback random image if external fetch fails
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
 * Parse metadata account using proper Solana metadata structure
 */
const parseMetadataAccount = (data, mintAddress) => {
  try {
    console.log("🔍 Parsing metadata account directly...");

    if (data.length < 101) {
      // Basic validation
      console.warn("Buffer too small for metadata account");
      return null;
    }

    // Solana Metadata Account Structure:
    // 0: discriminator (1 byte)
    // 1-32: update authority (32 bytes)
    // 33-64: mint (32 bytes)
    // 65-68: name length (4 bytes)
    // 69+: name data

    let offset = 1; // Skip discriminator
    offset += 32; // Skip update authority
    offset += 32; // Skip mint

    // Read name
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

    // Read symbol
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

    // Read URI
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
 * Manual metadata parsing as fallback with safe buffer reading
 */
const parseMetadataManually = (data, mintAddress) => {
  try {
    console.log("🔧 Trying manual metadata parsing...");
    console.log("Buffer length:", data.length);

    if (data.length < 70) {
      // Minimum required size
      console.warn("Buffer too small for metadata parsing");
      return createFallbackMetadata(mintAddress);
    }

    // Skip discriminator (1 byte) + update authority (32 bytes) + mint (32 bytes)
    let offset = 1 + 32 + 32; // = 65 bytes

    if (offset + 4 > data.length) {
      console.warn("Buffer too small for name length");
      return createFallbackMetadata(mintAddress);
    }

    // Name length (4 bytes) + name
    const nameLength = data.readUInt32LE(offset);
    offset += 4;

    console.log(
      "Name length:",
      nameLength,
      "Offset:",
      offset,
      "Buffer length:",
      data.length
    );

    if (nameLength > 200 || offset + nameLength > data.length) {
      // Reasonable name limit
      console.warn("Invalid name length or buffer overflow");
      return createFallbackMetadata(mintAddress);
    }

    const name = data
      .slice(offset, offset + nameLength)
      .toString("utf8")
      .replace(/\0/g, "")
      .trim();
    offset += nameLength;

    if (offset + 4 > data.length) {
      console.warn("Buffer too small for symbol length");
      return {
        name: name || `Noottools NFT #${mintAddress.slice(-4)}`,
        symbol: constants.nft.collectionSymbol,
        image: constants.metadata.defaultImage,
        description: constants.metadata.defaultDescription,
        uri: "",
      };
    }

    // Symbol length (4 bytes) + symbol
    const symbolLength = data.readUInt32LE(offset);
    offset += 4;

    console.log(
      "Symbol length:",
      symbolLength,
      "Offset:",
      offset,
      "Buffer length:",
      data.length
    );

    if (symbolLength > 50 || offset + symbolLength > data.length) {
      // Reasonable symbol limit
      console.warn("Invalid symbol length or buffer overflow");
      return {
        name: name || `Noottools NFT #${mintAddress.slice(-4)}`,
        symbol: constants.nft.collectionSymbol,
        image: constants.metadata.defaultImage,
        description: constants.metadata.defaultDescription,
        uri: "",
      };
    }

    const symbol = data
      .slice(offset, offset + symbolLength)
      .toString("utf8")
      .replace(/\0/g, "")
      .trim();
    offset += symbolLength;

    if (offset + 4 > data.length) {
      console.warn("Buffer too small for URI length");
      return {
        name: name || `Noottools NFT #${mintAddress.slice(-4)}`,
        symbol: symbol || constants.nft.collectionSymbol,
        image: constants.metadata.defaultImage,
        description: constants.metadata.defaultDescription,
        uri: "",
      };
    }

    // URI length (4 bytes) + URI
    const uriLength = data.readUInt32LE(offset);
    offset += 4;

    console.log(
      "URI length:",
      uriLength,
      "Offset:",
      offset,
      "Buffer length:",
      data.length
    );

    if (uriLength > 2000 || offset + uriLength > data.length) {
      // Reasonable URI limit
      console.warn("Invalid URI length or buffer overflow");
      return {
        name: name || `Noottools NFT #${mintAddress.slice(-4)}`,
        symbol: symbol || constants.nft.collectionSymbol,
        image: constants.metadata.defaultImage,
        description: constants.metadata.defaultDescription,
        uri: "",
      };
    }

    const uri = data
      .slice(offset, offset + uriLength)
      .toString("utf8")
      .replace(/\0/g, "")
      .trim();

    console.log("📝 Manual parsed metadata:", { name, symbol, uri });

    return {
      name: name || `Noottools NFT #${mintAddress.slice(-4)}`,
      symbol: symbol || constants.nft.collectionSymbol,
      image: constants.metadata.defaultImage,
      description: constants.metadata.defaultDescription,
      uri,
    };
  } catch (error) {
    console.error("Manual parsing failed:", error);
    return createFallbackMetadata(mintAddress);
  }
};

/**
 * Create fallback metadata when all parsing fails
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
 * 4. User'ın Tüm NFT'lerini Getir (Stake edilmiş + edilmemiş)
 */
export const getUserNFTs = async (wallet) => {
  try {
    console.log("🎨 Fetching user NFTs...");

    if (!wallet.publicKey) {
      throw new Error("Wallet not connected");
    }

    const connection = getConnection();
    const userPubkey = wallet.publicKey;

    // User'ın token account'larını getir (NFT'leri bulmak için)
    const tokenAccounts = await connection.getTokenAccountsByOwner(userPubkey, {
      programId: TOKEN_PROGRAM_ID,
    });

    const allNFTs = [];

    // Her token account için NFT kontrolü yap
    for (const tokenAccountInfo of tokenAccounts.value) {
      const tokenAccountData = await connection.getParsedAccountInfo(
        tokenAccountInfo.pubkey
      );
      const parsedInfo = tokenAccountData.value?.data?.parsed?.info;

      if (
        parsedInfo &&
        parsedInfo.tokenAmount?.decimals === 0 &&
        parsedInfo.tokenAmount?.uiAmount === 1
      ) {
        // Bu bir NFT (decimals=0 ve amount=1)
        const mintAddress = parsedInfo.mint;
        const mintPubkey = new PublicKey(mintAddress);

        // Bu NFT için stake info PDA'sını hesapla
        const [stakeInfoPda] = PublicKey.findProgramAddressSync(
          [Buffer.from("stake_info"), mintPubkey.toBuffer()],
          PROGRAM_ID
        );

        // NFT metadata'sını getir
        console.log(`🎨 Fetching metadata for NFT: ${mintAddress}`);
        const metadata = await getNFTMetadata(mintAddress);
        console.log(`✅ Got metadata for ${mintAddress}:`, metadata);

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

        // Stake durumunu kontrol et
        try {
          const stakeInfoAccount = await connection.getAccountInfo(
            stakeInfoPda
          );

          if (stakeInfoAccount) {
            // Stake info data'sını parse et
            const stakeInfoData = stakeInfoAccount.data;
            let offset = 8; // discriminator skip

            // Mint (32 bytes)
            const mint = new PublicKey(
              stakeInfoData.slice(offset, offset + 32)
            ).toString();
            offset += 32;

            // Owner (32 bytes)
            const owner = new PublicKey(
              stakeInfoData.slice(offset, offset + 32)
            ).toString();
            offset += 32;

            // Stake timestamp (8 bytes)
            const stakeTimestamp = stakeInfoData.readBigInt64LE(offset);
            offset += 8;

            // Unlock timestamp (8 bytes)
            const unlockTimestamp = stakeInfoData.readBigInt64LE(offset);
            offset += 8;

            // Original stake timestamp (8 bytes)
            const originalStakeTimestamp = stakeInfoData.readBigInt64LE(offset);
            offset += 8;

            // Is staked (1 byte)
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
          // Bu NFT stake edilmemiş, varsayılan değerlerle devam et
        }

        allNFTs.push(nftInfo);
      }
    }

    // Şimdi program'daki tüm StakeInfo account'larını kontrol et
    // Bu, vault'taki (stake edilmiş) NFT'leri bulur
    try {
      const programAccounts = await connection.getProgramAccounts(PROGRAM_ID, {
        filters: [
          {
            memcmp: {
              offset: 8 + 32, // discriminator (8) + mint (32) = owner position
              bytes: userPubkey.toBase58(),
            },
          },
        ],
      });

      for (const accountInfo of programAccounts) {
        try {
          const data = accountInfo.account.data;

          // Discriminator kontrolü (StakeInfo için [66, 62, 68, 70, 108, 179, 183, 235])
          const discriminator = data.slice(0, 8);
          const expectedDiscriminator = [66, 62, 68, 70, 108, 179, 183, 235];

          if (!discriminator.equals(Buffer.from(expectedDiscriminator))) {
            continue; // Bu bir StakeInfo account değil
          }

          let offset = 8;

          // Mint (32 bytes)
          const mint = new PublicKey(
            data.slice(offset, offset + 32)
          ).toString();
          offset += 32;

          // Owner (32 bytes)
          const owner = new PublicKey(
            data.slice(offset, offset + 32)
          ).toString();
          offset += 32;

          // Bu stake user'a ait mi kontrol et
          if (owner !== userPubkey.toString()) {
            continue;
          }

          // Stake timestamp (8 bytes)
          const stakeTimestamp = data.readBigInt64LE(offset);
          offset += 8;

          // Unlock timestamp (8 bytes)
          const unlockTimestamp = data.readBigInt64LE(offset);
          offset += 8;

          // Original stake timestamp (8 bytes)
          const originalStakeTimestamp = data.readBigInt64LE(offset);
          offset += 8;

          // Is staked (1 byte)
          const isStaked = data.readUInt8(offset) === 1;

          if (isStaked) {
            // Bu NFT stake edilmiş, zaten listede var mı kontrol et
            const existingNFTIndex = allNFTs.findIndex(
              (nft) => nft.mintAddress === mint
            );

            if (existingNFTIndex === -1) {
              // Bu NFT listede yok, vault'ta olmalı - ekle
              console.log(`🎨 Fetching metadata for staked NFT: ${mint}`);
              const metadata = await getNFTMetadata(mint);
              console.log(`✅ Got metadata for staked ${mint}:`, metadata);

              const stakeDate = new Date(Number(stakeTimestamp) * 1000);
              const unlockDate = new Date(Number(unlockTimestamp) * 1000);
              const now = new Date();

              allNFTs.push({
                mintAddress: mint,
                tokenAccount: null, // Vault'ta olduğu için user'ın token account'ı yok
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
          console.log("Error parsing stake info account:", error);
          continue;
        }
      }
    } catch (error) {
      console.log("Error fetching program accounts:", error);
    }

    console.log(`✅ Found ${allNFTs.length} NFTs total`);

    // Debug: Log all NFT metadata
    console.log("📊 NFT Metadata Summary:");
    allNFTs.forEach((nft, index) => {
      console.log(
        `  ${index + 1}. ${nft.name} (${nft.symbol}) - ${
          nft.staked ? "STAKED" : "WALLET"
        }`
      );
      console.log(`     Image: ${nft.image}`);
      console.log(`     Mint: ${nft.mintAddress.slice(0, 8)}...`);
    });

    return allNFTs.sort((a, b) => {
      // Stake edilmiş olanları üste, sonra stake tarihine göre sırala
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
 * 5. User'ın Stake'lerini Getir (Geriye uyumluluk için)
 */
export const getUserStakes = async (wallet) => {
  try {
    console.log("📊 Fetching user stakes...");

    if (!wallet.publicKey) {
      throw new Error("Wallet not connected");
    }

    const connection = getConnection();
    const userPubkey = wallet.publicKey;

    // User stats PDA
    const [userStatsPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("user_stats"), userPubkey.toBuffer()],
      PROGRAM_ID
    );

    // User stats account'ını getir
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

    // Tüm NFT'leri getir
    const userNFTs = await getUserNFTs(wallet);

    // Sadece stake edilmiş olanları filtrele (eski API uyumluluğu için)
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

    // User stats data'sını parse et
    const userStatsData = userStatsAccount.data;
    let offset = 8; // discriminator skip

    offset += 32; // user pubkey skip
    const nftsMinted = userStatsData.readUInt8(offset);
    offset += 1;
    const nftsStaked = userStatsData.readUInt8(offset);

    console.log("✅ User stakes fetched successfully!");

    return {
      nftsMinted,
      nftsStaked,
      userNFTs, // Tüm NFT'ler (stake edilmiş + edilmemiş)
      stakes: stakes.sort(
        (a, b) => new Date(b.stakeDate) - new Date(a.stakeDate)
      ), // En yeni önce
    };
  } catch (error) {
    console.error("❌ Error fetching user stakes:", error);
    throw error;
  }
};

/**
 * 5. Config bilgilerini getir
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
      // Return default values when config doesn't exist
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

    // Config data'sını parse et
    const configData = configAccount.data;
    let offset = 8; // discriminator skip

    // Admin (32 bytes)
    const admin = new PublicKey(
      configData.slice(offset, offset + 32)
    ).toString();
    offset += 32;

    // Minting fee (8 bytes)
    const mintingFee = configData.readBigUInt64LE(offset);
    offset += 8;

    // Max NFTs per wallet (1 byte)
    const maxNftsPerWallet = configData.readUInt8(offset);
    offset += 1;

    // Staking duration months (1 byte)
    const stakingDurationMonths = configData.readUInt8(offset);
    offset += 1;

    // Total minted (8 bytes)
    const totalMinted = configData.readBigUInt64LE(offset);
    offset += 8;

    // Total staked (8 bytes)
    const totalStaked = configData.readBigUInt64LE(offset);

    const result = {
      admin,
      mintingFee: Number(mintingFee) / LAMPORTS_PER_SOL, // SOL cinsinden
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

    // Return default values on error
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
 * 6. Utility fonksiyonları
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
 * 7. Admin Withdraw Fees Fonksiyonu
 */
export const withdrawFees = async (publicKey, sendTransaction) => {
  try {
    console.log("💰 Starting fee withdrawal...");

    if (!publicKey) {
      throw new Error("Wallet not connected");
    }

    const connection = getConnection();
    const adminPubkey = publicKey;

    // Fee vault PDA
    const [feeVaultPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("fee_vault")],
      PROGRAM_ID
    );

    console.log("💰 Fee Vault PDA:", feeVaultPda.toString());

    // Check fee vault balance before withdrawal
    const feeVaultBalance = await connection.getBalance(feeVaultPda);
    console.log(
      "💰 Fee Vault Balance:",
      feeVaultBalance / LAMPORTS_PER_SOL,
      "SOL"
    );

    if (feeVaultBalance === 0) {
      throw new Error("No funds available in fee vault to withdraw");
    }

    // Check admin balance before withdrawal
    const adminBalanceBefore = await connection.getBalance(adminPubkey);
    console.log(
      "👤 Admin Balance Before:",
      adminBalanceBefore / LAMPORTS_PER_SOL,
      "SOL"
    );

    // Instruction data (withdraw_fees discriminator)
    const instructionData = Buffer.alloc(8);
    // You may need to update this discriminator based on your program
    const discriminator = [106, 158, 232, 248, 164, 251, 230, 188]; // withdraw_fees discriminator
    discriminator.forEach((byte, index) => {
      instructionData.writeUInt8(byte, index);
    });

    // Transaction instruction
    const instruction = new anchor.web3.TransactionInstruction({
      keys: [
        { pubkey: adminPubkey, isSigner: true, isWritable: true }, // admin
        { pubkey: feeVaultPda, isSigner: false, isWritable: true }, // fee_vault
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }, // system_program
      ],
      programId: PROGRAM_ID,
      data: instructionData,
    });

    // Compute budget instruction
    const computeBudgetIx = ComputeBudgetProgram.setComputeUnitLimit({
      units: 200000,
    });

    // Transaction oluştur ve gönder
    const transaction = new anchor.web3.Transaction()
      .add(computeBudgetIx)
      .add(instruction);

    console.log("🚀 Sending withdrawal transaction...");

    const signature = await sendTransaction(transaction, connection);

    await connection.confirmTransaction(signature, COMMITMENT);

    // Check balances after withdrawal
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
 * 8. Get Fee Vault Info (Admin için)
 */
export const getFeeVaultInfo = async () => {
  try {
    console.log("🔍 Fetching fee vault info...");
    const connection = getConnection();

    // Fee vault PDA
    const [feeVaultPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("fee_vault")],
      PROGRAM_ID
    );

    console.log("💰 Fee Vault PDA:", feeVaultPda.toString());

    // Get fee vault balance
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
