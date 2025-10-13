import * as React from "react";
import { useMemo } from "react";
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import { GlobalStateProvider, useGlobalState } from "./hooks/useGlobalState";
import { useEffect, useState } from "react";
import AppRoutes from "./AppRoutes";
import { HeroUIProvider } from "@heroui/react";
import { WalletAdapterNetwork } from "@solana/wallet-adapter-base";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import "@solana/wallet-adapter-react-ui/styles.css";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ToastContainer, toast } from "react-toastify";
import { clusterApiUrl } from "@solana/web3.js";
import {
  ConnectionProvider,
  WalletProvider,
} from "@solana/wallet-adapter-react";
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
  TorusWalletAdapter,
  LedgerWalletAdapter,
} from "@solana/wallet-adapter-wallets";

// CSS import'ları
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";
import "@solana/wallet-adapter-react-ui/styles.css";

const network = WalletAdapterNetwork.Mainnet;
const queryClient = new QueryClient();

function App() {
  const [theme, setTheme] = useState("light");

  const endpoint = useMemo(() => clusterApiUrl(network), []);

  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter(),
      new TorusWalletAdapter(),
      new LedgerWalletAdapter(),
    ],
    []
  );

  // MetaMask duplicate'ını engelle
  useEffect(() => {
    // Browser'daki MetaMask detection'ını override et
    const originalDefineProperty = Object.defineProperty;

    // MetaMask'ın kendini register etmesini engelle
    Object.defineProperty = function (obj, prop, descriptor) {
      if (
        prop === "solana" &&
        descriptor.value &&
        descriptor.value.isMetaMask
      ) {
        console.log("MetaMask Solana provider engellendi");
        return obj;
      }
      return originalDefineProperty.apply(this, arguments);
    };

    // Cleanup
    return () => {
      Object.defineProperty = originalDefineProperty;
    };
  }, []);

  useEffect(() => {
    const storedTheme = localStorage.getItem("theme");
    if (storedTheme) {
      setTheme(storedTheme);
    } else {
      const prefersDarkMode =
        window.matchMedia &&
        window.matchMedia("(prefers-color-scheme: dark)").matches;
      const systemTheme = prefersDarkMode ? "dark" : "light";
      setTheme(systemTheme);
      localStorage.setItem("theme", systemTheme);
    }
  }, []);

  useEffect(() => {
    document.documentElement.classList.remove("light", "dark");
    document.documentElement.classList.add(theme);
  }, [theme]);

  return (
    <>
      <GlobalStateProvider>
        <HeroUIProvider>
          <QueryClientProvider client={queryClient}>
            <ConnectionProvider endpoint={endpoint}>
              <WalletProvider
                wallets={wallets}
                autoConnect
                localStorageKey="walletAdapter"
                onError={(error) => {
                  console.log("Wallet error:", error);
                }}
              >
                <WalletModalProvider
                  featuredWallets={wallets.length} // Sadece bizim wallet'ları göster
                >
                  <Router>
                    <ToastContainer />
                    <AppRoutes />
                  </Router>
                </WalletModalProvider>
              </WalletProvider>
            </ConnectionProvider>
          </QueryClientProvider>
        </HeroUIProvider>
      </GlobalStateProvider>
    </>
  );
}

export default App;
