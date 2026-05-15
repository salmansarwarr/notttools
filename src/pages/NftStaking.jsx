import React, { useState, useEffect } from "react";
import {
    Lock,
    Unlock,
    Trophy,
    RefreshCw,
    AlertCircle,
    Loader2,
} from "lucide-react";
import WalletLogin from "../components/Walletlogin";
import { useGlobalState } from "../hooks/useGlobalState";
import { useUnifiedWallet } from "../hooks/useUnifiedWallet";
import { getUserNFTs, stakeNFT, unstakeNFT } from "../hooks/frontend-functions";
import { getConfigInfo } from "../hooks/frontend-functions-old";
import { useTranslation } from "react-i18next";

const NftStaking = () => {
    const { t } = useTranslation();
    const { globalState } = useGlobalState();
    const wallet = useUnifiedWallet();

    const user = globalState?.user;
    const authToken = globalState?.authToken;
    const isLoggedIn = !!user && !!authToken && wallet.connected;

    const [selectedNFTs, setSelectedNFTs] = useState([]);
    const [userNFTs, setUserNFTs] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [loadingProgress, setLoadingProgress] = useState({
        current: 0,
        total: 0,
    });
    const [refreshing, setRefreshing] = useState(false);
    const [config, setConfig] = useState(null);
    const [error, setError] = useState(null);
    const [processingNFT, setProcessingNFT] = useState(null);

    // Load on mount
    useEffect(() => {
        if (isLoggedIn && wallet.publicKey) {
            loadData();
        }
    }, [isLoggedIn, wallet.publicKey]);

    const loadData = async () => {
        setIsLoading(true);
        setError(null);
        setLoadingProgress({ current: 0, total: 0 });

        try {
            console.log("📊 Loading data...");

            // Load config (fast)
            const configPromise = getConfigInfo(true);

            // Start loading NFTs
            const nftsPromise = getUserNFTs(wallet, (progress) => {
                setLoadingProgress(progress);
            });

            const [configData, nftsData] = await Promise.all([
                configPromise,
                nftsPromise,
            ]);

            setConfig(configData);
            setUserNFTs(nftsData || []);

            console.log("✅ Data loaded:", {
                config: configData,
                nfts: nftsData?.length || 0,
            });
        } catch (error) {
            console.error("❌ Error loading data:", error);
            setError(error.message || "Failed to load data");

            // Set empty defaults on error
            setUserNFTs([]);
            setConfig(null);
        } finally {
            setIsLoading(false);
            setLoadingProgress({ current: 0, total: 0 });
        }
    };

    const handleRefresh = async () => {
        setRefreshing(true);
        await loadData();
        setRefreshing(false);
    };

    const stakedNFTs = userNFTs.filter((nft) => nft.staked);
    const unstakedNFTs = userNFTs.filter((nft) => !nft.staked);

    const handleStakeNFTs = async () => {
        if (!isLoggedIn || selectedNFTs.length === 0) return;

        setIsLoading(true);
        setError(null);

        try {
            for (let i = 0; i < selectedNFTs.length; i++) {
                const mintAddress = selectedNFTs[i];
                setProcessingNFT(mintAddress);
                console.log(
                    `🔒 Staking ${i + 1}/${selectedNFTs.length}: ${mintAddress.slice(0, 8)}...`,
                );
                await stakeNFT(wallet, mintAddress);
            }

            setSelectedNFTs([]);
            await loadData();
        } catch (error) {
            console.error("❌ Stake error:", error);
            setError(error.message);
        } finally {
            setIsLoading(false);
            setProcessingNFT(null);
        }
    };

    const handleUnstakeNFT = async (mintAddress) => {
        if (!isLoggedIn) return;

        setIsLoading(true);
        setError(null);
        setProcessingNFT(mintAddress);

        try {
            console.log(`🔓 Unstaking: ${mintAddress.slice(0, 8)}...`);
            await unstakeNFT(wallet, mintAddress);
            await loadData();
        } catch (error) {
            console.error("❌ Unstake error:", error);
            setError(error.message);
        } finally {
            setIsLoading(false);
            setProcessingNFT(null);
        }
    };

    const toggleNFTSelection = (mintAddress) => {
        setSelectedNFTs((prev) =>
            prev.includes(mintAddress)
                ? prev.filter((id) => id !== mintAddress)
                : [...prev, mintAddress],
        );
    };

    const selectAllUnstaked = () => {
        setSelectedNFTs(unstakedNFTs.map((nft) => nft.mintAddress));
    };

    const deselectAll = () => {
        setSelectedNFTs([]);
    };

    if (!isLoggedIn) {
        return (
            <div className="min-h-screen bg-[#0A151E] pt-28 pb-20">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-12">
                        <h1 className="text-5xl font-bold text-white mb-6">
                            {t("nft_staking_title")}
                        </h1>
                        <p className="text-gray-400 text-xl">
                            {t("connect_to_stake")}
                        </p>
                    </div>
                    <div className="max-w-2xl mx-auto">
                        <div className="bg-gradient-to-br from-[#192630] to-[#1a2332] rounded-2xl p-8 border border-gray-700 text-center">
                            <Trophy
                                className="mx-auto text-yellow-400 mb-4"
                                size={64}
                            />
                            <h2 className="text-2xl font-bold text-white mb-4">
                                {t("ready_to_stake")}
                            </h2>
                            <p className="text-gray-400 mb-8">
                                {t("connect_to_stake_genesis")}
                            </p>
                            <WalletLogin />
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#0A151E] pt-28 pb-20">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="text-center mb-12">
                    <div className="inline-flex items-center gap-3 bg-gradient-to-r from-yellow-600/20 to-orange-600/20 border border-yellow-500/30 rounded-2xl px-6 py-3 mb-6">
                        <Trophy className="text-yellow-400" size={24} />
                        <span className="text-yellow-300 font-semibold">
                            {t("genesis_nft_staking")}
                        </span>
                        <button
                            onClick={handleRefresh}
                            disabled={refreshing || isLoading}
                            className="ml-2 p-1 rounded hover:bg-yellow-500/20 transition-colors disabled:opacity-50"
                        >
                            <RefreshCw
                                className={`text-yellow-400 ${refreshing ? "animate-spin" : ""}`}
                                size={16}
                            />
                        </button>
                    </div>

                    <h1 className="text-5xl font-bold text-white mb-6">
                        {t("stake_your_genesis")}
                    </h1>
                    <p className="text-gray-400 text-xl max-w-3xl mx-auto">
                        {t("stake_duration_desc", {
                            count: config?.stakingDurationMonths || "...",
                        })}
                    </p>
                </div>

                {/* Error Message */}
                {error && (
                    <div className="max-w-4xl mx-auto mb-8">
                        <div className="bg-red-600/20 border border-red-500/30 rounded-xl p-4 flex items-start gap-3">
                            <AlertCircle
                                className="text-red-400 flex-shrink-0"
                                size={20}
                            />
                            <div className="flex-1">
                                <div className="text-red-400 font-semibold">
                                    Error
                                </div>
                                <div className="text-sm text-gray-300">
                                    {error}
                                </div>
                            </div>
                            <button
                                onClick={() => setError(null)}
                                className="text-red-400 hover:text-red-300 text-xl leading-none"
                            >
                                ×
                            </button>
                        </div>
                    </div>
                )}

                {/* Loading State with Progress */}
                {isLoading && userNFTs.length === 0 ? (
                    <div className="bg-gradient-to-br from-[#192630] to-[#1a2332] rounded-2xl p-12 border border-gray-700">
                        <div className="text-center">
                            <Loader2 className="w-16 h-16 text-blue-400 animate-spin mx-auto mb-4" />
                            <div className="text-lg text-white font-semibold mb-2">
                                {t("loading_nfts")}
                            </div>
                            {loadingProgress.total > 0 && (
                                <>
                                    <div className="text-sm text-gray-400 mb-4">
                                        {t("processing_nfts", {
                                            current: loadingProgress.current,
                                            total: loadingProgress.total,
                                        })}
                                    </div>
                                    <div className="max-w-md mx-auto bg-gray-700 rounded-full h-2 overflow-hidden">
                                        <div
                                            className="bg-gradient-to-r from-blue-500 to-purple-500 h-full transition-all duration-300"
                                            style={{
                                                width: `${(loadingProgress.current / loadingProgress.total) * 100}%`,
                                            }}
                                        />
                                    </div>
                                </>
                            )}
                            {loadingProgress.total === 0 && (
                                <div className="text-sm text-gray-400">
                                    {t("fetching_accounts")}
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    <>
                        {/* Stats */}
                        <div className="bg-gradient-to-br from-[#192630] to-[#1a2332] rounded-2xl p-8 border border-gray-700 mb-8">
                            <h2 className="text-2xl font-bold text-white mb-6">
                                {t("overview")}
                            </h2>
                            <div className="grid md:grid-cols-3 gap-6">
                                <div className="text-center">
                                    <div className="text-3xl font-bold text-green-400">
                                        {stakedNFTs.length}
                                    </div>
                                    <div className="text-gray-400">
                                        {t("staked")}
                                    </div>
                                </div>
                                <div className="text-center">
                                    <div className="text-3xl font-bold text-blue-400">
                                        {unstakedNFTs.length}
                                    </div>
                                    <div className="text-gray-400">
                                        {t("available_nav")}
                                    </div>
                                </div>
                                <div className="text-center">
                                    <div className="text-3xl font-bold text-purple-400">
                                        {config?.stakingDurationMonths || "..."}{" "}
                                        mo
                                    </div>
                                    <div className="text-gray-400">
                                        {t("lock_period")}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* No NFTs */}
                        {userNFTs.length === 0 && !isLoading && (
                            <div className="bg-gradient-to-br from-[#192630] to-[#1a2332] rounded-2xl p-12 border border-gray-700 text-center">
                                <Trophy
                                    className="mx-auto text-gray-600 mb-4"
                                    size={64}
                                />
                                <h3 className="text-2xl font-bold text-white mb-2">
                                    {t("no_nfts_found")}
                                </h3>
                                <p className="text-gray-400 mb-6">
                                    {t("mint_to_stake")}
                                </p>
                                <a
                                    href="/nft-minting"
                                    className="inline-block bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white px-8 py-3 rounded-xl font-semibold transition-all"
                                >
                                    {t("mint_nfts_btn")}
                                </a>
                            </div>
                        )}

                        {/* Unstaked NFTs */}
                        {unstakedNFTs.length > 0 && (
                            <div className="mb-8">
                                <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
                                    <h2 className="text-3xl font-bold text-white">
                                        {t("available")} ({unstakedNFTs.length})
                                    </h2>
                                    <div className="flex items-center gap-3">
                                        {unstakedNFTs.length > 0 && (
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={selectAllUnstaked}
                                                    className="text-sm text-blue-400 hover:text-blue-300 px-3 py-1 rounded-lg border border-blue-500/30 hover:border-blue-500/50 transition-colors"
                                                >
                                                    {t("select_all")}
                                                </button>
                                                {selectedNFTs.length > 0 && (
                                                    <button
                                                        onClick={deselectAll}
                                                        className="text-sm text-gray-400 hover:text-gray-300 px-3 py-1 rounded-lg border border-gray-600 hover:border-gray-500 transition-colors"
                                                    >
                                                        {t("deselect_all")}
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                        {selectedNFTs.length > 0 && (
                                            <button
                                                onClick={handleStakeNFTs}
                                                disabled={isLoading}
                                                className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-6 py-3 rounded-xl font-semibold flex items-center gap-2 transition-all"
                                            >
                                                {isLoading ? (
                                                    <>
                                                        <Loader2 className="w-4 h-4 animate-spin" />
                                                        {t("staking_status")}
                                                    </>
                                                ) : (
                                                    <>
                                                        <Lock size={16} />
                                                        {t("stake_nfts_btn", {
                                                            count: selectedNFTs.length,
                                                        })}
                                                    </>
                                                )}
                                            </button>
                                        )}
                                    </div>
                                </div>

                                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                                    {unstakedNFTs.map((nft) => (
                                        <div
                                            key={nft.mintAddress}
                                            onClick={() =>
                                                !isLoading &&
                                                toggleNFTSelection(
                                                    nft.mintAddress,
                                                )
                                            }
                                            className={`bg-gradient-to-br from-[#192630] to-[#1a2332] rounded-2xl p-4 border cursor-pointer transition-all ${
                                                selectedNFTs.includes(
                                                    nft.mintAddress,
                                                )
                                                    ? "border-green-500 scale-105 shadow-lg shadow-green-500/20"
                                                    : "border-gray-700 hover:border-gray-600 hover:scale-102"
                                            } ${isLoading ? "opacity-50 cursor-not-allowed" : ""}`}
                                        >
                                            <div className="aspect-square bg-gray-800 rounded-lg mb-4 overflow-hidden relative">
                                                <img
                                                    src={nft.image}
                                                    alt={nft.name}
                                                    loading="lazy"
                                                    className="w-full h-full object-cover"
                                                    onError={(e) =>
                                                        (e.target.src =
                                                            "/logo.jpeg")
                                                    }
                                                />
                                                {selectedNFTs.includes(
                                                    nft.mintAddress,
                                                ) && (
                                                    <div className="absolute top-2 right-2 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center shadow-lg">
                                                        <span className="text-white text-sm font-bold">
                                                            ✓
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                            <h3 className="text-lg font-bold text-white truncate mb-1">
                                                {nft.name}
                                            </h3>
                                            <span className="inline-block text-xs px-2 py-1 rounded bg-purple-500/20 text-purple-300">
                                                {nft.symbol}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Staked NFTs */}
                        {stakedNFTs.length > 0 && (
                            <div>
                                <h2 className="text-3xl font-bold text-white mb-6">
                                    {t("staked")} ({stakedNFTs.length})
                                </h2>
                                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                                    {stakedNFTs.map((nft) => (
                                        <div
                                            key={nft.mintAddress}
                                            className="bg-gradient-to-br from-[#192630] to-[#1a2332] rounded-2xl p-4 border border-green-500/30 hover:border-green-500/50 transition-all"
                                        >
                                            <div className="aspect-square bg-gray-800 rounded-lg mb-4 overflow-hidden relative">
                                                <img
                                                    src={nft.image}
                                                    alt={nft.name}
                                                    loading="lazy"
                                                    className="w-full h-full object-cover"
                                                    onError={(e) =>
                                                        (e.target.src =
                                                            "/logo.jpeg")
                                                    }
                                                />
                                                <div className="absolute top-2 right-2 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center shadow-lg">
                                                    <Lock
                                                        className="text-white"
                                                        size={14}
                                                    />
                                                </div>
                                            </div>
                                            <h3 className="text-lg font-bold text-white truncate mb-2">
                                                {nft.name}
                                            </h3>
                                            <span className="inline-block text-xs px-2 py-1 rounded bg-yellow-500/20 text-yellow-300 mb-3">
                                                {nft.symbol}
                                            </span>
                                            <div className="mt-3 space-y-2">
                                                <div className="text-xs text-gray-500">
                                                    Staked:{" "}
                                                    {nft.stakeDate
                                                        ? new Date(
                                                              nft.stakeDate,
                                                          ).toLocaleDateString()
                                                        : "N/A"}
                                                </div>
                                                <div className="text-sm text-green-400 font-semibold">
                                                    ✨ {t("premium_active")}
                                                </div>
                                                {nft.isLocked ? (
                                                    <div className="text-xs text-orange-400 font-medium">
                                                        🔒{" "}
                                                        {t(
                                                            nft.daysRemaining ===
                                                                1
                                                                ? "days_remaining"
                                                                : "days_remaining_plural",
                                                            {
                                                                count: nft.daysRemaining,
                                                            },
                                                        )}
                                                    </div>
                                                ) : (
                                                    <div className="text-xs text-blue-400 font-medium">
                                                        🔓 {t("unlocked_ready")}
                                                    </div>
                                                )}
                                            </div>
                                            <button
                                                onClick={() =>
                                                    handleUnstakeNFT(
                                                        nft.mintAddress,
                                                    )
                                                }
                                                disabled={
                                                    isLoading ||
                                                    nft.isLocked ||
                                                    processingNFT ===
                                                        nft.mintAddress
                                                }
                                                className="w-full mt-4 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white py-2 rounded-lg font-semibold flex items-center justify-center gap-2 transition-all"
                                            >
                                                {processingNFT ===
                                                nft.mintAddress ? (
                                                    <>
                                                        <Loader2 className="w-4 h-4 animate-spin" />
                                                        {t("unstaking_status")}
                                                    </>
                                                ) : (
                                                    <>
                                                        <Unlock size={16} />
                                                        {nft.isLocked
                                                            ? t("locked_days", {
                                                                  count: nft.daysRemaining,
                                                              })
                                                            : t("unstake")}
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default NftStaking;
