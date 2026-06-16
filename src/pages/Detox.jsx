import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useUnifiedWallet } from "../hooks/useUnifiedWallet";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import {
    Loader2,
    ShieldCheck,
    RefreshCcw,
    CheckCircle,
    Trash2,
    Info,
    ChevronRight,
    Search,
    Check,
    Flame,
    AlertTriangle,
    Zap,
} from "lucide-react";
import { DetoxService } from "../utils/detoxService";
import { motion, AnimatePresence } from "framer-motion";

const detoxService = new DetoxService(import.meta.env.VITE_RPC_URL);

const RENT_PER_ACCOUNT = 0.00203928;
const FEE_PERCENTAGE = 0.2;

export default function Detox() {
    const { t } = useTranslation();
    const { publicKey, signTransaction } = useUnifiedWallet();
    const [scanResults, setScanResults] = useState(null);
    const [loading, setLoading] = useState(false);
    const [processing, setProcessing] = useState(false);
    const [progress, setProgress] = useState(null);
    const [result, setResult] = useState(null);
    const [selectedAccounts, setSelectedAccounts] = useState(new Set());
    const [filter, setFilter] = useState("all"); // all, empty, tokens

    const handleScan = async () => {
        if (!publicKey) return;

        setLoading(true);
        setResult(null);
        try {
            const results = await detoxService.scanWallet(publicKey.toString());
            setScanResults(results);
            // Automatically select empty accounts by default
            const emptyAccountAddresses = results.emptyAccounts.map(
                (a) => a.address,
            );
            setSelectedAccounts(new Set(emptyAccountAddresses));
        } catch (error) {
            console.error(error);
            alert("Error scanning wallet: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    const toggleAccount = (address) => {
        const newSelected = new Set(selectedAccounts);
        if (newSelected.has(address)) {
            newSelected.delete(address);
        } else {
            newSelected.add(address);
        }
        setSelectedAccounts(newSelected);
    };

    const selectAll = () => {
        if (scanResults) {
            const allAddresses = filteredAccounts.map((a) => a.address);
            setSelectedAccounts(
                new Set([...selectedAccounts, ...allAddresses]),
            );
        }
    };

    const deselectAll = () => {
        if (scanResults) {
            const filteredAddresses = new Set(
                filteredAccounts.map((a) => a.address),
            );
            const newSelected = new Set(
                [...selectedAccounts].filter(
                    (addr) => !filteredAddresses.has(addr),
                ),
            );
            setSelectedAccounts(newSelected);
        }
    };

    const handleDetox = async () => {
        if (selectedAccounts.size === 0 || !publicKey || !signTransaction)
            return;

        const accountsToBurn = scanResults.accounts.filter((a) =>
            selectedAccounts.has(a.address),
        );

        setProcessing(true);
        setProgress({
            current: 0,
            total: Math.ceil(accountsToBurn.length / 10),
            accountsClosed: 0,
            feesCollected: 0,
        });

        try {
            const result = await detoxService.executeDetox(
                accountsToBurn,
                publicKey.toString(),
                signTransaction,
                (prog) => setProgress(prog),
            );

            setResult(result);
            setScanResults(null);
            setSelectedAccounts(new Set());
            setProgress(null);
        } catch (error) {
            alert("Error during detox: " + error.message);
        } finally {
            setProcessing(false);
        }
    };

    const filteredAccounts = scanResults
        ? scanResults.accounts.filter((acc) => {
              if (filter === "empty") return acc.isEmpty;
              if (filter === "tokens") return !acc.isEmpty;
              return true;
          })
        : [];

    const totalSelectedRent = selectedAccounts.size * RENT_PER_ACCOUNT;
    const totalSelectedFee = totalSelectedRent * FEE_PERCENTAGE;
    const netSelectedRecovery = totalSelectedRent - totalSelectedFee;

    return (
        <div className="min-h-screen bg-[#050A0E] text-white pt-24 pb-20 px-4 sm:px-6 flex flex-col items-center font-sans">
            {/* Background Glow */}
            <div className="fixed top-0 left-1/2 -translate-x-1/2 w-full h-full pointer-events-none overflow-hidden -z-10">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 blur-[120px] rounded-full" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/10 blur-[120px] rounded-full" />
            </div>

            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center mb-12 max-w-3xl"
            >
                <div className="inline-flex items-center gap-2 bg-[#0F1C26] border border-blue-500/20 rounded-full px-4 py-1.5 mb-6 shadow-lg shadow-blue-500/5">
                    <ShieldCheck className="text-blue-400" size={18} />
                    <span className="text-blue-200 text-sm font-medium tracking-wide uppercase">
                        SOL Incinerator v2
                    </span>
                </div>
                <h1 className="text-4xl sm:text-6xl font-black mb-6 tracking-tight">
                    CLEAN YOUR{" "}
                    <span className="bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-500 bg-clip-text text-transparent">
                        WALLET
                    </span>
                </h1>
                <p className="text-gray-400 text-lg leading-relaxed max-w-2xl mx-auto">
                    Reclaim your locked SOL from empty accounts and dust tokens.
                    Analyze your assets, select what to burn, and get your SOL
                    back instantly.
                </p>
            </motion.div>

            {/* Main Action Area */}
            {!scanResults && !result && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl w-full"
                >
                    {/* Analyze Card */}
                    <div className="group relative bg-[#0D161F] border border-gray-800 rounded-3xl p-8 hover:border-blue-500/50 transition-all duration-500 shadow-2xl overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 blur-3xl group-hover:bg-blue-500/10 transition-colors" />
                        <div className="relative z-10">
                            <div className="w-14 h-14 bg-blue-600/20 rounded-2xl flex items-center justify-center mb-6 border border-blue-500/30">
                                <Search className="text-blue-400" size={28} />
                            </div>
                            <h2 className="text-2xl font-bold mb-3">{t("analyze")}</h2>
                            <p className="text-gray-400 mb-8 leading-relaxed">
                                Scan your wallet to find empty accounts, NFTs,
                                and tokens that are wasting your SOL. Choose
                                exactly what you want to keep.
                            </p>

                            {!publicKey ? (
                                <div className="flex justify-center sm:justify-start">
                                    <WalletMultiButton className="!bg-blue-600 hover:!bg-blue-700 !rounded-xl !h-12 !px-8 !font-bold transition-all" />
                                </div>
                            ) : (
                                <button
                                    onClick={handleScan}
                                    disabled={loading}
                                    className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 text-white font-bold py-4 rounded-2xl transition-all shadow-lg shadow-blue-900/20 active:scale-95"
                                >
                                    {loading ? (
                                        <Loader2
                                            className="animate-spin"
                                            size={20}
                                        />
                                    ) : (
                                        <Zap size={20} />
                                    )}
                                    {loading ? t("scanning") : t("start_analysis")}
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Quick Burn Card */}
                    <div className="group relative bg-[#0D161F] border border-gray-800 rounded-3xl p-8 hover:border-orange-500/50 transition-all duration-500 shadow-2xl overflow-hidden opacity-60">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/5 blur-3xl" />
                        <div className="relative z-10">
                            <div className="w-14 h-14 bg-orange-600/20 rounded-2xl flex items-center justify-center mb-6 border border-orange-500/30">
                                <Flame className="text-orange-400" size={28} />
                            </div>
                            <h2 className="text-2xl font-bold mb-3">
                                STUCK TOKENS
                            </h2>
                            <p className="text-gray-400 mb-8 leading-relaxed">
                                Burn tokens you accidentally sent to invalid
                                addresses or clean up complex account states.
                                (Coming Soon)
                            </p>
                            <button
                                disabled
                                className="w-full bg-gray-800 text-gray-500 font-bold py-4 rounded-2xl cursor-not-allowed"
                            >
                                LOCKED
                            </button>
                        </div>
                    </div>
                </motion.div>
            )}

            {/* Analysis Results */}
            {scanResults && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="w-full max-w-5xl"
                >
                    <div className="flex flex-col lg:flex-row gap-8">
                        {/* List Section */}
                        <div className="flex-grow">
                            <div className="bg-[#0D161F] border border-gray-800 rounded-3xl overflow-hidden shadow-2xl">
                                {/* Filters & Actions */}
                                <div className="p-6 border-b border-gray-800 flex flex-wrap items-center justify-between gap-4">
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setFilter("all")}
                                            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${filter === "all" ? "bg-blue-600 text-white" : "bg-[#152431] text-gray-400 hover:bg-[#1a2d3d]"}`}
                                        >
                                            {t("all")} ({scanResults.accounts.length})
                                        </button>
                                        <button
                                            onClick={() => setFilter("empty")}
                                            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${filter === "empty" ? "bg-blue-600 text-white" : "bg-[#152431] text-gray-400 hover:bg-[#1a2d3d]"}`}
                                        >
                                            {t("empty")} (
                                            {scanResults.emptyAccounts.length})
                                        </button>
                                        <button
                                            onClick={() => setFilter("tokens")}
                                            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${filter === "tokens" ? "bg-blue-600 text-white" : "bg-[#152431] text-gray-400 hover:bg-[#1a2d3d]"}`}
                                        >
                                            {t("tokens")} (
                                            {scanResults.tokenAccounts.length})
                                        </button>
                                    </div>

                                    <div className="flex gap-2">
                                        <button
                                            onClick={selectAll}
                                            className="text-blue-400 hover:text-blue-300 text-sm font-bold"
                                        >
                                            SELECT ALL
                                        </button>
                                        <span className="text-gray-700">|</span>
                                        <button
                                            onClick={deselectAll}
                                            className="text-gray-400 hover:text-gray-300 text-sm font-bold"
                                        >
                                            DESELECT ALL
                                        </button>
                                    </div>
                                </div>

                                {/* The List */}
                                <div className="max-h-[500px] overflow-y-auto custom-scrollbar">
                                    {filteredAccounts.length === 0 ? (
                                        <div className="p-20 text-center text-gray-500">
                                            <Info
                                                className="mx-auto mb-4 opacity-20"
                                                size={48}
                                            />
                                            <p>
                                                No accounts found in this
                                                category.
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="divide-y divide-gray-800/50">
                                            {filteredAccounts.map((acc) => (
                                                <div
                                                    key={acc.address}
                                                    onClick={() =>
                                                        toggleAccount(
                                                            acc.address,
                                                        )
                                                    }
                                                    className={`flex items-center p-4 hover:bg-blue-600/5 cursor-pointer transition-colors ${selectedAccounts.has(acc.address) ? "bg-blue-600/10" : ""}`}
                                                >
                                                    <div
                                                        className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all ${selectedAccounts.has(acc.address) ? "bg-blue-600 border-blue-600" : "border-gray-700 bg-[#0A151E]"}`}
                                                    >
                                                        {selectedAccounts.has(
                                                            acc.address,
                                                        ) && (
                                                            <Check
                                                                size={14}
                                                                className="text-white"
                                                            />
                                                        )}
                                                    </div>

                                                    <div className="ml-4 flex-grow">
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-bold text-gray-200 truncate max-w-[200px]">
                                                                {acc.name ===
                                                                "{t('unknown_token')}"
                                                                    ? acc.mint.slice(
                                                                          0,
                                                                          8,
                                                                      ) +
                                                                      "..." +
                                                                      acc.mint.slice(
                                                                          -8,
                                                                      )
                                                                    : acc.name}
                                                            </span>
                                                            {acc.isNFT && (
                                                                <span className="text-[10px] bg-purple-600/20 text-purple-400 px-1.5 py-0.5 rounded border border-purple-500/30">
                                                                    NFT
                                                                </span>
                                                            )}
                                                            {acc.isEmpty && (
                                                                <span className="text-[10px] bg-green-600/20 text-green-400 px-1.5 py-0.5 rounded border border-green-500/30">
                                                                    EMPTY
                                                                </span>
                                                            )}
                                                            {!acc.isEmpty &&
                                                                !acc.isNFT && (
                                                                    <span className="text-[10px] bg-orange-600/20 text-orange-400 px-1.5 py-0.5 rounded border border-orange-500/30">
                                                                        TOKEN
                                                                    </span>
                                                                )}
                                                        </div>
                                                        <div className="text-xs text-gray-500 font-mono mt-0.5">
                                                            {acc.address.slice(
                                                                0,
                                                                4,
                                                            )}
                                                            ...
                                                            {acc.address.slice(
                                                                -4,
                                                            )}
                                                        </div>
                                                    </div>

                                                    <div className="text-right">
                                                        <div className="text-sm font-bold text-gray-300">
                                                            {acc.amount.toLocaleString()}{" "}
                                                            {acc.symbol !==
                                                            "???"
                                                                ? acc.symbol
                                                                : ""}
                                                        </div>
                                                        <div className="text-[10px] text-green-500/70 font-medium">
                                                            + {RENT_PER_ACCOUNT}{" "}
                                                            SOL
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Summary Section */}
                        <div className="w-full lg:w-80 shrink-0">
                            <div className="bg-[#0D161F] border border-gray-800 rounded-3xl p-6 sticky top-24 shadow-2xl">
                                <h3 className="text-xl font-bold mb-6">
                                    SUMMARY
                                </h3>

                                <div className="space-y-4 mb-8">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-400">
                                            Selected Accounts
                                        </span>
                                        <span className="font-bold">
                                            {selectedAccounts.size}
                                        </span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-400">
                                            Total Recovery
                                        </span>
                                        <span className="font-bold text-green-400">
                                            {totalSelectedRent.toFixed(4)} SOL
                                        </span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-400">
                                            Service Fee (20%)
                                        </span>
                                        <span className="font-bold text-red-400">
                                            -{totalSelectedFee.toFixed(4)} SOL
                                        </span>
                                    </div>
                                    <div className="h-px bg-gray-800 my-2" />
                                    <div className="flex justify-between">
                                        <span className="font-bold">
                                            Net Estimate
                                        </span>
                                        <span className="font-black text-xl text-blue-400">
                                            {netSelectedRecovery.toFixed(4)} SOL
                                        </span>
                                    </div>
                                </div>

                                {selectedAccounts.size > 0 &&
                                    Array.from(selectedAccounts).some(
                                        (addr) =>
                                            !scanResults.accounts.find(
                                                (a) => a.address === addr,
                                            )?.isEmpty,
                                    ) && (
                                        <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-3 mb-6 flex gap-3">
                                            <AlertTriangle
                                                className="text-orange-400 shrink-0"
                                                size={18}
                                            />
                                            <p className="text-[11px] text-orange-200/80 leading-tight">
                                                Warning: Some selected accounts
                                                contain tokens. Burning these
                                                will permanently destroy the
                                                assets.
                                            </p>
                                        </div>
                                    )}

                                <button
                                    onClick={handleDetox}
                                    disabled={
                                        processing ||
                                        selectedAccounts.size === 0
                                    }
                                    className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:from-gray-800 disabled:to-gray-800 disabled:text-gray-600 text-white font-black py-4 rounded-2xl transition-all shadow-xl shadow-blue-900/20 flex items-center justify-center gap-2 active:scale-95"
                                >
                                    {processing ? (
                                        <>
                                            <Loader2
                                                className="animate-spin"
                                                size={20}
                                            />
                                            <span>{t("burning")}</span>
                                        </>
                                    ) : (
                                        <>
                                            <Flame size={20} />
                                            <span>{t("execute_burn")}</span>
                                        </>
                                    )}
                                </button>

                                <p className="text-[10px] text-gray-500 text-center mt-4">
                                    By clicking Execute Burn, you agree to the
                                    20% service fee and understand that assets
                                    burned cannot be recovered.
                                </p>
                            </div>
                        </div>
                    </div>
                </motion.div>
            )}

            {/* Progress Overlay */}
            <AnimatePresence>
                {processing && progress && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-[#050A0E]/90 backdrop-blur-sm p-6"
                    >
                        <div className="bg-[#0D161F] border border-gray-800 rounded-3xl p-10 max-w-md w-full text-center shadow-2xl">
                            <div className="relative w-24 h-24 mx-auto mb-8">
                                <div className="absolute inset-0 rounded-full border-4 border-gray-800" />
                                <div
                                    className="absolute inset-0 rounded-full border-4 border-blue-500 border-t-transparent animate-spin"
                                    style={{ animationDuration: "1.5s" }}
                                />
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <Flame
                                        className="text-blue-500 animate-pulse"
                                        size={32}
                                    />
                                </div>
                            </div>

                            <h2 className="text-3xl font-black mb-2 tracking-tight">
                                BURNING IN PROGRESS
                            </h2>
                            <p className="text-gray-400 mb-8">
                                Please approve the transactions in your wallet.
                            </p>

                            <div className="space-y-4 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-gray-500 uppercase tracking-widest text-[10px] font-bold">
                                        Batches
                                    </span>
                                    <span className="font-bold text-blue-400">
                                        {progress.current} / {progress.total}
                                    </span>
                                </div>
                                <div className="w-full bg-gray-800 h-2 rounded-full overflow-hidden">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{
                                            width: `${(progress.current / progress.total) * 100}%`,
                                        }}
                                        className="h-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]"
                                    />
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500 uppercase tracking-widest text-[10px] font-bold">
                                        Accounts Closed
                                    </span>
                                    <span className="font-bold">
                                        {progress.accountsClosed}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Success Result */}
            {result && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-gradient-to-br from-green-600/10 to-blue-600/10 border border-green-500/30 rounded-3xl p-10 mt-10 max-w-lg w-full text-center shadow-2xl relative overflow-hidden"
                >
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-green-500 to-blue-500" />
                    <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle className="text-green-400" size={40} />
                    </div>
                    <h3 className="text-3xl font-black mb-2 tracking-tight">
                        DETOX SUCCESSFUL
                    </h3>
                    <p className="text-gray-400 mb-8 leading-relaxed">
                        The incinerator has processed your request and recovered
                        your SOL.
                    </p>

                    <div className="grid grid-cols-2 gap-4 mb-8 text-left">
                        <div className="bg-[#0A151E] p-4 rounded-2xl border border-gray-800">
                            <div className="text-[10px] text-gray-500 uppercase font-bold tracking-widest mb-1">
                                Closed
                            </div>
                            <div className="text-xl font-black">
                                {result.totalClosed} Accounts
                            </div>
                        </div>
                        <div className="bg-[#0A151E] p-4 rounded-2xl border border-gray-800">
                            <div className="text-[10px] text-gray-500 uppercase font-bold tracking-widest mb-1">
                                Recovered
                            </div>
                            <div className="text-xl font-black text-blue-400">
                                {result.netRecovered.toFixed(4)} SOL
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={() => setResult(null)}
                        className="w-full bg-white text-black font-black py-4 rounded-2xl hover:bg-gray-200 transition-all active:scale-95 shadow-xl shadow-white/5"
                    >
                        DONE
                    </button>
                </motion.div>
            )}

            {/* CSS Overrides for Custom Scrollbar */}
            <style
                dangerouslySetInnerHTML={{
                    __html: `
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(0, 0, 0, 0.2);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.2);
        }
      `,
                }}
            />
        </div>
    );
}
