import React, { useState, useEffect, useMemo } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { createTokenWithMetadata } from "../utils/tokenCreator";
import { getUserStakes } from "../hooks/frontend-functions";
import { useGlobalState } from "../hooks/useGlobalState";
import constants from "../constants";
import axios from "axios";
import { useUnifiedWallet } from "../hooks/useUnifiedWallet";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import { useVanityMint } from "../hooks/useVanityMint";
import {
    Shield,
    Info,
    Globe,
    Twitter,
    Send,
    Tags,
    CheckCircle2,
    ArrowRight,
    ArrowLeft,
    Upload,
    Coins,
    Lock,
    Eye,
    AlertCircle,
    X,
} from "lucide-react";
import { toast } from "react-toastify";

const StepIndicator = ({ currentStep }) => {
    const steps = [
        { id: 1, name: "Token Info", icon: <Info size={16} /> },
        { id: 2, name: "Security", icon: <Shield size={16} /> },
        { id: 3, name: "Review", icon: <Eye size={16} /> },
    ];

    return (
        <div className="flex items-center justify-between w-full max-w-2xl mx-auto mb-12 relative">
            {/* Background Line */}
            <div className="absolute top-1/2 left-0 w-full h-0.5 bg-gray-800 -translate-y-1/2 z-0" />

            {/* Active Line */}
            <motion.div
                className="absolute top-1/2 left-0 h-0.5 bg-gradient-to-r from-cyan-500 to-purple-500 -translate-y-1/2 z-0"
                initial={{ width: "0%" }}
                animate={{ width: `${(currentStep - 1) * 50}%` }}
                transition={{ duration: 0.5, ease: "easeInOut" }}
            />

            {steps.map((step) => (
                <div
                    key={step.id}
                    className="relative z-10 flex flex-col items-center"
                >
                    <motion.div
                        initial={false}
                        animate={{
                            backgroundColor:
                                currentStep >= step.id
                                    ? "rgba(0, 242, 255, 1)"
                                    : "rgba(31, 41, 55, 1)",
                            scale: currentStep === step.id ? 1.2 : 1,
                            boxShadow:
                                currentStep === step.id
                                    ? "0 0 20px rgba(0, 242, 255, 0.5)"
                                    : "none",
                        }}
                        className={`w-10 h-10 rounded-full flex items-center justify-center text-white border-2 ${
                            currentStep >= step.id
                                ? "border-cyan-400"
                                : "border-gray-700"
                        }`}
                    >
                        {currentStep > step.id ? (
                            <CheckCircle2
                                size={20}
                                className="text-[#0A151E]"
                            />
                        ) : (
                            <span
                                className={`font-bold ${currentStep >= step.id ? "text-[#0A151E]" : "text-gray-400"}`}
                            >
                                {step.id}
                            </span>
                        )}
                    </motion.div>
                    <span
                        className={`mt-2 text-xs font-medium uppercase tracking-wider ${
                            currentStep >= step.id
                                ? "text-cyan-400"
                                : "text-gray-500"
                        }`}
                    >
                        {step.id}. {step.name}
                    </span>
                </div>
            ))}
        </div>
    );
};

const CreateCoin = () => {
    const { t } = useTranslation();
    const wallet = useUnifiedWallet();
    const { globalState } = useGlobalState();

    const [step, setStep] = useState(1);
    const [commissionSettings, setCommissionSettings] = useState(null);
    const [isLoadingSettings, setIsLoadingSettings] = useState(true);
    const [hasStakedNFT, setHasStakedNFT] = useState(false);
    const [isCheckingStake, setIsCheckingStake] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    const [creationResult, setCreationResult] = useState(null);
    const [mediaPreview, setMediaPreview] = useState(null);
    const [vanitySuffix, setVanitySuffix] = useState("NTL");

    const {
        findVanityMint,
        isSearching,
        attempts: vanityAttempts,
    } = useVanityMint();

    const [formData, setFormData] = useState({
        coinName: "",
        ticker: "",
        decimals: 9,
        totalSupply: 1000000,
        description: "",
        website: "",
        twitter: "",
        telegram: "",
        tags: "",
        coinMedia: null,
        revokeMint: false,
        revokeFreeze: false,
        revokeUpdate: false,
        useCustomSuffix: false,
    });

    const [errors, setErrors] = useState({});

    // Cost calculation
    const totalCost = useMemo(() => {
        if (!commissionSettings) return 0;
        let cost = hasStakedNFT
            ? 0
            : parseFloat(commissionSettings.token_creation_fee || 0.05);
        if (formData.revokeMint) cost += 0.05;
        if (formData.revokeFreeze) cost += 0.05;
        if (formData.revokeUpdate) cost += 0.05;
        // Check custom suffix fee
        if (formData.useCustomSuffix) {
            cost += 0.01;
        }
        return parseFloat(cost.toFixed(2));
    }, [
        commissionSettings,
        hasStakedNFT,
        formData.revokeMint,
        formData.revokeFreeze,
        formData.revokeUpdate,
        formData.useCustomSuffix,
    ]);

    // Load commission settings
    useEffect(() => {
        const loadSettings = async () => {
            try {
                setIsLoadingSettings(true);
                const response = await axios.get(
                    `${constants.backend_url}/items/settings`,
                );
                setCommissionSettings({
                    treasury_wallet: response.data.data.treasury_wallet,
                    token_creation_fee: response.data.data.token_creation_fee,
                });
            } catch (error) {
                console.error("Error loading settings:", error);
            } finally {
                setIsLoadingSettings(false);
            }
        };
        loadSettings();
    }, []);

    // Check staked NFTs
    useEffect(() => {
        const checkStakes = async () => {
            if (!wallet.connected || !wallet.publicKey) {
                setHasStakedNFT(false);
                setIsCheckingStake(false);
                return;
            }
            try {
                setIsCheckingStake(true);
                const stakes = await getUserStakes(wallet);
                setHasStakedNFT(
                    stakes && stakes.stakes && stakes.stakes.length > 0,
                );
            } catch (error) {
                console.error("Error checking stakes:", error);
            } finally {
                setIsCheckingStake(false);
            }
        };
        checkStakes();
    }, [wallet.connected, wallet.publicKey]);

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: type === "checkbox" ? checked : value,
        }));
        // Clear error when user types
        if (errors[name]) {
            setErrors((prev) => {
                const newErrors = { ...prev };
                delete newErrors[name];
                return newErrors;
            });
        }
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) {
                toast.error("File size too large (max 5MB)");
                return;
            }
            setFormData((prev) => ({ ...prev, coinMedia: file }));
            const reader = new FileReader();
            reader.onload = (e) => setMediaPreview(e.target.result);
            reader.readAsDataURL(file);
        }
    };

    const removeImage = (e) => {
        e.stopPropagation();
        setFormData((prev) => ({ ...prev, coinMedia: null }));
        setMediaPreview(null);
        const fileInput = document.getElementById("icon-upload");
        if (fileInput) fileInput.value = "";
    };

    const validateStep = (currentStep) => {
        const newErrors = {};
        if (currentStep === 1) {
            if (!formData.coinName.trim())
                newErrors.coinName = "Token name is required";
            if (!formData.ticker.trim())
                newErrors.ticker = "Ticker is required";
            if (!formData.totalSupply || formData.totalSupply <= 0)
                newErrors.totalSupply = "Invalid supply";
            if (!formData.coinMedia)
                newErrors.coinMedia = "Token icon is required";
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const nextStep = () => {
        if (validateStep(step)) {
            setStep((prev) => prev + 1);
            window.scrollTo(0, 0);
        }
    };

    const prevStep = () => {
        setStep((prev) => prev - 1);
        window.scrollTo(0, 0);
    };

    const handleDeploy = async () => {
        if (!wallet.connected) {
            toast.error("Please connect your wallet");
            return;
        }

        try {
            setIsCreating(true);

            // 1. Upload to Pinata
            const pinataFormData = new FormData();
            pinataFormData.append("file", formData.coinMedia);

            const pinataResponse = await fetch(
                "https://api.pinata.cloud/pinning/pinFileToIPFS",
                {
                    method: "POST",
                    headers: {
                        pinata_api_key: import.meta.env.VITE_PINATA_API_KEY,
                        pinata_secret_api_key: import.meta.env
                            .VITE_PINATA_SECRET_KEY,
                    },
                    body: pinataFormData,
                },
            );

            if (!pinataResponse.ok) throw new Error("Pinata upload failed");
            const pinataData = await pinataResponse.json();
            const imageUrl = `https://gateway.pinata.cloud/ipfs/${pinataData.IpfsHash}`;

            // 2. Prepare Token Data
            const tokenData = {
                ...formData,
                imageUrl,
                ticker: formData.ticker.toUpperCase(),
            };

            const commissionData =
                totalCost > 0
                    ? {
                          amount: totalCost,
                          walletAddress: commissionSettings.treasury_wallet,
                      }
                    : null;

            // 3. Find Vanity Address (New Step)
            let finalMint;
            if (formData.useCustomSuffix) {
                const cleanSuffix = vanitySuffix
                    .trim()
                    .toUpperCase()
                    .replace(/[^1-9A-HJ-NP-Za-km-z]/g, "")
                    .slice(0, 3) || "NTL";
                toast.info(`Generating vanity address... (${cleanSuffix})`);
                finalMint = await findVanityMint(cleanSuffix);
            } else {
                toast.info(`Generating default vanity address... (NTL)`);
                finalMint = await findVanityMint("NTL");
            }

            // 4. Create Token (Now passing the generated mint)
            const result = await createTokenWithMetadata(
                tokenData,
                wallet,
                finalMint,
                commissionData,
            );
            setCreationResult(result);
            toast.success("Token created successfully!");

            // 4. Save to Backend (Directus)
            await saveToBackend(result, imageUrl);
        } catch (error) {
            console.error("Deployment failed:", error);
            toast.error(error.message || "Deployment failed");
        } finally {
            setIsCreating(false);
        }
    };

    const saveToBackend = async (result, imageUrl) => {
        try {
            // First upload file to Directus to get ID
            const fileFormData = new FormData();
            fileFormData.append("file", formData.coinMedia);

            const fileResponse = await axios.post(
                `${constants.backend_url}/files`,
                fileFormData,
                {
                    headers: {
                        Authorization: `Bearer ${globalState.authToken}`,
                    },
                },
            );

            const logoId = fileResponse.data.data.id;

            const projectData = {
                name: formData.coinName,
                symbol: formData.ticker.toUpperCase(),
                contract_address: result.mintAddress,
                description: formData.description,
                launch_tx: result.signature,
                chain: "solana",
                user: globalState.user?.id || wallet.publicKey.toString(),
                twitter: formData.twitter,
                telegram: formData.telegram,
                website: formData.website,
                status: "published",
                logo: logoId,
                tags: formData.tags,
            };

            await axios.post(
                `${constants.backend_url}/items/projects`,
                projectData,
                {
                    headers: {
                        Authorization: `Bearer ${globalState.authToken}`,
                    },
                },
            );
        } catch (err) {
            console.error("Error saving to backend:", err);
        }
    };

    const renderStep = () => {
        switch (step) {
            case 1:
                return (
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="space-y-6"
                    >
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-cyan-500/10 rounded-lg">
                                <Coins className="text-cyan-400" size={24} />
                            </div>
                            <h2 className="text-2xl font-bold text-white">
                                Asset Information
                            </h2>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-400">
                                    Token Name*
                                </label>
                                <input
                                    type="text"
                                    name="coinName"
                                    value={formData.coinName}
                                    onChange={handleInputChange}
                                    placeholder="e.g. Daily Solana"
                                    className={`w-full bg-[#111C26] border ${errors.coinName ? "border-red-500" : "border-gray-800"} focus:border-cyan-500 rounded-xl px-4 py-3 text-white outline-none transition-all`}
                                />
                                <p className="text-xs text-gray-500">
                                    The full name of your cryptocurrency.
                                </p>
                                {errors.coinName && (
                                    <p className="text-xs text-red-500">
                                        {errors.coinName}
                                    </p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-400">
                                    Ticker Symbol*
                                </label>
                                <input
                                    type="text"
                                    name="ticker"
                                    value={formData.ticker}
                                    onChange={handleInputChange}
                                    placeholder="e.g. GOLD"
                                    className={`w-full bg-[#111C26] border ${errors.ticker ? "border-red-500" : "border-gray-800"} focus:border-cyan-500 rounded-xl px-4 py-3 text-white outline-none transition-all uppercase`}
                                />
                                <p className="text-xs text-gray-500">
                                    Short identifier (e.g. SOL, BTC).
                                </p>
                                {errors.ticker && (
                                    <p className="text-xs text-red-500">
                                        {errors.ticker}
                                    </p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-400">
                                    Decimals
                                </label>
                                <input
                                    type="number"
                                    name="decimals"
                                    value={formData.decimals}
                                    onChange={handleInputChange}
                                    className="w-full bg-[#111C26] border border-gray-800 focus:border-cyan-500 rounded-xl px-4 py-3 text-white outline-none transition-all"
                                />
                                <p className="text-xs text-gray-500">
                                    Standard is 9 for Solana tokens.
                                </p>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-400">
                                    Total Supply*
                                </label>
                                <input
                                    type="number"
                                    name="totalSupply"
                                    value={formData.totalSupply}
                                    onChange={handleInputChange}
                                    className={`w-full bg-[#111C26] border ${errors.totalSupply ? "border-red-500" : "border-gray-800"} focus:border-cyan-500 rounded-xl px-4 py-3 text-white outline-none transition-all`}
                                />
                                <p className="text-xs text-gray-500">
                                    Total amount of tokens that will ever exist.
                                </p>
                                {errors.totalSupply && (
                                    <p className="text-xs text-red-500">
                                        {errors.totalSupply}
                                    </p>
                                )}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-400">
                                Description
                            </label>
                            <textarea
                                name="description"
                                value={formData.description}
                                onChange={handleInputChange}
                                rows={4}
                                placeholder="Describe the utility or theme of your token..."
                                className="w-full bg-[#111C26] border border-gray-800 focus:border-cyan-500 rounded-xl px-4 py-3 text-white outline-none transition-all resize-none"
                            />
                            <p className="text-xs text-gray-500">
                                Appears on explorers and in wallets.
                            </p>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-400">
                                Token Icon*
                            </label>
                            <div
                                onClick={() =>
                                    document
                                        .getElementById("icon-upload")
                                        .click()
                                }
                                className={`w-full h-40 bg-[#111C26] border-2 border-dashed ${errors.coinMedia ? "border-red-500/50" : "border-gray-800"} hover:border-cyan-500/50 rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all relative overflow-hidden`}
                            >
                                {mediaPreview ? (
                                    <>
                                        <img
                                            src={mediaPreview}
                                            className="absolute inset-0 w-full h-full object-contain p-4"
                                            alt="Icon Preview"
                                        />
                                        <button
                                            type="button"
                                            onClick={removeImage}
                                            className="absolute top-2 right-2 p-1.5 bg-red-500/80 hover:bg-red-600 text-white rounded-full transition-colors z-20 shadow-lg"
                                        >
                                            <X size={16} />
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <Upload
                                            className="text-gray-600 mb-2"
                                            size={32}
                                        />
                                        <span className="text-gray-400 font-medium">
                                            Click to Upload Image
                                        </span>
                                        <span className="text-gray-600 text-xs mt-1">
                                            Square PNG/JPG, max 1MB
                                        </span>
                                    </>
                                )}
                                <input
                                    id="icon-upload"
                                    type="file"
                                    accept="image/*"
                                    onChange={handleFileChange}
                                    className="hidden"
                                />
                            </div>
                            {errors.coinMedia && (
                                <p className="text-xs text-red-500">
                                    {errors.coinMedia}
                                </p>
                            )}
                        </div>
                    </motion.div>
                );
            case 2:
                return (
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="space-y-8"
                    >
                        <div className="space-y-6">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-2 bg-purple-500/10 rounded-lg">
                                    <Lock
                                        className="text-purple-400"
                                        size={24}
                                    />
                                </div>
                                <h2 className="text-2xl font-bold text-white">
                                    Security & Permissions
                                </h2>
                            </div>

                            <div className="space-y-4 bg-[#111C26] p-6 rounded-2xl border border-gray-800">
                                <div className="flex items-center justify-between p-4 bg-gray-900/50 rounded-xl border border-gray-800 hover:border-cyan-500/30 transition-all">
                                    <div>
                                        <h4 className="text-white font-bold">
                                            Revoke Minting Power
                                        </h4>
                                        <p className="text-xs text-gray-500">
                                            Guarantees a fixed supply. Essential
                                            for meme coins.
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <span className="text-green-400 text-sm font-bold">
                                            +0.05 SOL
                                        </span>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input
                                                type="checkbox"
                                                name="revokeMint"
                                                checked={formData.revokeMint}
                                                onChange={handleInputChange}
                                                className="sr-only peer"
                                            />
                                            <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-500"></div>
                                        </label>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between p-4 bg-gray-900/50 rounded-xl border border-gray-800 hover:border-cyan-500/30 transition-all">
                                    <div>
                                        <h4 className="text-white font-bold">
                                            Revoke Freeze Power
                                        </h4>
                                        <p className="text-xs text-gray-500">
                                            Ensures you cannot lock user
                                            accounts. Required for DEXs.
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <span className="text-green-400 text-sm font-bold">
                                            +0.05 SOL
                                        </span>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input
                                                type="checkbox"
                                                name="revokeFreeze"
                                                checked={formData.revokeFreeze}
                                                onChange={handleInputChange}
                                                className="sr-only peer"
                                            />
                                            <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-500"></div>
                                        </label>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between p-4 bg-gray-900/50 rounded-xl border border-gray-800 hover:border-cyan-500/30 transition-all">
                                    <div>
                                        <h4 className="text-white font-bold">
                                            Revoke Update Power
                                        </h4>
                                        <p className="text-xs text-gray-500">
                                            Makes your logo and name permanent.
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <span className="text-green-400 text-sm font-bold">
                                            +0.05 SOL
                                        </span>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input
                                                type="checkbox"
                                                name="revokeUpdate"
                                                checked={formData.revokeUpdate}
                                                onChange={handleInputChange}
                                                className="sr-only peer"
                                            />
                                            <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-500"></div>
                                        </label>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-2 bg-cyan-500/10 rounded-lg">
                                    <Tags className="text-cyan-400" size={24} />
                                </div>
                                <h2 className="text-2xl font-bold text-white">
                                    Custom Mint Address
                                </h2>
                            </div>

                            <div className="bg-[#111C26] p-6 rounded-2xl border border-gray-800">
                                <div className="flex items-center justify-between mb-4">
                                    <div>
                                        <h3 className="text-white font-bold text-lg">
                                            Enable Custom Suffix
                                        </h3>
                                        <p className="text-gray-400 text-sm">
                                            By default, tokens end with 'NTL'. Enable this to choose your own 3-character suffix.
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <span className="text-green-400 text-sm font-bold">
                                            +0.01 SOL
                                        </span>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input
                                                type="checkbox"
                                                name="useCustomSuffix"
                                                checked={formData.useCustomSuffix}
                                                onChange={handleInputChange}
                                                className="sr-only peer"
                                            />
                                            <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-500"></div>
                                        </label>
                                    </div>
                                </div>

                                <AnimatePresence>
                                    {formData.useCustomSuffix && (
                                        <motion.div
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: "auto" }}
                                            exit={{ opacity: 0, height: 0 }}
                                            className="overflow-hidden"
                                        >
                                            <div className="flex items-center gap-3 pt-4 border-t border-gray-800">
                                                <span className="text-gray-500 text-sm font-mono">
                                                    ...ends with
                                                </span>
                                                <input
                                                    type="text"
                                                    value={vanitySuffix}
                                                    onChange={(e) =>
                                                        setVanitySuffix(
                                                            e.target.value
                                                                .toUpperCase()
                                                                .replace(
                                                                    /[^1-9A-HJ-NP-Za-km-z]/g,
                                                                    "",
                                                                )
                                                                .slice(0, 3),
                                                        )
                                                    }
                                                    placeholder="NTL"
                                                    className="w-32 bg-[#0A151E] border border-cyan-500/40 focus:border-cyan-400 rounded-xl px-4 py-2 text-white font-mono font-bold text-lg outline-none transition-all text-center tracking-widest uppercase"
                                                />
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-2 bg-cyan-500/10 rounded-lg">
                                    <Globe
                                        className="text-cyan-400"
                                        size={24}
                                    />
                                </div>
                                <h2 className="text-2xl font-bold text-white">
                                    Community Connections
                                </h2>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-400 flex items-center gap-2">
                                        <Globe size={14} /> Official Website
                                    </label>
                                    <input
                                        type="text"
                                        name="website"
                                        value={formData.website}
                                        onChange={handleInputChange}
                                        placeholder="https://yourproject.com"
                                        className="w-full bg-[#111C26] border border-gray-800 focus:border-cyan-500 rounded-xl px-4 py-3 text-white outline-none transition-all"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-400 flex items-center gap-2">
                                        <Twitter size={14} /> X (Twitter)
                                    </label>
                                    <input
                                        type="text"
                                        name="twitter"
                                        value={formData.twitter}
                                        onChange={handleInputChange}
                                        placeholder="https://x.com/yourproject"
                                        className="w-full bg-[#111C26] border border-gray-800 focus:border-cyan-500 rounded-xl px-4 py-3 text-white outline-none transition-all"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-400 flex items-center gap-2">
                                        <Send size={14} /> Telegram Group
                                    </label>
                                    <input
                                        type="text"
                                        name="telegram"
                                        value={formData.telegram}
                                        onChange={handleInputChange}
                                        placeholder="https://t.me/yourproject"
                                        className="w-full bg-[#111C26] border border-gray-800 focus:border-cyan-500 rounded-xl px-4 py-3 text-white outline-none transition-all"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-400 flex items-center gap-2">
                                        <Tags size={14} /> Project Tags
                                    </label>
                                    <input
                                        type="text"
                                        name="tags"
                                        value={formData.tags}
                                        onChange={handleInputChange}
                                        placeholder="Meme, DAO, DeFi"
                                        className="w-full bg-[#111C26] border border-gray-800 focus:border-cyan-500 rounded-xl px-4 py-3 text-white outline-none transition-all"
                                    />
                                    <p className="text-xs text-gray-500">
                                        Helps with discovery on explorers.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-gradient-to-r from-cyan-500/10 to-purple-500/10 border border-cyan-500/20 p-6 rounded-2xl">
                            <div className="flex items-center justify-between mb-4">
                                <span className="text-white font-bold">
                                    Deployment Fee:
                                </span>
                                <span className="text-cyan-400 font-bold text-lg">
                                    {totalCost} SOL
                                </span>
                            </div>
                            <p className="text-xs text-gray-500 flex items-start gap-2">
                                <AlertCircle
                                    size={14}
                                    className="mt-0.5 shrink-0"
                                />
                                Note: New tokens may appear as 'Unknown' in
                                Phantom during signing. This is normal until the
                                first block is confirmed.
                            </p>
                        </div>
                    </motion.div>
                );
            case 3:
                return (
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="space-y-8"
                    >
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-green-500/10 rounded-lg">
                                <CheckCircle2
                                    className="text-green-400"
                                    size={24}
                                />
                            </div>
                            <h2 className="text-2xl font-bold text-white">
                                Review & Confirm
                            </h2>
                        </div>

                        <div className="bg-[#111C26] rounded-2xl border border-gray-800 overflow-hidden">
                            <div className="p-6 border-b border-gray-800 flex items-center gap-4">
                                <div className="w-16 h-16 rounded-xl bg-gray-900 border border-gray-800 overflow-hidden">
                                    <img
                                        src={mediaPreview}
                                        className="w-full h-full object-cover"
                                        alt="Icon"
                                    />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-white">
                                        {formData.coinName}
                                    </h3>
                                    <p className="text-cyan-400 font-medium">
                                        ${formData.ticker.toUpperCase()}
                                    </p>
                                </div>
                            </div>

                            <div className="p-6 grid grid-cols-2 md:grid-cols-3 gap-6">
                                <div>
                                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">
                                        Supply
                                    </p>
                                    <p className="text-white font-medium">
                                        {formData.totalSupply.toLocaleString()}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">
                                        Decimals
                                    </p>
                                    <p className="text-white font-medium">
                                        {formData.decimals}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">
                                        Mint Revoked
                                    </p>
                                    <p
                                        className={
                                            formData.revokeMint
                                                ? "text-green-400"
                                                : "text-red-400"
                                        }
                                    >
                                        {formData.revokeMint ? "YES" : "NO"}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">
                                        Freeze Revoked
                                    </p>
                                    <p
                                        className={
                                            formData.revokeFreeze
                                                ? "text-green-400"
                                                : "text-red-400"
                                        }
                                    >
                                        {formData.revokeFreeze ? "YES" : "NO"}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">
                                        Update Revoked
                                    </p>
                                    <p
                                        className={
                                            formData.revokeUpdate
                                                ? "text-green-400"
                                                : "text-red-400"
                                        }
                                    >
                                        {formData.revokeUpdate ? "YES" : "NO"}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">
                                        Custom Suffix
                                    </p>
                                    <p className="text-cyan-400 font-mono font-bold">
                                        {formData.useCustomSuffix ? (vanitySuffix || "NTL") : "NTL"}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">
                                        Total Fee
                                    </p>
                                    <p className="text-cyan-400 font-bold">
                                        {totalCost} SOL
                                    </p>
                                </div>
                            </div>

                            {formData.description && (
                                <div className="p-6 border-t border-gray-800">
                                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">
                                        Description
                                    </p>
                                    <p className="text-gray-300 text-sm leading-relaxed">
                                        {formData.description}
                                    </p>
                                </div>
                            )}
                        </div>

                        {creationResult && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="bg-green-500/10 border border-green-500/30 p-6 rounded-2xl"
                            >
                                <h4 className="text-green-400 font-bold mb-4 flex items-center gap-2">
                                    <CheckCircle2 size={18} /> Success! Token
                                    Deployed
                                </h4>
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between items-center">
                                        <span className="text-gray-400">
                                            Mint Address:
                                        </span>
                                        <span className="text-white font-mono text-xs">
                                            {creationResult.mintAddress.slice(
                                                0,
                                                8,
                                            )}
                                            ...
                                            {creationResult.mintAddress.slice(
                                                -8,
                                            )}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-gray-400">
                                            Transaction:
                                        </span>
                                        <span className="text-white font-mono text-xs">
                                            {creationResult.signature.slice(
                                                0,
                                                8,
                                            )}
                                            ...
                                            {creationResult.signature.slice(-8)}
                                        </span>
                                    </div>
                                </div>
                                <div className="mt-6 grid grid-cols-2 gap-3">
                                    <a
                                        href={`https://solscan.io/token/${creationResult.mintAddress}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center justify-center gap-2 py-3 bg-[#111C26] hover:bg-[#1a2535] border border-gray-700 hover:border-cyan-500/50 text-white font-bold rounded-xl transition-all text-sm"
                                    >
                                        <svg
                                            width="16"
                                            height="16"
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            xmlns="http://www.w3.org/2000/svg"
                                        >
                                            <path
                                                d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
                                                stroke="#22d3ee"
                                                strokeWidth="2"
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                            />
                                        </svg>
                                        Solscan
                                    </a>
                                    <a
                                        href={`https://explorer.solana.com/address/${creationResult.mintAddress}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center justify-center gap-2 py-3 bg-[#111C26] hover:bg-[#1a2535] border border-gray-700 hover:border-purple-500/50 text-white font-bold rounded-xl transition-all text-sm"
                                    >
                                        <svg
                                            width="16"
                                            height="16"
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            xmlns="http://www.w3.org/2000/svg"
                                        >
                                            <circle
                                                cx="12"
                                                cy="12"
                                                r="10"
                                                stroke="#a855f7"
                                                strokeWidth="2"
                                            />
                                            <path
                                                d="M12 8v4l3 3"
                                                stroke="#a855f7"
                                                strokeWidth="2"
                                                strokeLinecap="round"
                                            />
                                        </svg>
                                        Explorer
                                    </a>
                                </div>
                            </motion.div>
                        )}
                    </motion.div>
                );
            default:
                return null;
        }
    };

    return (
        <div className="min-h-screen bg-[#0A151E] pt-32 pb-20 px-4">
            {/* Background Glow */}
            <div className="fixed top-0 right-0 w-[500px] h-[500px] bg-purple-600/10 blur-[120px] pointer-events-none" />
            <div className="fixed bottom-0 left-0 w-[500px] h-[500px] bg-cyan-600/10 blur-[120px] pointer-events-none" />

            <div className="max-w-4xl mx-auto">
                <div className="text-center mb-12">
                    <motion.h1
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-4xl md:text-5xl font-black mb-4 bg-gradient-to-r from-cyan-400 via-white to-purple-400 bg-clip-text text-transparent"
                    >
                        Launch Dashboard
                    </motion.h1>
                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.2 }}
                        className="text-gray-400"
                    >
                        Create and deploy your custom Solana token in seconds.
                    </motion.p>
                </div>

                <StepIndicator currentStep={step} />

                <div className="bg-[#192630]/80 backdrop-blur-xl border border-gray-800 rounded-[32px] p-8 md:p-12 shadow-2xl relative overflow-hidden">
                    {/* Subtle Scanline Effect */}
                    <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%),linear-gradient(90deg,rgba(255,0,0,0.02),rgba(0,255,0,0.01),rgba(0,0,255,0.02))] bg-[length:100%_2px,3px_100%] pointer-events-none opacity-20" />

                    {/* Stake Status Banner */}
                    <div className="relative z-10">
                        {isCheckingStake ? (
                            <div className="mb-8 p-4 bg-cyan-900/10 border border-cyan-500/20 rounded-2xl flex items-center gap-3">
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-cyan-400"></div>
                                <p className="text-cyan-400/80 text-sm">
                                    Checking stake eligibility...
                                </p>
                            </div>
                        ) : wallet.connected && hasStakedNFT ? (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="mb-8 p-4 bg-green-500/10 border border-green-500/20 rounded-2xl flex items-start gap-3"
                            >
                                <CheckCircle2
                                    className="text-green-400 shrink-0 mt-0.5"
                                    size={18}
                                />
                                <div>
                                    <p className="text-green-200 text-sm font-bold">
                                        NFT Stake Benefit Active
                                    </p>
                                    <p className="text-green-400/60 text-xs">
                                        Your base deployment fee has been
                                        waived. You only pay for additional
                                        security features.
                                    </p>
                                </div>
                            </motion.div>
                        ) : (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="mb-8 p-4 bg-purple-500/10 border border-purple-500/20 rounded-2xl flex items-start justify-between gap-4"
                            >
                                <div className="flex items-start gap-3">
                                    <Shield
                                        className="text-purple-400 shrink-0 mt-0.5"
                                        size={18}
                                    />
                                    <div>
                                        <p className="text-purple-200 text-sm font-bold">
                                            Stake NFT for Free Launch
                                        </p>
                                        <p className="text-purple-400/60 text-xs">
                                            Stake a Noottools NFT to waive the{" "}
                                            {commissionSettings?.token_creation_fee ||
                                                0.1}{" "}
                                            SOL platform fee.
                                        </p>
                                    </div>
                                </div>
                                <a
                                    href="/nft-staking"
                                    className="px-4 py-2 bg-purple-600/20 hover:bg-purple-600/40 border border-purple-500/30 text-purple-200 text-xs font-bold rounded-xl transition-all shrink-0 flex items-center gap-2"
                                >
                                    Stake Now <ArrowRight size={14} />
                                </a>
                            </motion.div>
                        )}
                    </div>

                    <AnimatePresence mode="wait">
                        {renderStep()}
                    </AnimatePresence>

                    <div className="mt-12 pt-8 border-t border-gray-800 flex items-center justify-between gap-4">
                        {step > 1 ? (
                            <button
                                onClick={prevStep}
                                disabled={isCreating}
                                className="flex items-center gap-2 px-8 py-4 bg-gray-800 hover:bg-gray-700 text-white font-bold rounded-2xl transition-all disabled:opacity-50"
                            >
                                <ArrowLeft size={18} /> Back
                            </button>
                        ) : (
                            <div />
                        )}

                        {step < 3 ? (
                            <button
                                onClick={nextStep}
                                className="flex items-center gap-2 px-12 py-4 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold rounded-2xl shadow-lg shadow-cyan-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
                            >
                                Continue <ArrowRight size={18} />
                            </button>
                        ) : (
                            <button
                                onClick={handleDeploy}
                                disabled={isCreating || isSearching}
                                className="flex items-center justify-center gap-3 px-12 py-4 bg-gradient-to-r from-purple-600 to-cyan-500 hover:from-purple-500 hover:to-cyan-400 text-white font-black text-lg rounded-2xl shadow-xl shadow-purple-500/20 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed group relative overflow-hidden"
                            >
                                {isSearching ? (
                                    <div className="flex flex-col items-center">
                                        <div className="flex items-center gap-2">
                                            <motion.div
                                                animate={{ rotate: 360 }}
                                                transition={{
                                                    repeat: Infinity,
                                                    duration: 1,
                                                    ease: "linear",
                                                }}
                                                className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                                            />
                                            <span>
                                                Generating Vanity (
                                                {vanityAttempts.toLocaleString()}
                                                )...
                                            </span>
                                        </div>
                                    </div>
                                ) : isCreating ? (
                                    <>
                                        <motion.div
                                            animate={{ rotate: 360 }}
                                            transition={{
                                                repeat: Infinity,
                                                duration: 1,
                                                ease: "linear",
                                            }}
                                            className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full"
                                        />
                                        Deploying...
                                    </>
                                ) : (
                                    <>
                                        Deploy to Mainnet
                                        <motion.div
                                            className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-500"
                                            style={{ skewX: "-20deg" }}
                                        />
                                    </>
                                )}
                            </button>
                        )}
                    </div>
                </div>

                {/* Info Banner */}
                {step === 1 && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-8 flex items-start gap-4 bg-cyan-500/5 border border-cyan-500/20 p-4 rounded-2xl"
                    >
                        <Info
                            className="text-cyan-400 shrink-0 mt-0.5"
                            size={20}
                        />
                        <p className="text-sm text-gray-400">
                            Need help? Join our{" "}
                            <a
                                href="#"
                                className="text-cyan-400 hover:underline"
                            >
                                Telegram
                            </a>{" "}
                            for support. Token creation fees are non-refundable.
                        </p>
                    </motion.div>
                )}
            </div>
        </div>
    );
};

export default CreateCoin;
