import React, { useState, useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { createTokenWithMetadata } from "../utils/tokenCreator";
import { getUserStakes } from "../hooks/frontend-functions";
import { useGlobalState } from "../hooks/useGlobalState";
import constants from "../constants";
import axios from "axios";
import { useUnifiedWallet } from "../hooks/useUnifiedWallet";

const CreateCoin = () => {
  const wallet = useUnifiedWallet();
  const { globalState } = useGlobalState();

  // Commission settings state
  const [commissionSettings, setCommissionSettings] = useState(null); // başta null
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);

  const [formData, setFormData] = useState({
    coinName: "",
    ticker: "",
    description: "",
    website: "",
    twitter: "",
    telegram: "",
    coinMedia: null,
    banner: null,
    initialSupply: 100000000,
  });

  const [errors, setErrors] = useState({});
  const [mediaPreview, setMediaPreview] = useState(null);
  const [bannerPreview, setBannerPreview] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [creationResult, setCreationResult] = useState(null);
  const [hasStakedNFT, setHasStakedNFT] = useState(false);
  const [isCheckingStake, setIsCheckingStake] = useState(true);
  const [stakeError, setStakeError] = useState(null);

  // Legal agreement checkboxes
  const [agreements, setAgreements] = useState({
    generalStatement: false,
    legalAdvice: false,
    privacyPolicy: false,
    euToken: false,
  });

  // Load commission settings from backend
  useEffect(() => {
    const loadCommissionSettings = async () => {
      try {
        setIsLoadingSettings(true);
        console.log("🔍 Loading commission settings from backend...");

        const response = await axios.get(
          `${constants.backend_url}/items/settings`
        );
        setCommissionSettings({
          treasury_wallet: response.data.data.treasury_wallet,
          token_creation_fee: response.data.data.token_creation_fee, // direkt kullan
        });
        console.log(response);
      } catch (error) {
        console.error("❌ Error loading commission settings:", error);
        // Keep default values
      } finally {
        setIsLoadingSettings(false);
      }
    };

    loadCommissionSettings();
  }, [globalState.authToken]);

  // Kullanıcının stake edilmiş NFT'si var mı kontrol et
  useEffect(() => {
    const checkStakedNFTs = async () => {
      if (!wallet.connected || !wallet.publicKey) {
        setHasStakedNFT(false);
        setIsCheckingStake(false);
        return;
      }

      try {
        setIsCheckingStake(true);
        setStakeError(null);

        console.log("🔍 Checking staked NFTs for user...");
        const stakes = await getUserStakes(wallet);

        console.log("📊 Stake results:", stakes);

        // Stake edilmiş NFT var mı kontrol et - doğru field'ı kullan
        const hasStaked = stakes && stakes.stakes && stakes.stakes.length > 0;
        setHasStakedNFT(hasStaked);

        console.log("✅ Has staked NFT:", hasStaked);
        console.log("📊 Stakes count:", stakes?.stakes?.length || 0);
      } catch (error) {
        console.error("❌ Error checking staked NFTs:", error);
        setStakeError("Failed to check staked NFTs. Please try again.");
        setHasStakedNFT(false);
      } finally {
        setIsCheckingStake(false);
      }
    };

    checkStakedNFTs();
  }, [wallet.connected, wallet.publicKey]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const validateFile = (file, type) => {
    const errors = [];

    if (type === "coin") {
      const isImage = file.type.startsWith("image/");
      const isVideo = file.type.startsWith("video/");

      if (isImage) {
        if (file.size > 15 * 1024 * 1024) {
          errors.push("Image must be under 15MB");
        }
        if (!["image/jpeg", "image/png", "image/gif"].includes(file.type)) {
          errors.push("Image must be .jpg, .png, or .gif");
        }
      } else if (isVideo) {
        if (file.size > 30 * 1024 * 1024) {
          errors.push("Video must be under 30MB");
        }
        if (file.type !== "video/mp4") {
          errors.push("Video must be .mp4");
        }
      } else {
        errors.push("File must be an image or video");
      }
    } else if (type === "banner") {
      if (file.size > 4.3 * 1024 * 1024) {
        errors.push("Banner must be under 4.3MB");
      }
      if (!["image/jpeg", "image/png", "image/gif"].includes(file.type)) {
        errors.push("Banner must be .jpg, .png, or .gif");
      }
    }

    return errors;
  };

  const createPreview = (file, type) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      if (type === "coin") {
        setMediaPreview(e.target.result);
      } else {
        setBannerPreview(e.target.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e, type) => {
    const file = e.target.files[0];
    if (file) {
      const fileErrors = validateFile(file, type);
      if (fileErrors.length > 0) {
        setErrors((prev) => ({
          ...prev,
          [type]: fileErrors,
        }));
        return;
      }

      setFormData((prev) => ({
        ...prev,
        [type === "coin" ? "coinMedia" : "banner"]: file,
      }));

      setErrors((prev) => ({
        ...prev,
        [type]: [],
      }));

      createPreview(file, type);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Wallet bağlantı kontrolü
    if (!wallet.connected) {
      return;
    }

    // Validation
    const newErrors = {};
    if (!formData.coinName.trim()) newErrors.coinName = "Coin name is required";
    if (!formData.ticker.trim()) newErrors.ticker = "Ticker is required";
    if (!formData.coinMedia)
      newErrors.coinMedia = "Coin image or video is required";

    // Legal agreement validations
    if (!agreements.generalStatement) {
      newErrors.generalStatement = "You must accept the General Statement";
    }
    if (!agreements.legalAdvice) {
      newErrors.legalAdvice = "You must accept the Legal Advice";
    }
    if (!agreements.privacyPolicy) {
      newErrors.privacyPolicy = "You must accept the Privacy Policy";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      setIsCreating(true);

      // TokenCreator'a uygun format için form data'yı düzenle
      const tokenFormData = {
        coinName: formData.coinName.trim(),
        ticker: formData.ticker.trim().toUpperCase(),
        description: formData.description.trim(),
        website: formData.website.trim(),
        twitter: formData.twitter.trim(),
        telegram: formData.telegram.trim(),
        initialSupply: formData.initialSupply,
        // Legal agreements
        agreements: {
          generalStatement: agreements.generalStatement,
          legalAdvice: agreements.legalAdvice,
          privacyPolicy: agreements.privacyPolicy,
          euToken: agreements.euToken,
          acceptedAt: new Date().toISOString(),
        },
      };

      console.log("Creating token with data:", tokenFormData);
      console.log("Commission settings:", commissionSettings);

      // Token oluştur - komisyon bilgisini de gönder
      const commissionData = !hasStakedNFT
        ? {
            amount: commissionSettings.token_creation_fee,
            walletAddress: commissionSettings.treasury_wallet,
          }
        : null;

      const result = await createTokenWithMetadata(
        tokenFormData,
        wallet,
        commissionData
      );

      console.log("Token creation result:", result);

      setCreationResult(result);

      // Directus'a token bilgilerini kaydet
      try {
        console.log("Saving token to Directus...");

        let logoFileId = null;
        let bannerFileId = null;

        // Önce logo'yu yükle
        if (formData.coinMedia) {
          try {
            const logoFormData = new FormData();
            logoFormData.append("file", formData.coinMedia);

            const logoResponse = await fetch(`${constants.backend_url}/files`, {
              method: "POST",
              headers: {
                Authorization: `Bearer ${globalState.authToken}`,
              },
              body: logoFormData,
            });

            if (logoResponse.ok) {
              const logoResult = await logoResponse.json();
              logoFileId = logoResult.data.id;
              console.log("Logo uploaded successfully:", logoFileId);
            } else {
              console.warn("Failed to upload logo:", logoResponse.status);
            }
          } catch (logoError) {
            console.error("Error uploading logo:", logoError);
          }
        }

        // Sonra banner'ı yükle
        if (formData.banner) {
          try {
            const bannerFormData = new FormData();
            bannerFormData.append("file", formData.banner);

            const bannerResponse = await fetch(
              `${constants.backend_url}/files`,
              {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${globalState.authToken}`,
                },
                body: bannerFormData,
              }
            );

            if (bannerResponse.ok) {
              const bannerResult = await bannerResponse.json();
              bannerFileId = bannerResult.data.id;
              console.log("Banner uploaded successfully:", bannerFileId);
            } else {
              console.warn("Failed to upload banner:", bannerResponse.status);
            }
          } catch (bannerError) {
            console.error("Error uploading banner:", bannerError);
          }
        }

        // Son olarak project'i kaydet
        const projectData = {
          name: tokenFormData.coinName,
          symbol: tokenFormData.ticker,
          contract_address: result.mintAddress,
          description: tokenFormData.description || null,
          launch_tx: result.signature,
          chain: "solana",
          user: globalState.user?.id || wallet.publicKey.toString(),
          twitter: tokenFormData.twitter || null,
          telegram: tokenFormData.telegram || null,
          website: tokenFormData.website || null,
          featured: false,
          status: "published",
          logo: logoFileId, // File ID'si
          banner_image: bannerFileId, // File ID'si
        };

        const response = await fetch(
          `${constants.backend_url}/items/projects`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${globalState.authToken}`,
            },
            body: JSON.stringify(projectData),
          }
        );

        if (response.ok) {
          const savedProject = await response.json();
          console.log("Token saved to Directus successfully:", savedProject);
        } else {
          console.warn(
            "Failed to save token to Directus:",
            response.status,
            response.statusText
          );
          // Directus kaydetme hatası, fakat token oluşturma başarılı
        }
      } catch (directusError) {
        console.error("Error saving to Directus:", directusError);
        // Directus kaydetme hatası, fakat token oluşturma başarılı
      }

      // Success message
      console.log(
        `Token created successfully!\n\nMint Address: ${
          result.mintAddress
        }\nTransaction: ${result.signature}\n\nNetwork: Solana ${
          constants.network.type === "mainnet-beta"
            ? "Mainnet"
            : constants.network.type.charAt(0).toUpperCase() +
              constants.network.type.slice(1)
        }`
      );
    } catch (error) {
      console.error("Token creation failed:", error);

      // Detaylı hata mesajı
      let errorMessage = "Token creation failed";
      if (error.message) {
        errorMessage += `: ${error.message}`;
      }
      if (error.response?.data?.message) {
        errorMessage += ` (${error.response.data.message})`;
      }

      console.error(errorMessage);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A151E] py-8 px-4 pt-28">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Form Section */}
          <div className="bg-[#192630] rounded-2xl shadow-2xl p-8 border border-gray-700">
            <h1 className="text-3xl font-bold text-white mb-8 text-center">
              Create New Coin
            </h1>

            {/* Commission Settings Loading */}
            {isLoadingSettings ? (
              <div className="mb-6 p-4 bg-blue-900/30 border border-blue-600/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-400"></div>
                  <p className="text-blue-300">
                    Loading commission settings...
                  </p>
                </div>
              </div>
            ) : null}

            {/* Stake Requirement Info */}
            {isCheckingStake ? (
              <div className="mb-6 p-4 bg-blue-900/30 border border-blue-600/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-400"></div>
                  <p className="text-blue-300">Checking your staked NFTs...</p>
                </div>
              </div>
            ) : stakeError ? (
              <div className="mb-6 p-4 bg-red-900/30 border border-red-600/50 rounded-lg">
                <p className="text-red-300">{stakeError}</p>
              </div>
            ) : !wallet.connected ? (
              <div className="mb-6 p-4 bg-yellow-900/30 border border-yellow-600/50 rounded-lg">
                <h3 className="text-yellow-300 font-semibold mb-2">
                  🔗 Wallet Required
                </h3>
                <p className="text-yellow-200 text-sm">
                  Please connect your wallet to check your eligibility for token
                  creation.
                </p>
              </div>
            ) : !hasStakedNFT ? (
              <div className="mb-6 p-4 bg-orange-900/30 border border-orange-600/50 rounded-lg">
                <h3 className="text-orange-300 font-semibold mb-2">
                  � Token Creation Options
                </h3>
                <p className="text-orange-200 text-sm mb-3">
                  You don't have staked NFTs, but you can still create tokens by
                  paying a {commissionSettings?.token_creation_fee} SOL
                  commission.
                </p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <a
                    href="/nft-staking"
                    className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                  >
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
                        d="M13 7l5 5m0 0l-5 5m5-5H6"
                      />
                    </svg>
                    Stake NFT (Free)
                  </a>
                  <div className="inline-flex items-center gap-2 bg-orange-600/20 border border-orange-500/30 text-orange-300 px-4 py-2 rounded-lg text-sm font-medium">
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
                        d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"
                      />
                    </svg>
                    Pay {commissionSettings?.token_creation_fee} SOL Commission
                  </div>
                </div>
              </div>
            ) : (
              <div className="mb-6 p-4 bg-green-900/30 border border-green-600/50 rounded-lg">
                <h3 className="text-green-300 font-semibold mb-2">
                  ✅ Eligible for Token Creation
                </h3>
                <p className="text-green-200 text-sm">
                  You have staked NFTs! You can now create your own token with
                  metadata.
                </p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Basic Info */}
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-white border-b border-gray-600 pb-2">
                  Basic Information
                </h2>

                <div className="space-y-4">
                  <div>
                    <label
                      htmlFor="coinName"
                      className="block text-sm font-medium text-gray-300 mb-2"
                    >
                      Coin Name * (Max 32 characters)
                    </label>
                    <input
                      type="text"
                      id="coinName"
                      name="coinName"
                      value={formData.coinName}
                      onChange={handleInputChange}
                      maxLength="32"
                      className={`w-full px-4 py-3 bg-gray-800/50 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-white placeholder-gray-400 ${
                        errors.coinName
                          ? "border-red-500 bg-red-900/20"
                          : "border-gray-600"
                      }`}
                      placeholder="Enter coin name"
                    />
                    <p className="text-xs text-gray-400 mt-1">
                      {formData.coinName.length}/32 characters
                    </p>
                    {errors.coinName && (
                      <p className="mt-2 text-sm text-red-400">
                        {errors.coinName}
                      </p>
                    )}
                  </div>

                  <div>
                    <label
                      htmlFor="ticker"
                      className="block text-sm font-medium text-gray-300 mb-2"
                    >
                      Ticker * (Max 10 characters)
                    </label>
                    <input
                      type="text"
                      id="ticker"
                      name="ticker"
                      value={formData.ticker}
                      onChange={handleInputChange}
                      className={`w-full px-4 py-3 bg-gray-800/50 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-white placeholder-gray-400 ${
                        errors.ticker
                          ? "border-red-500 bg-red-900/20"
                          : "border-gray-600"
                      }`}
                      placeholder="Enter ticker symbol"
                      maxLength="10"
                      style={{ textTransform: "uppercase" }}
                    />
                    <p className="text-xs text-gray-400 mt-1">
                      {formData.ticker.length}/10 characters
                    </p>
                    {errors.ticker && (
                      <p className="mt-2 text-sm text-red-400">
                        {errors.ticker}
                      </p>
                    )}
                  </div>

                  <div>
                    <label
                      htmlFor="description"
                      className="block text-sm font-medium text-gray-300 mb-2"
                    >
                      Description (Optional)
                    </label>
                    <textarea
                      id="description"
                      name="description"
                      value={formData.description}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 bg-gray-800/50 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-none text-white placeholder-gray-400"
                      placeholder="Enter coin description"
                      rows="4"
                    />
                  </div>
                </div>
              </div>

              {/* Social Links */}
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-white border-b border-gray-600 pb-2">
                  Social Links (Optional)
                </h2>

                <div className="space-y-4">
                  <div>
                    <label
                      htmlFor="website"
                      className="block text-sm font-medium text-gray-300 mb-2"
                    >
                      Website
                    </label>
                    <input
                      type="url"
                      id="website"
                      name="website"
                      value={formData.website}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 bg-gray-800/50 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-white placeholder-gray-400"
                      placeholder="https://example.com"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="twitter"
                      className="block text-sm font-medium text-gray-300 mb-2"
                    >
                      X (Twitter)
                    </label>
                    <input
                      type="url"
                      id="twitter"
                      name="twitter"
                      value={formData.twitter}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 bg-gray-800/50 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-white placeholder-gray-400"
                      placeholder="https://x.com/username"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="telegram"
                      className="block text-sm font-medium text-gray-300 mb-2"
                    >
                      Telegram
                    </label>
                    <input
                      type="url"
                      id="telegram"
                      name="telegram"
                      value={formData.telegram}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 bg-gray-800/50 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-white placeholder-gray-400"
                      placeholder="https://t.me/username"
                    />
                  </div>
                </div>
              </div>

              {/* Token Supply */}
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-white border-b border-gray-600 pb-2">
                  Token Supply
                </h2>

                <div>
                  <label
                    htmlFor="initialSupply"
                    className="block text-sm font-medium text-gray-300 mb-2"
                  >
                    Initial Supply (Tokens to mint)
                  </label>
                  <input
                    type="number"
                    id="initialSupply"
                    name="initialSupply"
                    value={formData.initialSupply}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 bg-gray-800/50 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-white placeholder-gray-400"
                    placeholder="1000000"
                    min="0"
                    step="1"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Number of tokens to mint to your wallet (with 9 decimals)
                  </p>
                </div>
              </div>

              {/* Coin Media */}
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-white border-b border-gray-600 pb-2">
                  Coin Image/Video *
                </h2>

                <div className="bg-blue-900/30 border border-blue-600/50 rounded-lg p-4">
                  <div className="text-sm text-blue-300 space-y-1">
                    <p>
                      <strong>Image:</strong> Max 15MB, .jpg/.gif/.png
                      recommended
                    </p>
                    <p>
                      <strong>Video:</strong> Max 30MB, .mp4 recommended
                    </p>
                    <p>
                      <strong>Resolution:</strong> Min. 1000x1000px, 1:1 square
                      recommended for images
                    </p>
                    <p>
                      <strong>Video:</strong> 16:9 or 9:16, 1080p+ recommended
                    </p>
                  </div>
                </div>

                <div>
                  <label htmlFor="coinMedia" className="block">
                    <div className="border-2 border-dashed border-gray-600 rounded-lg p-8 text-center hover:border-blue-500 hover:bg-gray-800/30 transition-colors cursor-pointer">
                      <div className="space-y-2">
                        <svg
                          className="mx-auto h-12 w-12 text-gray-400"
                          stroke="currentColor"
                          fill="none"
                          viewBox="0 0 48 48"
                        >
                          <path
                            d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                        <div className="text-gray-300">
                          <p className="font-medium">Select Image or Video</p>
                          <p className="text-sm text-gray-400">
                            Click to browse files
                          </p>
                        </div>
                      </div>
                    </div>
                    <input
                      type="file"
                      id="coinMedia"
                      accept="image/*,video/mp4"
                      onChange={(e) => handleFileChange(e, "coin")}
                      className="hidden"
                    />
                  </label>

                  {formData.coinMedia && (
                    <div className="mt-3 p-3 bg-green-900/30 border border-green-600/50 rounded-lg">
                      <p className="text-sm text-green-300">
                        <strong>Selected:</strong> {formData.coinMedia.name}
                      </p>
                    </div>
                  )}

                  {errors.coinMedia && typeof errors.coinMedia === "string" && (
                    <p className="mt-2 text-sm text-red-400">
                      {errors.coinMedia}
                    </p>
                  )}
                  {errors.coin &&
                    errors.coin.map((error, index) => (
                      <p key={index} className="mt-2 text-sm text-red-400">
                        {error}
                      </p>
                    ))}
                </div>
              </div>

              {/* Banner */}
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-white border-b border-gray-600 pb-2">
                  Upload Banner (Optional)
                </h2>

                <div className="bg-amber-900/30 border border-amber-600/50 rounded-lg p-4">
                  <div className="text-sm text-amber-300 space-y-1">
                    <p>
                      This will be shown on the coin page in addition to the
                      coin image.
                    </p>
                    <p>
                      <strong>File:</strong> Max 4.3MB, .jpg/.gif/.png
                      recommended
                    </p>
                    <p>
                      <strong>Resolution:</strong> 3:1 aspect ratio, 1500x500px
                      recommended
                    </p>
                    <p>
                      <strong>Note:</strong> You can only do this when creating
                      the coin, and it cannot be changed later.
                    </p>
                  </div>
                </div>

                <div>
                  <label htmlFor="banner" className="block">
                    <div className="border-2 border-dashed border-gray-600 rounded-lg p-8 text-center hover:border-blue-500 hover:bg-gray-800/30 transition-colors cursor-pointer">
                      <div className="space-y-2">
                        <svg
                          className="mx-auto h-12 w-12 text-gray-400"
                          stroke="currentColor"
                          fill="none"
                          viewBox="0 0 48 48"
                        >
                          <path
                            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h36v16a2 2 0 01-2 2H8a2 2 0 01-2-2V20zM6 12a2 2 0 002-2h32a2 2 0 012 2v8H6V12z"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                        <div className="text-gray-300">
                          <p className="font-medium">Select Banner Image</p>
                          <p className="text-sm text-gray-400">
                            Click to browse files
                          </p>
                        </div>
                      </div>
                    </div>
                    <input
                      type="file"
                      id="banner"
                      accept="image/*"
                      onChange={(e) => handleFileChange(e, "banner")}
                      className="hidden"
                    />
                  </label>

                  {formData.banner && (
                    <div className="mt-3 p-3 bg-green-900/30 border border-green-600/50 rounded-lg">
                      <p className="text-sm text-green-300">
                        <strong>Selected:</strong> {formData.banner.name}
                      </p>
                    </div>
                  )}

                  {errors.banner &&
                    errors.banner.map((error, index) => (
                      <p key={index} className="mt-2 text-sm text-red-400">
                        {error}
                      </p>
                    ))}
                </div>
              </div>

              {/* Legal Agreements & Compliance Section */}
              <div className="bg-gradient-to-br from-[#1e2832] to-[#1a2430] border border-gray-700/50 rounded-xl p-6">
                <h3 className="text-xl font-semibold text-white mb-6 flex items-center gap-3">
                  <div className="w-6 h-6 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full flex items-center justify-center">
                    <svg
                      className="w-3 h-3 text-white"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  Legal Agreements & Compliance
                </h3>

                <div className="space-y-4">
                  {/* General Statement */}
                  <div className="flex items-start gap-3 p-4 bg-gray-800/30 rounded-xl border border-gray-700/50">
                    <input
                      type="checkbox"
                      id="generalStatement"
                      checked={agreements.generalStatement}
                      onChange={(e) =>
                        setAgreements((prev) => ({
                          ...prev,
                          generalStatement: e.target.checked,
                        }))
                      }
                      className="mt-1 w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500 focus:ring-2"
                    />
                    <label
                      htmlFor="generalStatement"
                      className="text-gray-300 text-sm leading-relaxed"
                    >
                      I have read and accept the{" "}
                      <a
                        href="/general-statement"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-400 hover:text-blue-300 underline transition-colors"
                      >
                        General Statement
                      </a>{" "}
                      regarding token creation and platform usage.
                    </label>
                  </div>
                  {errors.generalStatement && (
                    <p className="text-red-400 text-sm ml-7">
                      {errors.generalStatement}
                    </p>
                  )}

                  {/* Legal Advice */}
                  <div className="flex items-start gap-3 p-4 bg-gray-800/30 rounded-xl border border-gray-700/50">
                    <input
                      type="checkbox"
                      id="legalAdvice"
                      checked={agreements.legalAdvice}
                      onChange={(e) =>
                        setAgreements((prev) => ({
                          ...prev,
                          legalAdvice: e.target.checked,
                        }))
                      }
                      className="mt-1 w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500 focus:ring-2"
                    />
                    <label
                      htmlFor="legalAdvice"
                      className="text-gray-300 text-sm leading-relaxed"
                    >
                      I have read and understand the{" "}
                      <a
                        href="/legal-advice"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-400 hover:text-blue-300 underline transition-colors"
                      >
                        Legal Advice
                      </a>{" "}
                      and acknowledge the legal implications of token creation.
                    </label>
                  </div>
                  {errors.legalAdvice && (
                    <p className="text-red-400 text-sm ml-7">
                      {errors.legalAdvice}
                    </p>
                  )}

                  {/* Privacy Policy */}
                  <div className="flex items-start gap-3 p-4 bg-gray-800/30 rounded-xl border border-gray-700/50">
                    <input
                      type="checkbox"
                      id="privacyPolicy"
                      checked={agreements.privacyPolicy}
                      onChange={(e) =>
                        setAgreements((prev) => ({
                          ...prev,
                          privacyPolicy: e.target.checked,
                        }))
                      }
                      className="mt-1 w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500 focus:ring-2"
                    />
                    <label
                      htmlFor="privacyPolicy"
                      className="text-gray-300 text-sm leading-relaxed"
                    >
                      I have read and accept the{" "}
                      <a
                        href="/privacy-policy"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-400 hover:text-blue-300 underline transition-colors"
                      >
                        Privacy Policy
                      </a>{" "}
                      regarding data collection and usage.
                    </label>
                  </div>
                  {errors.privacyPolicy && (
                    <p className="text-red-400 text-sm ml-7">
                      {errors.privacyPolicy}
                    </p>
                  )}

                  {/* EU Token Checkbox */}
                  <div className="flex items-start gap-3 p-4 bg-gradient-to-r from-blue-800/20 to-purple-800/20 rounded-xl border border-blue-500/30">
                    <input
                      type="checkbox"
                      id="euToken"
                      checked={agreements.euToken}
                      onChange={(e) =>
                        setAgreements((prev) => ({
                          ...prev,
                          euToken: e.target.checked,
                        }))
                      }
                      className="mt-1 w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500 focus:ring-2"
                    />
                    <label
                      htmlFor="euToken"
                      className="text-gray-300 text-sm leading-relaxed"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-blue-300 font-medium">
                          EU Token Declaration
                        </span>
                        <div className="text-xs bg-blue-500/20 text-blue-300 px-2 py-1 rounded">
                          Optional
                        </div>
                      </div>
                      This token will be created and operated in accordance with
                      European Union regulations and guidelines.
                    </label>
                  </div>
                </div>

                <div className="mt-6 p-4 bg-yellow-600/10 border border-yellow-500/30 rounded-xl">
                  <div className="flex items-start gap-3">
                    <svg
                      className="w-5 h-5 text-yellow-400 mt-0.5 flex-shrink-0"
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
                      <p className="text-yellow-200 text-sm font-medium mb-1">
                        Important Notice
                      </p>
                      <p className="text-yellow-100 text-xs leading-relaxed">
                        By proceeding with token creation, you acknowledge that
                        you have read and understood all legal documents. Token
                        creation involves financial and legal responsibilities.
                        Please ensure compliance with your local jurisdiction.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={
                  isCreating ||
                  isLoadingSettings ||
                  !wallet.connected ||
                  isCheckingStake ||
                  !agreements.generalStatement ||
                  !agreements.legalAdvice ||
                  !agreements.privacyPolicy
                }
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white font-medium py-3 px-6 rounded-lg transition-all hover:transform hover:scale-105 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-[#192630] disabled:transform-none disabled:cursor-not-allowed"
              >
                {isCreating
                  ? "Creating Token..."
                  : isLoadingSettings
                  ? "Loading..."
                  : hasStakedNFT
                  ? "Create Token (Free)"
                  : commissionSettings
                  ? `Create Token (${commissionSettings.token_creation_fee} SOL)`
                  : "Loading..."}
              </button>

              {!wallet.connected && (
                <p className="text-yellow-400 text-sm text-center">
                  Please connect your wallet to create a token
                </p>
              )}

              {wallet.connected &&
                !hasStakedNFT &&
                !isCheckingStake &&
                commissionSettings && (
                  <p className="text-orange-400 text-sm text-center">
                    You can create a token by paying{" "}
                    {commissionSettings.token_creation_fee} SOL commission
                  </p>
                )}
            </form>

            {/* Creation Result */}
            {creationResult && (
              <div className="mt-6 p-4 bg-green-900/30 border border-green-600/50 rounded-lg">
                <h3 className="text-green-300 font-semibold mb-2">
                  Token Created Successfully!
                </h3>
                <div className="text-sm text-green-200 space-y-1">
                  <p>
                    <strong>Mint Address:</strong> {creationResult.mintAddress}
                  </p>
                  {creationResult.metadataAddress && (
                    <p>
                      <strong>Metadata Address:</strong>{" "}
                      {creationResult.metadataAddress}
                    </p>
                  )}

                  <p>
                    <strong>Network:</strong> Solana{" "}
                    {constants.network.type === "mainnet-beta"
                      ? "Mainnet"
                      : constants.network.type.charAt(0).toUpperCase() +
                        constants.network.type.slice(1)}
                  </p>
                  {creationResult.initialSupply && (
                    <p>
                      <strong>Initial Supply:</strong>{" "}
                      {creationResult.initialSupply} tokens
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Preview Section */}
          <div className="bg-[#192630] rounded-2xl shadow-2xl p-8 border border-gray-700 sticky top-28 h-fit">
            <h2 className="text-2xl font-bold text-white mb-6 text-center">
              Preview
            </h2>

            {/* Banner Preview */}
            {bannerPreview && (
              <div className="mb-6">
                <div className="w-full h-32 bg-gray-800 rounded-lg overflow-hidden">
                  <img
                    src={bannerPreview}
                    alt="Banner preview"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            )}

            {/* Coin Card Preview */}
            <div className="bg-[#243340] rounded-xl p-6 border border-gray-600">
              {/* Coin Media */}
              <div className="mb-4">
                {mediaPreview ? (
                  <div className="w-24 h-24 mx-auto bg-gray-800 rounded-full overflow-hidden">
                    {formData.coinMedia?.type?.startsWith("video/") ? (
                      <video
                        src={mediaPreview}
                        className="w-full h-full object-cover"
                        muted
                        loop
                        autoPlay
                      />
                    ) : (
                      <img
                        src={mediaPreview}
                        alt="Coin preview"
                        className="w-full h-full object-cover"
                      />
                    )}
                  </div>
                ) : (
                  <div className="w-24 h-24 mx-auto bg-gray-700 rounded-full flex items-center justify-center">
                    <svg
                      className="w-8 h-8 text-gray-500"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h36v16a2 2 0 01-2 2H8a2 2 0 01-2-2V20zM6 12a2 2 0 002-2h32a2 2 0 012 2v8H6V12z"
                      />
                    </svg>
                  </div>
                )}
              </div>

              {/* Coin Info */}
              <div className="text-center">
                <h3 className="text-xl font-bold text-white mb-1">
                  {formData.coinName || "Coin Name"}
                </h3>
                <p className="text-gray-400 text-sm mb-3">
                  {formData.ticker
                    ? `$${formData.ticker.toUpperCase()}`
                    : "$TICKER"}
                </p>

                {formData.description && (
                  <p className="text-gray-300 text-sm mb-4 leading-relaxed">
                    {formData.description}
                  </p>
                )}

                {/* Token Supply Info */}
                {formData.initialSupply > 0 && (
                  <div className="bg-gray-800/50 rounded-lg p-3 mb-4">
                    <p className="text-gray-400 text-xs">Initial Supply</p>
                    <p className="text-white font-bold">
                      {parseInt(formData.initialSupply).toLocaleString()} tokens
                    </p>
                  </div>
                )}

                {/* Social Links */}
                {(formData.website ||
                  formData.twitter ||
                  formData.telegram) && (
                  <div className="flex justify-center space-x-3 mb-4">
                    {formData.website && (
                      <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                        <svg
                          className="w-4 h-4 text-white"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M10 18a8 8 0 100-16 8 8 0 000 16zM4.332 8.027a6.012 6.012 0 011.912-2.706C6.512 5.73 6.974 6 7.5 6A1.5 1.5 0 009 7.5V8a2 2 0 004 0 2 2 0 011.523-1.943A5.977 5.977 0 0116 10c0 .34-.028.675-.083 1H15a2 2 0 00-2 2v2.197A5.973 5.973 0 0110 16v-2a2 2 0 00-2-2 2 2 0 01-2-2 2 2 0 00-1.668-1.973z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </div>
                    )}
                    {formData.twitter && (
                      <div className="w-8 h-8 bg-black rounded-full flex items-center justify-center">
                        <svg
                          className="w-4 h-4 text-white"
                          fill="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                        </svg>
                      </div>
                    )}
                    {formData.telegram && (
                      <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                        <svg
                          className="w-4 h-4 text-white"
                          fill="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
                        </svg>
                      </div>
                    )}
                  </div>
                )}

                {/* Mock Stats */}
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div className="bg-gray-800/50 rounded-lg p-3">
                    <p className="text-gray-400 text-xs">Market Cap</p>
                    <p className="text-white font-bold">$0</p>
                  </div>
                  <div className="bg-gray-800/50 rounded-lg p-3">
                    <p className="text-gray-400 text-xs">24h Volume</p>
                    <p className="text-white font-bold">$0</p>
                  </div>
                </div>
              </div>
            </div>

            {!formData.coinName && !formData.ticker && !mediaPreview && (
              <div className="text-center text-gray-400 mt-6">
                <p className="text-sm">Fill in the form to see preview</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateCoin;