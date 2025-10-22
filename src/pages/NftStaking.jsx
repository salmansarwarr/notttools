import React, { useState, useEffect } from "react";
import { Image } from "@heroui/react";
import {
  Zap,
  TrendingUp,
  Clock,
  Gift,
  Star,
  Lock,
  Unlock,
  Trophy,
  Crown,
  ExternalLink,
  RefreshCw,
} from "lucide-react";
import WalletLogin from "../components/Walletlogin";
import { useGlobalState } from "../hooks/useGlobalState";
import { useUnifiedWallet  } from "../hooks/useUnifiedWallet";
import {
  getUserStakes,
  getUserNFTs,
  stakeNFT,
  unstakeNFT,
  getConfigInfo,
} from "../hooks/frontend-functions";

const NftStaking = () => {
  const { globalState } = useGlobalState();
  const wallet = useUnifiedWallet();

  const user = globalState?.user;
  const authToken = globalState?.authToken;
  const isLoggedIn = !!user && !!authToken && wallet.connected;

  const [selectedNFTs, setSelectedNFTs] = useState([]);
  const [stakingInfo, setStakingInfo] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [config, setConfig] = useState(null);
  const [imageLoadingStates, setImageLoadingStates] = useState({});

  // Load config and user stakes on component mount
  useEffect(() => {
    loadConfig();
    if (isLoggedIn && wallet.publicKey) {
      loadUserStakes();
    }
  }, [isLoggedIn, wallet.publicKey]);

  const loadConfig = async () => {
    try {
      const configData = await getConfigInfo();
      setConfig(configData);
    } catch (error) {
      console.error("Error loading config:", error);
      console.error("Failed to load staking configuration");
    }
  };

  const loadUserStakes = async () => {
    if (!wallet.publicKey || !wallet.connected) return;

    setIsLoading(true);
    try {
      // Tüm NFT'leri getir (stake edilmiş + edilmemiş)
      const userNFTs = await getUserNFTs(wallet);

      // Eski format için de stakes'i hazırla
      const stakes = userNFTs
        .filter((nft) => nft.staked)
        .map((nft) => ({
          mintAddress: nft.mintAddress,
          stakeInfoPda: nft.stakeInfoPda,
          stakeDate: nft.stakeDate,
          unlockDate: nft.unlockDate,
          isLocked: nft.isLocked,
          daysRemaining: nft.daysRemaining,
          explorerUrl: nft.explorerUrl,
        }));

      // User stats bilgilerini de al
      const userStats = await getUserStakes(wallet);

      setStakingInfo({
        nftsMinted: userStats.nftsMinted,
        nftsStaked: userStats.nftsStaked,
        userNFTs: userNFTs, // Tüm NFT'ler
        stakes: stakes, // Sadece stake edilmiş olanlar
      });

      console.log(
        `🎨 Loaded ${userNFTs.length} total NFTs (${stakes.length} staked)`
      );
    } catch (error) {
      console.error("Error loading user stakes:", error);
      console.error("Failed to load your staking information");
    } finally {
      setIsLoading(false);
    }
  };
  const handleRefresh = async () => {
    setRefreshing(true);
    setImageLoadingStates({}); // Refresh'te image loading state'leri sıfırla
    await loadUserStakes();
    setRefreshing(false);
    console.log("Staking information refreshed!");
  };

  const handleImageLoad = (id) => {
    setImageLoadingStates((prev) => ({ ...prev, [id]: false }));
  };

  const handleImageError = (e, id) => {
    e.target.src = "/pengu.png";
    setImageLoadingStates((prev) => ({ ...prev, [id]: false }));
  };

  // Staking pool info - config'ten gelen değerleri kullan
  const stakingPool = {
    name: "Genesis Staking Pool",
    apy: config?.apy || "180%",
    rewardToken: config?.rewardToken || "NTGC",
    rewardPerDay: config?.rewardPerDay || 10,
    totalStaked: config?.totalStaked || 0,
    totalRewardsDistributed: config?.totalRewardsDistributed || "0",
    lockPeriod: config?.lockPeriod || "No lock period",
    minStake: config?.minStake || 1,
    maxStake: config?.maxStake || "No limit",
  };

  // Gerçek user NFTs - stakingInfo'dan gel
  const userNFTs = stakingInfo?.userNFTs || [];

  // Eğer stakingInfo yoksa loading göster
  const isLoadingStakes = isLoading || (!stakingInfo && isLoggedIn);

  const stakedNFTs = userNFTs.filter((nft) => nft.staked);
  const unstakedNFTs = userNFTs.filter((nft) => !nft.staked);
  const totalRewards =
    stakingInfo?.totalRewards ||
    stakedNFTs.reduce((sum, nft) => sum + nft.rewards, 0);

  const handleStakeNFTs = async () => {
    if (!isLoggedIn) {
      return;
    }

    if (selectedNFTs.length === 0) {
      return;
    }

    setIsLoading(true);
    try {
      // For each selected NFT, call the stakeNFT function
      for (const mintAddress of selectedNFTs) {
        await stakeNFT(wallet, mintAddress);
        console.log(`Successfully staked NFT ${mintAddress.slice(0, 8)}...`);
      }

      console.log(
        `Successfully staked ${selectedNFTs.length} NFT${
          selectedNFTs.length > 1 ? "s" : ""
        }!`
      );
      setSelectedNFTs([]);

      // Refresh stakes after successful staking
      await loadUserStakes();
    } catch (error) {
      console.error("Error staking NFTs:", error);
      console.error("Failed to stake NFTs. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnstakeNFT = async (mintAddress) => {
    if (!isLoggedIn) {
      return;
    }

    setIsLoading(true);
    try {
      await unstakeNFT(wallet, mintAddress);
      console.log(`NFT ${mintAddress.slice(0, 8)}... unstaked successfully!`);

      // Refresh stakes after successful unstaking
      await loadUserStakes();
    } catch (error) {
      console.error("Error unstaking NFT:", error);
      console.error("Failed to unstake NFT. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClaimRewards = () => {
    if (!isLoggedIn) {
      return;
    }

    if (totalRewards === 0) {
      return;
    }

    // Placeholder claim logic
    console.log(
      `Claimed ${totalRewards.toFixed(2)} ${stakingPool.rewardToken} tokens!`
    );
  };

  const toggleNFTSelection = (nftId) => {
    setSelectedNFTs((prev) =>
      prev.includes(nftId)
        ? prev.filter((id) => id !== nftId)
        : [...prev, nftId]
    );
  };

  const getRarityColor = (rarity) => {
    switch (rarity) {
      case "Common":
        return "text-gray-400 bg-gray-600/20";
      case "Rare":
        return "text-blue-400 bg-blue-600/20";
      case "Epic":
        return "text-purple-400 bg-purple-600/20";
      case "Legendary":
        return "text-yellow-400 bg-yellow-600/20";
      default:
        return "text-gray-400 bg-gray-600/20";
    }
  };

  return (
    <div className="min-h-screen bg-[#0A151E] pt-28 pb-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header Section */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-3 bg-gradient-to-r from-yellow-600/20 to-orange-600/20 border border-yellow-500/30 rounded-2xl px-6 py-3 mb-6">
            <Trophy className="text-yellow-400" size={24} />
            <span className="text-yellow-300 font-semibold">
              Genesis NFT Staking
            </span>
            {isLoggedIn && (
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="ml-2 p-1 rounded hover:bg-yellow-500/20 transition-colors"
                title="Refresh staking info"
              >
                <RefreshCw
                  className={`text-yellow-400 ${
                    refreshing ? "animate-spin" : ""
                  }`}
                  size={16}
                />
              </button>
            )}
          </div>{" "}
          <h1 className="text-5xl font-bold text-white mb-6 bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent">
            Stake Your Genesis NFTs
          </h1>
          <p className="text-gray-400 text-xl max-w-3xl mx-auto leading-relaxed">
            Stake your Noottools Genesis NFTs to unlock free access to our token
            generation features. Staked NFTs grant premium platform privileges.
          </p>
        </div>

        {/* Main Content */}
        {!isLoggedIn ? (
          <div className="max-w-2xl mx-auto">
            <div className="bg-gradient-to-br from-[#192630] to-[#1a2332] rounded-2xl p-8 border border-gray-700 text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-2xl mx-auto mb-6 flex items-center justify-center">
                <Trophy className="text-white" size={32} />
              </div>

              <h2 className="text-2xl font-bold text-white mb-4">
                Ready to Start Earning?
              </h2>
              <p className="text-gray-400 mb-8">
                Connect your wallet and login to stake your Genesis NFTs and
                unlock free token generation features
              </p>

              <WalletLogin />
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Your Staking Overview */}
            <div className="bg-gradient-to-br from-[#192630] to-[#1a2332] rounded-2xl p-8 border border-gray-700">
              <h2 className="text-2xl font-bold text-white mb-6">
                Your Staking Overview
              </h2>

              <div className="grid md:grid-cols-2 gap-6 mb-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-400 mb-2">
                    {isLoadingStakes ? "Loading..." : stakedNFTs.length}
                  </div>
                  <div className="text-gray-400">NFTs Staked</div>
                  <div className="text-xs text-gray-500 mt-1">
                    Free token generation access
                  </div>
                </div>

                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-400 mb-2">
                    {isLoadingStakes ? "Loading..." : unstakedNFTs.length}
                  </div>
                  <div className="text-gray-400">Available to Stake</div>
                  <div className="text-xs text-gray-500 mt-1">
                    Ready for staking
                  </div>
                </div>
              </div>

              {stakedNFTs.length > 0 && (
                <div className="bg-green-600/20 border border-green-500/30 rounded-xl p-4 text-center">
                  <div className="text-green-400 font-semibold">
                    ✨ Premium Access Unlocked
                  </div>
                  <div className="text-sm text-gray-300 mt-1">
                    You can use token generation features for free!
                  </div>
                </div>
              )}
            </div>

            {/* Loading State */}
            {isLoadingStakes && (
              <div className="bg-gradient-to-br from-[#192630] to-[#1a2332] rounded-2xl p-8 border border-gray-700 text-center">
                <div className="text-lg text-gray-400">
                  Loading your NFTs...
                </div>
              </div>
            )}

            {/* No NFTs State */}
            {!isLoadingStakes && userNFTs.length === 0 && (
              <div className="bg-gradient-to-br from-[#192630] to-[#1a2332] rounded-2xl p-8 border border-gray-700 text-center">
                <div className="text-lg text-gray-400 mb-4">
                  No Genesis NFTs found in your wallet
                </div>
                <p className="text-gray-500">
                  You need to mint Genesis NFTs to start staking.
                </p>
              </div>
            )}

            {/* Unstaked NFTs */}
            {!isLoadingStakes && unstakedNFTs.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-3xl font-bold text-white">
                    Available NFTs
                  </h2>
                  {selectedNFTs.length > 0 && (
                    <button
                      onClick={handleStakeNFTs}
                      disabled={isLoading}
                      className="bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 disabled:from-gray-600 disabled:to-gray-700 text-white px-6 py-2 rounded-lg font-semibold transition-all flex items-center gap-2 disabled:cursor-not-allowed"
                    >
                      <Lock size={16} />
                      {isLoading
                        ? "Staking..."
                        : `Stake Selected (${selectedNFTs.length})`}
                    </button>
                  )}
                </div>

                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {unstakedNFTs.map((nft) => (
                    <div
                      key={nft.mintAddress}
                      className={`bg-gradient-to-br from-[#192630] to-[#1a2332] rounded-2xl p-4 border transition-all cursor-pointer ${
                        selectedNFTs.includes(nft.mintAddress)
                          ? "border-green-500 transform scale-105"
                          : "border-gray-700 hover:border-gray-600"
                      }`}
                      onClick={() => toggleNFTSelection(nft.mintAddress)}
                    >
                      <div className="aspect-square bg-gray-800 rounded-lg mb-4 p-4 flex items-center justify-center relative">
                        {imageLoadingStates[nft.mintAddress] !== false && (
                          <div className="absolute inset-0 bg-gray-800 animate-pulse flex items-center justify-center rounded-lg">
                            <div className="w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
                          </div>
                        )}
                        <img
                          src={nft.image}
                          alt={nft.name || "NFT"}
                          className={`w-full h-full object-cover rounded-lg transition-opacity duration-300 ${
                            imageLoadingStates[nft.mintAddress] !== false
                              ? "opacity-0"
                              : "opacity-100"
                          }`}
                          onLoad={() => handleImageLoad(nft.mintAddress)}
                          onError={(e) => handleImageError(e, nft.mintAddress)}
                        />
                        {selectedNFTs.includes(nft.mintAddress) && (
                          <div className="absolute top-2 right-2 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                            <span className="text-white text-xs font-bold">
                              ✓
                            </span>
                          </div>
                        )}
                      </div>

                      <h3 className="text-lg font-bold text-white mb-2">
                        {nft.name}
                      </h3>

                      <div className="mb-3">
                        <span className="text-xs px-2 py-1 rounded bg-purple-500/20 text-purple-300">
                          {nft.symbol}
                        </span>
                      </div>

                      <div className="text-sm text-gray-400">
                        Stake to unlock free token generation
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Staked NFTs */}
            {!isLoadingStakes && stakedNFTs.length > 0 && (
              <div>
                <h2 className="text-3xl font-bold text-white mb-6">
                  Staked NFTs
                </h2>
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {stakedNFTs.map((nft) => (
                    <div
                      key={nft.mintAddress}
                      className="bg-gradient-to-br from-[#192630] to-[#1a2332] rounded-2xl p-4 border border-gray-700"
                    >
                      <div className="aspect-square bg-gray-800 rounded-lg mb-4 p-4 flex items-center justify-center relative">
                        {imageLoadingStates[`staked_${nft.mintAddress}`] !==
                          false && (
                          <div className="absolute inset-0 bg-gray-800 animate-pulse flex items-center justify-center rounded-lg">
                            <div className="w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
                          </div>
                        )}
                        <img
                          src={nft.image}
                          alt={nft.name || "Staked NFT"}
                          className={`w-full h-full object-cover rounded-lg transition-opacity duration-300 ${
                            imageLoadingStates[`staked_${nft.mintAddress}`] !==
                            false
                              ? "opacity-0"
                              : "opacity-100"
                          }`}
                          onLoad={() =>
                            handleImageLoad(`staked_${nft.mintAddress}`)
                          }
                          onError={(e) =>
                            handleImageError(e, `staked_${nft.mintAddress}`)
                          }
                        />
                        <div className="absolute top-2 right-2 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                          <Lock className="text-white" size={12} />
                        </div>
                      </div>

                      <h3 className="text-lg font-bold text-white mb-2">
                        {nft.name}
                      </h3>

                      <div className="mb-3">
                        <span className="text-xs px-2 py-1 rounded bg-yellow-500/20 text-yellow-300">
                          {nft.symbol}
                        </span>
                      </div>

                      <div className="space-y-2 mb-4">
                        <div className="text-xs text-gray-500">
                          Staked:{" "}
                          {nft.stakeDate
                            ? new Date(nft.stakeDate).toLocaleDateString()
                            : "N/A"}
                        </div>

                        <div className="text-sm text-green-400 font-semibold">
                          ✨ Premium Access Active
                        </div>

                        {nft.isLocked && (
                          <div className="text-xs text-orange-400">
                            🔒 Locked for {nft.daysRemaining} days
                          </div>
                        )}

                        <div className="text-xs text-gray-400">
                          Free token generation unlocked
                        </div>
                      </div>

                      <button
                        onClick={() => handleUnstakeNFT(nft.mintAddress)}
                        disabled={isLoading || nft.isLocked}
                        className="w-full bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white py-2 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2 disabled:cursor-not-allowed"
                      >
                        <Unlock size={16} />
                        {isLoading
                          ? "Unstaking..."
                          : nft.isLocked
                          ? "Locked"
                          : "Unstake"}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default NftStaking;
