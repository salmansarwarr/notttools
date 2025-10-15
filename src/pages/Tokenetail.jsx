import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useUnifiedWallet } from "../hooks/useUnifiedWallet";
import { useGlobalState } from "../hooks/useGlobalState";
import { Connection, PublicKey } from "@solana/web3.js";
import constants from "../constants";
import axios from "axios";

const TokenDetail = () => {
    const { mintAddress } = useParams();
    const navigate = useNavigate();
    const wallet = useUnifiedWallet();
    const { globalState } = useGlobalState();

    const [tokenData, setTokenData] = useState(null);
    const [priceData, setPriceData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [chartAvailable, setChartAvailable] = useState(false);
    const [activeTab, setActiveTab] = useState("trade"); // trade or chart

    // Trade states
    const [tradeMode, setTradeMode] = useState("buy"); // buy or sell
    const [tradeAmount, setTradeAmount] = useState("");
    const [slippage, setSlippage] = useState("1");
    const [isTrading, setIsTrading] = useState(false);
    const [tradeQuote, setTradeQuote] = useState(null);

    // Fetch token data from backend
    useEffect(() => {
        fetchTokenData();
    }, [mintAddress]);

    // Check DEXScreener availability
    useEffect(() => {
        if (tokenData?.pool_address) {
            checkDEXScreener();
        }
    }, [tokenData]);

    // Fetch price data from Raydium/Jupiter
    useEffect(() => {
        if (mintAddress) {
            fetchPriceData();
            const interval = setInterval(fetchPriceData, 10000); // Update every 10s
            return () => clearInterval(interval);
        }
    }, [mintAddress]);

    const fetchTokenData = async () => {
        try {
            setIsLoading(true);
            const response = await fetch(
                `${constants.backend_url}/items/projects?filter[contract_address][_eq]=${mintAddress}`
            );
            const data = await response.json();
            
            if (data.data && data.data.length > 0) {
                setTokenData(data.data[0]);
            }
        } catch (error) {
            console.error("Error fetching token data:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchPriceData = async () => {
        try {
            // Try Jupiter API first for price data
            const response = await axios.get(
                `https://price.jup.ag/v4/price?ids=${mintAddress}`
            );
            
            if (response.data?.data?.[mintAddress]) {
                setPriceData(response.data.data[mintAddress]);
            } else {
                // Fallback to Raydium API
                await fetchRaydiumPrice();
            }
        } catch (error) {
            console.error("Error fetching price:", error);
            await fetchRaydiumPrice();
        }
    };

    const fetchRaydiumPrice = async () => {
        try {
            const response = await axios.get(
                `https://api.raydium.io/v2/main/pairs`
            );
            
            const pair = response.data.find(
                p => p.baseMint === mintAddress || p.quoteMint === mintAddress
            );
            
            if (pair) {
                setPriceData({
                    price: parseFloat(pair.price),
                    volume24h: parseFloat(pair.volume24h),
                    priceChange24h: parseFloat(pair.priceChange24h),
                });
            }
        } catch (error) {
            console.error("Error fetching Raydium price:", error);
        }
    };

    const checkDEXScreener = async () => {
        try {
            const response = await axios.get(
                `https://api.dexscreener.com/latest/dex/tokens/${mintAddress}`
            );
            
            if (response.data?.pairs && response.data.pairs.length > 0) {
                setChartAvailable(true);
            }
        } catch (error) {
            console.error("DEXScreener not available yet:", error);
            setChartAvailable(false);
        }
    };

    const fetchTradeQuote = async (amount, mode) => {
        if (!amount || parseFloat(amount) <= 0) {
            setTradeQuote(null);
            return;
        }

        try {
            const inputMint = mode === "buy" 
                ? "So11111111111111111111111111111111111111112" // SOL
                : mintAddress;
            const outputMint = mode === "buy" 
                ? mintAddress 
                : "So11111111111111111111111111111111111111112"; // SOL

            const amountInLamports = Math.floor(parseFloat(amount) * 1e9);

            const response = await axios.get(
                `https://quote-api.jup.ag/v6/quote?inputMint=${inputMint}&outputMint=${outputMint}&amount=${amountInLamports}&slippageBps=${parseFloat(slippage) * 100}`
            );

            setTradeQuote(response.data);
        } catch (error) {
            console.error("Error fetching quote:", error);
            setTradeQuote(null);
        }
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchTradeQuote(tradeAmount, tradeMode);
        }, 500);
        
        return () => clearTimeout(timer);
    }, [tradeAmount, tradeMode, slippage]);

    const executeTrade = async () => {
        if (!wallet.connected || !tradeQuote) return;

        try {
            setIsTrading(true);

            // Get swap transaction from Jupiter
            const swapResponse = await axios.post(
                "https://quote-api.jup.ag/v6/swap",
                {
                    quoteResponse: tradeQuote,
                    userPublicKey: wallet.publicKey.toString(),
                    wrapAndUnwrapSol: true,
                }
            );

            const { swapTransaction } = swapResponse.data;

            // Deserialize and send transaction
            const connection = new Connection(constants.rpc_url || "https://api.mainnet-beta.solana.com");
            const transaction = Transaction.from(Buffer.from(swapTransaction, "base64"));
            
            const signature = await wallet.sendTransaction(transaction, connection);
            await connection.confirmTransaction(signature, "confirmed");

            alert(`Trade successful! Signature: ${signature}`);
            
            // Refresh data
            fetchPriceData();
            setTradeAmount("");
            setTradeQuote(null);
        } catch (error) {
            console.error("Trade failed:", error);
            alert(`Trade failed: ${error.message}`);
        } finally {
            setIsTrading(false);
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-[#0A151E] pt-28 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                    <p className="text-gray-400">Loading token data...</p>
                </div>
            </div>
        );
    }

    if (!tokenData) {
        return (
            <div className="min-h-screen bg-[#0A151E] pt-28 flex items-center justify-center">
                <div className="text-center">
                    <p className="text-red-400 mb-4">Token not found</p>
                    <button
                        onClick={() => navigate("/")}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg"
                    >
                        Go Home
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#0A151E] pt-28 px-4 pb-8">
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
                                <h1 className="text-3xl font-bold text-white">{tokenData.name}</h1>
                                <p className="text-gray-400">${tokenData.symbol}</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            {priceData && (
                                <div className="text-right">
                                    <p className="text-2xl font-bold text-white">
                                        ${priceData.price?.toFixed(6) || "—"}
                                    </p>
                                    {priceData.priceChange24h && (
                                        <p className={`text-sm ${priceData.priceChange24h >= 0 ? "text-green-400" : "text-red-400"}`}>
                                            {priceData.priceChange24h >= 0 ? "+" : ""}
                                            {priceData.priceChange24h.toFixed(2)}%
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Token Stats */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                        <div className="bg-gray-800/50 rounded-lg p-4">
                            <p className="text-gray-400 text-sm mb-1">Market Cap</p>
                            <p className="text-white font-semibold">
                                ${priceData?.price && tokenData.supply 
                                    ? ((priceData.price * tokenData.supply) / 1e6).toFixed(2) + "M"
                                    : "—"}
                            </p>
                        </div>
                        <div className="bg-gray-800/50 rounded-lg p-4">
                            <p className="text-gray-400 text-sm mb-1">24h Volume</p>
                            <p className="text-white font-semibold">
                                ${priceData?.volume24h 
                                    ? (priceData.volume24h / 1e3).toFixed(2) + "K"
                                    : "—"}
                            </p>
                        </div>
                        <div className="bg-gray-800/50 rounded-lg p-4">
                            <p className="text-gray-400 text-sm mb-1">Total Supply</p>
                            <p className="text-white font-semibold">
                                {tokenData.supply ? (tokenData.supply / 1e6).toFixed(2) + "M" : "—"}
                            </p>
                        </div>
                        <div className="bg-gray-800/50 rounded-lg p-4">
                            <p className="text-gray-400 text-sm mb-1">LP Status</p>
                            <p className="text-green-400 font-semibold flex items-center gap-1">
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                                </svg>
                                60% Locked
                            </p>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Chart Section */}
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
                                    Trade
                                </button>
                                <button
                                    onClick={() => setActiveTab("chart")}
                                    className={`flex-1 py-4 px-6 font-semibold transition-colors ${
                                        activeTab === "chart"
                                            ? "bg-blue-600 text-white"
                                            : "text-gray-400 hover:text-white hover:bg-gray-800"
                                    }`}
                                >
                                    Chart
                                </button>
                            </div>

                            {/* Content */}
                            <div className="p-6">
                                {activeTab === "trade" ? (
                                    <div className="space-y-6">
                                        {/* Trade Mode Selector */}
                                        <div className="flex gap-2 bg-gray-800 rounded-lg p-1">
                                            <button
                                                onClick={() => setTradeMode("buy")}
                                                className={`flex-1 py-3 rounded-md font-semibold transition-colors ${
                                                    tradeMode === "buy"
                                                        ? "bg-green-600 text-white"
                                                        : "text-gray-400 hover:text-white"
                                                }`}
                                            >
                                                Buy
                                            </button>
                                            <button
                                                onClick={() => setTradeMode("sell")}
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
                                                {tradeMode === "buy" ? "Amount (SOL)" : `Amount (${tokenData.symbol})`}
                                            </label>
                                            <input
                                                type="number"
                                                value={tradeAmount}
                                                onChange={(e) => setTradeAmount(e.target.value)}
                                                className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                                placeholder="0.0"
                                                step="0.01"
                                            />
                                        </div>

                                        {/* Slippage */}
                                        <div>
                                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                                Slippage Tolerance (%)
                                            </label>
                                            <div className="flex gap-2">
                                                {["0.5", "1", "2", "5"].map((value) => (
                                                    <button
                                                        key={value}
                                                        onClick={() => setSlippage(value)}
                                                        className={`flex-1 py-2 rounded-lg font-medium transition-colors ${
                                                            slippage === value
                                                                ? "bg-blue-600 text-white"
                                                                : "bg-gray-800 text-gray-400 hover:text-white"
                                                        }`}
                                                    >
                                                        {value}%
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Quote Display */}
                                        {tradeQuote && (
                                            <div className="bg-gray-800/50 rounded-lg p-4 space-y-2">
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-gray-400">You {tradeMode === "buy" ? "pay" : "receive"}</span>
                                                    <span className="text-white font-semibold">
                                                        {(parseInt(tradeQuote.inAmount) / 1e9).toFixed(6)}{" "}
                                                        {tradeMode === "buy" ? "SOL" : tokenData.symbol}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-gray-400">You {tradeMode === "buy" ? "receive" : "pay"}</span>
                                                    <span className="text-white font-semibold">
                                                        {(parseInt(tradeQuote.outAmount) / 1e9).toFixed(6)}{" "}
                                                        {tradeMode === "buy" ? tokenData.symbol : "SOL"}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between text-sm pt-2 border-t border-gray-700">
                                                    <span className="text-gray-400">Price Impact</span>
                                                    <span className={`font-semibold ${
                                                        parseFloat(tradeQuote.priceImpactPct) > 5 ? "text-red-400" : "text-green-400"
                                                    }`}>
                                                        {tradeQuote.priceImpactPct}%
                                                    </span>
                                                </div>
                                            </div>
                                        )}

                                        {/* Trade Button */}
                                        <button
                                            onClick={executeTrade}
                                            disabled={!wallet.connected || !tradeQuote || isTrading}
                                            className={`w-full py-4 rounded-lg font-bold transition-all ${
                                                tradeMode === "buy"
                                                    ? "bg-green-600 hover:bg-green-700"
                                                    : "bg-red-600 hover:bg-red-700"
                                            } text-white disabled:bg-gray-600 disabled:cursor-not-allowed`}
                                        >
                                            {!wallet.connected
                                                ? "Connect Wallet"
                                                : isTrading
                                                ? "Trading..."
                                                : tradeMode === "buy"
                                                ? "Buy"
                                                : "Sell"}
                                        </button>
                                    </div>
                                ) : (
                                    <div className="h-[600px]">
                                        {chartAvailable ? (
                                            <iframe
                                                src={`https://dexscreener.com/solana/${mintAddress}?embed=1&theme=dark`}
                                                className="w-full h-full rounded-lg"
                                                title="DEXScreener Chart"
                                            />
                                        ) : (
                                            <div className="h-full flex flex-col items-center justify-center text-center p-8">
                                                <div className="bg-blue-900/20 border border-blue-600/30 rounded-lg p-6 max-w-md">
                                                    <svg className="w-16 h-16 text-blue-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                                    </svg>
                                                    <h3 className="text-blue-300 font-semibold text-lg mb-2">
                                                        Chart Coming Soon
                                                    </h3>
                                                    <p className="text-blue-200 text-sm mb-4">
                                                        This token is brand new! Charts will appear on DEXScreener once the pool has:
                                                    </p>
                                                    <ul className="text-blue-200 text-sm space-y-2 text-left">
                                                        <li className="flex items-center gap-2">
                                                            <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                            </svg>
                                                            Sufficient trading volume
                                                        </li>
                                                        <li className="flex items-center gap-2">
                                                            <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                            </svg>
                                                            Minimum liquidity threshold
                                                        </li>
                                                        <li className="flex items-center gap-2">
                                                            <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                            </svg>
                                                            Some trading history
                                                        </li>
                                                    </ul>
                                                    <p className="text-blue-300 text-xs mt-4">
                                                        Use the Trade tab to buy/sell tokens now!
                                                    </p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Token Info Sidebar */}
                    <div className="space-y-6">
                        {/* Description */}
                        <div className="bg-[#192630] rounded-2xl p-6 border border-gray-700">
                            <h2 className="text-xl font-bold text-white mb-4">About</h2>
                            <p className="text-gray-300 text-sm leading-relaxed">
                                {tokenData.description || "No description available."}
                            </p>

                            {/* Social Links */}
                            {(tokenData.website || tokenData.twitter || tokenData.telegram) && (
                                <div className="mt-6 pt-6 border-t border-gray-700">
                                    <h3 className="text-sm font-semibold text-gray-400 mb-3">Links</h3>
                                    <div className="flex flex-wrap gap-2">
                                        {tokenData.website && (
                                            <a
                                                href={tokenData.website}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 text-gray-300 px-3 py-2 rounded-lg text-sm transition-colors"
                                            >
                                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fillRule="evenodd" d="M4.083 9h1.946c.089-1.546.383-2.97.837-4.118A6.004 6.004 0 004.083 9zM10 2a8 8 0 100 16 8 8 0 000-16zm0 2c-.076 0-.232.032-.465.262-.238.234-.497.623-.737 1.182-.389.907-.673 2.142-.766 3.556h3.936c-.093-1.414-.377-2.649-.766-3.556-.24-.56-.5-.948-.737-1.182C10.232 4.032 10.076 4 10 4zm3.971 5c-.089-1.546-.383-2.97-.837-4.118A6.004 6.004 0 0115.917 9h-1.946zm-2.003 2H8.032c.093 1.414.377 2.649.766 3.556.24.56.5.948.737 1.182.233.23.389.262.465.262.076 0 .232-.032.465-.262.238-.234.498-.623.737-1.182.389-.907.673-2.142.766-3.556zm1.166 4.118c.454-1.147.748-2.572.837-4.118h1.946a6.004 6.004 0 01-2.783 4.118zm-6.268 0C6.412 13.97 6.118 12.546 6.03 11H4.083a6.004 6.004 0 002.783 4.118z" clipRule="evenodd" />
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
                                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
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
                                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
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
                            <h2 className="text-xl font-bold text-white mb-4">Contract</h2>
                            <div className="space-y-3">
                                <div>
                                    <p className="text-gray-400 text-xs mb-1">Token Address</p>
                                    <div className="flex items-center gap-2">
                                        <code className="text-white text-xs bg-gray-800 px-3 py-2 rounded flex-1 overflow-hidden text-ellipsis">
                                            {mintAddress}
                                        </code>
                                        <button
                                            onClick={() => {
                                                navigator.clipboard.writeText(mintAddress);
                                                alert("Copied!");
                                            }}
                                            className="p-2 bg-gray-800 hover:bg-gray-700 rounded transition-colors"
                                        >
                                            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>

                                {tokenData.pool_address && (
                                    <div>
                                        <p className="text-gray-400 text-xs mb-1">Pool Address</p>
                                        <div className="flex items-center gap-2">
                                            <code className="text-white text-xs bg-gray-800 px-3 py-2 rounded flex-1 overflow-hidden text-ellipsis">
                                                {tokenData.pool_address}
                                            </code>
                                            <button
                                                onClick={() => {
                                                    navigator.clipboard.writeText(tokenData.pool_address);
                                                    alert("Copied!");
                                                }}
                                                className="p-2 bg-gray-800 hover:bg-gray-700 rounded transition-colors"
                                            >
                                                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                                </svg>
                                            </button>
                                        </div>
                                    </div>
                                )}

                                <div className="pt-3 space-y-2">
                                    <a
                                        href={`https://solscan.io/token/${mintAddress}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center justify-between w-full bg-gray-800 hover:bg-gray-700 text-gray-300 px-3 py-2 rounded-lg text-sm transition-colors"
                                    >
                                        <span>View on Solscan</span>
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                        </svg>
                                    </a>
                                    <a
                                        href={`https://birdeye.so/token/${mintAddress}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center justify-between w-full bg-gray-800 hover:bg-gray-700 text-gray-300 px-3 py-2 rounded-lg text-sm transition-colors"
                                    >
                                        <span>View on Birdeye</span>
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                        </svg>
                                    </a>
                                    {chartAvailable && (
                                        <a
                                            href={`https://dexscreener.com/solana/${mintAddress}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center justify-between w-full bg-gray-800 hover:bg-gray-700 text-gray-300 px-3 py-2 rounded-lg text-sm transition-colors"
                                        >
                                            <span>View on DEXScreener</span>
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                            </svg>
                                        </a>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* LP Lock Info */}
                        {tokenData.lockinfo && (
                            <div className="bg-gradient-to-br from-green-900/20 to-blue-900/20 rounded-2xl p-6 border border-green-600/30">
                                <div className="flex items-center gap-2 mb-4">
                                    <svg className="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                                    </svg>
                                    <h2 className="text-xl font-bold text-white">LP Lock Details</h2>
                                </div>
                                <div className="space-y-3 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-gray-400">Locked Amount</span>
                                        <span className="text-green-400 font-semibold">60% of LP</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-400">Status</span>
                                        <span className="text-green-400 font-semibold">🔒 Locked</span>
                                    </div>
                                    <div className="pt-3 border-t border-green-600/30">
                                        <p className="text-gray-300 text-xs mb-2">Unlock Conditions:</p>
                                        <ul className="space-y-1 text-xs text-gray-400">
                                            <li className="flex items-center gap-2">
                                                <svg className="w-3 h-3 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                </svg>
                                                300+ unique holders
                                            </li>
                                            <li className="flex items-center gap-2">
                                                <svg className="w-3 h-3 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                </svg>
                                                $25,000+ trading volume
                                            </li>
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Quick Actions */}
                        <div className="bg-[#192630] rounded-2xl p-6 border border-gray-700">
                            <h2 className="text-xl font-bold text-white mb-4">Quick Actions</h2>
                            <div className="space-y-3">
                                <button
                                    onClick={() => {
                                        navigator.clipboard.writeText(window.location.href);
                                        alert("Link copied to clipboard!");
                                    }}
                                    className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-lg font-medium transition-colors"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                                    </svg>
                                    Share Token
                                </button>
                                
                                <button
                                    onClick={() => {
                                        const text = `Check out ${tokenData.name} ($${tokenData.symbol}) on Solana!\n\n${window.location.href}`;
                                        window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, '_blank');
                                    }}
                                    className="w-full flex items-center justify-center gap-2 bg-gray-800 hover:bg-gray-700 text-white px-4 py-3 rounded-lg font-medium transition-colors"
                                >
                                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
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