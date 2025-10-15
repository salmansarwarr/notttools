import { createAppKit } from '@reown/appkit/react'
import { SolanaAdapter } from '@reown/appkit-adapter-solana/react'
import { solana, solanaTestnet, solanaDevnet } from '@reown/appkit/networks'
import { PhantomWalletAdapter, SolflareWalletAdapter } from '@solana/wallet-adapter-wallets'

// Your existing wallet-adapter setup
const wallets = [
  new PhantomWalletAdapter(),
  new SolflareWalletAdapter(),
];

// Reown AppKit setup
const solanaWeb3JsAdapter = new SolanaAdapter({
  wallets
});

// 1. Get projectId from https://cloud.reown.com
const projectId = 'fc0b7f76086b5fccf0fc5d12449e7d3e'

const metadata = {
  name: 'Your App Name',
  description: 'Your App Description',
  url: 'https://yourapp.com',
  icons: ['https://yourapp.com/icon.png']
};

createAppKit({
  adapters: [solanaWeb3JsAdapter],
  networks: [solana, solanaTestnet, solanaDevnet],
  metadata,
  projectId,
  features: {
    analytics: true
  }
});

// Remove WagmiProvider - it's for Ethereum, not Solana
export function ReownProvider({ children }) {
  return <>{children}</>;
}