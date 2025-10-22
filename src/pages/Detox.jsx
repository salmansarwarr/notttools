import React, { useState } from "react";
import { useUnifiedWallet } from "../hooks/useUnifiedWallet";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { Loader2, ShieldCheck, AlertCircle, RefreshCcw, CheckCircle } from "lucide-react";
import { DetoxService } from "../utils/detoxService";

const detoxService = new DetoxService();

export default function Detox() {
  const { publicKey, signTransaction } = useUnifiedWallet();
  const [scanResults, setScanResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(null);
  const [result, setResult] = useState(null);

  const handleScan = async () => {
    if (!publicKey) return;

    setLoading(true);
    try {
      const results = await detoxService.scanWallet(publicKey.toString());
      setScanResults(results);
    } catch (error) {
      alert("Error scanning wallet: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDetox = async () => {
    if (!scanResults || !publicKey || !signTransaction) return;

    setProcessing(true);
    setProgress({ current: 0, total: 1 });

    try {
      const result = await detoxService.executeDetox(
        scanResults.emptyAccounts,
        publicKey.toString(),
        signTransaction,
        (prog) => setProgress(prog)
      );

      setResult(result);
      alert(`Success! Closed ${result.totalClosed} accounts. Net recovered: ${result.netRecovered.toFixed(4)} SOL`);
      setScanResults(null);
      setProgress(null);
    } catch (error) {
      alert("Error during detox: " + error.message);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A151E] pt-24 pb-20 px-6 flex flex-col items-center">
      {/* Header */}
      <div className="text-center mb-16 mt-6">
        <div className="inline-flex items-center gap-3 bg-gradient-to-r from-blue-600/20 to-purple-600/20 border border-blue-500/30 rounded-2xl px-6 py-3 mb-6">
          <ShieldCheck className="text-green-400" size={24} />
          <span className="text-blue-300 font-semibold">Wallet Detox</span>
        </div>
        <h1 className="text-5xl font-bold text-white mb-4">
          <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            Reclaim Your SOL
          </span>
        </h1>
        <p className="text-gray-400 text-lg max-w-2xl mx-auto">
          Scan your Solana wallet for empty token accounts and reclaim wasted SOL instantly — securely and transparently.
        </p>
      </div>

      {/* Wallet Connect */}
      <div className="mb-10">
        <WalletMultiButton className="!bg-gradient-to-r !from-blue-600 !to-purple-600 hover:!from-blue-700 hover:!to-purple-700 text-white font-semibold rounded-xl px-6 py-3 transition-all duration-300" />
      </div>

      {/* Scan Button */}
      {publicKey && !scanResults && (
        <button
          onClick={handleScan}
          disabled={loading}
          className={`px-8 py-4 rounded-xl font-semibold text-white text-lg transition-all duration-300 transform hover:scale-105 ${
            loading
              ? "bg-gray-600 cursor-not-allowed"
              : "bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600"
          }`}
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <Loader2 className="animate-spin" size={20} /> Scanning...
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <RefreshCcw size={20} /> Scan Wallet
            </span>
          )}
        </button>
      )}

      {/* Scan Results */}
      {scanResults && (
        <div className="bg-gradient-to-br from-[#192630] to-[#1a2332] border border-gray-700 rounded-2xl p-8 mt-10 max-w-lg w-full text-center shadow-lg hover:border-gray-600 transition-all duration-300">
          <h2 className="text-3xl font-bold text-white mb-6">Scan Results</h2>

          <div className="space-y-3 text-gray-300 mb-8">
            <p><strong>Empty Accounts:</strong> {scanResults.totalAccounts}</p>
            <p><strong>Total Recoverable:</strong> {scanResults.recoverableSOL.toFixed(4)} SOL</p>
            <p className="text-red-400">
              <strong>Service Fee (20%):</strong> {scanResults.feeAmount.toFixed(4)} SOL
            </p>
            <p className="text-green-400 text-xl font-semibold">
              <strong>You’ll Receive:</strong> {scanResults.netRecovery.toFixed(4)} SOL
            </p>
          </div>

          <button
            onClick={handleDetox}
            disabled={processing || scanResults.totalAccounts === 0}
            className={`px-8 py-4 w-full rounded-xl font-semibold text-white text-lg transition-all duration-300 ${
              processing
                ? "bg-gray-600 cursor-not-allowed"
                : "bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
            }`}
          >
            {processing ? (
              <span className="flex justify-center items-center gap-2">
                <Loader2 className="animate-spin" size={20} /> Processing...
              </span>
            ) : (
              "Start Detox"
            )}
          </button>

          {progress && (
            <div className="mt-6 text-gray-400 text-sm space-y-1">
              <p>Progress: {progress.current} / {progress.total} batches</p>
              <p>Accounts closed: {progress.accountsClosed}</p>
              <p>Fees collected: {progress.feesCollected?.toFixed(4)} SOL</p>
            </div>
          )}
        </div>
      )}

      {/* Detox Result */}
      {result && (
        <div className="bg-gradient-to-br from-green-600/20 to-blue-600/20 border border-green-400/30 rounded-2xl p-8 mt-10 max-w-lg w-full text-center text-white shadow-lg">
          <div className="flex justify-center mb-4">
            <CheckCircle className="text-green-400" size={40} />
          </div>
          <h3 className="text-2xl font-bold mb-4">✅ Detox Complete!</h3>
          <p>Accounts Closed: {result.totalClosed}</p>
          <p>Fees Collected: {result.totalFees.toFixed(4)} SOL</p>
          <p className="text-green-400 font-semibold text-lg mt-2">
            You Received: {result.netRecovered.toFixed(4)} SOL
          </p>
        </div>
      )}

      {/* Footer Info */}
      <div className="text-gray-500 text-sm text-center mt-16 max-w-md">
        <p>ℹ️ This service charges a <span className="text-red-400 font-semibold">20%</span> fee on recovered SOL</p>
      </div>
    </div>
  );
}
