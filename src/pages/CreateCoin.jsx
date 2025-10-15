import React, { useState, useEffect } from "react";
import { useUnifiedWallet } from "../hooks/useUnifiedWallet";
import { useSolanaTokenFlow } from "../hooks/useSolanaTokenFlow";
import { useGlobalState } from "../hooks/useGlobalState";
import constants from "../constants";
import axios from "axios";
import { Keypair } from "@solana/web3.js";
import { BN } from "bn.js";

const CreateToken = () => {
    const wallet = useUnifiedWallet();
    const { globalState } = useGlobalState();
    const {
        createMintAccount,
        addMetadata,
        mintTokens,
    } = useSolanaTokenFlow();

    // Commission settings state
    const [commissionSettings, setCommissionSettings] = useState(null);
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

    // Modal states
    const [showCreationModal, setShowCreationModal] = useState(false);
    const [currentStep, setCurrentStep] = useState(1);
    const [stepStatus, setStepStatus] = useState({
        step1: "pending",
        step2: "pending",
    });
    const [creationProgress, setCreationProgress] = useState("");
    const [errorDetails, setErrorDetails] = useState(null);

    // Legal agreement checkboxes
    const [agreements, setAgreements] = useState({
        generalStatement: false,
        legalAdvice: false,
        privacyPolicy: false,
        euToken: false,
    });

    // Auto-save form data to localStorage
    useEffect(() => {
        const savedData = localStorage.getItem("tokenCreationDraft");
        if (savedData) {
            const parsed = JSON.parse(savedData);
            setFormData((prev) => ({ ...prev, ...parsed }));
        }
    }, []);

    useEffect(() => {
        const timer = setTimeout(() => {
            localStorage.setItem(
                "tokenCreationDraft",
                JSON.stringify({
                    coinName: formData.coinName,
                    ticker: formData.ticker,
                    description: formData.description,
                    website: formData.website,
                    twitter: formData.twitter,
                    telegram: formData.telegram,
                    initialSupply: formData.initialSupply,
                })
            );
        }, 1000);
        return () => clearTimeout(timer);
    }, [formData]);

    // Load commission settings from backend
    useEffect(() => {
        const loadCommissionSettings = async () => {
            try {
                setIsLoadingSettings(true);
                const response = await axios.get(
                    `${constants.backend_url}/items/settings`
                );
                setCommissionSettings({
                    treasury_wallet: response.data.data.treasury_wallet,
                    token_creation_fee: response.data.data.token_creation_fee,
                });
            } catch (error) {
                console.error("❌ Error loading commission settings:", error);
                setErrors((prev) => ({
                    ...prev,
                    settings: "Failed to load settings. Please refresh.",
                }));
            } finally {
                setIsLoadingSettings(false);
            }
        };

        loadCommissionSettings();
    }, [globalState.authToken]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));
        // Clear error for this field
        if (errors[name]) {
            setErrors((prev) => {
                const newErrors = { ...prev };
                delete newErrors[name];
                return newErrors;
            });
        }
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
                if (
                    !["image/jpeg", "image/png", "image/gif"].includes(
                        file.type
                    )
                ) {
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

    const executeStep1 = async () => {
        try {
            setStepStatus((prev) => ({ ...prev, step1: "loading" }));
            setCreationProgress("Creating mint account with transfer fee extension...");

            const mintKeypair = Keypair.generate();
            await createMintAccount(mintKeypair);

            setCreationProgress("Adding token metadata...");
            await addMetadata(mintKeypair, formData);

            setStepStatus((prev) => ({ ...prev, step1: "success" }));
            setCreationProgress("Token created successfully!");

            return mintKeypair.publicKey;
        } catch (error) {
            console.error("Step 1 failed:", error);
            setStepStatus((prev) => ({ ...prev, step1: "error" }));
            setErrorDetails({
                step: 1,
                message: error.message || "Failed to create token",
                details: error.toString(),
            });
            throw error;
        }
    };

    const executeStep2 = async (mintAddress) => {
        try {
            setStepStatus((prev) => ({ ...prev, step2: "loading" }));
            setCreationProgress("Minting initial token supply...");

            await mintTokens(
                mintAddress,
                new BN(formData.initialSupply).mul(new BN(10).pow(new BN(9)))
            );

            setStepStatus((prev) => ({ ...prev, step2: "success" }));
            setCreationProgress("Initial supply minted successfully!");

            return mintAddress;
        } catch (error) {
            console.error("Step 2 failed:", error);
            setStepStatus((prev) => ({ ...prev, step2: "error" }));
            setErrorDetails({
                step: 2,
                message: error.message || "Failed to mint tokens",
                details: error.toString(),
            });
            throw error;
        }
    };

    const validateForm = () => {
        const newErrors = {};

        if (!formData.coinName.trim()) {
            newErrors.coinName = "Coin name is required";
        } else if (formData.coinName.length > 32) {
            newErrors.coinName = "Coin name must be 32 characters or less";
        }

        if (!formData.ticker.trim()) {
            newErrors.ticker = "Ticker is required";
        } else if (formData.ticker.length > 10) {
            newErrors.ticker = "Ticker must be 10 characters or less";
        }

        if (!formData.coinMedia) {
            newErrors.coinMedia = "Coin image or video is required";
        }

        if (!agreements.generalStatement) {
            newErrors.generalStatement = "You must accept the General Statement";
        }
        if (!agreements.legalAdvice) {
            newErrors.legalAdvice = "You must accept the Legal Advice";
        }
        if (!agreements.privacyPolicy) {
            newErrors.privacyPolicy = "You must accept the Privacy Policy";
        }

        return newErrors;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!wallet.connected) {
            setErrors({ wallet: "Please connect your wallet" });
            return;
        }

        const validationErrors = validateForm();
        if (Object.keys(validationErrors).length > 0) {
            setErrors(validationErrors);
            // Scroll to first error
            const firstErrorField = document.querySelector(".border-red-500");
            if (firstErrorField) {
                firstErrorField.scrollIntoView({
                    behavior: "smooth",
                    block: "center",
                });
            }
            return;
        }

        // Open modal and start the process
        setShowCreationModal(true);
        setCurrentStep(1);
        setStepStatus({ step1: "pending", step2: "pending" });
        setCreationProgress("Ready to start token creation...");
        setErrorDetails(null);
    };

    const startCreationProcess = async () => {
        setIsCreating(true);

        try {
            // Step 1: Create token with metadata
            setCurrentStep(1);
            const mintAddress = await executeStep1();

            // Step 2: Mint initial supply
            setCurrentStep(2);
            await executeStep2(mintAddress);

            // Save to Directus
            await saveToDirectus(mintAddress.toString());

            // Final success
            setCreationResult({
                mintAddress: mintAddress.toString(),
                tokenName: formData.coinName,
                ticker: formData.ticker,
            });

            // Clear draft
            localStorage.removeItem("tokenCreationDraft");
        } catch (error) {
            console.error("Creation process failed:", error);
        } finally {
            setIsCreating(false);
        }
    };

    const saveToDirectus = async (mintAddress) => {
        try {
            setCreationProgress("Saving token information to database...");

            let logoFileId = null;
            let bannerFileId = null;

            // Upload logo
            if (formData.coinMedia) {
                try {
                    const logoFormData = new FormData();
                    logoFormData.append("file", formData.coinMedia);

                    const logoResponse = await fetch(
                        `${constants.backend_url}/files`,
                        {
                            method: "POST",
                            headers: {
                                Authorization: `Bearer ${globalState.authToken}`,
                            },
                            body: logoFormData,
                        }
                    );

                    if (logoResponse.ok) {
                        const logoResult = await logoResponse.json();
                        logoFileId = logoResult.data.id;
                    }
                } catch (logoError) {
                    console.error("Error uploading logo:", logoError);
                }
            }

            // Upload banner
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
                    }
                } catch (bannerError) {
                    console.error("Error uploading banner:", bannerError);
                }
            }

            // Save project
            const projectData = {
                name: formData.coinName,
                symbol: formData.ticker,
                contract_address: mintAddress,
                description: formData.description || null,
                chain: "solana",
                user: globalState.user?.id || wallet.publicKey.toString(),
                twitter: formData.twitter || null,
                telegram: formData.telegram || null,
                website: formData.website || null,
                featured: false,
                status: "draft", // Set as draft until pool is created
                logo: logoFileId,
                banner_image: bannerFileId,
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
                setCreationProgress("Token information saved successfully!");
            }
        } catch (directusError) {
            console.error("Error saving to Directus:", directusError);
        }
    };

    const closeModal = () => {
        setShowCreationModal(false);
        setCurrentStep(1);
        setStepStatus({ step1: "pending", step2: "pending" });
        setCreationProgress("");
        setErrorDetails(null);
    };

    const resetForm = () => {
        setFormData({
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
        setMediaPreview(null);
        setBannerPreview(null);
        setAgreements({
            generalStatement: false,
            legalAdvice: false,
            privacyPolicy: false,
            euToken: false,
        });
        setErrors({});
        localStorage.removeItem("tokenCreationDraft");
    };

    const getStepIcon = (stepNumber, status) => {
        if (status === "loading") {
            return (
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
            );
        } else if (status === "success") {
            return (
                <div className="h-6 w-6 bg-green-500 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                </div>
            );
        } else if (status === "error") {
            return (
                <div className="h-6 w-6 bg-red-500 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </div>
            );
        } else {
            return (
                <div className="h-6 w-6 bg-gray-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm font-medium">{stepNumber}</span>
                </div>
            );
        }
    };

    const getStepColor = (status) => {
        switch (status) {
            case "success": return "text-green-400";
            case "error": return "text-red-400";
            case "loading": return "text-blue-400";
            default: return "text-gray-400";
        }
    };

    const isFormValid = () => {
        return (
            wallet.connected &&
            !isLoadingSettings &&
            formData.coinName.trim() &&
            formData.ticker.trim() &&
            formData.coinMedia &&
            agreements.generalStatement &&
            agreements.legalAdvice &&
            agreements.privacyPolicy
        );
    };

    return (
        <div className="min-h-screen bg-[#0A151E] py-8 px-4 pt-28">
            {/* Creation Modal */}
            {showCreationModal && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-[#192630] rounded-2xl shadow-2xl p-8 border border-gray-700 max-w-md w-full max-h-[90vh] overflow-y-auto">
                        <h2 className="text-2xl font-bold text-white mb-6 text-center">Creating Your Token</h2>

                        {/* Steps */}
                        <div className="space-y-4 mb-6">
                            {/* Step 1 */}
                            <div className={`flex items-center gap-4 p-4 rounded-lg border transition-all ${
                                stepStatus.step1 === "error" ? "border-red-500/30 bg-red-900/20" :
                                stepStatus.step1 === "success" ? "border-green-500/30 bg-green-900/20" :
                                stepStatus.step1 === "loading" ? "border-blue-500/30 bg-blue-900/20" :
                                "border-gray-600/30 bg-gray-800/20"
                            }`}>
                                {getStepIcon(1, stepStatus.step1)}
                                <div className="flex-1">
                                    <h3 className={`font-semibold ${getStepColor(stepStatus.step1)}`}>
                                        Step 1: Create Token & Metadata
                                    </h3>
                                    <p className="text-sm text-gray-300">Creating mint account and metadata</p>
                                </div>
                            </div>

                            {/* Step 2 */}
                            <div className={`flex items-center gap-4 p-4 rounded-lg border transition-all ${
                                stepStatus.step2 === "error" ? "border-red-500/30 bg-red-900/20" :
                                stepStatus.step2 === "success" ? "border-green-500/30 bg-green-900/20" :
                                stepStatus.step2 === "loading" ? "border-blue-500/30 bg-blue-900/20" :
                                "border-gray-600/30 bg-gray-800/20"
                            }`}>
                                {getStepIcon(2, stepStatus.step2)}
                                <div className="flex-1">
                                    <h3 className={`font-semibold ${getStepColor(stepStatus.step2)}`}>
                                        Step 2: Mint Initial Supply
                                    </h3>
                                    <p className="text-sm text-gray-300">Minting initial token supply to your wallet</p>
                                </div>
                            </div>
                        </div>

                        {/* Progress Text */}
                        {creationProgress && (
                            <div className="mb-6 p-4 bg-blue-900/30 border border-blue-600/50 rounded-lg">
                                <p className="text-blue-300 text-sm text-center">{creationProgress}</p>
                            </div>
                        )}

                        {/* Error Details */}
                        {errorDetails && (
                            <div className="mb-6 p-4 bg-red-900/30 border border-red-600/50 rounded-lg">
                                <h3 className="text-red-300 font-semibold mb-2">❌ Error in Step {errorDetails.step}</h3>
                                <p className="text-red-200 text-sm mb-2">{errorDetails.message}</p>
                                <details className="text-xs text-red-300">
                                    <summary className="cursor-pointer">View Details</summary>
                                    <pre className="mt-2 p-2 bg-black/20 rounded overflow-x-auto">{errorDetails.details}</pre>
                                </details>
                            </div>
                        )}

                        {/* Action Buttons */}
                        <div className="flex gap-3">
                            {stepStatus.step1 === "pending" && stepStatus.step2 === "pending" && (
                                <button
                                    onClick={startCreationProcess}
                                    disabled={isCreating}
                                    className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white font-medium py-3 px-6 rounded-lg transition-colors disabled:cursor-not-allowed"
                                >
                                    {isCreating ? "Creating..." : "Start Creation"}
                                </button>
                            )}

                            {stepStatus.step1 === "success" && stepStatus.step2 === "success" && (
                                <>
                                    <button
                                        onClick={() => {
                                            closeModal();
                                            // Navigate to liquidity pool creation page
                                            window.location.href = `/create-pool?mint=${creationResult.mintAddress}`;
                                        }}
                                        className="flex-1 bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-6 rounded-lg transition-colors"
                                    >
                                        Create Liquidity Pool
                                    </button>
                                    <button
                                        onClick={() => {
                                            closeModal();
                                            resetForm();
                                        }}
                                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-lg transition-colors"
                                    >
                                        Create Another
                                    </button>
                                </>
                            )}

                            {(stepStatus.step1 === "error" || stepStatus.step2 === "error") && (
                                <>
                                    <button
                                        onClick={startCreationProcess}
                                        disabled={isCreating}
                                        className="flex-1 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-600 text-white font-medium py-3 px-6 rounded-lg transition-colors"
                                    >
                                        Retry
                                    </button>
                                    <button
                                        onClick={closeModal}
                                        className="px-6 py-3 border border-gray-600 text-gray-300 hover:bg-gray-700 rounded-lg transition-colors"
                                    >
                                        Close
                                    </button>
                                </>
                            )}
                        </div>

                        {/* Creation Result Summary */}
                        {creationResult && stepStatus.step2 === "success" && (
                            <div className="mt-6 p-4 bg-green-900/30 border border-green-600/50 rounded-lg">
                                <h3 className="text-green-300 font-semibold mb-2 text-center">✅ Token Created Successfully!</h3>
                                <div className="text-sm text-green-200 space-y-1">
                                    <p className="break-all"><strong>Mint:</strong> {creationResult.mintAddress}</p>
                                    <p><strong>Token:</strong> {creationResult.tokenName} (${creationResult.ticker})</p>
                                    <div className="mt-3 pt-3 border-t border-green-600/30">
                                        <p className="text-xs text-green-300">Next: Create liquidity pool to enable trading</p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            <div className="max-w-4xl mx-auto">
                <div className="bg-[#192630] rounded-2xl shadow-2xl p-8 border border-gray-700">
                    <div className="flex items-center justify-between mb-8">
                        <h1 className="text-3xl font-bold text-white">Create New Token</h1>
                        <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${isFormValid() ? "bg-green-500" : "bg-gray-500"}`}></div>
                            <span className="text-xs text-gray-400">
                                {isFormValid() ? "Ready to create" : "Fill required fields"}
                            </span>
                        </div>
                    </div>

                    {/* Commission Settings Loading */}
                    {isLoadingSettings && (
                        <div className="mb-6 p-4 bg-blue-900/30 border border-blue-600/50 rounded-lg">
                            <div className="flex items-center gap-3">
                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-400"></div>
                                <p className="text-blue-300">Loading commission settings...</p>
                            </div>
                        </div>
                    )}

                    {/* Token Creation Fee Info */}
                    {/* {commissionSettings && (
                        <div className="mb-6 p-4 bg-blue-900/30 border border-blue-600/50 rounded-lg">
                            <div className="flex items-start gap-3">
                                <svg className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd" />
                                </svg>
                                <div>
                                    <h3 className="text-blue-300 font-semibold mb-2">💰 Token Creation Fee</h3>
                                    <p className="text-blue-200 text-sm">
                                        Token creation fee: <strong>{commissionSettings?.token_creation_fee} SOL</strong>
                                    </p>
                                    <p className="text-blue-200 text-sm mt-1">
                                        Note: Pool creation fees are separate and may be waived if you have staked NFTs.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )} */}

                    {!wallet.connected && (
                        <div className="mb-6 p-4 bg-yellow-900/30 border border-yellow-600/50 rounded-lg">
                            <div className="flex items-start gap-3">
                                <svg className="w-5 h-5 text-yellow-400 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                </svg>
                                <div>
                                    <h3 className="text-yellow-300 font-semibold mb-2">🔗 Wallet Required</h3>
                                    <p className="text-yellow-200 text-sm">Please connect your wallet to create a token.</p>
                                </div>
                            </div>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-8">
                        {/* Basic Info Section */}
                        <div className="space-y-6">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                                    <span className="text-white font-bold text-sm">1</span>
                                </div>
                                <h2 className="text-xl font-semibold text-white">Basic Information</h2>
                            </div>

                            <div className="space-y-4 pl-10">
                                <div>
                                    <label htmlFor="coinName" className="block text-sm font-medium text-gray-300 mb-2">
                                        Coin Name * <span className="text-gray-500 text-xs ml-2">(Max 32 characters)</span>
                                    </label>
                                    <input
                                        type="text"
                                        id="coinName"
                                        name="coinName"
                                        value={formData.coinName}
                                        onChange={handleInputChange}
                                        maxLength="32"
                                        className={`w-full px-4 py-3 bg-gray-800/50 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all text-white placeholder-gray-400 ${
                                            errors.coinName ? "border-red-500 bg-red-900/20 shake" : "border-gray-600 hover:border-gray-500"
                                        }`}
                                        placeholder="e.g., Solana Gold"
                                    />
                                    <div className="flex justify-between items-center mt-1">
                                        <p className={`text-xs ${formData.coinName.length > 28 ? "text-yellow-400" : "text-gray-400"}`}>
                                            {formData.coinName.length}/32 characters
                                        </p>
                                        {errors.coinName && <p className="text-sm text-red-400">{errors.coinName}</p>}
                                    </div>
                                </div>

                                <div>
                                    <label htmlFor="ticker" className="block text-sm font-medium text-gray-300 mb-2">
                                        Ticker Symbol * <span className="text-gray-500 text-xs ml-2">(Max 10 characters)</span>
                                    </label>
                                    <input
                                        type="text"
                                        id="ticker"
                                        name="ticker"
                                        value={formData.ticker}
                                        onChange={handleInputChange}
                                        className={`w-full px-4 py-3 bg-gray-800/50 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all text-white placeholder-gray-400 uppercase ${
                                            errors.ticker ? "border-red-500 bg-red-900/20 shake" : "border-gray-600 hover:border-gray-500"
                                        }`}
                                        placeholder="e.g., GOLDSOL"
                                        maxLength="10"
                                        style={{ textTransform: "uppercase" }}
                                    />
                                    <div className="flex justify-between items-center mt-1">
                                        <p className={`text-xs ${formData.ticker.length > 8 ? "text-yellow-400" : "text-gray-400"}`}>
                                            {formData.ticker.length}/10 characters
                                        </p>
                                        {errors.ticker && <p className="text-sm text-red-400">{errors.ticker}</p>}
                                    </div>
                                </div>

                                <div>
                                    <label htmlFor="description" className="block text-sm font-medium text-gray-300 mb-2">
                                        Description <span className="text-gray-500 text-xs ml-2">(Optional)</span>
                                    </label>
                                    <textarea
                                        id="description"
                                        name="description"
                                        value={formData.description}
                                        onChange={handleInputChange}
                                        className="w-full px-4 py-3 bg-gray-800/50 border border-gray-600 hover:border-gray-500 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all resize-none text-white placeholder-gray-400"
                                        placeholder="Tell people about your token..."
                                        rows="4"
                                        maxLength="500"
                                    />
                                    <p className="text-xs text-gray-400 mt-1">{formData.description.length}/500 characters</p>
                                </div>
                            </div>
                        </div>

                        {/* Token Supply Section */}
                        <div className="space-y-6">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center">
                                    <span className="text-white font-bold text-sm">2</span>
                                </div>
                                <h2 className="text-xl font-semibold text-white">Token Supply</h2>
                            </div>

                            <div className="space-y-4 pl-10">
                                <div>
                                    <label htmlFor="initialSupply" className="block text-sm font-medium text-gray-300 mb-2">
                                        Initial Supply *
                                    </label>
                                    <input
                                        type="number"
                                        id="initialSupply"
                                        name="initialSupply"
                                        value={formData.initialSupply}
                                        onChange={handleInputChange}
                                        className="w-full px-4 py-3 bg-gray-800/50 border border-gray-600 hover:border-gray-500 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all text-white placeholder-gray-400"
                                        placeholder="100000000"
                                        min="0"
                                        step="1"
                                    />
                                    <p className="text-xs text-gray-400 mt-1">Tokens will be minted to your wallet (with 9 decimals)</p>
                                </div>
                            </div>
                        </div>

                        {/* Media Upload Section */}
                        <div className="space-y-6">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center">
                                    <span className="text-white font-bold text-sm">3</span>
                                </div>
                                <h2 className="text-xl font-semibold text-white">Media Assets</h2>
                            </div>

                            <div className="space-y-6 pl-10">
                                {/* Coin Media */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">
                                        Token Logo * <span className="text-gray-500 text-xs ml-2">(Image or Video)</span>
                                    </label>

                                    <div className="bg-blue-900/20 border border-blue-600/30 rounded-lg p-3 mb-3">
                                        <div className="text-xs text-blue-300 space-y-1">
                                            <p><strong>Image:</strong> Max 15MB, .jpg/.gif/.png, 1:1 ratio recommended</p>
                                            <p><strong>Video:</strong> Max 30MB, .mp4, 16:9 or 9:16</p>
                                        </div>
                                    </div>

                                    <label htmlFor="coinMedia" className="block cursor-pointer group">
                                        <div className={`border-2 border-dashed rounded-lg p-8 text-center transition-all ${
                                            errors.coinMedia || errors.coin ? "border-red-500/50 bg-red-900/10" :
                                            formData.coinMedia ? "border-green-500/50 bg-green-900/10" :
                                            "border-gray-600 hover:border-blue-500 hover:bg-gray-800/30 group-hover:scale-[1.02]"
                                        }`}>
                                            <div className="space-y-2">
                                                {formData.coinMedia ? (
                                                    <div className="flex items-center justify-center gap-2 text-green-400">
                                                        <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                                                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                                        </svg>
                                                        <span className="font-medium">File Selected</span>
                                                    </div>
                                                ) : (
                                                    <svg className="mx-auto h-12 w-12 text-gray-400 group-hover:text-blue-400 transition-colors" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                                                        <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                                    </svg>
                                                )}
                                                <div className="text-gray-300">
                                                    <p className="font-medium">{formData.coinMedia ? formData.coinMedia.name : "Click to upload token logo"}</p>
                                                    <p className="text-sm text-gray-400">{formData.coinMedia ? "Click to change" : "Image or video file"}</p>
                                                </div>
                                            </div>
                                        </div>
                                        <input type="file" id="coinMedia" accept="image/*,video/mp4" onChange={(e) => handleFileChange(e, "coin")} className="hidden" />
                                    </label>

                                    {(errors.coinMedia || errors.coin) && (
                                        <div className="mt-2">
                                            {typeof errors.coinMedia === "string" && <p className="text-sm text-red-400">{errors.coinMedia}</p>}
                                            {errors.coin && errors.coin.map((error, index) => (
                                                <p key={index} className="text-sm text-red-400">{error}</p>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Banner */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">
                                        Banner Image <span className="text-gray-500 text-xs ml-2">(Optional)</span>
                                    </label>

                                    <div className="bg-amber-900/20 border border-amber-600/30 rounded-lg p-3 mb-3">
                                        <div className="text-xs text-amber-300 space-y-1">
                                            <p><strong>Size:</strong> Max 4.3MB, 3:1 ratio (1500x500px recommended)</p>
                                            <p><strong>Note:</strong> Can only be set during creation</p>
                                        </div>
                                    </div>

                                    <label htmlFor="banner" className="block cursor-pointer group">
                                        <div className={`border-2 border-dashed rounded-lg p-6 text-center transition-all ${
                                            formData.banner ? "border-green-500/50 bg-green-900/10" : "border-gray-600 hover:border-blue-500 hover:bg-gray-800/30 group-hover:scale-[1.02]"
                                        }`}>
                                            <div className="space-y-2">
                                                {formData.banner ? (
                                                    <div className="flex items-center justify-center gap-2 text-green-400">
                                                        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                                                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                                        </svg>
                                                        <span className="text-sm font-medium">Banner Selected</span>
                                                    </div>
                                                ) : (
                                                    <svg className="mx-auto h-8 w-8 text-gray-400 group-hover:text-blue-400 transition-colors" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                                                        <path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h36v16a2 2 0 01-2 2H8a2 2 0 01-2-2V20zM6 12a2 2 0 002-2h32a2 2 0 012 2v8H6V12z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                                    </svg>
                                                )}
                                                <div className="text-gray-300">
                                                    <p className="text-sm font-medium">{formData.banner ? formData.banner.name : "Click to upload banner"}</p>
                                                    <p className="text-xs text-gray-400">{formData.banner ? "Click to change" : "Optional banner image"}</p>
                                                </div>
                                            </div>
                                        </div>
                                        <input type="file" id="banner" accept="image/*" onChange={(e) => handleFileChange(e, "banner")} className="hidden" />
                                    </label>

                                    {errors.banner && errors.banner.map((error, index) => (
                                        <p key={index} className="mt-2 text-sm text-red-400">{error}</p>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Social Links Section */}
                        <div className="space-y-6">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 bg-cyan-600 rounded-full flex items-center justify-center">
                                    <span className="text-white font-bold text-sm">4</span>
                                </div>
                                <h2 className="text-xl font-semibold text-white">Social Links</h2>
                                <span className="text-xs text-gray-500">(Optional)</span>
                            </div>

                            <div className="space-y-4 pl-10">
                                <div>
                                    <label htmlFor="website" className="block text-sm font-medium text-gray-300 mb-2">
                                        <div className="flex items-center gap-2">
                                            <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM4.332 8.027a6.012 6.012 0 011.912-2.706C6.512 5.73 6.974 6 7.5 6A1.5 1.5 0 009 7.5V8a2 2 0 004 0 2 2 0 011.523-1.943A5.977 5.977 0 0116 10c0 .34-.028.675-.083 1H15a2 2 0 00-2 2v2.197A5.973 5.973 0 0110 16v-2a2 2 0 00-2-2 2 2 0 01-2-2 2 2 0 00-1.668-1.973z" clipRule="evenodd" />
                                            </svg>
                                            Website
                                        </div>
                                    </label>
                                    <input
                                        type="url"
                                        id="website"
                                        name="website"
                                        value={formData.website}
                                        onChange={handleInputChange}
                                        className="w-full px-4 py-3 bg-gray-800/50 border border-gray-600 hover:border-gray-500 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all text-white placeholder-gray-400"
                                        placeholder="https://example.com"
                                    />
                                </div>

                                <div>
                                    <label htmlFor="twitter" className="block text-sm font-medium text-gray-300 mb-2">
                                        <div className="flex items-center gap-2">
                                            <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                                                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                                            </svg>
                                            X (Twitter)
                                        </div>
                                    </label>
                                    <input
                                        type="url"
                                        id="twitter"
                                        name="twitter"
                                        value={formData.twitter}
                                        onChange={handleInputChange}
                                        className="w-full px-4 py-3 bg-gray-800/50 border border-gray-600 hover:border-gray-500 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all text-white placeholder-gray-400"
                                        placeholder="https://x.com/username"
                                    />
                                </div>

                                <div>
                                    <label htmlFor="telegram" className="block text-sm font-medium text-gray-300 mb-2">
                                        <div className="flex items-center gap-2">
                                            <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                                                <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
                                            </svg>
                                            Telegram
                                        </div>
                                    </label>
                                    <input
                                        type="url"
                                        id="telegram"
                                        name="telegram"
                                        value={formData.telegram}
                                        onChange={handleInputChange}
                                        className="w-full px-4 py-3 bg-gray-800/50 border border-gray-600 hover:border-gray-500 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all text-white placeholder-gray-400"
                                        placeholder="https://t.me/username"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Legal Agreements Section */}
                        <div className="space-y-6">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 bg-red-600 rounded-full flex items-center justify-center">
                                    <span className="text-white font-bold text-sm">5</span>
                                </div>
                                <h2 className="text-xl font-semibold text-white">Legal Agreements</h2>
                                <span className="text-xs text-red-400">*Required</span>
                            </div>

                            <div className="bg-gradient-to-br from-[#1e2832] to-[#1a2430] border border-gray-700/50 rounded-xl p-6 space-y-4 pl-10">
                                {/* General Statement */}
                                <div className={`flex items-start gap-3 p-4 bg-gray-800/30 rounded-xl border transition-all ${
                                    errors.generalStatement ? "border-red-500/50 bg-red-900/10" : "border-gray-700/50 hover:border-gray-600"
                                }`}>
                                    <input
                                        type="checkbox"
                                        id="generalStatement"
                                        checked={agreements.generalStatement}
                                        onChange={(e) => {
                                            setAgreements((prev) => ({ ...prev, generalStatement: e.target.checked }));
                                            if (e.target.checked && errors.generalStatement) {
                                                setErrors((prev) => {
                                                    const newErrors = { ...prev };
                                                    delete newErrors.generalStatement;
                                                    return newErrors;
                                                });
                                            }
                                        }}
                                        className="mt-1 w-5 h-5 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500 focus:ring-2 cursor-pointer"
                                    />
                                    <label htmlFor="generalStatement" className="text-gray-300 text-sm leading-relaxed cursor-pointer">
                                        I have read and accept the{" "}
                                        <a href="/general-statement" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 underline transition-colors" onClick={(e) => e.stopPropagation()}>
                                            General Statement
                                        </a>{" "}
                                        regarding token creation and platform usage.
                                    </label>
                                </div>

                                {/* Legal Advice */}
                                <div className={`flex items-start gap-3 p-4 bg-gray-800/30 rounded-xl border transition-all ${
                                    errors.legalAdvice ? "border-red-500/50 bg-red-900/10" : "border-gray-700/50 hover:border-gray-600"
                                }`}>
                                    <input
                                        type="checkbox"
                                        id="legalAdvice"
                                        checked={agreements.legalAdvice}
                                        onChange={(e) => {
                                            setAgreements((prev) => ({ ...prev, legalAdvice: e.target.checked }));
                                            if (e.target.checked && errors.legalAdvice) {
                                                setErrors((prev) => {
                                                    const newErrors = { ...prev };
                                                    delete newErrors.legalAdvice;
                                                    return newErrors;
                                                });
                                            }
                                        }}
                                        className="mt-1 w-5 h-5 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500 focus:ring-2 cursor-pointer"
                                    />
                                    <label htmlFor="legalAdvice" className="text-gray-300 text-sm leading-relaxed cursor-pointer">
                                        I have read and understand the{" "}
                                        <a href="/legal-advice" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 underline transition-colors" onClick={(e) => e.stopPropagation()}>
                                            Legal Advice
                                        </a>{" "}
                                        and acknowledge the legal implications of token creation.
                                    </label>
                                </div>

                                {/* Privacy Policy */}
                                <div className={`flex items-start gap-3 p-4 bg-gray-800/30 rounded-xl border transition-all ${
                                    errors.privacyPolicy ? "border-red-500/50 bg-red-900/10" : "border-gray-700/50 hover:border-gray-600"
                                }`}>
                                    <input
                                        type="checkbox"
                                        id="privacyPolicy"
                                        checked={agreements.privacyPolicy}
                                        onChange={(e) => {
                                            setAgreements((prev) => ({ ...prev, privacyPolicy: e.target.checked }));
                                            if (e.target.checked && errors.privacyPolicy) {
                                                setErrors((prev) => {
                                                    const newErrors = { ...prev };
                                                    delete newErrors.privacyPolicy;
                                                    return newErrors;
                                                });
                                            }
                                        }}
                                        className="mt-1 w-5 h-5 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500 focus:ring-2 cursor-pointer"
                                    />
                                    <label htmlFor="privacyPolicy" className="text-gray-300 text-sm leading-relaxed cursor-pointer">
                                        I have read and accept the{" "}
                                        <a href="/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 underline transition-colors" onClick={(e) => e.stopPropagation()}>
                                            Privacy Policy
                                        </a>{" "}
                                        regarding data collection and usage.
                                    </label>
                                </div>

                                {/* EU Token Checkbox */}
                                <div className="flex items-start gap-3 p-4 bg-gradient-to-r from-blue-800/20 to-purple-800/20 rounded-xl border border-blue-500/30 hover:border-blue-500/50 transition-all">
                                    <input
                                        type="checkbox"
                                        id="euToken"
                                        checked={agreements.euToken}
                                        onChange={(e) => setAgreements((prev) => ({ ...prev, euToken: e.target.checked }))}
                                        className="mt-1 w-5 h-5 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500 focus:ring-2 cursor-pointer"
                                    />
                                    <label htmlFor="euToken" className="text-gray-300 text-sm leading-relaxed cursor-pointer">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-blue-300 font-medium">EU Token Declaration</span>
                                            <div className="text-xs bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded">Optional</div>
                                        </div>
                                        This token will be created and operated in accordance with European Union regulations and guidelines.
                                    </label>
                                </div>

                                {/* Important Notice */}
                                <div className="mt-6 p-4 bg-yellow-600/10 border border-yellow-500/30 rounded-xl">
                                    <div className="flex items-start gap-3">
                                        <svg className="w-5 h-5 text-yellow-400 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                        </svg>
                                        <div>
                                            <p className="text-yellow-200 text-sm font-medium mb-1">Important Notice</p>
                                            <p className="text-yellow-100 text-xs leading-relaxed">
                                                By proceeding, you acknowledge all legal documents and understand the financial and legal responsibilities of token creation. Ensure compliance with your local jurisdiction.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Submit Button */}
                        <div className="sticky bottom-0 bg-[#192630] pt-6 pb-4 -mx-8 px-8 border-t border-gray-700">
                            <button
                                type="submit"
                                disabled={!isFormValid() || isCreating}
                                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-600 disabled:to-gray-600 text-white font-bold py-4 px-6 rounded-lg transition-all hover:transform hover:scale-[1.02] hover:shadow-lg focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-[#192630] disabled:transform-none disabled:cursor-not-allowed disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {isCreating ? (
                                    <>
                                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                                        Creating Token...
                                    </>
                                ) : isLoadingSettings ? (
                                    <>
                                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                                        Loading...
                                    </>
                                ) : commissionSettings ? (
                                    <>
                                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                            <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
                                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd" />
                                        </svg>
                                        Create Token
                                    </>
                                ) : (
                                    "Loading..."
                                )}
                            </button>

                            {/* Helper Text */}
                            <div className="mt-3 text-center">
                                {!wallet.connected ? (
                                    <p className="text-yellow-400 text-sm flex items-center justify-center gap-2">
                                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                        </svg>
                                        Please connect your wallet to create a token
                                    </p>
                                ) : !isFormValid() ? (
                                    <p className="text-gray-400 text-sm">Fill all required fields to continue</p>
                                ) : null}
                            </div>

                            {/* Draft Saved Indicator */}
                            {wallet.connected && (formData.coinName || formData.ticker) && (
                                <p className="text-xs text-green-400 text-center mt-2 flex items-center justify-center gap-1">
                                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                    </svg>
                                    Draft saved automatically
                                </p>
                            )}
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default CreateToken;