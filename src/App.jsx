import * as React from "react";
import { useMemo } from "react";
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import { GlobalStateProvider } from "./hooks/useGlobalState";
import { useEffect, useState } from "react";
import AppRoutes from "./AppRoutes";
import { HeroUIProvider } from "@heroui/react";
import { WalletAdapterNetwork } from "@solana/wallet-adapter-base";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import "@solana/wallet-adapter-react-ui/styles.css";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ToastContainer } from "react-toastify";
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
import { ReownProvider } from "./providers/Reown"; 

// CSS imports
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
              <ReownProvider>
                <WalletModalProvider>
                  <Router>
                    <ToastContainer />
                    <AppRoutes />
                  </Router>
                </WalletModalProvider>
              </ReownProvider>
            </WalletProvider>
          </ConnectionProvider>
        </QueryClientProvider>
      </HeroUIProvider>
    </GlobalStateProvider>
  );
}

export default App;