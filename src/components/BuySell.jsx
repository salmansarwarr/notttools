import React, { useState } from "react";
import { useUnifiedWallet } from "../hooks/useUnifiedWallet";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { TrendingUp, TrendingDown, Zap, Wallet } from "lucide-react";
import constants from "../constants";

const BuySell = ({ project }) => {
  const { connected } = useUnifiedWallet();
  const [activeTab, setActiveTab] = useState("buy");
  const [amount, setAmount] = useState("");

  const handleQuickAmount = (value) => {
    setAmount(value.toString());
  };

  const handleTrade = () => {
    // Trading logic will be implemented here
    console.log(
      `${activeTab} ${amount} ${activeTab === "buy" ? "SOL" : project.symbol}`
    );
  };

  return (
    <div className="bg-gradient-to-br from-[#192630] to-[#1a2332] rounded-2xl p-6 border border-gray-700 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-green-600/10 to-red-600/10 rounded-full blur-2xl"></div>

      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-blue-600 rounded-lg">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">
              Trade ${project.symbol?.toUpperCase()}
            </h3>
            <p className="text-gray-400 text-sm">Instant buy & sell</p>
          </div>
        </div>

        {/* Tab Buttons */}
        <div className="flex rounded-xl bg-gray-800/50 p-1 mb-6 border border-gray-700">
          <button
            onClick={() => setActiveTab("buy")}
            className={`flex-1 py-3 px-4 rounded-lg text-center transition-all duration-300 flex items-center justify-center gap-2 ${
              activeTab === "buy"
                ? "bg-gradient-to-r from-green-600 to-green-500 text-white shadow-lg"
                : "text-gray-400 hover:text-white hover:bg-gray-700/30"
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span className="font-medium">Buy</span>
          </button>
          <button
            onClick={() => setActiveTab("sell")}
            className={`flex-1 py-3 px-4 rounded-lg text-center transition-all duration-300 flex items-center justify-center gap-2 ${
              activeTab === "sell"
                ? "bg-gradient-to-r from-red-600 to-red-500 text-white shadow-lg"
                : "text-gray-400 hover:text-white hover:bg-gray-700/30"
            }`}
          >
            <TrendingDown className="w-4 h-4" />
            <span className="font-medium">Sell</span>
          </button>
        </div>

        {/* Amount Input */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-400 mb-3">
            Amount {activeTab === "buy" ? "to spend" : "to sell"}
          </label>
          <div className="relative">
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full px-4 py-4 bg-gray-800/50 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 pr-20 text-lg font-medium transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              disabled={!connected}
            />
            <div className="absolute right-4 top-1/2 transform -translate-y-1/2 flex items-center gap-2">
              {activeTab === "buy" ? (
                <>
                  <img
                    src="/solana-logo.png"
                    alt="SOL"
                    className="w-5 h-5"
                    onError={(e) => {
                      e.target.style.display = "none";
                    }}
                  />
                  <span className="text-gray-400 text-sm font-medium">SOL</span>
                </>
              ) : (
                <>
                  {project.logo ? (
                    <img
                      src={`${constants.backend_url}/assets/${project.logo}`}
                      alt={project.symbol}
                      className="w-5 h-5 rounded-full"
                    />
                  ) : (
                    <div className="w-5 h-5 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full"></div>
                  )}
                  <span className="text-gray-400 text-sm font-medium">
                    {project.symbol?.toUpperCase()}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Quick Amount Buttons */}
        <div className="space-y-3 mb-6">
          {activeTab === "buy" ? (
            <>
              {/* First row - Amount buttons */}
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => handleQuickAmount(0.1)}
                  disabled={!connected}
                  className="py-2 px-2 bg-gray-700/50 hover:bg-gray-600/50 disabled:bg-gray-700/20 text-white text-sm rounded-lg transition-all duration-300 disabled:cursor-not-allowed border border-gray-600 hover:border-gray-500"
                >
                  0.1 SOL
                </button>
                <button
                  onClick={() => handleQuickAmount(0.5)}
                  disabled={!connected}
                  className="py-2 px-2 bg-gray-700/50 hover:bg-gray-600/50 disabled:bg-gray-700/20 text-white text-sm rounded-lg transition-all duration-300 disabled:cursor-not-allowed border border-gray-600 hover:border-gray-500"
                >
                  0.5 SOL
                </button>
                <button
                  onClick={() => handleQuickAmount(1)}
                  disabled={!connected}
                  className="py-2 px-2 bg-gray-700/50 hover:bg-gray-600/50 disabled:bg-gray-700/20 text-white text-sm rounded-lg transition-all duration-300 disabled:cursor-not-allowed border border-gray-600 hover:border-gray-500"
                >
                  1 SOL
                </button>
              </div>
              {/* Second row - Max and Reset */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleQuickAmount("max")}
                  disabled={!connected}
                  className="py-2 px-2 bg-blue-600/20 hover:bg-blue-600/30 disabled:bg-gray-700/20 text-blue-400 text-sm rounded-lg transition-all duration-300 disabled:cursor-not-allowed border border-blue-600/30 hover:border-blue-600/50"
                >
                  Max
                </button>
                <button
                  onClick={() => setAmount("")}
                  disabled={!connected}
                  className="py-2 px-2 bg-gray-700/50 hover:bg-gray-600/50 disabled:bg-gray-700/20 text-white text-sm rounded-lg transition-all duration-300 disabled:cursor-not-allowed border border-gray-600 hover:border-gray-500"
                >
                  Reset
                </button>
              </div>
            </>
          ) : (
            <>
              {/* First row - Percentage buttons */}
              <div className="grid grid-cols-4 gap-2">
                <button
                  onClick={() => handleQuickAmount("25")}
                  disabled={!connected}
                  className="py-2 px-2 bg-gray-700/50 hover:bg-gray-600/50 disabled:bg-gray-700/20 text-white text-sm rounded-lg transition-all duration-300 disabled:cursor-not-allowed border border-gray-600 hover:border-gray-500"
                >
                  25%
                </button>
                <button
                  onClick={() => handleQuickAmount("50")}
                  disabled={!connected}
                  className="py-2 px-2 bg-gray-700/50 hover:bg-gray-600/50 disabled:bg-gray-700/20 text-white text-sm rounded-lg transition-all duration-300 disabled:cursor-not-allowed border border-gray-600 hover:border-gray-500"
                >
                  50%
                </button>
                <button
                  onClick={() => handleQuickAmount("75")}
                  disabled={!connected}
                  className="py-2 px-2 bg-gray-700/50 hover:bg-gray-600/50 disabled:bg-gray-700/20 text-white text-sm rounded-lg transition-all duration-300 disabled:cursor-not-allowed border border-gray-600 hover:border-gray-500"
                >
                  75%
                </button>
                <button
                  onClick={() => handleQuickAmount("100")}
                  disabled={!connected}
                  className="py-2 px-2 bg-red-600/20 hover:bg-red-600/30 disabled:bg-gray-700/20 text-red-400 text-sm rounded-lg transition-all duration-300 disabled:cursor-not-allowed border border-red-600/30 hover:border-red-600/50"
                >
                  100%
                </button>
              </div>
              {/* Second row - Reset */}
              <div className="grid grid-cols-1">
                <button
                  onClick={() => setAmount("")}
                  disabled={!connected}
                  className="py-2 px-2 bg-gray-700/50 hover:bg-gray-600/50 disabled:bg-gray-700/20 text-white text-sm rounded-lg transition-all duration-300 disabled:cursor-not-allowed border border-gray-600 hover:border-gray-500"
                >
                  Reset
                </button>
              </div>
            </>
          )}
        </div>

        {/* Trade Button or Connect Wallet */}
        {connected ? (
          <button
            onClick={handleTrade}
            disabled={!amount}
            className={`w-full py-4 rounded-xl font-semibold transition-all duration-300 transform hover:scale-105 disabled:scale-100 ${
              activeTab === "buy"
                ? "bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 disabled:from-green-600/50 disabled:to-green-500/50"
                : "bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 disabled:from-red-600/50 disabled:to-red-500/50"
            } text-white disabled:cursor-not-allowed shadow-lg`}
          >
            {activeTab === "buy" ? "Buy" : "Sell"}{" "}
            {project.symbol?.toUpperCase()}
          </button>
        ) : (
          <div className="space-y-4">
            <WalletMultiButton className="!w-full !bg-gradient-to-r !from-blue-600 !to-purple-600 !hover:from-blue-700 !hover:to-purple-700 !py-4 !rounded-xl !font-semibold !transition-all !duration-300 !transform !hover:scale-105" />
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 text-gray-400 text-sm">
                <Wallet className="w-4 h-4" />
                <span>Connect your wallet to start trading</span>
              </div>
            </div>
          </div>
        )}

        {/* Balance Info - Only show when connected */}
        {connected && (
          <div className="mt-6 pt-4 border-t border-gray-700">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="bg-gray-800/30 rounded-lg p-3">
                <div className="text-gray-400 mb-1">SOL Balance</div>
                <div className="text-white font-bold">0.00 SOL</div>
              </div>
              <div className="bg-gray-800/30 rounded-lg p-3">
                <div className="text-gray-400 mb-1">
                  {project.symbol?.toUpperCase()} Balance
                </div>
                <div className="text-white font-bold">
                  0 {project.symbol?.toUpperCase()}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BuySell;
