import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import constants from "../constants";
import axios from "axios";

const TokensPage = () => {
    const navigate = useNavigate();
    const [tokens, setTokens] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [priceData, setPriceData] = useState({});
    const [sortBy, setSortBy] = useState("newest"); // newest, oldest, name
    const [filterStatus, setFilterStatus] = useState("all"); // all, active, new

    useEffect(() => {
        fetchTokens();
    }, []);

    useEffect(() => {
        if (tokens.length > 0) {
            fetchAllPrices();
        }
    }, [tokens]);

    const fetchTokens = async () => {
        try {
            setIsLoading(true);
            const response = await fetch(
                `${constants.backend_url}/items/projects?sort=-date_created&limit=100`
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

    const fetchAllPrices = async () => {
        try {
            // Batch fetch prices for all tokens
            const mintAddresses = tokens.map(token => token.contract_address).filter(Boolean);
            
            if (mintAddresses.length === 0) return;

            // Jupiter API supports multiple tokens
            const response = await axios.get(
                `https://price.jup.ag/v4/price?ids=${mintAddresses.join(',')}`
            );

            if (response.data?.data) {
                setPriceData(response.data.data);
            }
        } catch (error) {
            console.error("Error fetching prices:", error);
        }
    };

    const getSortedTokens = () => {
        let sorted = [...tokens];

        // Filter by status
        if (filterStatus !== "all") {
            sorted = sorted.filter(token => {
                if (filterStatus === "new") {
                    const createdDate = new Date(token.date_created);
                    const hoursSinceCreation = (Date.now() - createdDate.getTime()) / (1000 * 60 * 60);
                    return hoursSinceCreation < 24;
                }
                return true;
            });
        }

        // Sort
        switch (sortBy) {
            case "newest":
                sorted.sort((a, b) => new Date(b.date_created) - new Date(a.date_created));
                break;
            case "oldest":
                sorted.sort((a, b) => new Date(a.date_created) - new Date(b.date_created));
                break;
            case "name":
                sorted.sort((a, b) => a.name.localeCompare(b.name));
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

    const formatMarketCap = (price, supply) => {
        if (!price || !supply) return "—";
        const mcap = price * supply;
        if (mcap >= 1e9) return `$${(mcap / 1e9).toFixed(2)}B`;
        if (mcap >= 1e6) return `$${(mcap / 1e6).toFixed(2)}M`;
        if (mcap >= 1e3) return `$${(mcap / 1e3).toFixed(2)}K`;
        return `$${mcap.toFixed(2)}`;
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
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-4xl font-bold text-white mb-2">
                        All Tokens
                    </h1>
                    <p className="text-gray-400">
                        Discover newly launched tokens on Solana
                    </p>
                </div>

                {/* Filters and Sort */}
                <div className="bg-[#192630] rounded-2xl p-6 mb-6 border border-gray-700">
                    <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
                        {/* Filter Tabs */}
                        <div className="flex gap-2 bg-gray-800 rounded-lg p-1">
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

                        {/* Sort Dropdown */}
                        <div className="flex items-center gap-3">
                            <span className="text-gray-400 text-sm">Sort by:</span>
                            <select
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value)}
                                className="bg-gray-800 border border-gray-600 text-white px-4 py-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                            >
                                <option value="newest">Newest First</option>
                                <option value="oldest">Oldest First</option>
                                <option value="name">Name (A-Z)</option>
                            </select>
                        </div>
                    </div>

                    {/* Token Count */}
                    <div className="mt-4 pt-4 border-t border-gray-700">
                        <p className="text-gray-400 text-sm">
                            Showing <span className="text-white font-semibold">{sortedTokens.length}</span> tokens
                        </p>
                    </div>
                </div>

                {/* Tokens Grid */}
                {sortedTokens.length === 0 ? (
                    <div className="bg-[#192630] rounded-2xl p-12 border border-gray-700 text-center">
                        <svg className="w-16 h-16 text-gray-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                        </svg>
                        <h3 className="text-xl font-semibold text-white mb-2">No tokens found</h3>
                        <p className="text-gray-400">No tokens match your filter criteria.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {sortedTokens.map((token) => {
                            const tokenPrice = priceData[token.contract_address];
                            const isNew = () => {
                                const createdDate = new Date(token.date_created);
                                const hoursSinceCreation = (Date.now() - createdDate.getTime()) / (1000 * 60 * 60);
                                return hoursSinceCreation < 24;
                            };

                            return (
                                <div
                                    key={token.id}
                                    onClick={() => navigate(`/token/${token.contract_address}`)}
                                    className="bg-[#192630] rounded-2xl border border-gray-700 hover:border-blue-500 transition-all cursor-pointer group overflow-hidden"
                                >
                                    {/* Token Header */}
                                    <div className="p-6">
                                        <div className="flex items-start justify-between mb-4">
                                            <div className="flex items-center gap-3">
                                                {token.logo ? (
                                                    <img
                                                        src={`${constants.backend_url}/assets/${token.logo}`}
                                                        alt={token.name}
                                                        className="w-12 h-12 rounded-full"
                                                        onError={(e) => {
                                                            e.target.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="%23192630" width="100" height="100"/><text x="50" y="50" font-size="40" text-anchor="middle" dy=".3em" fill="%23fff">?</text></svg>';
                                                        }}
                                                    />
                                                ) : (
                                                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                                                        <span className="text-white font-bold text-lg">
                                                            {token.symbol?.charAt(0) || "?"}
                                                        </span>
                                                    </div>
                                                )}
                                                <div>
                                                    <h3 className="text-lg font-bold text-white group-hover:text-blue-400 transition-colors">
                                                        {token.name}
                                                    </h3>
                                                    <p className="text-gray-400 text-sm">${token.symbol}</p>
                                                </div>
                                            </div>
                                            {isNew() && (
                                                <span className="bg-green-500/20 text-green-400 text-xs font-semibold px-2 py-1 rounded-full border border-green-500/30">
                                                    NEW
                                                </span>
                                            )}
                                        </div>

                                        {/* Price Info */}
                                        <div className="space-y-3 mb-4">
                                            <div className="flex justify-between items-center">
                                                <span className="text-gray-400 text-sm">Price</span>
                                                <span className="text-white font-semibold">
                                                    {tokenPrice?.price 
                                                        ? `$${tokenPrice.price.toFixed(8)}`
                                                        : "—"}
                                                </span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="text-gray-400 text-sm">Market Cap</span>
                                                <span className="text-white font-semibold">
                                                    {formatMarketCap(tokenPrice?.price, token.supply)}
                                                </span>
                                            </div>
                                            {tokenPrice?.priceChange24h && (
                                                <div className="flex justify-between items-center">
                                                    <span className="text-gray-400 text-sm">24h Change</span>
                                                    <span className={`font-semibold ${
                                                        tokenPrice.priceChange24h >= 0 
                                                            ? "text-green-400" 
                                                            : "text-red-400"
                                                    }`}>
                                                        {tokenPrice.priceChange24h >= 0 ? "+" : ""}
                                                        {tokenPrice.priceChange24h.toFixed(2)}%
                                                    </span>
                                                </div>
                                            )}
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
                                                {formatTimeAgo(token.date_created)}
                                            </span>
                                            <div className="flex items-center gap-2">
                                                {token.lockinfo && (
                                                    <span className="text-green-400 text-xs flex items-center gap-1">
                                                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                                            <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                                                        </svg>
                                                        LP Locked
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Hover Effect */}
                                    <div className="h-1 bg-gradient-to-r from-blue-500 to-purple-600 transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left"></div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Refresh Button */}
                <div className="mt-8 text-center">
                    <button
                        onClick={fetchTokens}
                        className="bg-gray-800 hover:bg-gray-700 text-white px-6 py-3 rounded-lg font-medium transition-colors inline-flex items-center gap-2"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Refresh Tokens
                    </button>
                </div>
            </div>
        </div>
    );
};

export default TokensPage;