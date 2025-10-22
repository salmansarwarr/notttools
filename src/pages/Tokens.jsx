import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Connection, PublicKey } from "@solana/web3.js";
import { AnchorProvider, Program, BN } from "@coral-xyz/anchor";
import constants from "../constants";
import bondingCurveIDL from "../hooks/bonding_curve.json";

const BONDING_CURVE_PROGRAM_ID = new PublicKey(
    "BMX3MoC5FmAHkgtXAGrKa8iPTCUj6RaBKqQfBtXzK9nZ"
);
const RPC_URL = "https://api.devnet.solana.com";

const fetchSolPrice = async () => {
    try {
        const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd');
        const data = await response.json();
        return data.solana.usd;
    } catch (error) {
        console.error('Error fetching SOL price:', error);
        return 186.14; // fallback price
    }
}

const TokensPage = () => {
    const navigate = useNavigate();
    const [tokens, setTokens] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [bondingCurveData, setBondingCurveData] = useState({});
    const [sortBy, setSortBy] = useState("newest");
    const [filterStatus, setFilterStatus] = useState("all");

    useEffect(() => {
        fetchTokens();
    }, []);

    useEffect(() => {
        if (tokens.length > 0) {
            fetchBondingCurveData();
        }
    }, [tokens]);

    const fetchTokens = async () => {
        try {
            setIsLoading(true);
            const response = await fetch(
                `${constants.backend_url}/items/projects?sort=-date_created&limit=2`
            );
            const data = await response.json();

            if (data.data) {
                setTokens(data.data);
            }
        } catch (error) {
            console.error("Error fetching tokens:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchBondingCurveData = async () => {
        try {
            const connection = new Connection(RPC_URL);
            const provider = new AnchorProvider(connection, {}, {});
            const program = new Program(bondingCurveIDL, provider);
    
            const curveDataMap = {};
    
            for (const token of tokens) {
                try {
                    const [bondingCurve] = PublicKey.findProgramAddressSync(
                        [Buffer.from("bonding_curve"), new PublicKey(token.contract_address).toBuffer()],
                        BONDING_CURVE_PROGRAM_ID
                    );
    
                    const curveData = await program.account.bondingCurve.fetch(bondingCurve);
    
                    // Convert BN values to numbers with proper decimal handling
                    const bnToNumber = (bn, decimals = 9) => {
                        const value = parseFloat(bn.toString()) / Math.pow(10, decimals);
                        return value;
                    };
    
                    const virtualSolReserves = new BN(curveData.virtualSolReserves);
                    const realSolReserves = new BN(curveData.realSolReserves);
                    const virtualTokenReserves = new BN(curveData.virtualTokenReserves);
                    const realTokenReserves = new BN(curveData.realTokenReserves);
                    const totalSupply = new BN(curveData.totalSupply);
                    const migrationThreshold = new BN(curveData.migrationThreshold);
                    
                    // SOL uses 9 decimals, tokens typically use 6 or 9 decimals
                    // Adjust based on your token's actual decimal places
                    const SOL_DECIMALS = 9;
                    const TOKEN_DECIMALS = 9; 
                    
                    const totalSolReserves = virtualSolReserves.add(realSolReserves);
                    const totalTokenReserves = virtualTokenReserves.add(realTokenReserves);
                    
                    const totalSolReservesNum = bnToNumber(totalSolReserves, SOL_DECIMALS);
                    const totalTokenReservesNum = bnToNumber(totalTokenReserves, TOKEN_DECIMALS);
                    const realSolReservesNum = bnToNumber(realSolReserves, SOL_DECIMALS);
                    const migrationThresholdNum = bnToNumber(migrationThreshold, SOL_DECIMALS);
                    const totalSupplyNum = bnToNumber(totalSupply, TOKEN_DECIMALS);
                    
                    // Calculate price per token in SOL
                    const priceInSol = totalTokenReservesNum > 0 ? totalSolReservesNum / totalTokenReservesNum : 0;
                    
                    // Convert SOL price to USD (you'll need to fetch current SOL price)
                    // For now, using a placeholder - you should fetch this from an API
                    const SOL_TO_USD = await fetchSolPrice(); // Replace with actual SOL price fetch
                    const priceInUsd = priceInSol * SOL_TO_USD;
                    
                    const marketCap = priceInUsd * totalSupplyNum;
                    
                    const progress = migrationThresholdNum > 0 
                        ? (realSolReservesNum / migrationThresholdNum) * 100 
                        : 0;
                    
                    curveDataMap[token.contract_address] = {
                        price: priceInUsd,
                        marketCap,
                        progress: Math.min(progress, 100),
                        isMigrated: curveData.isMigrated,
                        realSolReserves: realSolReservesNum,
                        migrationThreshold: migrationThresholdNum,
                        totalSolReserves: totalSolReservesNum,
                        totalTokenReserves: totalTokenReservesNum,
                        priceInSol, // Keep this for reference
                    };
                    
                    console.log("Final curve data:", curveDataMap[token.contract_address]);
                    
                } catch (error) {
                    console.error(`Error fetching curve data for ${token.contract_address}:`, error);
                    // Continue with next token instead of breaking
                }
            }
    
            setBondingCurveData(curveDataMap);
        } catch (error) {
            console.error("Error fetching bonding curve data:", error);
        }
    };

    const getSortedTokens = () => {
        let sorted = [...tokens];

        if (filterStatus !== "all") {
            sorted = sorted.filter((token) => {
                if (filterStatus === "new") {
                    const createdDate = new Date(token.date_created);
                    const hoursSinceCreation =
                        (Date.now() - createdDate.getTime()) / (1000 * 60 * 60);
                    return hoursSinceCreation < 24;
                } else if (filterStatus === "active") {
                    const curveData = bondingCurveData[token.contract_address];
                    return curveData && !curveData.isMigrated;
                } else if (filterStatus === "migrated") {
                    const curveData = bondingCurveData[token.contract_address];
                    return curveData && curveData.isMigrated;
                }
                return true;
            });
        }

        switch (sortBy) {
            case "newest":
                sorted.sort(
                    (a, b) =>
                        new Date(b.date_created) - new Date(a.date_created)
                );
                break;
            case "oldest":
                sorted.sort(
                    (a, b) =>
                        new Date(a.date_created) - new Date(b.date_created)
                );
                break;
            case "name":
                sorted.sort((a, b) => a.name.localeCompare(b.name));
                break;
            case "progress":
                sorted.sort((a, b) => {
                    const progressA =
                        bondingCurveData[a.contract_address]?.progress || 0;
                    const progressB =
                        bondingCurveData[b.contract_address]?.progress || 0;
                    return progressB - progressA;
                });
                break;
            default:
                break;
        }

        return sorted;
    };

    const formatTimeAgo = (dateString) => {
        const date = new Date(dateString);
        const now = new Date();
        const seconds = Math.floor((now - date) / 1000);

        if (seconds < 60) return `${seconds}s ago`;
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
        if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
        return `${Math.floor(seconds / 86400)}d ago`;
    };

    const sortedTokens = getSortedTokens();

    if (isLoading) {
        return (
            <div className="min-h-screen bg-[#0A151E] pt-28 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                    <p className="text-gray-400">Loading tokens...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#0A151E] pt-28 px-4 pb-8">
            <div className="max-w-7xl mx-auto">
                <div className="mb-8">
                    <h1 className="text-4xl font-bold text-white mb-2">
                        Bonding Curve Tokens
                    </h1>
                    <p className="text-gray-400">
                        Fair launch tokens with automated Raydium migration
                    </p>
                </div>

                <div className="bg-[#192630] rounded-2xl p-6 mb-6 border border-gray-700">
                    <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
                        <div className="flex gap-2 bg-gray-800 rounded-lg p-1 flex-wrap">
                            <button
                                onClick={() => setFilterStatus("all")}
                                className={`px-4 py-2 rounded-md font-medium transition-colors ${
                                    filterStatus === "all"
                                        ? "bg-blue-600 text-white"
                                        : "text-gray-400 hover:text-white"
                                }`}
                            >
                                All Tokens
                            </button>
                            <button
                                onClick={() => setFilterStatus("active")}
                                className={`px-4 py-2 rounded-md font-medium transition-colors ${
                                    filterStatus === "active"
                                        ? "bg-blue-600 text-white"
                                        : "text-gray-400 hover:text-white"
                                }`}
                            >
                                Active Curves
                            </button>
                            <button
                                onClick={() => setFilterStatus("migrated")}
                                className={`px-4 py-2 rounded-md font-medium transition-colors ${
                                    filterStatus === "migrated"
                                        ? "bg-blue-600 text-white"
                                        : "text-gray-400 hover:text-white"
                                }`}
                            >
                                Migrated
                            </button>
                            <button
                                onClick={() => setFilterStatus("new")}
                                className={`px-4 py-2 rounded-md font-medium transition-colors ${
                                    filterStatus === "new"
                                        ? "bg-blue-600 text-white"
                                        : "text-gray-400 hover:text-white"
                                }`}
                            >
                                New (24h)
                            </button>
                        </div>

                        <div className="flex items-center gap-3">
                            <span className="text-gray-400 text-sm">
                                Sort by:
                            </span>
                            <select
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value)}
                                className="bg-gray-800 border border-gray-600 text-white px-4 py-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                            >
                                <option value="newest">Newest First</option>
                                <option value="oldest">Oldest First</option>
                                <option value="progress">Progress</option>
                                <option value="name">Name (A-Z)</option>
                            </select>
                        </div>
                    </div>

                    <div className="mt-4 pt-4 border-t border-gray-700">
                        <p className="text-gray-400 text-sm">
                            Showing{" "}
                            <span className="text-white font-semibold">
                                {sortedTokens.length}
                            </span>{" "}
                            tokens
                        </p>
                    </div>
                </div>

                {sortedTokens.length === 0 ? (
                    <div className="bg-[#192630] rounded-2xl p-12 border border-gray-700 text-center">
                        <svg
                            className="w-16 h-16 text-gray-600 mx-auto mb-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                            />
                        </svg>
                        <h3 className="text-xl font-semibold text-white mb-2">
                            No tokens found
                        </h3>
                        <p className="text-gray-400">
                            No tokens match your filter criteria.
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {sortedTokens.map((token) => {
                            const curveData =
                                bondingCurveData[token.contract_address];
                            const isNew = () => {
                                const createdDate = new Date(
                                    token.date_created
                                );
                                const hoursSinceCreation =
                                    (Date.now() - createdDate.getTime()) /
                                    (1000 * 60 * 60);
                                return hoursSinceCreation < 24;
                            };

                            return (
                                <div
                                    key={token.id}
                                    onClick={() =>
                                        navigate(
                                            `/token/${token.contract_address}`
                                        )
                                    }
                                    className="bg-[#192630] rounded-2xl border border-gray-700 hover:border-blue-500 transition-all cursor-pointer group overflow-hidden"
                                >
                                    <div className="p-6">
                                        <div className="flex items-start justify-between mb-4">
                                            <div className="flex items-center gap-3">
                                                {token.logo ? (
                                                    <img
                                                        src={`${constants.backend_url}/assets/${token.logo}`}
                                                        alt={token.name}
                                                        className="w-12 h-12 rounded-full"
                                                        onError={(e) => {
                                                            e.target.src =
                                                                'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="%23192630" width="100" height="100"/><text x="50" y="50" font-size="40" text-anchor="middle" dy=".3em" fill="%23fff">?</text></svg>';
                                                        }}
                                                    />
                                                ) : (
                                                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                                                        <span className="text-white font-bold text-lg">
                                                            {token.symbol?.charAt(
                                                                0
                                                            ) || "?"}
                                                        </span>
                                                    </div>
                                                )}
                                                <div>
                                                    <h3 className="text-lg font-bold text-white group-hover:text-blue-400 transition-colors">
                                                        {token.name}
                                                    </h3>
                                                    <p className="text-gray-400 text-sm">
                                                        ${token.symbol}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex flex-col items-end gap-1">
                                                {isNew() && (
                                                    <span className="bg-green-500/20 text-green-400 text-xs font-semibold px-2 py-1 rounded-full border border-green-500/30">
                                                        NEW
                                                    </span>
                                                )}
                                                {curveData?.isMigrated && (
                                                    <span className="bg-purple-500/20 text-purple-400 text-xs font-semibold px-2 py-1 rounded-full border border-purple-500/30">
                                                        MIGRATED
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Bonding Curve Progress */}
                                        {curveData && !curveData.isMigrated && (
                                            <div className="mb-4">
                                                <div className="flex justify-between text-xs text-gray-400 mb-2">
                                                    <span>
                                                        Bonding Curve Progress
                                                    </span>
                                                    <span className="text-white font-semibold">
                                                        {curveData.progress.toFixed(
                                                            1
                                                        )}
                                                        %
                                                    </span>
                                                </div>
                                                <div className="w-full bg-gray-700 rounded-full h-2">
                                                    <div
                                                        className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full transition-all"
                                                        style={{
                                                            width: `${curveData.progress}%`,
                                                        }}
                                                    ></div>
                                                </div>
                                                <div className="flex justify-between text-xs text-gray-500 mt-1">
                                                    <span>
                                                        {curveData.realSolReserves.toFixed(
                                                            2
                                                        )}{" "}
                                                        SOL
                                                    </span>
                                                    <span>
                                                        {curveData.migrationThreshold.toFixed(
                                                            0
                                                        )}{" "}
                                                        SOL to migrate
                                                    </span>
                                                </div>
                                            </div>
                                        )}

                                        {/* Price Info */}
<div className="space-y-3 mb-4">
    <div className="flex justify-between items-center">
        <span className="text-gray-400 text-sm">
            Current Price
        </span>
        <span className="text-white font-semibold">
            {curveData?.price
                ? curveData.price < 0.01 
                    ? `$${curveData.price.toFixed(8)}`
                    : `$${curveData.price.toFixed(4)}`
                : "—"}
        </span>
    </div>
    <div className="flex justify-between items-center">
        <span className="text-gray-400 text-sm">
            Market Cap
        </span>
        <span className="text-white font-semibold">
            {curveData?.marketCap
                ? curveData.marketCap >= 1e6
                    ? `$${(curveData.marketCap / 1e6).toFixed(2)}M`
                    : curveData.marketCap >= 1e3
                    ? `$${(curveData.marketCap / 1e3).toFixed(2)}K`
                    : `$${curveData.marketCap.toFixed(2)}`
                : "—"}
        </span>
    </div>
</div>

                                        {/* Description Preview */}
                                        {token.description && (
                                            <p className="text-gray-400 text-sm line-clamp-2 mb-4">
                                                {token.description}
                                            </p>
                                        )}

                                        {/* Footer */}
                                        <div className="flex items-center justify-between pt-4 border-t border-gray-700">
                                            <span className="text-gray-500 text-xs">
                                                {formatTimeAgo(
                                                    token.date_created
                                                )}
                                            </span>
                                            {curveData?.isMigrated && (
                                                <span className="text-green-400 text-xs flex items-center gap-1">
                                                    <svg
                                                        className="w-3 h-3"
                                                        fill="currentColor"
                                                        viewBox="0 0 20 20"
                                                    >
                                                        <path
                                                            fillRule="evenodd"
                                                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                                            clipRule="evenodd"
                                                        />
                                                    </svg>
                                                    On Raydium
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="h-1 bg-gradient-to-r from-blue-500 to-purple-600 transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left"></div>
                                </div>
                            );
                        })}
                    </div>
                )}

                <div className="mt-8 text-center">
                    <button
                        onClick={() => {
                            fetchTokens();
                            fetchBondingCurveData();
                        }}
                        className="bg-gray-800 hover:bg-gray-700 text-white px-6 py-3 rounded-lg font-medium transition-colors inline-flex items-center gap-2"
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
                                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                            />
                        </svg>
                        Refresh Tokens
                    </button>
                </div>
            </div>
        </div>
    );
};

export default TokensPage;
