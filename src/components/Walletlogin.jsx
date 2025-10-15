import { useAppKit } from "@reown/appkit/react";
import bs58 from "bs58";
import axios from "axios";
import { useState, useEffect } from "react";
import constants from "../constants";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useGlobalState } from "../hooks/useGlobalState";
import useRefreshState from "../hooks/useRefreshState";
import { AlertCircle, CheckCircle, LogIn, Wallet } from "lucide-react";
import { useUnifiedWallet } from "../hooks/useUnifiedWallet"; 

export default function WalletLogin() {
  // Use unified wallet instead of separate hooks
  const { publicKey, signMessage, connected, disconnect } = useUnifiedWallet();
  const { open } = useAppKit();
  
  const { globalState, setGlobalState } = useGlobalState();
  const { getData } = useRefreshState();
  const [loginError, setLoginError] = useState(null);
  const [loginSuccess, setLoginSuccess] = useState(false);

  // User and auth state
  const user = globalState?.user;
  const authToken = globalState?.authToken;
  const isLoggedIn = !!user && !!authToken;

  // Get wallet address and connection status
  const walletAddress = publicKey?.toBase58();
  const walletConnected = connected;

  // Nonce fetch query
  const { refetch: getNonce } = useQuery({
    queryKey: ["nonce", walletAddress],
    queryFn: async () => {
      const { data } = await axios.get(
        `${constants.backend_url}/solana-auth/nonce`,
        {
          params: { wallet: walletAddress },
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
      setTimeout(() => setLoginSuccess(false), 3000);
    },
    onError: (error) => {
      console.error("Login error:", error.response?.data || error);
      setLoginError("Login failed. Please try again.");
      setLoginSuccess(false);
    },
  });

  const login = async () => {
    if (!walletAddress || !walletConnected) {
      setLoginError("Wallet not connected");
      return;
    }

    try {
      setLoginError(null);

      // 1. Get nonce
      const { data: nonce } = await getNonce();
      console.log("Received nonce:", nonce.nonce);

      const message = `Sign this message to log in\nNonce: ${nonce.nonce}`;
      const encoded = new TextEncoder().encode(message);

      // 2. Sign with unified wallet (works with both systems)
      if (!signMessage) {
        throw new Error("Wallet does not support message signing");
      }
      
      const signed = await signMessage(encoded);
      const signature = bs58.encode(signed);

      console.log("Signature:", signature);

      // 3. Verify
      loginMutation.mutate({
        wallet: walletAddress,
        signature,
        nonce: nonce.nonce,
      });
    } catch (err) {
      console.error("Login error:", err);
      setLoginError(err.message || "Login failed. Please try again.");
    }
  };

  const handleConnect = () => {
    open();
  };

  // Format address for display
  const formatAddress = (addr) => {
    if (!addr) return "";
    return `${addr.slice(0, 4)}...${addr.slice(-4)}`;
  };

  // SINGLE BUTTON LOGIC
  if (!walletConnected) {
    // State 1: Wallet not connected - Connect button
    return (
      <div className="relative">
        <button
          onClick={handleConnect}
          className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-xl font-semibold transition-all duration-300 transform hover:scale-105 text-sm sm:text-base flex items-center gap-2"
        >
          <Wallet size={16} />
          <span className="hidden sm:inline">Connect Wallet</span>
          <span className="sm:hidden">Connect</span>
        </button>
      </div>
    );
  }

  if (walletConnected && !isLoggedIn) {
    // State 2: Wallet connected but not logged in - Login button
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

  // State 3: Wallet connected AND logged in - Show wallet address
  return (
    <button
      onClick={handleConnect}
      className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-xl font-semibold transition-all duration-300 text-sm sm:text-base flex items-center gap-2"
    >
      <Wallet size={16} />
      <span>{formatAddress(walletAddress)}</span>
    </button>
  );
}