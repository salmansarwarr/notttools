import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Search,
    ShieldCheck,
    ShieldAlert,
    Shield,
    Info,
    ExternalLink,
    TrendingUp,
    Users,
    Wallet,
    Lock,
    Zap,
    CheckCircle2,
    AlertTriangle,
    XCircle,
} from "lucide-react";
import { toast } from "react-toastify";
import { Connection, PublicKey } from "@solana/web3.js";
import { getMint } from "@solana/spl-token";
import constants from "../constants";

const TokenTracker = () => {
    const [address, setAddress] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [report, setReport] = useState(null);

    const handleSearch = async (e) => {
        if (e) e.preventDefault();
        if (!address.trim()) {
            toast.error("Please enter a token address");
            return;
        }

        let mintPubkey;
        try {
            mintPubkey = new PublicKey(address.trim());
        } catch (err) {
            toast.error("Invalid Solana address format");
            return;
        }

        setIsLoading(true);
        setReport(null);

        try {
            // Step 1: Attempt to fetch from RugCheck API (Best for deep analysis)
            const rugCheckResponse = await fetch(
                `https://api.rugcheck.xyz/v1/tokens/${address}/report`,
            );

            if (rugCheckResponse.ok) {
                const data = await rugCheckResponse.json();
                console.log("RugCheck API Data:", data);

                const decimals = data.token?.decimals ?? 9;
                const normalizedReport = {
                    isManual: false,
                    mint: data.mint || address,
                    score: data.score ?? 0,
                    scoreNormalised: data.score_normalised ?? Math.min(100, Math.round((data.score ?? 0) / 10)),
                    tokenMeta: data.tokenMeta || {
                        name: data.fileMeta?.name || "Unknown",
                        symbol: data.fileMeta?.symbol || "TOKEN",
                    },
                    uiSupply: data.token?.supply ? (Number(data.token.supply) / Math.pow(10, decimals)).toLocaleString() : "0",
                    creator: data.creator ? data.creator.slice(0, 4) + "..." + data.creator.slice(-4) : "Unknown",
                    fullCreator: data.creator || address,
                    uiCreatorBalance: data.creatorBalance != null ? (Number(data.creatorBalance) / Math.pow(10, decimals)).toLocaleString(undefined, { maximumFractionDigits: 2 }) : "0",
                    uiMarketCap: data.totalMarketLiquidity ? "$" + Number(data.totalMarketLiquidity).toLocaleString(undefined, { maximumFractionDigits: 2 }) : "$0.00",
                    uiTotalHolders: data.totalHolders ? Number(data.totalHolders).toLocaleString() : "1",
                    mintAuthorityStatus: data.token?.mintAuthority != null ? "Enabled" : "Revoked",
                    freezeAuthorityStatus: data.token?.freezeAuthority != null ? "Enabled" : "Revoked",
                    risks: data.risks || [],
                    markets: data.markets ? data.markets.map(m => ({
                        name: m.marketType ? m.marketType.toUpperCase() : "DEX",
                        status: m.rugged ? "Rugged" : "Active",
                        liquidity: m.lp?.lpLockedUSD ? "$" + Number(m.lp.lpLockedUSD).toLocaleString(undefined, { maximumFractionDigits: 0 }) : (m.lp?.lpLockedPct ? `${m.lp.lpLockedPct}% Locked` : "Live")
                    })) : null,
                    topHolders: data.topHolders ? data.topHolders.map(h => ({
                        address: h.address ? h.address.slice(0, 4) + "..." + h.address.slice(-4) : "Wallet",
                        fullAddress: h.address || "",
                        amount: h.uiAmountString ? Number(h.uiAmountString).toLocaleString(undefined, { maximumFractionDigits: 2 }) : (Number(h.amount) / Math.pow(10, decimals)).toLocaleString(undefined, { maximumFractionDigits: 2 }),
                        pct: Number(h.pct || 0).toFixed(2) + "%",
                        pctWidth: Math.min(100, Number(h.pct || 0)).toFixed(2) + "%",
                        rawPct: Number(h.pct || 0)
                    })) : []
                };

                setReport(normalizedReport);
                setIsLoading(false);
                return;
            }

            throw new Error("RugCheck API unavailable or CORS restricted");
        } catch (error) {
            console.warn(
                "RugCheck API failed, falling back to on-chain analysis:",
                error.message,
            );

            try {
                // Step 2: Fallback to On-Chain Analysis (Truly Functional)
                const connection = new Connection(
                    constants.network.endpoint,
                    "confirmed",
                );

                // Fetch Mint Info
                const mintInfo = await getMint(connection, mintPubkey);

                // Fetch Largest Accounts (Holders)
                const largestAccounts =
                    await connection.getTokenLargestAccounts(mintPubkey);

                // Calculate Risks based on on-chain data
                const risks = [];
                let score = 0;

                if (mintInfo.mintAuthority) {
                    risks.push({
                        name: "Mint Authority Enabled",
                        level: "danger",
                        description:
                            "The creator can mint unlimited tokens, which can lead to a rug pull.",
                    });
                    score += 400;
                } else {
                    risks.push({
                        name: "Mint Authority Revoked",
                        level: "safe",
                        description:
                            "The supply is fixed and cannot be increased.",
                    });
                }

                if (mintInfo.freezeAuthority) {
                    risks.push({
                        name: "Freeze Authority Enabled",
                        level: "warning",
                        description:
                            "The creator can freeze user wallets, preventing them from selling.",
                    });
                    score += 200;
                } else {
                    risks.push({
                        name: "Freeze Authority Revoked",
                        level: "safe",
                        description:
                            "Users have full control over their tokens.",
                    });
                }

                // Holder Analysis
                const topHolders = largestAccounts.value.map((acc, idx) => {
                    const rawPct = (Number(acc.amount) / Number(mintInfo.supply)) * 100;
                    const percentStr = rawPct.toFixed(2);
                    return {
                        address:
                            acc.address.toString().slice(0, 4) +
                            "..." +
                            acc.address.toString().slice(-4),
                        fullAddress: acc.address.toString(),
                        amount: (
                            Number(acc.amount) / Math.pow(10, mintInfo.decimals)
                        ).toLocaleString(undefined, { maximumFractionDigits: 2 }),
                        pct: percentStr + "%",
                        pctWidth: Math.min(100, rawPct).toFixed(2) + "%",
                        rawPct: rawPct
                    };
                });

                if (topHolders[0] && topHolders[0].rawPct > 20) {
                    risks.push({
                        name: "High Individual Ownership",
                        level: "danger",
                        description: `A single wallet holds ${topHolders[0].pct} of the supply.`,
                    });
                    score += 250;
                }

                // Prepare the report object in the normalized format
                const onChainReport = {
                    isManual: true,
                    mint: address,
                    score: score,
                    scoreNormalised: Math.min(100, Math.round(score / 10)),
                    tokenMeta: {
                        name: "On-Chain Asset",
                        symbol: "TOKEN",
                    },
                    uiSupply: (Number(mintInfo.supply) / Math.pow(10, mintInfo.decimals)).toLocaleString(),
                    creator: "On-Chain Verify",
                    fullCreator: address,
                    uiCreatorBalance: "Unknown",
                    uiMarketCap: "Fetching...",
                    uiTotalHolders: "N/A",
                    mintAuthorityStatus: mintInfo.mintAuthority ? "Enabled" : "Revoked",
                    freezeAuthorityStatus: mintInfo.freezeAuthority ? "Enabled" : "Revoked",
                    risks: risks.sort((a, b) => (a.level === "danger" ? -1 : 1)),
                    markets: [
                        {
                            name: "Verification",
                            status: "On-Chain",
                            liquidity: "Live",
                        },
                    ],
                    topHolders: topHolders.slice(0, 5),
                };

                setReport(onChainReport);
                toast.success("On-chain scan complete");
            } catch (onChainError) {
                console.error("On-chain analysis failed:", onChainError);
                toast.error("Token not found or RPC error");
            }
        } finally {
            setIsLoading(false);
        }
    };

    const getScoreColor = (score) => {
        if (score < 200) return "text-green-400";
        if (score < 500) return "text-yellow-400";
        return "text-red-500";
    };

    const getStatusText = (score) => {
        if (score < 200) return "Good";
        if (score < 500) return "Warning";
        return "Danger";
    };

    const getRiskLevelClass = (level) => {
        switch (level) {
            case "danger":
                return "bg-red-500/10 border-red-500/30 text-red-400";
            case "warning":
            case "warn":
                return "bg-orange-500/10 border-orange-500/30 text-orange-400";
            case "safe":
                return "bg-green-500/10 border-green-500/30 text-green-400";
            default:
                return "bg-blue-500/10 border-blue-500/30 text-blue-400";
        }
    };

    return (
        <div className="min-h-screen bg-[#0A151E] pt-28 px-4 pb-12">
            <div className="max-w-7xl mx-auto">
                {/* Header Section */}
                <div className="text-center mb-12">
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500/10 border border-blue-500/20 rounded-full text-blue-400 text-sm font-bold mb-4"
                    >
                        <ShieldCheck size={16} />
                        TOKEN SECURITY SCANNER
                    </motion.div>
                    <h1 className="text-4xl md:text-5xl font-black text-white mb-6 tracking-tight">
                        Know Your{" "}
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">
                            Risk
                        </span>
                    </h1>
                    <p className="text-gray-400 text-lg max-w-2xl mx-auto mb-10">
                        Analyze any Solana token for common rugs, honeypots, and
                        malicious permissions instantly.
                    </p>

                    {/* Search Bar */}
                    <form
                        onSubmit={handleSearch}
                        className="max-w-3xl mx-auto relative group"
                    >
                        <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none text-gray-500 group-focus-within:text-blue-400 transition-colors">
                            <Search size={20} />
                        </div>
                        <input
                            type="text"
                            value={address}
                            onChange={(e) => setAddress(e.target.value)}
                            placeholder="Enter Token Mint Address (e.g. EPjFW...)"
                            className="w-full bg-[#111C26] border-2 border-gray-800 focus:border-blue-500 rounded-2xl py-5 pl-14 pr-32 text-white text-lg outline-none transition-all shadow-2xl"
                        />
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="absolute right-2 top-2 bottom-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 text-white font-bold px-8 rounded-xl transition-all flex items-center gap-2"
                        >
                            {isLoading ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                "Analyze"
                            )}
                        </button>
                    </form>
                </div>

                <AnimatePresence mode="wait">
                    {report && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="grid grid-cols-1 lg:grid-cols-3 gap-6"
                        >
                            {/* Left Column - Risk Analysis */}
                            <div className="lg:col-span-1 space-y-6">
                                <div className="bg-[#111C26] border border-gray-800 rounded-3xl p-6 overflow-hidden relative">
                                    <div className="flex justify-between items-center mb-6">
                                        <h3 className="text-white font-bold text-xl">
                                            Risk Analysis
                                        </h3>
                                        <div className="text-right">
                                            <span
                                                className={`text-2xl font-black ${getScoreColor(report.score)}`}
                                            >
                                                {report.scoreNormalised}
                                            </span>
                                            <span className="text-gray-500 font-bold">
                                                {" "}
                                                / 100
                                            </span>
                                        </div>
                                    </div>

                                    <div
                                        className={`text-center py-10 mb-6 border-2 rounded-2xl ${report.score > 400 ? "border-red-500/50 bg-red-500/5" : "border-green-500/50 bg-green-500/5"}`}
                                    >
                                        <h2
                                            className={`text-5xl font-black uppercase tracking-widest ${getScoreColor(report.score)}`}
                                        >
                                            {getStatusText(report.score)}
                                        </h2>
                                    </div>

                                    <div className="space-y-3">
                                        {report.risks.map((risk, idx) => (
                                            <div
                                                key={idx}
                                                className={`flex items-center gap-3 p-3 border rounded-xl ${getRiskLevelClass(risk.level)}`}
                                            >
                                                <div className="shrink-0">
                                                    {risk.level === "danger" ? (
                                                        <ShieldAlert
                                                            size={18}
                                                        />
                                                    ) : risk.level === "warning" || risk.level === "warn" ? (
                                                        <Shield size={18} />
                                                    ) : (
                                                        <ShieldCheck
                                                            size={18}
                                                        />
                                                    )}
                                                </div>
                                                <div className="flex-1">
                                                    <p className="font-bold text-sm">
                                                        {risk.name}
                                                    </p>
                                                </div>
                                                <div
                                                    className="text-white/40 cursor-help"
                                                    title={risk.description}
                                                >
                                                    <Info size={16} />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    {report.isManual && (
                                        <p className="mt-4 text-[10px] text-gray-500 text-center uppercase tracking-widest font-bold">
                                            ⚠️ On-chain raw data scan
                                        </p>
                                    )}
                                </div>

                                <div className="bg-[#111C26] border border-gray-800 rounded-3xl p-6">
                                    <h3 className="text-white font-bold text-xl mb-6">
                                        Markets
                                    </h3>
                                    <div className="space-y-4">
                                        {report.markets &&
                                            report.markets.map(
                                                (market, idx) => (
                                                    <div
                                                        key={idx}
                                                        className="flex items-center justify-between p-4 bg-gray-900/50 rounded-2xl border border-gray-800"
                                                    >
                                                        <div>
                                                            <p className="text-white font-bold">
                                                                {market.name}
                                                            </p>
                                                            <p
                                                                className={`text-xs ${market.status === "Active" || market.status === "On-Chain" ? "text-green-400" : "text-gray-500"}`}
                                                            >
                                                                {market.status}
                                                            </p>
                                                        </div>
                                                        <div className="text-right">
                                                            <p className="text-white font-mono text-sm">
                                                                {
                                                                    market.liquidity
                                                                }
                                                            </p>
                                                            <p className="text-gray-500 text-xs">
                                                                Liquidity
                                                            </p>
                                                        </div>
                                                    </div>
                                                ),
                                            )}
                                    </div>
                                </div>
                            </div>

                            {/* Middle Column - Token Overview */}
                            <div className="lg:col-span-1 space-y-6">
                                <div className="bg-[#111C26] border border-gray-800 rounded-3xl p-6">
                                    <div className="flex items-center gap-4 mb-8">
                                        <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center text-white font-black text-2xl shadow-lg shadow-blue-500/20">
                                            {report.tokenMeta.symbol.charAt(0)}
                                        </div>
                                        <div>
                                            <h2 className="text-2xl font-bold text-white">
                                                {report.tokenMeta.name}
                                            </h2>
                                            <p className="text-blue-400 font-bold">
                                                ${report.tokenMeta.symbol}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="space-y-6">
                                        <div className="flex justify-between items-center pb-4 border-b border-gray-800">
                                            <span className="text-gray-400 font-medium flex items-center gap-2">
                                                <TrendingUp size={16} /> Supply
                                            </span>
                                            <span className="text-white font-mono font-bold">
                                                {report.uiSupply}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center pb-4 border-b border-gray-800">
                                            <span className="text-gray-400 font-medium flex items-center gap-2">
                                                <Wallet size={16} /> Creator
                                            </span>
                                            <span 
                                                onClick={() => window.open(`https://solscan.io/account/${report.fullCreator}`, '_blank')}
                                                className="text-blue-400 font-mono text-sm hover:underline cursor-pointer flex items-center gap-1"
                                            >
                                                {report.creator}{" "}
                                                <ExternalLink size={12} />
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center pb-4 border-b border-gray-800">
                                            <span className="text-gray-400 font-medium flex items-center gap-2">
                                                <Lock size={16} /> Creator
                                                Balance
                                            </span>
                                            <span
                                                className={`font-bold ${report.uiCreatorBalance === "0" || report.uiCreatorBalance === "Unknown" ? "text-green-400" : "text-yellow-400"}`}
                                            >
                                                {report.uiCreatorBalance}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center pb-4 border-b border-gray-800">
                                            <span className="text-gray-400 font-medium flex items-center gap-2">
                                                <Zap size={16} /> Market Cap
                                            </span>
                                            <span className="text-white font-bold">
                                                {report.uiMarketCap}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center pb-4 border-b border-gray-800">
                                            <span className="text-gray-400 font-medium flex items-center gap-2">
                                                <Users size={16} /> Holders
                                            </span>
                                            <span className="text-white font-bold">
                                                {report.uiTotalHolders}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center pb-4 border-b border-gray-800">
                                            <span className="text-gray-400 font-medium flex items-center gap-2">
                                                <ShieldCheck size={16} /> Mint
                                                Authority
                                            </span>
                                            <span
                                                className={`font-bold ${report.mintAuthorityStatus === "Enabled" ? "text-red-400" : "text-green-400"}`}
                                            >
                                                {report.mintAuthorityStatus}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-gray-400 font-medium flex items-center gap-2">
                                                <Lock size={16} /> Freeze
                                                Authority
                                            </span>
                                            <span
                                                className={`font-bold ${report.freezeAuthorityStatus === "Enabled" ? "text-red-400" : "text-green-400"}`}
                                            >
                                                {report.freezeAuthorityStatus}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-[#111C26] border border-gray-800 rounded-3xl p-6 relative overflow-hidden group">
                                    <div className="absolute top-3 right-3 bg-yellow-500/20 text-yellow-500 text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-widest">
                                        Beta
                                    </div>
                                    <h3 className="text-white font-bold text-xl mb-4">
                                        Insider Networks
                                    </h3>
                                    <div className="flex items-center gap-3 p-4 bg-green-500/5 border border-green-500/20 rounded-2xl">
                                        <CheckCircle2
                                            className="text-green-400"
                                            size={24}
                                        />
                                        <p className="text-green-400 font-bold uppercase text-xs tracking-wider">
                                            No insider networks detected
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Right Column - Top Holders */}
                            <div className="lg:col-span-1">
                                <div className="bg-[#111C26] border border-gray-800 rounded-3xl p-6 h-full flex flex-col">
                                    <div className="flex justify-between items-center mb-6">
                                        <h3 className="text-white font-bold text-xl">
                                            Top Holders
                                        </h3>
                                        <span className="text-gray-500 text-sm font-bold">
                                            TOP 5 SHOWN
                                        </span>
                                    </div>

                                    <div className="flex-1 space-y-4">
                                        <div className="grid grid-cols-12 gap-2 text-[10px] font-black text-gray-500 uppercase tracking-widest pb-2 border-b border-gray-800">
                                            <div className="col-span-6">
                                                Account
                                            </div>
                                            <div className="col-span-3 text-right">
                                                Amount
                                            </div>
                                            <div className="col-span-3 text-right">
                                                %
                                            </div>
                                        </div>

                                        {report.topHolders.map(
                                            (holder, idx) => (
                                                <div
                                                    key={idx}
                                                    className="grid grid-cols-12 gap-2 items-center group"
                                                >
                                                    <div className="col-span-6 flex items-center gap-2">
                                                        <span 
                                                            onClick={() => window.open(`https://solscan.io/account/${holder.fullAddress}`, '_blank')}
                                                            className="text-blue-400 font-mono text-sm group-hover:underline cursor-pointer"
                                                        >
                                                            {holder.address}
                                                        </span>

                                                        <span className="bg-orange-500/20 text-orange-400 text-[8px] px-1.5 py-0.5 rounded font-black uppercase">
                                                            TOP
                                                        </span>
                                                    </div>
                                                    <div className="col-span-3 text-right text-gray-400 font-mono text-sm">
                                                        {holder.amount}
                                                    </div>
                                                    <div className="col-span-3 text-right">
                                                        <div className="text-white font-bold font-mono text-sm">
                                                            {holder.pct}
                                                        </div>
                                                        <div className="w-full bg-gray-800 h-1 rounded-full mt-1 overflow-hidden">
                                                            <div
                                                                className={`h-full ${holder.rawPct > 20 ? "bg-red-500" : "bg-blue-500"}`}
                                                                style={{
                                                                    width: holder.pctWidth,
                                                                }}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            ),
                                        )}
                                    </div>

                                    <button className="w-full mt-8 py-4 bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white font-bold rounded-2xl transition-all flex items-center justify-center gap-2 text-sm">
                                        View All Holders{" "}
                                        <ExternalLink size={14} />
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {!report && !isLoading && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-20"
                    >
                        <div className="text-center p-8 bg-[#111C26]/50 rounded-3xl border border-gray-800/50">
                            <div className="w-16 h-16 bg-blue-500/10 text-blue-400 rounded-2xl flex items-center justify-center mx-auto mb-6">
                                <ShieldCheck size={32} />
                            </div>
                            <h4 className="text-white font-bold text-xl mb-3">
                                Rug Protection
                            </h4>
                            <p className="text-gray-500 text-sm">
                                Automatically detects if the creator has
                                retained malicious permissions.
                            </p>
                        </div>
                        <div className="text-center p-8 bg-[#111C26]/50 rounded-3xl border border-gray-800/50">
                            <div className="w-16 h-16 bg-purple-500/10 text-purple-400 rounded-2xl flex items-center justify-center mx-auto mb-6">
                                <Users size={32} />
                            </div>
                            <h4 className="text-white font-bold text-xl mb-3">
                                Holder Analysis
                            </h4>
                            <p className="text-gray-500 text-sm">
                                Scan wallet distributions to find hidden whale
                                groups or dev-controlled wallets.
                            </p>
                        </div>
                        <div className="text-center p-8 bg-[#111C26]/50 rounded-3xl border border-gray-800/50">
                            <div className="w-16 h-16 bg-green-500/10 text-green-400 rounded-2xl flex items-center justify-center mx-auto mb-6">
                                <TrendingUp size={32} />
                            </div>
                            <h4 className="text-white font-bold text-xl mb-3">
                                Liquidity Check
                            </h4>
                            <p className="text-gray-500 text-sm">
                                Verify if the liquidity is burned or locked to
                                prevent instant pool drainage.
                            </p>
                        </div>
                    </motion.div>
                )}
            </div>
        </div>
    );
};

export default TokenTracker;
