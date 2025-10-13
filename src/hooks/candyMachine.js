import { Connection, PublicKey } from "@solana/web3.js";
import { Metaplex } from "@metaplex-foundation/js";
import { walletAdapterIdentity } from "@metaplex-foundation/js";
import constants from "../constants.jsx";

// Network konfigürasyonu - Constants'tan al
const NETWORK_TYPE = constants.network.type;
const NETWORK_ENDPOINT = constants.network.endpoint;
const COMMITMENT = constants.solana.commitment;
const CANDY_MACHINE_ID = constants.network.candyMachineId;

console.log(`🍭 Candy Machine konfigürasyonu:`, {
  network: NETWORK_TYPE,
  candyMachineId: CANDY_MACHINE_ID,
  endpoint: NETWORK_ENDPOINT,
});

/**
 * Metaplex instance oluştur - Candy Machine için
 */
const createMetaplexInstance = (wallet) => {
  const connection = new Connection(NETWORK_ENDPOINT, COMMITMENT);
  return Metaplex.make(connection).use(walletAdapterIdentity(wallet));
};

/**
 * GERÇEK CANDY MACHINE MINT - METAPLEX JS SDK
 * Racing condition olmadan sıralı mint
 */
export const mintCandyMachineNFT = async (wallet) => {
  try {
    console.log("🍭 GERÇEK Candy Machine mint başlıyor...");
    console.log(`🌐 Network: ${NETWORK_TYPE.toUpperCase()}`);

    if (!wallet.publicKey) {
      throw new Error("Wallet bağlı değil");
    }

    // Metaplex instance oluştur
    const metaplex = createMetaplexInstance(wallet);

    // Candy Machine'i fetch et
    console.log("🔄 Candy Machine yükleniyor...");
    const candyMachine = await metaplex
      .candyMachines()
      .findByAddress({ address: new PublicKey(CANDY_MACHINE_ID) });

    console.log("🍭 Candy Machine bulundu:", {
      publicKey: candyMachine.address.toString(),
      itemsAvailable: candyMachine.itemsAvailable.toString(),
      itemsMinted: candyMachine.itemsMinted.toString(),
      itemsRemaining: candyMachine.itemsRemaining.toString(),
    });

    // Racing condition kontrolü
    if (candyMachine.itemsRemaining.isZero()) {
      throw new Error("Candy Machine sold out - racing condition önlendi");
    }

    // Gerçek mint işlemi
    console.log("⚡ NFT mint ediliyor...");
    const { nft, response } = await metaplex.candyMachines().mint({
      candyMachine,
      collectionUpdateAuthority: candyMachine.authorityAddress,
    });

    console.log("✅ CANDY MACHINE NFT BAŞARIYLA MİNT EDİLDİ! 🍭");
    console.log("🔗 Transaction:", response.signature);
    console.log("🎨 NFT Address:", nft.address.toString());
    console.log("📛 NFT Name:", nft.name);

    // Explorer URL'sini network'e göre oluştur
    const explorerCluster =
      NETWORK_TYPE === "mainnet-beta" ? "" : `?cluster=${NETWORK_TYPE}`;

    return {
      success: true,
      signature: response.signature,
      mintAddress: nft.address.toString(),
      nftName: nft.name,
      nftSymbol: nft.symbol,
      nftUri: nft.uri,
      metadata: nft.json,
      network: NETWORK_TYPE,
      source: "Metaplex Candy Machine",
      explorerUrl: `https://solscan.io/tx/${response.signature}${explorerCluster}`,
      candyMachineId: CANDY_MACHINE_ID,
      itemsRemaining: candyMachine.itemsRemaining.toString(),
    };
  } catch (error) {
    console.error("❌ Candy Machine mint hatası:", error);
    throw new Error(`Mint işlemi başarısız: ${error.message}`);
  }
};

/**
 * Candy Machine bilgilerini getir - Metaplex JS SDK
 */
export const getCandyMachineInfo = async (wallet) => {
  try {
    if (!wallet.publicKey) {
      throw new Error("Wallet bağlı değil");
    }

    const metaplex = createMetaplexInstance(wallet);
    const candyMachine = await metaplex
      .candyMachines()
      .findByAddress({ address: new PublicKey(CANDY_MACHINE_ID) });

    return {
      id: candyMachine.address.toString(),
      itemsAvailable: Number(candyMachine.itemsAvailable),
      itemsMinted: Number(candyMachine.itemsMinted),
      itemsRemaining: Number(candyMachine.itemsRemaining),
      network: NETWORK_TYPE,
      candyMachineId: CANDY_MACHINE_ID,
    };
  } catch (error) {
    console.error("❌ Candy Machine bilgi alma hatası:", error);
    return null;
  }
};

export default {
  mintCandyMachineNFT,
  getCandyMachineInfo,
};
