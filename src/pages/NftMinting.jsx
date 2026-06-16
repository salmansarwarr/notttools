import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Image } from "@heroui/react";
import {
    Upload,
    Image as ImageIcon,
    Palette,
    Zap,
    Shield,
    Sparkles,
    Crown,
    Star,
    RefreshCw,
} from "lucide-react";
import WalletLogin from "../components/Walletlogin";
import { useGlobalState } from "../hooks/useGlobalState";
import { useUnifiedWallet } from "../hooks/useUnifiedWallet";
import constants from "../constants.jsx";
import { mintRandomNFT } from "../hooks/frontend-functions";
import { getConfigInfo } from "../hooks/frontend-functions-old.js";
import { useTranslation } from "react-i18next";

const NftMinting = () => {
    const { t } = useTranslation();
    const { globalState } = useGlobalState();
    const wallet = useUnifiedWallet();
    const user = globalState?.user;
    const authToken = globalState?.authToken;
    const isLoggedIn = !!user && !!authToken && wallet.connected;

    const [isMinting, setIsMinting] = useState(false);
    const [mintAmount, setMintAmount] = useState(1);
    const [configInfo, setConfigInfo] = useState(null);
    const [mintResults, setMintResults] = useState([]);
    const [previewNfts, setPreviewNfts] = useState([]);
    const [isLoadingPreview, setIsLoadingPreview] = useState(false);
    const [imageLoadingStates, setImageLoadingStates] = useState({});

    // Config bilgilerini yükle
    useEffect(() => {
        const loadConfigInfo = async () => {
            try {
                const config = await getConfigInfo();
                setConfigInfo(config);
                console.log("Config loaded:", config);
            } catch (error) {
                console.error("Error loading config:", error);
                // Default values if config can't be loaded
                setConfigInfo({
                    mintingFee: 0.1,
                    maxNftsPerWallet: 5,
                    totalMinted: 0,
                    totalStaked: 0,
                });
            }
        };

        loadConfigInfo();
        loadRandomNfts();
    }, []);

    // Random NFT'leri yükle
    const loadRandomNfts = async () => {
        setIsLoadingPreview(true);

        // İlk başta tüm resimleri loading olarak ayarla
        const initialLoadingStates = {};
        for (let i = 0; i < 4; i++) {
            initialLoadingStates[i] = true;
        }
        setImageLoadingStates(initialLoadingStates);

        try {
            const nftPromises = [];
            const usedIds = new Set();

            // 4 farklı random NFT getir
            while (nftPromises.length < 4) {
                const randomId = Math.floor(Math.random() * 5000) + 1;
                if (!usedIds.has(randomId)) {
                    usedIds.add(randomId);
                    nftPromises.push(
                        fetch(
                            `https://metadata.noottools.io/metadata/${randomId}.json`,
                        )
                            .then((res) => res.json())
                            .then((data) => ({
                                name: data.name || `NOOT Genesis #${randomId}`,
                                image:
                                    data.image ||
                                    `https://metadata.noottools.io/metadata/${randomId}.png`,
                                id: randomId,
                            }))
                            .catch((err) => ({
                                name: `NOOT Genesis #${randomId}`,
                                image: `https://metadata.noottools.io/metadata/${randomId}.png`,
                                id: randomId,
                            })),
                    );
                }
            }

            const nfts = await Promise.all(nftPromises);
            setPreviewNfts(nfts);
        } catch (error) {
            console.error("Error loading preview NFTs:", error);
            // Fallback NFTs
            setPreviewNfts(
                Array.from({ length: 4 }, (_, i) => ({
                    name: `NOOT Genesis #${Math.floor(Math.random() * 5000) + 1}`,
                    image: "/logo.jpeg",
                    id: Math.floor(Math.random() * 5000) + 1,
                })),
            );
        } finally {
            setIsLoadingPreview(false);
        }
    };

    const handleImageLoad = (index) => {
        setImageLoadingStates((prev) => ({ ...prev, [index]: false }));
    };

    const handleImageError = (e, index) => {
        e.target.src = "/logo.jpeg";
        setImageLoadingStates((prev) => ({ ...prev, [index]: false }));
    };

    const handleMintNFT = async () => {
        if (!isLoggedIn) {
            return;
        }

        if (!wallet.connected || !wallet.publicKey) {
            return;
        }

        if (!configInfo) {
            return;
        }

        if (mintAmount < 1) {
            return;
        }

        setIsMinting(true);
        const results = [];

        try {
            for (let i = 0; i < mintAmount; i++) {
                console.log(`Minting NFT ${i + 1} of ${mintAmount}...`);
                // Basit mint - parametresiz
                const result = await mintRandomNFT(
                    wallet,
                    "BwqA35BKbdEV5miEsJJkQU7373GSHc7qKcyHebtdjPPw",
                );
                results.push(result);
                console.log(`NFT ${i + 1} minted successfully!`);

                // Small delay between mints
                if (i < mintAmount - 1) {
                    await new Promise((resolve) => setTimeout(resolve, 1000));
                }
            }

            setMintResults(results);

            console.log(
                `Successfully minted ${mintAmount} NFT${mintAmount > 1 ? "s" : ""}!`,
            );
        } catch (error) {
            console.error("Minting error:", error);
            console.error(`Failed to mint NFT: ${error.message}`);
        } finally {
            setIsMinting(false);
        }
    };

    // Calculate values
    const totalPrice = configInfo
        ? (configInfo.mintingFee * mintAmount).toFixed(2)
        : "Loading...";

    const maxSupply = constants.nft?.maxSupply || 5000;
    const remaining = configInfo
        ? Math.max(0, maxSupply - configInfo.totalMinted)
        : maxSupply;

    return (
        <div className="min-h-screen bg-[#0A151E] pt-28 pb-20">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Hero Section */}
                <div className="text-center mb-16">
                    <div className="inline-flex items-center gap-3 bg-gradient-to-r from-purple-600/20 to-blue-600/20 border border-purple-500/30 rounded-2xl px-6 py-3 mb-8">
                        <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse"></div>
                        <span className="text-purple-300 font-semibold">
                            {t("nft_collection")}
                        </span>
                    </div>

                    <h1 className="text-5xl md:text-7xl font-bold text-white mb-6">
                        <span className="bg-gradient-to-r from-purple-400 via-blue-400 to-cyan-400 bg-clip-text text-transparent">
                            {t("mint_genesis_nfts")}
                        </span>
                    </h1>

                    <p className="text-xl text-gray-300 max-w-4xl mx-auto leading-relaxed mb-12">
                        {t("nft_minting_desc")}
                    </p>
                </div>

                {!isLoggedIn ? (
                    <div className="max-w-2xl mx-auto">
                        <div className="bg-gradient-to-br from-[#192630] to-[#1a2332] rounded-2xl p-12 text-center border border-gray-700">
                            <div className="w-20 h-20 bg-gradient-to-br from-purple-600/20 to-pink-600/20 rounded-full flex items-center justify-center mx-auto mb-6 border border-purple-500/30">
                                <Crown className="text-white" size={32} />
                            </div>

                            <h2 className="text-2xl font-bold text-white mb-4">
                                {t("ready_to_mint")}
                            </h2>
                            <p className="text-gray-400 mb-8">
                                {t("connect_to_mint")}
                            </p>

                            <WalletLogin />
                        </div>
                    </div>
                ) : (
                    <div className="grid lg:grid-cols-2 gap-8">
                        {/* Collection Preview */}
                        <div className="bg-gradient-to-br from-[#192630] to-[#1a2332] rounded-2xl p-8 border border-gray-700">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-2xl font-bold text-white">
                                    {t("random_system")}
                                </h2>
                                <button
                                    onClick={loadRandomNfts}
                                    disabled={isLoadingPreview}
                                    className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-800 text-white px-4 py-2 rounded-lg transition-colors"
                                >
                                    <RefreshCw
                                        className={`w-4 h-4 ${
                                            isLoadingPreview
                                                ? "animate-spin"
                                                : ""
                                        }`}
                                    />
                                    {t("refresh")}
                                </button>
                            </div>

                            {/* NFT Grid */}
                            <div className="grid grid-cols-2 gap-4 mb-6">
                                {previewNfts.map((nft, index) => (
                                    <div
                                        key={index}
                                        className="bg-gradient-to-br from-purple-600/20 to-pink-600/20 rounded-xl p-4 border border-purple-500/30"
                                    >
                                        <div className="aspect-square bg-gray-800/50 rounded-lg mb-3 overflow-hidden relative">
                                            {imageLoadingStates[index] && (
                                                <div className="absolute inset-0 bg-gray-800 animate-pulse flex items-center justify-center">
                                                    <div className="w-8 h-8 border-2 border-purple-400 border-t-transparent rounded-full animate-spin"></div>
                                                </div>
                                            )}
                                            <img
                                                src={nft.image}
                                                alt={nft.name || "NFT Preview"}
                                                className={`w-full h-full object-cover transition-opacity duration-300 ${
                                                    imageLoadingStates[index]
                                                        ? "opacity-0"
                                                        : "opacity-100"
                                                }`}
                                                onLoad={() =>
                                                    handleImageLoad(index)
                                                }
                                                onError={(e) =>
                                                    handleImageError(e, index)
                                                }
                                            />
                                        </div>
                                        <div className="text-center">
                                            <div className="text-sm font-bold text-white truncate">
                                                {nft.name || "NFT Preview"}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <h3 className="text-xl font-bold text-white mb-4">
                                {t("nft_features")}
                            </h3>
                            <div className="space-y-3">
                                {[
                                    t("feature_stakeable"),
                                    t("feature_premium"),
                                    t("feature_benefits"),
                                    t("feature_limited"),
                                ].map((feature, index) => (
                                    <div
                                        key={index}
                                        className="flex items-center gap-3"
                                    >
                                        <Star
                                            className="text-yellow-400 flex-shrink-0"
                                            size={16}
                                        />
                                        <span className="text-gray-300">
                                            {feature}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Minting Interface */}
                        <div className="bg-gradient-to-br from-[#192630] to-[#1a2332] rounded-2xl p-8 border border-gray-700">
                            <h2 className="text-2xl font-bold text-white mb-6">
                                {t("mint_your_nfts")}
                            </h2>

                            <div className="space-y-6">
                                {/* Collection Stats */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-gray-800/50 rounded-xl p-4 text-center">
                                        <div className="text-2xl font-bold text-purple-400 mb-1">
                                            {configInfo
                                                ? configInfo.totalMinted &&
                                                  configInfo.totalMinted.toLocaleString()
                                                : "Loading..."}
                                        </div>
                                        <div className="text-gray-400 text-sm">
                                            {t("minted")}
                                        </div>
                                    </div>
                                    <div className="bg-gray-800/50 rounded-xl p-4 text-center">
                                        <div className="text-2xl font-bold text-green-400 mb-1">
                                            {remaining &&
                                                remaining.toLocaleString()}
                                        </div>
                                        <div className="text-gray-400 text-sm">
                                            {t("remaining")}
                                        </div>
                                    </div>
                                </div>

                                {/* Amount Selector */}
                                <div>
                                    <label className="block text-gray-300 mb-3">
                                        {t("how_many_mint")}
                                    </label>
                                    <div className="flex items-center gap-4 mb-4">
                                        <button
                                            onClick={() =>
                                                setMintAmount(
                                                    Math.max(1, mintAmount - 1),
                                                )
                                            }
                                            disabled={
                                                isMinting || mintAmount <= 1
                                            }
                                            className="w-12 h-12 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:cursor-not-allowed rounded-lg flex items-center justify-center text-white font-bold text-xl transition-colors"
                                        >
                                            -
                                        </button>

                                        <div className="text-center">
                                            <div className="text-3xl font-bold text-white">
                                                {mintAmount}
                                            </div>
                                            <div className="text-sm text-gray-400">
                                                NFT{mintAmount > 1 ? "s" : ""}
                                            </div>
                                        </div>

                                        <button
                                            onClick={() => setMintAmount(Math.min(mintAmount + 1, configInfo?.maxNftsPerWallet ?? Infinity))}
                                            disabled={isMinting}
                                            className="w-12 h-12 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:cursor-not-allowed rounded-lg flex items-center justify-center text-white font-bold text-xl transition-colors"
                                        >
                                            +
                                        </button>
                                    </div>
                                </div>

                                {/* Quick Select */}
                                <div>
                                    <label className="block text-gray-300 mb-3">
                                        {t("quick_select")}
                                    </label>
                                    <div className="grid grid-cols-4 gap-2">
                                        {[1, 5, 10, 20].map((amount) => (
                                            <button
                                                key={amount}
                                                onClick={() =>
                                                    setMintAmount(amount)
                                                }
                                                disabled={isMinting}
                                                className={`py-2 px-4 rounded-lg font-semibold transition-all disabled:opacity-50 ${
                                                    mintAmount === amount
                                                        ? "bg-purple-600 text-white"
                                                        : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                                                }`}
                                            >
                                                {amount} NFT
                                                {amount > 1 ? "s" : ""}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Price Summary */}
                                <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-600">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-gray-400">
                                            {t("price_per_nft")}
                                        </span>
                                        <span className="text-white">
                                            {configInfo
                                                ? `${configInfo.mintingFee} SOL`
                                                : "Loading..."}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-gray-400">
                                            {t("quantity")}
                                        </span>
                                        <span className="text-white">
                                            {mintAmount}
                                        </span>
                                    </div>
                                    <div className="border-t border-gray-600 pt-2">
                                        <div className="flex justify-between items-center">
                                            <span className="text-lg font-bold text-white">
                                                {t("total")}
                                            </span>
                                            <span className="text-lg font-bold text-purple-400">
                                                {totalPrice} SOL
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Mint Button */}
                                <div className="space-y-3">
                                    {/* Candy Machine Mint Button */}
                                    <button
                                        onClick={() => handleMintNFT()}
                                        disabled={
                                            isMinting ||
                                            (configInfo && remaining === 0) ||
                                            !configInfo
                                        }
                                        className="w-full bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700 disabled:from-gray-600 disabled:to-gray-700 text-white py-4 rounded-xl font-semibold transition-all duration-300 transform hover:scale-105 disabled:scale-100 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                    >
                                        {isMinting ? (
                                            <>
                                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                                                {t("minting_nfts")}
                                            </>
                                        ) : !configInfo ? (
                                            "Loading..."
                                        ) : remaining === 0 ? (
                                            t("sold_out")
                                        ) : (
                                            <>
                                                🍭
                                                <span>
                                                    {t("mint_your_nfts_btn", {
                                                        count: mintAmount,
                                                    })}
                                                </span>
                                                <span className="text-pink-200">
                                                    ({totalPrice} SOL)
                                                </span>
                                            </>
                                        )}
                                    </button>
                                </div>

                                {/* Mint Results */}
                                {mintResults.length > 0 && (
                                    <div className="mt-6 space-y-4">
                                        <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                            <Sparkles
                                                className="text-yellow-400"
                                                size={20}
                                            />
                                            {t("successfully_minted")}
                                        </h3>

                                        <div className="space-y-3 max-h-64 overflow-y-auto">
                                            {mintResults.map(
                                                (result, index) => (
                                                    <div
                                                        key={index}
                                                        className="bg-gradient-to-r from-green-600/20 to-emerald-600/20 border border-green-500/30 rounded-xl p-4"
                                                    >
                                                        <div className="flex items-start justify-between mb-2">
                                                            <div>
                                                                <div className="text-white font-semibold">
                                                                    {
                                                                        result.nftName
                                                                    }
                                                                </div>
                                                                {result.nftId && (
                                                                    <div className="text-sm text-green-300">
                                                                        NFT ID:
                                                                        #
                                                                        {
                                                                            result.nftId
                                                                        }
                                                                    </div>
                                                                )}
                                                                <div className="text-xs text-gray-400 truncate">
                                                                    {
                                                                        result.mintAddress
                                                                    }
                                                                </div>
                                                            </div>
                                                            <div className="text-right">
                                                                <div className="text-xs text-green-300">
                                                                    Minted
                                                                </div>
                                                                <Star
                                                                    className="text-yellow-400 ml-auto"
                                                                    size={16}
                                                                />
                                                            </div>
                                                        </div>

                                                        <div className="flex gap-2">
                                                            <a
                                                                href={
                                                                    result.explorerUrl
                                                                }
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="text-xs bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 px-3 py-1 rounded-lg transition-colors"
                                                            >
                                                                View on Explorer
                                                            </a>
                                                            {result.nftUri && (
                                                                <a
                                                                    href={
                                                                        result.nftUri
                                                                    }
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="text-xs bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 px-3 py-1 rounded-lg transition-colors"
                                                                >
                                                                    View
                                                                    Metadata
                                                                </a>
                                                            )}
                                                        </div>
                                                    </div>
                                                ),
                                            )}
                                        </div>

                                        <button
                                            onClick={() => setMintResults([])}
                                            className="w-full text-sm text-gray-400 hover:text-white transition-colors"
                                        >
                                            {t("clear_results")}
                                        </button>
                                    </div>
                                )}

                                {configInfo &&
                                    remaining < 100 &&
                                    remaining > 0 && (
                                        <div className="text-center text-orange-400 text-sm font-semibold">
                                            ⚠️{" "}
                                            {t("only_remaining", {
                                                count: remaining,
                                            })}
                                        </div>
                                    )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default NftMinting;
