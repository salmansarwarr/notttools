// 🔧 NETWORK CONFIGURATION
// Change: 'devnet' | 'testnet' | 'mainnet-beta'
const NETWORK_TYPE = "mainnet-beta";

// 🌐 SOLANA NETWORK ENDPOINTS
const SOLANA_NETWORKS = {
  devnet: "https://api.devnet.solana.com",
  testnet: "https://api.testnet.solana.com",
  "mainnet-beta":
    "https://mainnet.helius-rpc.com/?api-key=f18f588d-397e-4fe1-89d0-d4415638f465",
};

// 📝 SOLANA PROGRAM ADDRESSES
const PROGRAM_ADDRESSES = {
  devnet: "C5iywAsfLev5sx4bYuuMw7U1Ms8Dhe2Y9j4vjTrpxHx7",
  testnet: "DAbyh1R9NeSoYnmUxwogR6w3MP9Bd7jtxrmEVG4iY3y5",
  "mainnet-beta": "BF27BrKA4jbkqdNETXs7oYqZge8rMk4GyMFsJvNdrgzi",
};

// ⚙️ SOLANA CONNECTION SETTINGS
const SOLANA_CONFIG = {
  commitment: "confirmed", // 'processed' | 'confirmed' | 'finalized'
  confirmTransactionTimeout: 60000, // 60 seconds
  maxRetries: 3,
};

// 💰 NFT COLLECTION SETTINGS
const NFT_CONFIG = {
  maxSupply: 5000,
  defaultMintPrice: 0.01, // SOL
  maxNftsPerWallet: 5,
  stakingDurationMonths: 3,
  collectionName: "Noottools Genesis NFTs",
  collectionSymbol: "NTGC",
};

// 🖼️ METADATA SETTINGS
const METADATA_CONFIG = {
  defaultImage: "/pengu.png", // Default NFT image
  defaultDescription: "Noottools Genesis NFT Collection",
  defaultExternalUrl: "https://metadata.noottools.io/metadata",
  animationUrlPrefix: "https://noottools.uncw3b.com/nft-animations/",
};

// 🏪 BACKEND CONFIGURATION
const BACKEND_CONFIG = {
  development: {
    url: "https://panel.noottools.io", // Development backend URL
    timeout: 10000,
  },
  production: {
    url: "https://panel.noottools.io", // Production backend URL'ini buraya ekle
    timeout: 15000,
  },
};

// 🌍 FRONTEND CONFIGURATION
const FRONTEND_CONFIG = {
  development: {
    url: "http://localhost:5173",
  },
  production: {
    url: "https://noottools.io",
  },
};

// 📊 API RATE LIMITS
const API_LIMITS = {
  requestsPerMinute: 60,
  requestsPerHour: 3600,
  retryDelay: 1000, // 1 second
};

// 🎨 UI CONFIGURATION
const UI_CONFIG = {
  toastDuration: 5000, // 5 seconds
  loadingTimeout: 30000, // 30 seconds
  refreshInterval: 60000, // 1 minute
  animationDuration: 300, // 0.3 seconds
};

// 🔍 EXPLORER URLS
const EXPLORER_URLS = {
  devnet: "https://explorer.solana.com",
  testnet: "https://explorer.solana.com",
  "mainnet-beta": "https://explorer.solana.com",
};

// 📱 WALLET CONFIGURATION
const WALLET_CONFIG = {
  autoConnect: false,
  localStorageKey: "walletName",
  supportedWallets: ["phantom", "solflare", "sollet", "backpack"],
};

// 📄 LEGAL PAGES CONFIGURATION
const LEGAL_PAGES = {
  generalStatement: {
    title: "General Statement",
    path: "/general-statement",
    description: "General terms and conditions of use",
  },
  legalAdvice: {
    title: "Legal Advice",
    path: "/legal-advice",
    description: "Important legal disclaimers and advice",
  },
  privacyPolicy: {
    title: "Privacy Policy",
    path: "/privacy-policy",
    description: "How we handle your data and privacy",
  },
};

// ⚠️ ENVIRONMENT DETECTION
const isDevelopment = import.meta.env.DEV;
const isProduction = import.meta.env.PROD;

// 📤 EXPORTED CONSTANTS
const constants = {
  // Legacy support
  backend_url: isDevelopment
    ? BACKEND_CONFIG.development.url
    : BACKEND_CONFIG.production.url,
  frontend_url: isDevelopment
    ? FRONTEND_CONFIG.development.url
    : FRONTEND_CONFIG.production.url,
  app_name: "noottools",
  contract_address: PROGRAM_ADDRESSES[NETWORK_TYPE],
  SOLANA_NETWORK: NETWORK_TYPE,

  // New structured config
  network: {
    type: NETWORK_TYPE,
    endpoint: SOLANA_NETWORKS[NETWORK_TYPE],
    programId: PROGRAM_ADDRESSES[NETWORK_TYPE],
    explorerUrl: EXPLORER_URLS[NETWORK_TYPE],
    isDevelopment,
    isProduction,
  },

  solana: SOLANA_CONFIG,
  nft: NFT_CONFIG,
  metadata: METADATA_CONFIG,
  backend: isDevelopment
    ? BACKEND_CONFIG.development
    : BACKEND_CONFIG.production,
  frontend: isDevelopment
    ? FRONTEND_CONFIG.development
    : FRONTEND_CONFIG.production,
  api: API_LIMITS,
  ui: UI_CONFIG,
  wallet: WALLET_CONFIG,
  legal: LEGAL_PAGES,

  // Helper functions
  getExplorerUrl: (signature, type = "tx") => {
    const baseUrl = EXPLORER_URLS[NETWORK_TYPE];
    const cluster =
      NETWORK_TYPE === "mainnet-beta" ? "" : `?cluster=${NETWORK_TYPE}`;
    return `${baseUrl}/${type}/${signature}${cluster}`;
  },

  isDevnet: () => NETWORK_TYPE === "devnet",
  isTestnet: () => NETWORK_TYPE === "testnet",
  isMainnet: () => NETWORK_TYPE === "mainnet-beta",
};

export default constants;
