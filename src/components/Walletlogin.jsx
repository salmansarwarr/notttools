import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import bs58 from "bs58";
import axios from "axios";
import { useState } from "react";
import constants from "../constants";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useGlobalState } from "../hooks/useGlobalState";
import useRefreshState from "../hooks/useRefreshState";
import { AlertCircle, CheckCircle, LogIn } from "lucide-react";

export default function WalletLogin() {
  const { publicKey, signMessage, connected } = useWallet();
  const { globalState, setGlobalState } = useGlobalState();
  const { getData } = useRefreshState();
  const [loginError, setLoginError] = useState(null);
  const [loginSuccess, setLoginSuccess] = useState(false);

  // User ve auth durumu
  const user = globalState?.user;
  const authToken = globalState?.authToken;
  const isLoggedIn = !!user && !!authToken;

  // Nonce getirme query'si
  const { refetch: getNonce } = useQuery({
    queryKey: ["nonce", publicKey?.toBase58()],
    queryFn: async () => {
      const { data } = await axios.get(
        `${constants.backend_url}/solana-auth/nonce`,
        {
          params: { wallet: publicKey.toBase58() },
        }
      );
      return data;
    },
    enabled: false,
  });

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: async ({ wallet, signature, nonce }) => {
      const res = await axios.post(
        `${constants.backend_url}/solana-auth/verify`,
        {
          wallet,
          signature,
          nonce,
        }
      );
      return res.data;
    },
    onSuccess: async (data) => {
      console.log("Login successful", data);
      localStorage.setItem("auth_token", data.access_token);
      localStorage.setItem("refresh_token", data.refresh_token);
      setGlobalState((prevState) => ({
        ...prevState,
        authToken: data.access_token,
      }));
      await getData();
      setLoginSuccess(true);
      setLoginError(null);
      // Hide success message after 3 seconds
      setTimeout(() => setLoginSuccess(false), 3000);
    },
    onError: (error) => {
      console.error("Login error:", error.response?.data || error);
      setLoginError("Login failed. Please try again.");
      setLoginSuccess(false);
    },
  });

  const login = async () => {
    if (!publicKey || !signMessage || !connected) {
      setLoginError("Wallet not connected");
      return;
    }

    try {
      setLoginError(null);

      // 1. Nonce al
      const { data: nonce } = await getNonce();
      console.log("Received nonce:", nonce.nonce);

      const message = `Sign this message to log in\nNonce: ${nonce.nonce}`;
      console.log("Message to sign:", message);

      const encoded = new TextEncoder().encode(message);

      // 2. İmzala
      const signed = await signMessage(encoded);
      const signature = bs58.encode(signed);

      console.log("Signature:", signature);

      // 3. Doğrula
      loginMutation.mutate({
        wallet: publicKey.toBase58(),
        signature,
        nonce: nonce.nonce,
      });
    } catch (err) {
      console.error("Login error:", err);
      setLoginError("Login failed. Please try again.");
    }
  };

  // TEK BUTON LOGIC
  if (!connected) {
    // Durum 1: Cüzdan bağlı değil - Connect butonu
    return (
      <div className="relative">
        <WalletMultiButton className="!bg-gradient-to-r !from-purple-600 !to-blue-600 hover:!from-purple-700 hover:!to-blue-700 !text-white !px-4 sm:!px-6 !py-2 sm:!py-3 !rounded-xl !font-semibold !transition-all !duration-300 !transform hover:!scale-105 !text-sm sm:!text-base" />
      </div>
    );
  }

  if (connected && !isLoggedIn) {
    // Durum 2: Cüzdan bağlı ama login değil - Login butonu
    return (
      <div className="relative">
        <button
          onClick={login}
          disabled={loginMutation.isPending}
          className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 disabled:from-gray-600 disabled:to-gray-700 text-white px-3 sm:px-6 py-2 sm:py-3 rounded-xl font-semibold transition-all duration-300 transform hover:scale-105 disabled:scale-100 disabled:cursor-not-allowed flex items-center gap-1 sm:gap-2 text-sm sm:text-base"
        >
          {loginMutation.isPending ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              <span className="hidden sm:inline">Logging in...</span>
              <span className="sm:hidden">Login...</span>
            </>
          ) : (
            <>
              <LogIn size={16} className="sm:hidden" />
              <span className="hidden sm:inline">Login with Solana</span>
              <span className="sm:hidden">Login</span>
            </>
          )}
        </button>

        {/* Error Message */}
        {loginError && (
          <div className="absolute top-full left-0 right-0 mt-2 z-50">
            <div className="bg-red-500/20 border border-red-500/30 rounded-lg px-3 py-2 text-red-400 flex items-center gap-2 shadow-lg backdrop-blur-sm">
              <AlertCircle size={16} />
              <span className="text-sm">{loginError}</span>
            </div>
          </div>
        )}

        {/* Success Message */}
        {loginSuccess && (
          <div className="absolute top-full left-0 right-0 mt-2 z-50">
            <div className="bg-green-500/20 border border-green-500/30 rounded-lg px-3 py-2 text-green-400 flex items-center gap-2 shadow-lg backdrop-blur-sm">
              <CheckCircle size={16} />
              <span className="text-sm">Login successful! 🎉</span>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Durum 3: Cüzdan bağlı VE login yapılı - Wallet butonu (adres gösterir)
  return (
    <WalletMultiButton className="!bg-gradient-to-r !from-purple-600 !to-blue-600 hover:!from-purple-700 hover:!to-blue-700 !text-white !px-4 sm:!px-6 !py-2 sm:!py-3 !rounded-xl !font-semibold !transition-all !duration-300 !text-sm sm:!text-base" />
  );
}
