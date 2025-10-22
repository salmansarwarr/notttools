import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useUnifiedWallet } from "../hooks/useUnifiedWallet";
import { useGlobalState } from "../hooks/useGlobalState";
import { useBondingCurveFlow } from "../hooks/useSolanaTokenFlow";
import { PublicKey } from "@solana/web3.js";
import constants from "../constants";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const IS_MAINNET = true;

const TokenDetail = () => {
    const { mintAddress } = useParams();
    const navigate = useNavigate();
    const wallet = useUnifiedWallet();
    const { globalState } = useGlobalState();
    const {
        buyTokens,
        sellTokens,
        getPriceQuote,
        getBondingCurveInfo,
        batchUpdateData,
        checkUnlockConditions,
        unlockFirstBuyerTokens,
    } = useBondingCurveFlow();

    const [tokenData, setTokenData] = useState(null);
    const [bondingCurveInfo, setBondingCurveInfo] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("trade");
    const [isFetchingQuote, setIsFetchingQuote] = useState(false);

    // Trade states
    const [tradeMode, setTradeMode] = useState("buy");
    const [tradeAmount, setTradeAmount] = useState("");
    const [slippage, setSlippage] = useState("1");
    const [isTrading, setIsTrading] = useState(false);
    const [tradeQuote, setTradeQuote] = useState(null);

    // First buyer lock states
    const [isCheckingUnlock, setIsCheckingUnlock] = useState(false);
    const [isUnlocking, setIsUnlocking] = useState(false);

    useEffect(() => {
        fetchTokenData();
    }, [mintAddress]);

    useEffect(() => {
        if (mintAddress) {
            fetchBondingCurveInfo();
            const interval = setInterval(fetchBondingCurveInfo, 10000);
            return () => clearInterval(interval);
        }
    }, [mintAddress]);

    useEffect(() => {
        const timer = setTimeout(() => {
            if (tradeAmount && parseFloat(tradeAmount) > 0) {
                fetchQuote();
            } else {
                setTradeQuote(null);
            }
        }, 500);

        return () => clearTimeout(timer);
    }, [tradeAmount, tradeMode, slippage]);

    const fetchTokenData = async () => {
        try {
            setIsLoading(true);
            const response = await fetch(
                `${constants.backend_url}/items/projects?filter[contract_address][_eq]=${mintAddress}`
            );
            const data = await response.json();

            if (data.data && data.data.length > 0) {
                setTokenData(data.data[0]);
            } else {
                toast.error("Token not found in database");
            }
        } catch (error) {
            console.error("Error fetching token data:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchBondingCurveInfo = async () => {
        try {
            const mint = new PublicKey(mintAddress);
            const info = await getBondingCurveInfo(mint);
            setBondingCurveInfo(info);
        } catch (error) {
            console.error("Error fetching bonding curve info:", error);
        }
    };

    const fetchQuote = async () => {
        try {
            setIsFetchingQuote(true);
            const mint = new PublicKey(mintAddress);
            const amount = parseFloat(tradeAmount);
            const slippageBps = parseFloat(slippage) * 100;

            const quote = await getPriceQuote(
                mint,
                amount,
                tradeMode === "buy"
            );
            setTradeQuote(quote);
        } catch (error) {
            console.error("Error fetching quote:", error);
            setTradeQuote(null);
        } finally {
            setIsFetchingQuote(false);
        }
    };

    const executeTrade = async () => {
        if (!wallet.connected) {
            toast.warning("Please connect your wallet first");
            return;
        }

        if (!tradeQuote) {
            toast.warning("Please enter a valid amount");
            return;
        }

        try {
            setIsTrading(true);
            const mint = new PublicKey(mintAddress);
            const amount = parseFloat(tradeAmount);
            const slippageBps = parseFloat(slippage) * 100;

            if (tradeMode === "buy") {
                const result = await buyTokens(mint, amount, slippageBps);

                // Check if this was the first buy
                if (result?.isFirstBuy) {
                    toast.info(
                        "🔒 You're the first buyer! Your tokens are locked until unlock conditions are met.",
                        {
                            autoClose: 8000,
                        }
                    );
                }
            } else {
                await sellTokens(mint, amount, slippageBps);
            }

            setTradeAmount("");
            setTradeQuote(null);

            // Refresh bonding curve info after successful trade
            setTimeout(() => {
                fetchBondingCurveInfo();
            }, 2000);
        } catch (error) {
            console.error("Trade failed:", error);
            // Toast already shown in buyTokens/sellTokens functions
        } finally {
            setIsTrading(false);
        }
    };

    const handleCheckUnlock = async () => {
        if (!wallet.connected) {
            toast.warning("Please connect your wallet first");
            return;
        }

        try {
            setIsCheckingUnlock(true);
            const mint = new PublicKey(mintAddress);
            await checkUnlockConditions(mint);

            // Refresh bonding curve info
            setTimeout(() => {
                fetchBondingCurveInfo();
            }, 2000);
        } catch (error) {
            console.error("Check unlock failed:", error);
        } finally {
            setIsCheckingUnlock(false);
        }
    };

    const handleUnlock = async () => {
        if (!wallet.connected) {
            toast.warning("Please connect your wallet first");
            return;
        }

        try {
            setIsUnlocking(true);
            const mint = new PublicKey(mintAddress);
            await unlockFirstBuyerTokens(mint);

            // Refresh bonding curve info
            setTimeout(() => {
                fetchBondingCurveInfo();
            }, 2000);
        } catch (error) {
            console.error("Unlock failed:", error);
        } finally {
            setIsUnlocking(false);
        }
    };

    const isFirstBuyer =
        wallet.connected &&
        bondingCurveInfo?.firstBuyer &&
        bondingCurveInfo.firstBuyer === wallet.publicKey?.toString();

    if (isLoading) {
        return (
            <div className="min-h-screen bg-[#0A151E] pt-28 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-500 mx-auto mb-4"></div>
                    <p className="text-gray-400 text-lg">
                        Loading token data...
                    </p>
                    <p className="text-gray-500 text-sm mt-2">Please wait</p>
                </div>
            </div>
        );
    }

    if (!tokenData) {
        return (
            <div className="min-h-screen bg-[#0A151E] pt-28 flex items-center justify-center">
                <div className="text-center bg-[#192630] rounded-2xl p-8 border border-gray-700 max-w-md">
                    <svg
                        className="w-20 h-20 text-red-400 mx-auto mb-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                    </svg>
                    <p className="text-red-400 mb-4 text-xl font-semibold">
                        Token Not Found
                    </p>
                    <p className="text-gray-400 mb-6">
                        The token you're looking for doesn't exist or hasn't
                        been indexed yet.
                    </p>
                    <button
                        onClick={() => navigate("/")}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                    >
                        Go Home
                    </button>
                </div>
            </div>
        );
    }

    const currentPrice = bondingCurveInfo
        ? bondingCurveInfo.price < 0.1
            ? bondingCurveInfo.price.toFixed(8)
            : bondingCurveInfo.price.toFixed(4)
        : 0;

    return (
        <div className="min-h-screen bg-[#0A151E] pt-28 px-4 pb-8">
            <ToastContainer
                position="top-right"
                autoClose={5000}
                hideProgressBar={false}
                newestOnTop
                closeOnClick
                rtl={false}
                pauseOnFocusLoss
                draggable
                pauseOnHover
                theme="dark"
            />

            <div className="max-w-7xl mx-auto">
                {/* Token Header */}
                <div className="bg-[#192630] rounded-2xl p-6 mb-6 border border-gray-700">
                    <div className="flex items-center justify-between flex-wrap gap-4">
                        <div className="flex items-center gap-4">
                            {tokenData.logo && (
                                <img
                                    src={`${constants.backend_url}/assets/${tokenData.logo}`}
                                    alt={tokenData.name}
                                    className="w-16 h-16 rounded-full"
                                />
                            )}
                            <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                    <h1 className="text-3xl font-bold text-white">
                                        {tokenData.name}
                                    </h1>
                                    {bondingCurveInfo?.isMigrated && (
                                        <span className="bg-purple-500/20 text-purple-400 text-xs font-semibold px-3 py-1 rounded-full border border-purple-500/30">
                                            MIGRATED TO RAYDIUM
                                        </span>
                                    )}
                                    {bondingCurveInfo?.firstBuyerLockActive && (
                                        <span className="bg-orange-500/20 text-orange-400 text-xs font-semibold px-3 py-1 rounded-full border border-orange-500/30">
                                            🔒 FIRST BUYER LOCKED
                                        </span>
                                    )}
                                </div>
                                <p className="text-gray-400">
                                    ${tokenData.symbol}
                                </p>
                            </div>
                        </div>

                        <div className="text-right">
                            <p className="text-2xl font-bold text-white">
                                ${currentPrice}
                            </p>
                            {bondingCurveInfo && (
                                <p className="text-sm text-gray-400">
                                    Market Cap: ${" "}
                                    {bondingCurveInfo?.marketCap
                                        ? bondingCurveInfo.marketCap >= 1e6
                                            ? `$${(
                                                  bondingCurveInfo.marketCap /
                                                  1e6
                                              ).toFixed(2)}M`
                                            : bondingCurveInfo.marketCap >= 1e3
                                            ? `$${(
                                                  bondingCurveInfo.marketCap /
                                                  1e3
                                              ).toFixed(2)}K`
                                            : `$${bondingCurveInfo.marketCap.toFixed(
                                                  2
                                              )}`
                                        : "—"}
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Bonding Curve Progress */}
                    {bondingCurveInfo && !bondingCurveInfo.isMigrated && (
                        <div className="mt-6">
                            <div className="flex justify-between text-sm text-gray-400 mb-2">
                                <span>Migration Progress</span>
                                <span className="text-white font-semibold">
                                    {bondingCurveInfo.progress.toFixed(1)}%
                                </span>
                            </div>
                            <div className="w-full bg-gray-700 rounded-full h-3">
                                <div
                                    className="bg-gradient-to-r from-blue-500 to-purple-600 h-3 rounded-full transition-all"
                                    style={{
                                        width: `${bondingCurveInfo.progress}%`,
                                    }}
                                ></div>
                            </div>
                            <div className="flex justify-between text-xs text-gray-500 mt-2">
                                <span>
                                    {bondingCurveInfo.realSolReserves.toFixed(
                                        2
                                    )}{" "}
                                    SOL collected
                                </span>
                                <span>
                                    {bondingCurveInfo.migrationThreshold.toFixed(
                                        0
                                    )}{" "}
                                    SOL needed
                                </span>
                            </div>
                        </div>
                    )}

                    {/* Token Stats */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                        <div className="bg-gray-800/50 rounded-lg p-4">
                            <p className="text-gray-400 text-sm mb-1">
                                Total Reserves
                            </p>
                            <p className="text-white font-semibold">
                                {bondingCurveInfo?.totalSolReserves.toFixed(
                                    2
                                ) || "—"}{" "}
                                SOL
                            </p>
                        </div>
                        <div className="bg-gray-800/50 rounded-lg p-4">
                            <p className="text-gray-400 text-sm mb-1">
                                Tokens in Curve
                            </p>
                            <p className="text-white font-semibold">
                                {bondingCurveInfo
                                    ? (
                                          bondingCurveInfo.realTokenReserves /
                                          1e6
                                      ).toFixed(2) + "M"
                                    : "—"}
                            </p>
                        </div>
                        <div className="bg-gray-800/50 rounded-lg p-4">
                            <p className="text-gray-400 text-sm mb-1">
                                Total Supply
                            </p>
                            <p className="text-white font-semibold">
                                {bondingCurveInfo
                                    ? (
                                          bondingCurveInfo.totalSupply / 1e6
                                      ).toFixed(2) + "M"
                                    : "—"}
                            </p>
                        </div>
                        <div className="bg-gray-800/50 rounded-lg p-4">
                            <p className="text-gray-400 text-sm mb-1">Status</p>
                            <p
                                className={`font-semibold ${
                                    bondingCurveInfo?.isMigrated
                                        ? "text-purple-400"
                                        : "text-green-400"
                                }`}
                            >
                                {bondingCurveInfo?.isMigrated
                                    ? "🏊 Migrated"
                                    : "📈 Active"}
                            </p>
                        </div>
                    </div>
                </div>

                {/* ============================================ */}
                {/* GMGN CHART SECTION - ADD THIS HERE */}
                {/* ============================================ */}
                {IS_MAINNET && (
                    <div className="bg-[#192630] rounded-2xl border border-gray-700 overflow-hidden mb-6">
                        {/* Chart Container */}
                        <div
                            className="relative bg-[#0A151E]"
                            style={{ height: "600px" }}
                        >
                            <iframe
                                src={`https://www.gmgn.cc/kline/sol/${mintAddress}`}
                                className="w-full h-full border-0"
                                title="GMGN Price Chart"
                                allow="clipboard-read; clipboard-write"
                                loading="lazy"
                            />
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Trade Section */}
                    <div className="lg:col-span-2">
                        <div className="bg-[#192630] rounded-2xl border border-gray-700 overflow-hidden">
                            {/* Tabs */}
                            <div className="flex border-b border-gray-700">
                                <button
                                    onClick={() => setActiveTab("trade")}
                                    className={`flex-1 py-4 px-6 font-semibold transition-colors ${
                                        activeTab === "trade"
                                            ? "bg-blue-600 text-white"
                                            : "text-gray-400 hover:text-white hover:bg-gray-800"
                                    }`}
                                >
                                    {bondingCurveInfo?.isMigrated
                                        ? "Trade on Raydium"
                                        : "Trade on Curve"}
                                </button>
                                <button
                                    onClick={() => setActiveTab("info")}
                                    className={`flex-1 py-4 px-6 font-semibold transition-colors ${
                                        activeTab === "info"
                                            ? "bg-blue-600 text-white"
                                            : "text-gray-400 hover:text-white hover:bg-gray-800"
                                    }`}
                                >
                                    Curve Info
                                </button>
                            </div>

                            {/* Content */}
                            <div className="p-6">
                                {activeTab === "trade" ? (
                                    bondingCurveInfo?.isMigrated ? (
                                        // Migrated - Show Raydium link
                                        <div className="text-center py-12">
                                            <div className="bg-purple-900/20 border border-purple-600/30 rounded-lg p-8 max-w-md mx-auto">
                                                <svg
                                                    className="w-16 h-16 text-purple-400 mx-auto mb-4"
                                                    fill="currentColor"
                                                    viewBox="0 0 20 20"
                                                >
                                                    <path
                                                        fillRule="evenodd"
                                                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                                        clipRule="evenodd"
                                                    />
                                                </svg>
                                                <h3 className="text-purple-300 font-semibold text-xl mb-2">
                                                    Token Migrated to Raydium!
                                                </h3>
                                                <p className="text-purple-200 text-sm mb-6">
                                                    This token has successfully
                                                    reached its migration
                                                    threshold and is now trading
                                                    on Raydium DEX.
                                                </p>
                                                <a
                                                    href={`https://raydium.io/swap/?inputCurrency=sol&outputCurrency=${mintAddress}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                                                >
                                                    <svg
                                                        className="w-5 h-5"
                                                        fill="none"
                                                        stroke="currentColor"
                                                        viewBox="0 0 24 24"
                                                    >
                                                        <path
                                                            strokeLinecap="round"
                                                            strokeLinejoin="round"
                                                            strokeWidth="2"
                                                            d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                                                        />
                                                    </svg>
                                                    Trade on Raydium
                                                </a>
                                            </div>
                                        </div>
                                    ) : (
                                        // Active bonding curve - Show trade interface
                                        <div className="space-y-6">
                                            {/* Trade Mode Selector */}
                                            <div className="flex gap-2 bg-gray-800 rounded-lg p-1">
                                                <button
                                                    onClick={() =>
                                                        setTradeMode("buy")
                                                    }
                                                    className={`flex-1 py-3 rounded-md font-semibold transition-colors ${
                                                        tradeMode === "buy"
                                                            ? "bg-green-600 text-white"
                                                            : "text-gray-400 hover:text-white"
                                                    }`}
                                                >
                                                    Buy
                                                </button>
                                                <button
                                                    onClick={() =>
                                                        setTradeMode("sell")
                                                    }
                                                    className={`flex-1 py-3 rounded-md font-semibold transition-colors ${
                                                        tradeMode === "sell"
                                                            ? "bg-red-600 text-white"
                                                            : "text-gray-400 hover:text-white"
                                                    }`}
                                                >
                                                    Sell
                                                </button>
                                            </div>

                                            {/* Amount Input */}
                                            <div>
                                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                                    {tradeMode === "buy"
                                                        ? "Amount (SOL)"
                                                        : `Amount (${tokenData.symbol})`}
                                                </label>
                                                <div className="relative">
                                                    <input
                                                        type="number"
                                                        value={tradeAmount}
                                                        onChange={(e) =>
                                                            setTradeAmount(
                                                                e.target.value
                                                            )
                                                        }
                                                        className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                                        placeholder="0.0"
                                                        step="0.01"
                                                        disabled={isTrading}
                                                    />
                                                    {isFetchingQuote && (
                                                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                                                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Slippage */}
                                            <div>
                                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                                    Slippage Tolerance (%)
                                                </label>
                                                <div className="flex gap-2">
                                                    {["0.5", "1", "2", "5"].map(
                                                        (value) => (
                                                            <button
                                                                key={value}
                                                                onClick={() =>
                                                                    setSlippage(
                                                                        value
                                                                    )
                                                                }
                                                                disabled={
                                                                    isTrading
                                                                }
                                                                className={`flex-1 py-2 rounded-lg font-medium transition-colors ${
                                                                    slippage ===
                                                                    value
                                                                        ? "bg-blue-600 text-white"
                                                                        : "bg-gray-800 text-gray-400 hover:text-white"
                                                                } disabled:opacity-50 disabled:cursor-not-allowed`}
                                                            >
                                                                {value}%
                                                            </button>
                                                        )
                                                    )}
                                                </div>
                                            </div>

                                            {/* Quote Display */}
                                            {tradeQuote && !isFetchingQuote && (
                                                <div className="bg-gray-800/50 rounded-lg p-4 space-y-2 border border-gray-700">
                                                    <div className="flex justify-between text-sm">
                                                        <span className="text-gray-400">
                                                            You{" "}
                                                            {tradeMode === "buy"
                                                                ? "pay"
                                                                : "receive"}
                                                        </span>
                                                        <span className="text-white font-semibold">
                                                            {tradeQuote.input.toFixed(
                                                                6
                                                            )}{" "}
                                                            {tradeMode === "buy"
                                                                ? "SOL"
                                                                : tokenData.symbol}
                                                        </span>
                                                    </div>
                                                    <div className="flex justify-between text-sm">
                                                        <span className="text-gray-400">
                                                            You{" "}
                                                            {tradeMode === "buy"
                                                                ? "receive"
                                                                : "pay"}
                                                        </span>
                                                        <span className="text-white font-semibold">
                                                            {tradeQuote.output.toFixed(
                                                                6
                                                            )}{" "}
                                                            {tradeMode === "buy"
                                                                ? tokenData.symbol
                                                                : "SOL"}
                                                        </span>
                                                    </div>
                                                    <div className="flex justify-between text-sm">
                                                        <span className="text-gray-400">
                                                            Price per token
                                                        </span>
                                                        <span className="text-white font-semibold">
                                                            $
                                                            {tradeQuote.pricePerToken.toFixed(
                                                                8
                                                            )}
                                                        </span>
                                                    </div>
                                                    <div className="flex justify-between text-sm pt-2 border-t border-gray-700">
                                                        <span className="text-gray-400">
                                                            Price Impact
                                                        </span>
                                                        <span
                                                            className={`font-semibold ${
                                                                tradeQuote.priceImpact >
                                                                5
                                                                    ? "text-red-400"
                                                                    : tradeQuote.priceImpact >
                                                                      2
                                                                    ? "text-yellow-400"
                                                                    : "text-green-400"
                                                            }`}
                                                        >
                                                            {tradeQuote.priceImpact.toFixed(
                                                                2
                                                            )}
                                                            %
                                                        </span>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Loading Quote */}
                                            {isFetchingQuote && (
                                                <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
                                                    <div className="flex items-center justify-center gap-2 text-gray-400">
                                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                                                        <span className="text-sm">
                                                            Calculating quote...
                                                        </span>
                                                    </div>
                                                </div>
                                            )}

                                            {/* First Buy Warning */}
                                            {tradeMode === "buy" &&
                                                !bondingCurveInfo?.firstBuyer && (
                                                    <div className="bg-orange-900/20 border border-orange-600/30 rounded-lg p-4">
                                                        <div className="flex gap-2">
                                                            <svg
                                                                className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5"
                                                                fill="currentColor"
                                                                viewBox="0 0 20 20"
                                                            >
                                                                <path
                                                                    fillRule="evenodd"
                                                                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                                                                    clipRule="evenodd"
                                                                />
                                                            </svg>
                                                            <div>
                                                                <h4 className="text-orange-300 font-semibold text-sm mb-1">
                                                                    First Buyer
                                                                    Lock
                                                                </h4>
                                                                <p className="text-orange-200 text-xs">
                                                                    The first
                                                                    buyer's
                                                                    tokens will
                                                                    be locked
                                                                    until{" "}
                                                                    {
                                                                        bondingCurveInfo?.holderThreshold
                                                                    }{" "}
                                                                    holders and
                                                                    $
                                                                    {
                                                                        bondingCurveInfo?.volumeThreshold
                                                                    }{" "}
                                                                    trading
                                                                    volume is
                                                                    reached.
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}

                                            {/* Trade Button */}
                                            <button
                                                onClick={executeTrade}
                                                disabled={
                                                    !wallet.connected ||
                                                    !tradeQuote ||
                                                    isTrading ||
                                                    isFetchingQuote
                                                }
                                                className={`w-full py-4 rounded-lg font-bold transition-all flex items-center justify-center gap-2 ${
                                                    tradeMode === "buy"
                                                        ? "bg-green-600 hover:bg-green-700"
                                                        : "bg-red-600 hover:bg-red-700"
                                                } text-white disabled:bg-gray-600 disabled:cursor-not-allowed disabled:opacity-50`}
                                            >
                                                {isTrading ? (
                                                    <>
                                                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                                                        <span>
                                                            Processing...
                                                        </span>
                                                    </>
                                                ) : !wallet.connected ? (
                                                    "Connect Wallet"
                                                ) : isFetchingQuote ? (
                                                    "Calculating..."
                                                ) : (
                                                    <>
                                                        {tradeMode === "buy"
                                                            ? "Buy Tokens"
                                                            : "Sell Tokens"}
                                                    </>
                                                )}
                                            </button>

                                            {/* Warning for high price impact */}
                                            {tradeQuote &&
                                                tradeQuote.priceImpact > 5 && (
                                                    <div className="bg-yellow-900/20 border border-yellow-600/30 rounded-lg p-4">
                                                        <div className="flex gap-2">
                                                            <svg
                                                                className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5"
                                                                fill="currentColor"
                                                                viewBox="0 0 20 20"
                                                            >
                                                                <path
                                                                    fillRule="evenodd"
                                                                    d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                                                                    clipRule="evenodd"
                                                                />
                                                            </svg>
                                                            <div>
                                                                <h4 className="text-yellow-300 font-semibold text-sm mb-1">
                                                                    High Price
                                                                    Impact
                                                                    Warning
                                                                </h4>
                                                                <p className="text-yellow-200 text-xs">
                                                                    This trade
                                                                    will have a
                                                                    significant
                                                                    price impact
                                                                    (
                                                                    {tradeQuote.priceImpact.toFixed(
                                                                        2
                                                                    )}
                                                                    %). Consider
                                                                    reducing
                                                                    your trade
                                                                    size.
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}

                                            {/* Info Note */}
                                            <div className="bg-blue-900/20 border border-blue-600/30 rounded-lg p-4">
                                                <p className="text-blue-200 text-xs">
                                                    💡 Trading on bonding curve
                                                    with automated price
                                                    discovery. Price increases
                                                    as more SOL is deposited. At{" "}
                                                    {bondingCurveInfo?.migrationThreshold ||
                                                        85}{" "}
                                                    SOL, token automatically
                                                    migrates to Raydium.
                                                </p>
                                            </div>
                                        </div>
                                    )
                                ) : (
                                    // Curve Info Tab
                                    <div className="space-y-6">
                                        <div className="bg-gradient-to-br from-blue-900/20 to-purple-900/20 border border-blue-600/30 rounded-lg p-6">
                                            <h3 className="text-blue-300 font-semibold text-lg mb-4">
                                                📊 Bonding Curve Mechanics
                                            </h3>
                                            <div className="space-y-4 text-sm">
                                                <div>
                                                    <p className="text-gray-400 mb-1">
                                                        Pricing Model
                                                    </p>
                                                    <p className="text-white">
                                                        Constant Product (x * y
                                                        = k)
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="text-gray-400 mb-1">
                                                        Virtual Liquidity
                                                    </p>
                                                    <p className="text-white">
                                                        {bondingCurveInfo?.virtualSolReserves.toFixed(
                                                            2
                                                        )}{" "}
                                                        SOL /{" "}
                                                        {bondingCurveInfo
                                                            ? (
                                                                  bondingCurveInfo.virtualTokenReserves /
                                                                  1e9
                                                              ).toFixed(2)
                                                            : "—"}
                                                        B tokens
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="text-gray-400 mb-1">
                                                        Real Reserves
                                                    </p>
                                                    <p className="text-white">
                                                        {bondingCurveInfo?.realSolReserves.toFixed(
                                                            2
                                                        )}{" "}
                                                        SOL /{" "}
                                                        {bondingCurveInfo
                                                            ? (
                                                                  bondingCurveInfo.realTokenReserves /
                                                                  1e9
                                                              ).toFixed(2)
                                                            : "—"}
                                                        B tokens
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="text-gray-400 mb-1">
                                                        Current Price
                                                    </p>
                                                    <p className="text-white">
                                                        ${currentPrice}
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="text-gray-400 mb-1">
                                                        Migration Threshold
                                                    </p>
                                                    <p className="text-white">
                                                        {bondingCurveInfo?.migrationThreshold ||
                                                            85}{" "}
                                                        SOL
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="text-gray-400 mb-1">
                                                        Progress to Migration
                                                    </p>
                                                    <p className="text-white font-semibold">
                                                        {bondingCurveInfo?.progress.toFixed(
                                                            2
                                                        )}
                                                        %
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* First Buyer Lock Info */}
                                        {bondingCurveInfo?.firstBuyer && (
                                            <div className="bg-orange-900/20 border border-orange-600/30 rounded-lg p-6">
                                                <h3 className="text-orange-300 font-semibold text-lg mb-4">
                                                    🔒 First Buyer Lock Status
                                                </h3>
                                                <div className="space-y-3 text-sm">
                                                    <div className="flex justify-between">
                                                        <span className="text-gray-400">
                                                            First Buyer
                                                        </span>
                                                        <span className="text-white font-mono text-xs">
                                                            {bondingCurveInfo.firstBuyer.slice(
                                                                0,
                                                                8
                                                            )}
                                                            ...
                                                            {bondingCurveInfo.firstBuyer.slice(
                                                                -6
                                                            )}
                                                        </span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span className="text-gray-400">
                                                            Locked Amount
                                                        </span>
                                                        <span className="text-white">
                                                            {bondingCurveInfo.firstBuyerLockedAmount.toFixed(
                                                                2
                                                            )}{" "}
                                                            {tokenData.symbol}
                                                        </span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span className="text-gray-400">
                                                            Lock Active
                                                        </span>
                                                        <span
                                                            className={
                                                                bondingCurveInfo.firstBuyerLockActive
                                                                    ? "text-orange-400"
                                                                    : "text-green-400"
                                                            }
                                                        >
                                                            {bondingCurveInfo.firstBuyerLockActive
                                                                ? "🔒 Yes"
                                                                : "🔓 No"}
                                                        </span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span className="text-gray-400">
                                                            Holder Threshold
                                                        </span>
                                                        <span className="text-white">
                                                            {
                                                                bondingCurveInfo.currentHolderCount
                                                            }{" "}
                                                            /{" "}
                                                            {
                                                                bondingCurveInfo.holderThreshold
                                                            }
                                                        </span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span className="text-gray-400">
                                                            Volume Threshold
                                                        </span>
                                                        <span className="text-white">
                                                            $
                                                            {bondingCurveInfo.totalVolumeUsd.toFixed(
                                                                0
                                                            )}{" "}
                                                            / $
                                                            {bondingCurveInfo.volumeThreshold.toFixed(
                                                                0
                                                            )}
                                                        </span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span className="text-gray-400">
                                                            Unlockable
                                                        </span>
                                                        <span
                                                            className={
                                                                bondingCurveInfo.unlockable
                                                                    ? "text-green-400"
                                                                    : "text-gray-400"
                                                            }
                                                        >
                                                            {bondingCurveInfo.unlockable
                                                                ? "✅ Ready"
                                                                : "⏳ Not Yet"}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {bondingCurveInfo?.isMigrated && (
                                            <div className="bg-purple-900/20 border border-purple-600/30 rounded-lg p-6">
                                                <h3 className="text-purple-300 font-semibold text-lg mb-4">
                                                    🏊 Migration Complete
                                                </h3>
                                                <div className="space-y-3 text-sm">
                                                    <div className="flex justify-between">
                                                        <span className="text-gray-400">
                                                            Platform Fee (5%)
                                                        </span>
                                                        <span className="text-white">
                                                            {bondingCurveInfo.realSolReserves
                                                                ? (
                                                                      bondingCurveInfo.realSolReserves *
                                                                      0.05
                                                                  ).toFixed(2)
                                                                : "—"}{" "}
                                                            SOL
                                                        </span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span className="text-gray-400">
                                                            SOL to Pool
                                                        </span>
                                                        <span className="text-white">
                                                            {bondingCurveInfo.realSolReserves
                                                                ? (
                                                                      bondingCurveInfo.realSolReserves *
                                                                      0.95
                                                                  ).toFixed(2)
                                                                : "—"}{" "}
                                                            SOL
                                                        </span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span className="text-gray-400">
                                                            Tokens to Pool
                                                        </span>
                                                        <span className="text-white">
                                                            {bondingCurveInfo.realTokenReserves
                                                                ? (
                                                                      bondingCurveInfo.realTokenReserves /
                                                                      1e9
                                                                  ).toFixed(2)
                                                                : "—"}
                                                            B
                                                        </span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span className="text-gray-400">
                                                            LP Lock Status
                                                        </span>
                                                        <span className="text-green-400">
                                                            🔒 60% Locked
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        <div className="bg-yellow-900/20 border border-yellow-600/30 rounded-lg p-6">
                                            <h3 className="text-yellow-300 font-semibold text-lg mb-4">
                                                ⚡ How It Works
                                            </h3>
                                            <ul className="space-y-3 text-sm text-yellow-200">
                                                <li className="flex items-start gap-2">
                                                    <span className="text-yellow-400 mt-0.5">
                                                        1.
                                                    </span>
                                                    <span>
                                                        Token launches with
                                                        virtual liquidity for
                                                        price discovery
                                                    </span>
                                                </li>
                                                <li className="flex items-start gap-2">
                                                    <span className="text-yellow-400 mt-0.5">
                                                        2.
                                                    </span>
                                                    <span>
                                                        First buyer's tokens are
                                                        locked until{" "}
                                                        {bondingCurveInfo?.holderThreshold ||
                                                            300}{" "}
                                                        holders and $
                                                        {bondingCurveInfo?.volumeThreshold ||
                                                            25000}{" "}
                                                        volume
                                                    </span>
                                                </li>
                                                <li className="flex items-start gap-2">
                                                    <span className="text-yellow-400 mt-0.5">
                                                        3.
                                                    </span>
                                                    <span>
                                                        Price increases as more
                                                        SOL is deposited into
                                                        the curve
                                                    </span>
                                                </li>
                                                <li className="flex items-start gap-2">
                                                    <span className="text-yellow-400 mt-0.5">
                                                        4.
                                                    </span>
                                                    <span>
                                                        At{" "}
                                                        {bondingCurveInfo?.migrationThreshold ||
                                                            85}{" "}
                                                        SOL, automatically
                                                        migrates to Raydium
                                                    </span>
                                                </li>
                                                <li className="flex items-start gap-2">
                                                    <span className="text-yellow-400 mt-0.5">
                                                        5.
                                                    </span>
                                                    <span>
                                                        5% platform fee + 60% LP
                                                        auto-locked after
                                                        migration
                                                    </span>
                                                </li>
                                            </ul>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Token Info Sidebar */}
                    <div className="space-y-6">
                        {/* Description */}
                        <div className="bg-[#192630] rounded-2xl p-6 border border-gray-700">
                            <h2 className="text-xl font-bold text-white mb-4">
                                About
                            </h2>
                            <p className="text-gray-300 text-sm leading-relaxed">
                                {tokenData.description ||
                                    "No description available."}
                            </p>

                            {/* Social Links */}
                            {(tokenData.website ||
                                tokenData.twitter ||
                                tokenData.telegram) && (
                                <div className="mt-6 pt-6 border-t border-gray-700">
                                    <h3 className="text-sm font-semibold text-gray-400 mb-3">
                                        Links
                                    </h3>
                                    <div className="flex flex-wrap gap-2">
                                        {tokenData.website && (
                                            <a
                                                href={tokenData.website}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 text-gray-300 px-3 py-2 rounded-lg text-sm transition-colors"
                                            >
                                                <svg
                                                    className="w-4 h-4"
                                                    fill="currentColor"
                                                    viewBox="0 0 20 20"
                                                >
                                                    <path
                                                        fillRule="evenodd"
                                                        d="M4.083 9h1.946c.089-1.546.383-2.97.837-4.118A6.004 6.004 0 004.083 9zM10 2a8 8 0 100 16 8 8 0 000-16zm0 2c-.076 0-.232.032-.465.262-.238.234-.497.623-.737 1.182-.389.907-.673 2.142-.766 3.556h3.936c-.093-1.414-.377-2.649-.766-3.556-.24-.56-.5-.948-.737-1.182C10.232 4.032 10.076 4 10 4zm3.971 5c-.089-1.546-.383-2.97-.837-4.118A6.004 6.004 0 0115.917 9h-1.946zm-2.003 2H8.032c.093 1.414.377 2.649.766 3.556.24.56.5.948.737 1.182.233.23.389.262.465.262.076 0 .232-.032.465-.262.238-.234.498-.623.737-1.182.389-.907.673-2.142.766-3.556zm1.166 4.118c.454-1.147.748-2.572.837-4.118h1.946a6.004 6.004 0 01-2.783 4.118zm-6.268 0C6.412 13.97 6.118 12.546 6.03 11H4.083a6.004 6.004 0 002.783 4.118z"
                                                        clipRule="evenodd"
                                                    />
                                                </svg>
                                                Website
                                            </a>
                                        )}
                                        {tokenData.twitter && (
                                            <a
                                                href={tokenData.twitter}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 text-gray-300 px-3 py-2 rounded-lg text-sm transition-colors"
                                            >
                                                <svg
                                                    className="w-4 h-4"
                                                    fill="currentColor"
                                                    viewBox="0 0 24 24"
                                                >
                                                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                                                </svg>
                                                Twitter
                                            </a>
                                        )}
                                        {tokenData.telegram && (
                                            <a
                                                href={tokenData.telegram}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 text-gray-300 px-3 py-2 rounded-lg text-sm transition-colors"
                                            >
                                                <svg
                                                    className="w-4 h-4"
                                                    fill="currentColor"
                                                    viewBox="0 0 24 24"
                                                >
                                                    <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.161c-.18 1.897-.962 6.502-1.359 8.627-.168.9-.5 1.201-.820 1.230-.697.064-1.226-.461-1.901-.903-1.056-.692-1.653-1.123-2.678-1.799-1.185-.781-.417-1.21.258-1.911.177-.184 3.247-2.977 3.307-3.230.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.139-5.062 3.345-.479.329-.913.489-1.302.481-.428-.008-1.252-.241-1.865-.44-.752-.244-1.349-.374-1.297-.789.027-.216.324-.437.892-.663 3.498-1.524 5.831-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
                                                </svg>
                                                Telegram
                                            </a>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Contract Info */}
                        <div className="bg-[#192630] rounded-2xl p-6 border border-gray-700">
                            <h2 className="text-xl font-bold text-white mb-4">
                                Contract
                            </h2>
                            <div className="space-y-3">
                                <div>
                                    <p className="text-gray-400 text-xs mb-1">
                                        Token Address
                                    </p>
                                    <div className="flex items-center gap-2">
                                        <code className="text-white text-xs bg-gray-800 px-3 py-2 rounded flex-1 overflow-hidden text-ellipsis">
                                            {mintAddress}
                                        </code>
                                        <button
                                            onClick={() => {
                                                navigator.clipboard.writeText(
                                                    mintAddress
                                                );
                                                toast.success(
                                                    "Address copied to clipboard!"
                                                );
                                            }}
                                            className="p-2 bg-gray-800 hover:bg-gray-700 rounded transition-colors"
                                        >
                                            <svg
                                                className="w-4 h-4 text-gray-400"
                                                fill="none"
                                                stroke="currentColor"
                                                viewBox="0 0 24 24"
                                            >
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth="2"
                                                    d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                                                />
                                            </svg>
                                        </button>
                                    </div>
                                </div>

                                <div className="pt-3 space-y-2">
                                    <a
                                        href={`https://solscan.io/token/${mintAddress}?cluster=devnet`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center justify-between w-full bg-gray-800 hover:bg-gray-700 text-gray-300 px-3 py-2 rounded-lg text-sm transition-colors"
                                    >
                                        <span>View on Solscan</span>
                                        <svg
                                            className="w-4 h-4"
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth="2"
                                                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                                            />
                                        </svg>
                                    </a>
                                </div>
                            </div>
                        </div>

                        {/* Quick Actions */}
                        <div className="bg-[#192630] rounded-2xl p-6 border border-gray-700">
                            <h2 className="text-xl font-bold text-white mb-4">
                                Quick Actions
                            </h2>
                            <div className="space-y-3">
                                <button
                                    onClick={() => {
                                        navigator.clipboard.writeText(
                                            window.location.href
                                        );
                                        toast.success(
                                            "Link copied to clipboard!"
                                        );
                                    }}
                                    className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-lg font-medium transition-colors"
                                >
                                    <svg
                                        className="w-5 h-5"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth="2"
                                            d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
                                        />
                                    </svg>
                                    Share Token
                                </button>

                                <button
                                    onClick={() => {
                                        const text = `Check out ${tokenData.name} ($${tokenData.symbol}) - Fair launch on bonding curve!\n\n${window.location.href}`;
                                        window.open(
                                            `https://twitter.com/intent/tweet?text=${encodeURIComponent(
                                                text
                                            )}`,
                                            "_blank"
                                        );
                                    }}
                                    className="w-full flex items-center justify-center gap-2 bg-gray-800 hover:bg-gray-700 text-white px-4 py-3 rounded-lg font-medium transition-colors"
                                >
                                    <svg
                                        className="w-5 h-5"
                                        fill="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                                    </svg>
                                    Share on Twitter
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TokenDetail;
