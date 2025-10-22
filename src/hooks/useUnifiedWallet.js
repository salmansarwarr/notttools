import { useAppKitAccount, useAppKitProvider } from "@reown/appkit/react";
import { useWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { useMemo } from "react";

/**
 * Unified wallet hook that combines @solana/wallet-adapter-react and Reown AppKit
 * Use this instead of useWallet throughout your app
 */
export function useUnifiedWallet() {
  // Wallet Adapter
  const walletAdapter = useWallet();
  
  // AppKit
  const { address, isConnected: appKitConnected } = useAppKitAccount();
  const { walletProvider } = useAppKitProvider("solana");

  // Determine which system is active
  const isAppKit = appKitConnected && address && !walletAdapter.connected;
  
  // Unified interface
  const unifiedWallet = useMemo(() => {
    if (isAppKit) {
      // AppKit is active
      return {
        publicKey: address ? new PublicKey(address) : null,
        connected: appKitConnected,
        connecting: false,
        disconnecting: false,
        wallet: null,
        
        signMessage: async (message) => {
          if (!walletProvider?.signMessage) {
            throw new Error("Wallet does not support message signing");
          }
          return await walletProvider.signMessage(message);
        },
        
        signTransaction: async (transaction) => {
          if (!walletProvider?.signTransaction) {
            throw new Error("Wallet does not support transaction signing");
          }
          return await walletProvider.signTransaction(transaction);
        },
        
        signAllTransactions: async (transactions) => {
          if (!walletProvider?.signAllTransactions) {
            throw new Error("Wallet does not support signing multiple transactions");
          }
          return await walletProvider.signAllTransactions(transactions);
        },
        
        disconnect: async () => {
          // AppKit disconnect is handled through useAppKit's open() modal
          console.warn("Disconnect through AppKit modal");
        },
        
        // Metadata
        select: () => {},
        walletProvider,
        isAppKit: true,
      };
    } else {
      // Wallet Adapter is active (or nothing is connected)
      return {
        ...walletAdapter,
        isAppKit: false,
      };
    }
  }, [isAppKit, address, appKitConnected, walletAdapter, walletProvider]);

  return unifiedWallet;
}