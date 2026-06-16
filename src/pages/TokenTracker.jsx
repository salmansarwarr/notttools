import React, { useState } from "react";
import { useTranslation } from "react-i18next";
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
import InsiderNetworkModal from "../components/Graph";

const TokenTracker = () => {
    const { t } = useTranslation();
    const [address, setAddress] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [report, setReport] = useState(null);
    const [showGraphModal, setShowGraphModal] = useState(false);

    const handleSearch = async (e) => {
        if (e) e.preventDefault();
        if (!address.trim()) {
            toast.error(t("enter_token_address"));
            return;
        }

        let mintPubkey;
        try {
            mintPubkey = new PublicKey(address.trim());
        } catch (err) {
            toast.error(t("invalid_address"));
            return;
        }

        setIsLoading(true);
        setReport(null);

        try {
            const rugCheckResponse = await fetch(
                `https://api.rugcheck.xyz/v1/tokens/${address}/report`,
            );

            if (rugCheckResponse.ok) {
                const data = await rugCheckResponse.json();

                const decimals = data.token?.decimals ?? 9;
                const normalizedReport = {
                    isManual: false,
                    mint: data.mint || address,
                    score: data.score ?? 0,
                    scoreNormalised:
                        data.score_normalised ??
                        Math.min(100, Math.round((data.score ?? 0) / 10)),
                    tokenMeta: data.tokenMeta || {
                        name: data.fileMeta?.name || "Unknown",
                        symbol: data.fileMeta?.symbol || "TOKEN",
                    },
                    tokenImage:
                        data.fileMeta?.image || data.tokenMeta?.image || null,
                    uiSupply: data.token?.supply
                        ? (
                              Number(data.token.supply) / Math.pow(10, decimals)
                          ).toLocaleString()
                        : "0",
                    creator: data.creator
                        ? data.creator.slice(0, 4) +
                          "..." +
                          data.creator.slice(-4)
                        : "Unknown",
                    fullCreator: data.creator || address,
                    uiCreatorBalance:
                        data.creatorBalance != null
                            ? (
                                  Number(data.creatorBalance) /
                                  Math.pow(10, decimals)
                              ).toLocaleString(undefined, {
                                  maximumFractionDigits: 2,
                              })
                            : "0",
                    uiMarketCap:
                        data.price && data.token?.supply
                            ? "$" +
                              (
                                  (Number(data.token.supply) /
                                      Math.pow(10, data.token.decimals || 0)) *
                                  Number(data.price)
                              ).toLocaleString(undefined, {
                                  maximumFractionDigits: 0,
                              })
                            : "$0",
                    uiTotalHolders: data.totalHolders
                        ? Number(data.totalHolders).toLocaleString()
                        : "1",
                    mintAuthorityStatus:
                        data.token?.mintAuthority != null
                            ? "Enabled"
                            : "Revoked",
                    freezeAuthorityStatus:
                        data.token?.freezeAuthority != null
                            ? "Enabled"
                            : "Revoked",
                    risks: data.risks || [],
                    markets: data.markets
                        ? data.markets.map((m) => ({
                              name: m.marketType
                                  ? m.marketType.toUpperCase()
                                  : "DEX",
                              status: m.rugged ? "Rugged" : "Active",
                              liquidity: m.lp?.lpLockedUSD
                                  ? "$" +
                                    Number(m.lp.lpLockedUSD).toLocaleString(
                                        undefined,
                                        { maximumFractionDigits: 0 },
                                    )
                                  : m.lp?.lpLockedPct
                                    ? `${m.lp.lpLockedPct}% Locked`
                                    : "Live",
                          }))
                        : null,
                    topHolders: data.topHolders
                        ? data.topHolders.map((h) => ({
                              address: h.address
                                  ? h.address.slice(0, 4) +
                                    "..." +
                                    h.address.slice(-4)
                                  : "Wallet",
                              fullAddress: h.address || "",
                              amount: h.uiAmountString
                                  ? Number(h.uiAmountString).toLocaleString(
                                        undefined,
                                        { maximumFractionDigits: 2 },
                                    )
                                  : (
                                        Number(h.amount) /
                                        Math.pow(10, decimals)
                                    ).toLocaleString(undefined, {
                                        maximumFractionDigits: 2,
                                    }),
                              pct: Number(h.pct || 0).toFixed(2) + "%",
                              pctWidth:
                                  Math.min(100, Number(h.pct || 0)).toFixed(2) +
                                  "%",
                              rawPct: Number(h.pct || 0),
                          }))
                        : [],
                    insiderNetworks:
                        data.insiderNetworks?.map((n) => ({
                            id: n.id,
                            size: n.size,
                            type: n.type,
                            tokenAmount: (
                                Number(n.tokenAmount) / Math.pow(10, decimals)
                            ).toLocaleString(undefined, {
                                maximumFractionDigits: 0,
                            }),
                            pct: (
                                (Number(n.tokenAmount) /
                                    Number(data.token.supply)) *
                                100
                            ).toFixed(2),
                            activeAccounts: n.activeAccounts,
                            walletAddresses: n.walletAddresses || [], // if API ever returns these
                        })) ?? [],
                    graphInsidersDetected: data.graphInsidersDetected ?? 0,
                };

                setReport(normalizedReport);
                setIsLoading(false);
                return;
            }

            throw new Error(t("rugcheck_unavailable"));
        } catch (error) {
            console.warn(
                t("rugcheck_failed_fallback"),
                error.message,
            );

            try {
                const connection = new Connection(
                    constants.network.endpoint,
                    "confirmed",
                );

                const mintInfo = await getMint(connection, mintPubkey);
                const largestAccounts =
                    await connection.getTokenLargestAccounts(mintPubkey);

                const risks = [];
                let score = 0;

                if (mintInfo.mintAuthority) {
                    risks.push({
                        name: t("mint_authority_enabled"),
                        level: "danger",
                        description:
                            t("mint_authority_enabled_desc"),
                    });
                    score += 400;
                } else {
                    risks.push({
                        name: t("mint_authority_revoked"),
                        level: "safe",
                        description:
                            t("mint_authority_revoked_desc"),
                    });
                }

                if (mintInfo.freezeAuthority) {
                    risks.push({
                        name: t("freeze_authority_enabled"),
                        level: "warning",
                        description:
                            t("freeze_authority_enabled_desc"),
                    });
                    score += 200;
                } else {
                    risks.push({
                        name: t("freeze_authority_revoked"),
                        level: "safe",
                        description:
                            t("freeze_authority_revoked_desc"),
                    });
                }

                const topHolders = largestAccounts.value.map((acc, idx) => {
                    const rawPct =
                        (Number(acc.amount) / Number(mintInfo.supply)) * 100;
                    const percentStr = rawPct.toFixed(2);
                    return {
                        address:
                            acc.address.toString().slice(0, 4) +
                            "..." +
                            acc.address.toString().slice(-4),
                        fullAddress: acc.address.toString(),
                        amount: (
                            Number(acc.amount) / Math.pow(10, mintInfo.decimals)
                        ).toLocaleString(undefined, {
                            maximumFractionDigits: 2,
                        }),
                        pct: percentStr + "%",
                        pctWidth: Math.min(100, rawPct).toFixed(2) + "%",
                        rawPct: rawPct,
                    };
                });

                if (topHolders[0] && topHolders[0].rawPct > 20) {
                    risks.push({
                        name: t("high_ownership_warning"),
                        level: "danger",
                        description: `A single wallet holds ${topHolders[0].pct} of the supply.`,
                    });
                    score += 250;
                }

                const onChainReport = {
                    isManual: true,
                    mint: address,
                    score: score,
                    scoreNormalised: Math.min(100, Math.round(score / 10)),
                    tokenMeta: {
                        name: t("on_chain_asset"),
                        symbol: "TOKEN",
                    },
                    tokenImage: null,
                    uiSupply: (
                        Number(mintInfo.supply) /
                        Math.pow(10, mintInfo.decimals)
                    ).toLocaleString(),
                    creator: t("on_chain_verify"),
                    fullCreator: address,
                    uiCreatorBalance: "Unknown",
                    uiMarketCap: "Fetching...",
                    uiTotalHolders: "N/A",
                    mintAuthorityStatus: mintInfo.mintAuthority
                        ? "Enabled"
                        : "Revoked",
                    freezeAuthorityStatus: mintInfo.freezeAuthority
                        ? "Enabled"
                        : "Revoked",
                    risks: risks.sort((a, b) =>
                        a.level === "danger" ? -1 : 1,
                    ),
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
        <div className="min-h-screen bg-[#0A151E] pt-20 md:pt-28 px-3 md:px-4 pb-12">
            <InsiderNetworkModal
                isOpen={showGraphModal}
                onClose={() => setShowGraphModal(false)}
                report={report}
            />
            <div className="max-w-7xl mx-auto">
                {/* Header Section */}
                <div className="text-center mb-8 md:mb-12">
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="inline-flex items-center gap-2 px-3 py-1.5 md:px-4 md:py-2 bg-blue-500/10 border border-blue-500/20 rounded-full text-blue-400 text-xs md:text-sm font-bold mb-4"
                    >
                        <ShieldCheck size={14} />
                        TOKEN SECURITY SCANNER
                    </motion.div>
                    <h1 className="text-3xl md:text-5xl font-black text-white mb-4 md:mb-6 tracking-tight">
                        {t("know_your")}{" "}
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">
                            Risk
                        </span>
                    </h1>
                    <p className="text-gray-400 text-sm md:text-lg max-w-2xl mx-auto mb-6 md:mb-10 px-2">
                        Analyze any Solana token for common rugs, honeypots, and
                        malicious permissions instantly.
                    </p>

                    {/* Search Bar */}
                    <form onSubmit={handleSearch} className="max-w-3xl mx-auto">
                        <div className="flex items-center gap-2 bg-[#111C26] border-2 border-gray-800 focus-within:border-blue-500 rounded-2xl px-4 py-3 md:py-4 transition-all shadow-2xl">
                            <Search
                                size={18}
                                className="text-gray-500 shrink-0"
                            />
                            <input
                                type="text"
                                value={address}
                                onChange={(e) => setAddress(e.target.value)}
                                placeholder={t("paste_mint_address")}
                                className="flex-1 bg-transparent text-white text-sm md:text-base outline-none placeholder-gray-600 min-w-0"
                            />
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 text-white font-bold px-5 py-2 rounded-xl transition-all flex items-center gap-2 text-sm shrink-0"
                            >
                                {isLoading ? (
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    "Analyze"
                                )}
                            </button>
                        </div>
                    </form>
                </div>

                <AnimatePresence mode="wait">
                    {report && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6"
                        >
                            {/* Token Overview — first on mobile */}
                            <div className="lg:col-span-1 space-y-4 md:space-y-6 order-1 lg:order-2">
                                <div className="bg-[#111C26] border border-gray-800 rounded-3xl p-4 md:p-6">
                                    <div className="flex items-center gap-3 md:gap-4 mb-6 md:mb-8">
                                        {report.tokenImage ? (
                                            <img
                                                src={report.tokenImage}
                                                alt={report.tokenMeta.symbol}
                                                onError={(e) => {
                                                    e.currentTarget.onerror =
                                                        null;
                                                    e.currentTarget.style.display =
                                                        "none";
                                                    e.currentTarget.nextSibling.style.display =
                                                        "flex";
                                                }}
                                                className="w-14 h-14 md:w-16 md:h-16 rounded-2xl object-cover shadow-lg shrink-0"
                                            />
                                        ) : null}
                                        <div
                                            className="w-14 h-14 md:w-16 md:h-16 bg-blue-600 rounded-2xl items-center justify-center text-white font-black text-2xl shadow-lg shadow-blue-500/20 shrink-0"
                                            style={{
                                                display: report.tokenImage
                                                    ? "none"
                                                    : "flex",
                                            }}
                                        >
                                            {report.tokenMeta.symbol.charAt(0)}
                                        </div>
                                        <div className="min-w-0">
                                            <h2 className="text-xl md:text-2xl font-bold text-white truncate">
                                                {report.tokenMeta.name}
                                            </h2>
                                            <p className="text-blue-400 font-bold text-sm md:text-base">
                                                ${report.tokenMeta.symbol}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="space-y-4 md:space-y-6">
                                        <div className="flex justify-between items-center pb-3 md:pb-4 border-b border-gray-800">
                                            <span className="text-gray-400 font-medium flex items-center gap-2 text-sm md:text-base">
                                                <TrendingUp size={15} /> Supply
                                            </span>
                                            <span className="text-white font-mono font-bold text-sm md:text-base">
                                                {report.uiSupply}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center pb-3 md:pb-4 border-b border-gray-800">
                                            <span className="text-gray-400 font-medium flex items-center gap-2 text-sm md:text-base">
                                                <Wallet size={15} /> Creator
                                            </span>
                                            <span
                                                onClick={() =>
                                                    window.open(
                                                        `https://solscan.io/account/${report.fullCreator}`,
                                                        "_blank",
                                                    )
                                                }
                                                className="text-blue-400 font-mono text-xs md:text-sm hover:underline cursor-pointer flex items-center gap-1"
                                            >
                                                {report.creator}{" "}
                                                <ExternalLink size={11} />
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center pb-3 md:pb-4 border-b border-gray-800">
                                            <span className="text-gray-400 font-medium flex items-center gap-2 text-sm md:text-base">
                                                <Lock size={15} /> Creator
                                                Balance
                                            </span>
                                            <span
                                                className={`font-bold text-sm md:text-base ${report.uiCreatorBalance === "0" || report.uiCreatorBalance === "Unknown" ? "text-green-400" : "text-yellow-400"}`}
                                            >
                                                {report.uiCreatorBalance}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center pb-3 md:pb-4 border-b border-gray-800">
                                            <span className="text-gray-400 font-medium flex items-center gap-2 text-sm md:text-base">
                                                <Zap size={15} /> Market Cap
                                            </span>
                                            <span className="text-white font-bold text-sm md:text-base">
                                                {report.uiMarketCap}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center pb-3 md:pb-4 border-b border-gray-800">
                                            <span className="text-gray-400 font-medium flex items-center gap-2 text-sm md:text-base">
                                                <Users size={15} /> Holders
                                            </span>
                                            <span className="text-white font-bold text-sm md:text-base">
                                                {report.uiTotalHolders}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center pb-3 md:pb-4 border-b border-gray-800">
                                            <span className="text-gray-400 font-medium flex items-center gap-2 text-sm md:text-base">
                                                <ShieldCheck size={15} /> Mint
                                                Authority
                                            </span>
                                            <span
                                                className={`font-bold text-sm md:text-base ${report.mintAuthorityStatus === "Enabled" ? "text-red-400" : "text-green-400"}`}
                                            >
                                                {report.mintAuthorityStatus}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-gray-400 font-medium flex items-center gap-2 text-sm md:text-base">
                                                <Lock size={15} /> Freeze
                                                Authority
                                            </span>
                                            <span
                                                className={`font-bold text-sm md:text-base ${report.freezeAuthorityStatus === "Enabled" ? "text-red-400" : "text-green-400"}`}
                                            >
                                                {report.freezeAuthorityStatus}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-[#111C26] border border-gray-800 rounded-3xl p-4 md:p-6 relative overflow-hidden group">
                                    {/* <div className="absolute top-3 right-3 bg-yellow-500/20 text-yellow-500 text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-widest">
                                        Beta
                                    </div> */}
                                    <h3 className="text-white font-bold text-lg md:text-xl mb-4">
                                        Insider Networks
                                    </h3>

                                    {report.insiderNetworks?.length > 0 && (
                                        <button
                                            onClick={() =>
                                                setShowGraphModal(true)
                                            }
                                            className="text-xs text-blue-400 hover:text-blue-300 font-bold flex items-center gap-1 mb-4"
                                        >
                                            View Network Map
                                        </button>
                                    )}
                                    {report.insiderNetworks &&
                                    report.insiderNetworks.length > 0 ? (
                                        <div className="space-y-3">
                                            <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-2xl mb-4">
                                                <AlertTriangle
                                                    className="text-red-400 shrink-0"
                                                    size={18}
                                                />
                                                <p className="text-red-400 font-bold text-xs uppercase tracking-wider">
                                                    {
                                                        report.graphInsidersDetected
                                                    }{" "}
                                                    insider wallets detected
                                                </p>
                                            </div>
                                            {report.insiderNetworks.map(
                                                (network, idx) => (
                                                    <div
                                                        key={idx}
                                                        className="p-3 bg-gray-900/60 border border-gray-800 rounded-xl"
                                                    >
                                                        <div className="flex justify-between items-center mb-1">
                                                            <span className="text-gray-300 font-mono text-xs truncate max-w-[60%]">
                                                                {network.id}
                                                            </span>
                                                            <span className="text-red-400 font-bold text-xs">
                                                                {network.pct}%
                                                            </span>
                                                        </div>
                                                        <div className="flex gap-3 text-[11px] text-gray-500 mt-1">
                                                            <span>
                                                                {
                                                                    network.activeAccounts
                                                                }{" "}
                                                                wallets
                                                            </span>
                                                            <span>·</span>
                                                            <span>
                                                                {
                                                                    network.tokenAmount
                                                                }{" "}
                                                                tokens
                                                            </span>
                                                            <span>·</span>
                                                            <span className="capitalize">
                                                                {network.type}
                                                            </span>
                                                        </div>
                                                        <div className="w-full bg-gray-800 h-1 rounded-full mt-2 overflow-hidden">
                                                            <div
                                                                className="h-full bg-red-500"
                                                                style={{
                                                                    width: `${Math.min(100, parseFloat(network.pct))}%`,
                                                                }}
                                                            />
                                                        </div>
                                                    </div>
                                                ),
                                            )}
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-3 p-3 md:p-4 bg-green-500/5 border border-green-500/20 rounded-2xl">
                                            <CheckCircle2
                                                className="text-green-400 shrink-0"
                                                size={22}
                                            />
                                            <p className="text-green-400 font-bold uppercase text-xs tracking-wider">
                                                No insider networks detected
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Risk Analysis — second on mobile */}
                            <div className="lg:col-span-1 space-y-4 md:space-y-6 order-2 lg:order-1">
                                <div className="bg-[#111C26] border border-gray-800 rounded-3xl p-4 md:p-6 overflow-hidden relative">
                                    <div className="flex justify-between items-center mb-4 md:mb-6">
                                        <h3 className="text-white font-bold text-lg md:text-xl">
                                            Risk Analysis
                                        </h3>
                                        <div className="text-right">
                                            <span
                                                className={`text-xl md:text-2xl font-black ${getScoreColor(report.score)}`}
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
                                        className={`text-center py-7 md:py-10 mb-4 md:mb-6 border-2 rounded-2xl ${report.score > 400 ? "border-red-500/50 bg-red-500/5" : "border-green-500/50 bg-green-500/5"}`}
                                    >
                                        <h2
                                            className={`text-4xl md:text-5xl font-black uppercase tracking-widest ${getScoreColor(report.score)}`}
                                        >
                                            {getStatusText(report.score)}
                                        </h2>
                                    </div>

                                    <div className="space-y-2 md:space-y-3">
                                        {report.risks.map((risk, idx) => (
                                            <div
                                                key={idx}
                                                className={`flex items-center gap-3 p-3 border rounded-xl ${getRiskLevelClass(risk.level)}`}
                                            >
                                                <div className="shrink-0">
                                                    {risk.level === "danger" ? (
                                                        <ShieldAlert
                                                            size={16}
                                                        />
                                                    ) : risk.level ===
                                                          "warning" ||
                                                      risk.level === "warn" ? (
                                                        <Shield size={16} />
                                                    ) : (
                                                        <ShieldCheck
                                                            size={16}
                                                        />
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-bold text-xs md:text-sm truncate">
                                                        {risk.name}
                                                    </p>
                                                </div>
                                                <div
                                                    className="text-white/40 cursor-help shrink-0"
                                                    title={risk.description}
                                                >
                                                    <Info size={15} />
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

                                <div className="bg-[#111C26] border border-gray-800 rounded-3xl p-4 md:p-6">
                                    <h3 className="text-white font-bold text-lg md:text-xl mb-4 md:mb-6">
                                        Markets
                                    </h3>
                                    <div className="space-y-3 md:space-y-4">
                                        {report.markets &&
                                            report.markets.map(
                                                (market, idx) => (
                                                    <div
                                                        key={idx}
                                                        className="flex items-center justify-between p-3 md:p-4 bg-gray-900/50 rounded-2xl border border-gray-800"
                                                    >
                                                        <div>
                                                            <p className="text-white font-bold text-sm md:text-base">
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

                            {/* Right Column - Top Holders */}
                            <div className="lg:col-span-1 order-3">
                                <div className="bg-[#111C26] border border-gray-800 rounded-3xl p-4 md:p-6 h-full flex flex-col">
                                    <div className="flex justify-between items-center mb-4 md:mb-6">
                                        <h3 className="text-white font-bold text-lg md:text-xl">
                                            Top Holders
                                        </h3>
                                        <span className="text-gray-500 text-xs md:text-sm font-bold">
                                            TOP 5 SHOWN
                                        </span>
                                    </div>

                                    <div className="flex-1 space-y-3 md:space-y-4">
                                        {/* Header row */}
                                        <div className="grid grid-cols-12 gap-1 text-[9px] md:text-[10px] font-black text-gray-500 uppercase tracking-widest pb-2 border-b border-gray-800">
                                            <div className="col-span-5">
                                                Account
                                            </div>
                                            <div className="col-span-4 text-right">
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
                                                    className="grid grid-cols-12 gap-1 items-center group"
                                                >
                                                    {/* Account */}
                                                    <div className="col-span-5 flex items-center gap-1 min-w-0">
                                                        <span
                                                            onClick={() =>
                                                                window.open(
                                                                    `https://solscan.io/account/${holder.fullAddress}`,
                                                                    "_blank",
                                                                )
                                                            }
                                                            className="text-blue-400 font-mono text-xs group-hover:underline cursor-pointer truncate"
                                                        >
                                                            {holder.address}
                                                        </span>
                                                        <span className="bg-orange-500/20 text-orange-400 text-[7px] px-1 py-0.5 rounded font-black uppercase shrink-0 hidden sm:inline">
                                                            TOP
                                                        </span>
                                                    </div>

                                                    {/* Amount — truncated */}
                                                    <div className="col-span-4 text-right text-gray-400 font-mono text-xs truncate">
                                                        {Number(
                                                            holder.amount.replace(
                                                                /,/g,
                                                                "",
                                                            ),
                                                        ).toLocaleString(
                                                            undefined,
                                                            {
                                                                notation:
                                                                    "compact",
                                                                maximumFractionDigits: 2,
                                                            },
                                                        )}
                                                    </div>

                                                    {/* Percentage + bar */}
                                                    <div className="col-span-3 text-right">
                                                        <div className="text-white font-bold font-mono text-xs">
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

                                    <a
                                        target="_blank"
                                        href={`https://solscan.io/token/${report.mint}`}
                                        className="w-full mt-6 md:mt-8 py-3 md:py-4 bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white font-bold rounded-2xl transition-all flex items-center justify-center gap-2 text-sm"
                                    >
                                        View All Holders{" "}
                                        <ExternalLink size={13} />
                                    </a>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {!report && !isLoading && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-8 mt-12 md:mt-20"
                    >
                        <div className="text-center p-5 md:p-8 bg-[#111C26]/50 rounded-3xl border border-gray-800/50">
                            <div className="w-14 h-14 md:w-16 md:h-16 bg-blue-500/10 text-blue-400 rounded-2xl flex items-center justify-center mx-auto mb-4 md:mb-6">
                                <ShieldCheck size={28} />
                            </div>
                            <h4 className="text-white font-bold text-lg md:text-xl mb-2 md:mb-3">
                                Rug Protection
                            </h4>
                            <p className="text-gray-500 text-sm">
                                Automatically detects if the creator has
                                retained malicious permissions.
                            </p>
                        </div>
                        <div className="text-center p-5 md:p-8 bg-[#111C26]/50 rounded-3xl border border-gray-800/50">
                            <div className="w-14 h-14 md:w-16 md:h-16 bg-purple-500/10 text-purple-400 rounded-2xl flex items-center justify-center mx-auto mb-4 md:mb-6">
                                <Users size={28} />
                            </div>
                            <h4 className="text-white font-bold text-lg md:text-xl mb-2 md:mb-3">
                                Holder Analysis
                            </h4>
                            <p className="text-gray-500 text-sm">
                                Scan wallet distributions to find hidden whale
                                groups or dev-controlled wallets.
                            </p>
                        </div>
                        <div className="text-center p-5 md:p-8 bg-[#111C26]/50 rounded-3xl border border-gray-800/50">
                            <div className="w-14 h-14 md:w-16 md:h-16 bg-green-500/10 text-green-400 rounded-2xl flex items-center justify-center mx-auto mb-4 md:mb-6">
                                <TrendingUp size={28} />
                            </div>
                            <h4 className="text-white font-bold text-lg md:text-xl mb-2 md:mb-3">
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
