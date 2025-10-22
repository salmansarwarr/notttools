import React, { useState, useEffect } from "react";
import { useUnifiedWallet } from "../hooks/useUnifiedWallet";
import {
  Wallet,
  Download,
  DollarSign,
  Shield,
  RefreshCw,
  ExternalLink,
  AlertTriangle,
  CheckCircle,
} from "lucide-react";
import { withdrawFees, getFeeVaultInfo } from "../hooks/frontend-functions";
import constants from "../constants";

const AdminWithdraw = () => {
  const { wallet, connected, publicKey, sendTransaction } = useUnifiedWallet();
  const [feeVaultInfo, setFeeVaultInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);
  const [lastWithdrawal, setLastWithdrawal] = useState(null);
  const [error, setError] = useState(null);

  // Admin wallet address for reference
  const ADMIN_WALLET =
    constants.commission.walletAddress[constants.network.type];

  useEffect(() => {
    if (connected) {
      fetchFeeVaultInfo();
    }
  }, [connected]);

  const fetchFeeVaultInfo = async () => {
    try {
      setLoading(true);
      setError(null);
      const info = await getFeeVaultInfo();
      setFeeVaultInfo(info);
      console.log("Fee vault info:", info);
    } catch (error) {
      console.error("Error fetching fee vault info:", error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleWithdraw = async () => {
    if (!connected || !wallet || !publicKey) {
      setError("Wallet not connected");
      return;
    }

    if (!feeVaultInfo || feeVaultInfo.balance === 0) {
      setError("No funds available to withdraw");
      return;
    }

    try {
      setWithdrawing(true);
      setError(null);

      console.log("Starting withdrawal...");
      console.log("Wallet:", wallet);
      console.log("Public Key:", publicKey?.toBase58());
      console.log("SendTransaction:", sendTransaction);

      const result = await withdrawFees(publicKey, sendTransaction);

      setLastWithdrawal(result);
      console.log("Withdrawal result:", result);

      // Refresh fee vault info after withdrawal
      await fetchFeeVaultInfo();
    } catch (error) {
      console.error("Withdrawal error:", error);
      setError(error.message);
    } finally {
      setWithdrawing(false);
    }
  };

  if (!connected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0A151E] via-[#0D1B2A] to-[#0A151E] pt-28 pb-20">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <Shield className="w-16 h-16 text-blue-400 mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-white mb-4">
              Wallet Connection Required
            </h1>
            <p className="text-gray-400 mb-8">
              Please connect your wallet to access fee withdrawal functionality.
            </p>

            <div className="bg-blue-900/20 border border-blue-600/30 rounded-xl p-6">
              <AlertTriangle className="w-6 h-6 text-blue-400 mx-auto mb-2" />
              <p className="text-blue-200 text-sm">
                Connect your wallet to view fee vault information and attempt
                withdrawals.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0A151E] via-[#0D1B2A] to-[#0A151E] pt-28 pb-20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-3 bg-gradient-to-r from-green-600/20 to-blue-600/20 border border-green-500/30 rounded-2xl px-6 py-3 mb-6">
            <Shield className="w-5 h-5 text-green-400 animate-pulse" />
            <span className="text-green-300 font-semibold">Fee Management</span>
          </div>

          <h1 className="text-4xl md:text-5xl font-bold mb-6">
            <span className="bg-gradient-to-r from-green-400 via-blue-400 to-cyan-400 bg-clip-text text-transparent">
              Fee Withdrawal
            </span>
          </h1>

          <p className="text-xl text-gray-300 max-w-3xl mx-auto leading-relaxed">
            Manage and withdraw accumulated fees from the NOOTTOOLS platform.
          </p>
        </div>

        {/* Network Info */}
        <div className="bg-gradient-to-br from-[#192630] to-[#1a2332] border border-gray-700 rounded-2xl p-6 mb-8">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
              <Wallet className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">Connected Wallet</h3>
              <p className="text-gray-400">Admin: {publicKey?.toBase58()}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-800/50 rounded-xl p-4">
              <p className="text-gray-400 text-sm mb-1">Network</p>
              <p className="text-white font-semibold">
                {constants.network.type.toUpperCase()}
              </p>
            </div>
            <div className="bg-gray-800/50 rounded-xl p-4">
              <p className="text-gray-400 text-sm mb-1">Program ID</p>
              <p className="text-white font-semibold text-xs">
                {constants.network.programId.slice(0, 8)}...
                {constants.network.programId.slice(-8)}
              </p>
            </div>
            <div className="bg-gray-800/50 rounded-xl p-4">
              <p className="text-gray-400 text-sm mb-1">Admin Wallet</p>
              <p className="text-white font-semibold text-xs">
                {ADMIN_WALLET.slice(0, 8)}...{ADMIN_WALLET.slice(-8)}
              </p>
            </div>
          </div>

          {/* Admin Warning */}
          {publicKey?.toBase58() !== ADMIN_WALLET && (
            <div className="bg-amber-900/20 border border-amber-600/30 rounded-xl p-4 mt-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-amber-200 text-sm">
                    <strong>Note:</strong> Only the admin wallet can
                    successfully withdraw funds. You can view the fee vault
                    information, but withdrawal will fail if attempted with a
                    non-admin wallet.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Fee Vault Info */}
        <div className="bg-gradient-to-br from-[#192630] to-[#1a2332] border border-gray-700 rounded-2xl p-8 mb-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-full flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-white">Fee Vault</h2>
            </div>

            <button
              onClick={fetchFeeVaultInfo}
              disabled={loading}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 px-4 py-2 rounded-xl transition-colors"
            >
              <RefreshCw
                className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
              />
              Refresh
            </button>
          </div>

          {loading ? (
            <div className="text-center py-8">
              <RefreshCw className="w-8 h-8 text-blue-400 animate-spin mx-auto mb-4" />
              <p className="text-gray-400">Loading fee vault information...</p>
            </div>
          ) : feeVaultInfo ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gray-800/50 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-white mb-2">
                    Available Balance
                  </h3>
                  <p className="text-3xl font-bold text-green-400">
                    {feeVaultInfo.balance.toFixed(4)} SOL
                  </p>
                  <p className="text-gray-400 text-sm mt-1">
                    {feeVaultInfo.balanceLamports.toLocaleString()} lamports
                  </p>
                </div>

                <div className="bg-gray-800/50 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-white mb-2">
                    Fee Vault Address
                  </h3>
                  <p className="text-sm text-gray-300 font-mono break-all">
                    {feeVaultInfo.feeVaultPda}
                  </p>
                  <a
                    href={feeVaultInfo.explorerUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-blue-400 hover:text-blue-300 text-sm mt-2"
                  >
                    View on Explorer <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>

              {/* Withdraw Button */}
              <div className="text-center">
                <button
                  onClick={handleWithdraw}
                  disabled={withdrawing || feeVaultInfo.balance === 0}
                  className="inline-flex items-center gap-3 bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 disabled:from-gray-600 disabled:to-gray-700 px-8 py-4 rounded-xl font-semibold text-white transition-all transform hover:scale-105 disabled:scale-100"
                >
                  {withdrawing ? (
                    <>
                      <RefreshCw className="w-5 h-5 animate-spin" />
                      Withdrawing...
                    </>
                  ) : (
                    <>
                      <Download className="w-5 h-5" />
                      Withdraw All Fees ({feeVaultInfo.balance.toFixed(4)} SOL)
                    </>
                  )}
                </button>

                {feeVaultInfo.balance === 0 && (
                  <p className="text-gray-400 text-sm mt-2">
                    No funds available to withdraw
                  </p>
                )}

                {publicKey?.toBase58() !== ADMIN_WALLET &&
                  feeVaultInfo.balance > 0 && (
                    <p className="text-amber-400 text-sm mt-2">
                      ⚠️ Only admin wallet can withdraw funds
                    </p>
                  )}
              </div>
            </div>
          ) : null}
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-900/20 border border-red-600/30 rounded-xl p-6 mb-8">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-6 h-6 text-red-400 mt-1 flex-shrink-0" />
              <div>
                <h3 className="text-red-300 font-semibold mb-2">Error</h3>
                <p className="text-red-200 text-sm">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Last Withdrawal Info */}
        {lastWithdrawal && (
          <div className="bg-green-900/20 border border-green-600/30 rounded-xl p-6">
            <div className="flex items-start gap-3">
              <CheckCircle className="w-6 h-6 text-green-400 mt-1 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="text-green-300 font-semibold mb-4">
                  Withdrawal Successful
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-green-800/20 rounded-lg p-4">
                    <p className="text-green-200 text-sm mb-1">
                      Amount Withdrawn
                    </p>
                    <p className="text-green-100 font-semibold">
                      {lastWithdrawal.amountWithdrawn.toFixed(4)} SOL
                    </p>
                  </div>

                  <div className="bg-green-800/20 rounded-lg p-4">
                    <p className="text-green-200 text-sm mb-1">Transaction</p>
                    <a
                      href={lastWithdrawal.explorerUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-green-300 hover:text-green-200 text-sm font-mono"
                    >
                      {lastWithdrawal.signature.slice(0, 8)}...
                      {lastWithdrawal.signature.slice(-8)}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminWithdraw;
