import React, { useState, useEffect } from "react";
import { useBondingCurveFlow } from "../hooks/useSolanaTokenFlow";
import { useGlobalState } from "../hooks/useGlobalState";
import { useUnifiedWallet } from "../hooks/useUnifiedWallet";
import constants from "../constants";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const BondingCurveCreateCoin = () => {
    const wallet = useUnifiedWallet();
    const { globalState } = useGlobalState();
    const {
        createTokenMint,
        addMetadata,
        mintTokensToWallet,
        initializeBondingCurve,
        BONDING_CURVE_CONFIG,
    } = useBondingCurveFlow();

    const [formData, setFormData] = useState({
        coinName: "",
        ticker: "",
        description: "",
        website: "",
        twitter: "",
        telegram: "",
        coinMedia: null,
        banner: null,
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
        step1: "pending", // Create token & metadata
        step2: "pending", // Mint tokens to creator
        step3: "pending", // Initialize bonding curve & transfer
    });
    const [creationProgress, setCreationProgress] = useState("");
    const [errorDetails, setErrorDetails] = useState(null);

    // Legal agreements
    const [agreements, setAgreements] = useState({
        generalStatement: false,
        legalAdvice: false,
        privacyPolicy: false,
    });

    // Auto-save form data
    useEffect(() => {
        const savedData = localStorage.getItem("bondingCurveTokenDraft");
        if (savedData) {
            const parsed = JSON.parse(savedData);
            setFormData((prev) => ({ ...prev, ...parsed }));
        }
    }, []);

    useEffect(() => {
        const timer = setTimeout(() => {
            localStorage.setItem(
                "bondingCurveTokenDraft",
                JSON.stringify({
                    coinName: formData.coinName,
                    ticker: formData.ticker,
                    description: formData.description,
                    website: formData.website,
                    twitter: formData.twitter,
                    telegram: formData.telegram,
                })
            );
        }, 1000);
        return () => clearTimeout(timer);
    }, [formData]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
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
                if (file.size > 15 * 1024 * 1024)
                    errors.push("Image must be under 15MB");
                if (
                    !["image/jpeg", "image/png", "image/gif"].includes(
                        file.type
                    )
                ) {
                    errors.push("Image must be .jpg, .png, or .gif");
                }
            } else if (isVideo) {
                if (file.size > 30 * 1024 * 1024)
                    errors.push("Video must be under 30MB");
                if (file.type !== "video/mp4")
                    errors.push("Video must be .mp4");
            } else {
                errors.push("File must be an image or video");
            }
        } else if (type === "banner") {
            if (file.size > 4.3 * 1024 * 1024)
                errors.push("Banner must be under 4.3MB");
            if (!["image/jpeg", "image/png", "image/gif"].includes(file.type)) {
                errors.push("Banner must be .jpg, .png, or .gif");
            }
        }
        return errors;
    };

    const createPreview = (file, type) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            if (type === "coin") setMediaPreview(e.target.result);
            else setBannerPreview(e.target.result);
        };
        reader.readAsDataURL(file);
    };

    const handleFileChange = (e, type) => {
        const file = e.target.files[0];
        if (file) {
            const fileErrors = validateFile(file, type);
            if (fileErrors.length > 0) {
                setErrors((prev) => ({ ...prev, [type]: fileErrors }));
                return;
            }
            setFormData((prev) => ({
                ...prev,
                [type === "coin" ? "coinMedia" : "banner"]: file,
            }));
            setErrors((prev) => ({ ...prev, [type]: [] }));
            createPreview(file, type);
        }
    };

    const executeStep1 = async () => {
        try {
            setStepStatus((prev) => ({ ...prev, step1: "loading" }));
            setCreationProgress("Creating token mint with transfer fee...");

            const { mint, mintKeypair, txid } = await createTokenMint(formData);

            // setCreationProgress("Adding metadata to IPFS...");
            // toast.info("Uploading metadata to IPFS...");

            // await addMetadata(mintKeypair, formData);

            setStepStatus((prev) => ({ ...prev, step1: "success" }));
            setCreationProgress("Token & metadata created successfully!");
            toast.success("✅ Token created successfully!");

            return { mint, mintKeypair };
        } catch (error) {
            console.error("Step 1 failed:", error);
            setStepStatus((prev) => ({ ...prev, step1: "error" }));
            setErrorDetails({
                step: 1,
                message: error.message || "Failed to create token & metadata",
                details: error.toString(),
            });
            toast.error(`Step 1 failed: ${error.message}`);
            throw error;
        }
    };

    const executeStep2 = async (mint) => {
        try {
            setStepStatus((prev) => ({ ...prev, step2: "loading" }));
            setCreationProgress("Minting total supply to creator wallet...");
            toast.info("Minting tokens to your wallet...");

            const { creatorTokenAccount, txid } = await mintTokensToWallet(
                mint
            );

            setStepStatus((prev) => ({ ...prev, step2: "success" }));
            setCreationProgress("Tokens minted successfully!");
            toast.success("✅ Tokens minted successfully!");

            return { creatorTokenAccount };
        } catch (error) {
            console.error("Step 2 failed:", error);
            setStepStatus((prev) => ({ ...prev, step2: "error" }));
            setErrorDetails({
                step: 2,
                message: error.message || "Failed to mint tokens",
                details: error.toString(),
            });
            toast.error(`Step 2 failed: ${error.message}`);
            throw error;
        }
    };

    const executeStep3 = async (mint, creatorTokenAccount) => {
        try {
            setStepStatus((prev) => ({ ...prev, step3: "loading" }));
            setCreationProgress(
                "Initializing bonding curve with first buyer lock..."
            );

            const {
                bondingCurve,
                tokenVault,
                firstBuyerLockVault,
                solVault,
                txid,
            } = await initializeBondingCurve(mint, creatorTokenAccount);
            toast.info("Setting up bonding curve and first buyer lock...");

            setStepStatus((prev) => ({ ...prev, step3: "success" }));
            setCreationProgress(
                "Bonding curve initialized! Token ready for trading!"
            );
            toast.success("🎉 Token launched on bonding curve!");

            return {
                bondingCurve,
                tokenVault,
                firstBuyerLockVault,
                solVault,
            };
        } catch (error) {
            console.error("Step 3 failed:", error);
            setStepStatus((prev) => ({ ...prev, step3: "error" }));
            setErrorDetails({
                step: 3,
                message: error.message || "Failed to initialize bonding curve",
                details: error.toString(),
            });
            toast.error(`Step 3 failed: ${error.message}`);
            throw error;
        }
    };

    const validateForm = () => {
        const newErrors = {};
        if (!formData.coinName.trim())
            newErrors.coinName = "Coin name is required";
        else if (formData.coinName.length > 32)
            newErrors.coinName = "Coin name must be 32 characters or less";
        if (!formData.ticker.trim()) newErrors.ticker = "Ticker is required";
        else if (formData.ticker.length > 10)
            newErrors.ticker = "Ticker must be 10 characters or less";
        if (!formData.coinMedia)
            newErrors.coinMedia = "Coin image or video is required";
        if (!agreements.generalStatement)
            newErrors.generalStatement =
                "You must accept the General Statement";
        if (!agreements.legalAdvice)
            newErrors.legalAdvice = "You must accept the Legal Advice";
        if (!agreements.privacyPolicy)
            newErrors.privacyPolicy = "You must accept the Privacy Policy";
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
            return;
        }

        setShowCreationModal(true);
        setCurrentStep(1);
        setStepStatus({
            step1: "pending",
            step2: "pending",
            step3: "pending",
        });
        setCreationProgress("Ready to create token on bonding curve...");
        setErrorDetails(null);
    };

    const startCreationProcess = async () => {
        setIsCreating(true);

        try {
            // Step 1: Create token & metadata
            setCurrentStep(1);
            const { mint, mintKeypair } = await executeStep1();

            // Step 2: Mint tokens to creator
            setCurrentStep(2);
            const { creatorTokenAccount } = await executeStep2(mint);

            // Add a 3 second delay between step 2 and step 3
            await new Promise((resolve) => setTimeout(resolve, 3000));

            // Step 3: Initialize bonding curve & transfer tokens
            setCurrentStep(3);
            await executeStep3(mint, creatorTokenAccount);

            // Save to Directus
            await saveToDirectus(mint.toString());

            setCreationResult({ mintAddress: mint.toString() });
            localStorage.removeItem("bondingCurveTokenDraft");
        } catch (error) {
            console.error("Creation process failed:", error);
        } finally {
            setIsCreating(false);
        }
    };

    const saveToDirectus = async (mintAddress) => {
        const toastId = toast.loading("Saving token information...");

        try {
            setCreationProgress("Saving token information...");

            let logoFileId = null;
            let bannerFileId = null;

            if (formData.coinMedia) {
                toast.update(toastId, { render: "Uploading logo..." });
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
            }

            if (formData.banner) {
                toast.update(toastId, { render: "Uploading banner..." });
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
            }

            toast.update(toastId, { render: "Saving project data..." });

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
                status: "published",
                logo: logoFileId,
                banner_image: bannerFileId,
                token_type: "bonding_curve",
            };

            await fetch(`${constants.backend_url}/items/projects`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${globalState.authToken}`,
                },
                body: JSON.stringify(projectData),
            });

            setCreationProgress("Token saved successfully!");
            toast.update(toastId, {
                render: "✅ Token information saved!",
                type: "success",
                isLoading: false,
                autoClose: 3000,
            });
        } catch (error) {
            console.error("Error saving to Directus:", error);
            toast.update(toastId, {
                render: "⚠️ Token created but failed to save metadata",
                type: "warning",
                isLoading: false,
                autoClose: 5000,
            });
        }
    };

    const closeModal = () => {
        setShowCreationModal(false);
        setCurrentStep(1);
        setStepStatus({
            step1: "pending",
            step2: "pending",
            step3: "pending",
        });
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
        });
        setMediaPreview(null);
        setBannerPreview(null);
        setAgreements({
            generalStatement: false,
            legalAdvice: false,
            privacyPolicy: false,
        });
        setErrors({});
        localStorage.removeItem("bondingCurveTokenDraft");
    };

    const getStepIcon = (stepNumber, status) => {
        if (status === "loading") {
            return (
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
            );
        } else if (status === "success") {
            return (
                <div className="h-6 w-6 bg-green-500 rounded-full flex items-center justify-center">
                    <svg
                        className="w-4 h-4 text-white"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M5 13l4 4L19 7"
                        ></path>
                    </svg>
                </div>
            );
        } else if (status === "error") {
            return (
                <div className="h-6 w-6 bg-red-500 rounded-full flex items-center justify-center">
                    <svg
                        className="w-4 h-4 text-white"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M6 18L18 6M6 6l12 12"
                        ></path>
                    </svg>
                </div>
            );
        } else {
            return (
                <div className="h-6 w-6 bg-gray-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm font-medium">
                        {stepNumber}
                    </span>
                </div>
            );
        }
    };

    const getStepColor = (status) => {
        switch (status) {
            case "success":
                return "text-green-400";
            case "error":
                return "text-red-400";
            case "loading":
                return "text-blue-400";
            default:
                return "text-gray-400";
        }
    };

    const isFormValid = () => {
        return (
            wallet.connected &&
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
            {/* Creation Modal */}
            {showCreationModal && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-[#192630] rounded-2xl shadow-2xl p-8 border border-gray-700 max-w-md w-full max-h-[90vh] overflow-y-auto">
                        <h2 className="text-2xl font-bold text-white mb-6 text-center">
                            Launching Token on Bonding Curve
                        </h2>

                        {/* Steps */}
                        <div className="space-y-4 mb-6">
                            {/* Step 1 */}
                            <div
                                className={`flex items-center gap-4 p-4 rounded-lg border transition-all ${
                                    stepStatus.step1 === "error"
                                        ? "border-red-500/30 bg-red-900/20"
                                        : stepStatus.step1 === "success"
                                        ? "border-green-500/30 bg-green-900/20"
                                        : stepStatus.step1 === "loading"
                                        ? "border-blue-500/30 bg-blue-900/20"
                                        : "border-gray-600/30 bg-gray-800/20"
                                }`}
                            >
                                {getStepIcon(1, stepStatus.step1)}
                                <div className="flex-1">
                                    <h3
                                        className={`font-semibold ${getStepColor(
                                            stepStatus.step1
                                        )}`}
                                    >
                                        Step 1: Create Token & Metadata
                                    </h3>
                                    <p className="text-sm text-gray-300">
                                        Creating token mint and uploading
                                        metadata
                                    </p>
                                </div>
                            </div>

                            {/* Step 2 */}
                            <div
                                className={`flex items-center gap-4 p-4 rounded-lg border transition-all ${
                                    stepStatus.step2 === "error"
                                        ? "border-red-500/30 bg-red-900/20"
                                        : stepStatus.step2 === "success"
                                        ? "border-green-500/30 bg-green-900/20"
                                        : stepStatus.step2 === "loading"
                                        ? "border-blue-500/30 bg-blue-900/20"
                                        : "border-gray-600/30 bg-gray-800/20"
                                }`}
                            >
                                {getStepIcon(2, stepStatus.step2)}
                                <div className="flex-1">
                                    <h3
                                        className={`font-semibold ${getStepColor(
                                            stepStatus.step2
                                        )}`}
                                    >
                                        Step 2: Mint Total Supply
                                    </h3>
                                    <p className="text-sm text-gray-300">
                                        Minting{" "}
                                        {BONDING_CURVE_CONFIG.TOTAL_SUPPLY.toLocaleString()}{" "}
                                        tokens to creator
                                    </p>
                                </div>
                            </div>

                            {/* Step 3 */}
                            <div
                                className={`flex items-center gap-4 p-4 rounded-lg border transition-all ${
                                    stepStatus.step3 === "error"
                                        ? "border-red-500/30 bg-red-900/20"
                                        : stepStatus.step3 === "success"
                                        ? "border-green-500/30 bg-green-900/20"
                                        : stepStatus.step3 === "loading"
                                        ? "border-blue-500/30 bg-blue-900/20"
                                        : "border-gray-600/30 bg-gray-800/20"
                                }`}
                            >
                                {getStepIcon(3, stepStatus.step3)}
                                <div className="flex-1">
                                    <h3
                                        className={`font-semibold ${getStepColor(
                                            stepStatus.step3
                                        )}`}
                                    >
                                        Step 3: Initialize Bonding Curve
                                    </h3>
                                    <p className="text-sm text-gray-300">
                                        Setting up bonding curve with first
                                        buyer lock
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Progress Text */}
                        {creationProgress && (
                            <div className="mb-6 p-4 bg-blue-900/30 border border-blue-600/50 rounded-lg">
                                <p className="text-blue-300 text-sm text-center">
                                    {creationProgress}
                                </p>
                            </div>
                        )}

                        {/* Error Details */}
                        {errorDetails && (
                            <div className="mb-6 p-4 bg-red-900/30 border border-red-600/50 rounded-lg">
                                <h3 className="text-red-300 font-semibold mb-2">
                                    ❌ Error in Step {errorDetails.step}
                                </h3>
                                <p className="text-red-200 text-sm mb-2">
                                    {errorDetails.message}
                                </p>
                                <details className="text-xs text-red-300">
                                    <summary className="cursor-pointer">
                                        View Details
                                    </summary>
                                    <pre className="mt-2 p-2 bg-black/20 rounded overflow-x-auto">
                                        {errorDetails.details}
                                    </pre>
                                </details>
                            </div>
                        )}

                        {/* Action Buttons */}
                        <div className="flex gap-3">
                            {stepStatus.step1 === "pending" &&
                                stepStatus.step2 === "pending" &&
                                stepStatus.step3 === "pending" && (
                                    <button
                                        onClick={startCreationProcess}
                                        disabled={isCreating}
                                        className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white font-medium py-3 px-6 rounded-lg transition-colors disabled:cursor-not-allowed"
                                    >
                                        {isCreating
                                            ? "Creating..."
                                            : "Start Creation"}
                                    </button>
                                )}

                            {stepStatus.step1 === "success" &&
                                stepStatus.step2 === "success" &&
                                stepStatus.step3 === "success" && (
                                    <>
                                        <button
                                            onClick={() => {
                                                closeModal();
                                                resetForm();
                                            }}
                                            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-lg transition-colors"
                                        >
                                            Close
                                        </button>
                                    </>
                                )}

                            {(stepStatus.step1 === "error" ||
                                stepStatus.step2 === "error" ||
                                stepStatus.step3 === "error") && (
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

                        {/* Success Summary */}
                        {creationResult && stepStatus.step3 === "success" && (
                            <div className="mt-6 p-4 bg-green-900/30 border border-green-600/50 rounded-lg">
                                <h3 className="text-green-300 font-semibold mb-2 text-center">
                                    ✅ Token Launched Successfully!
                                </h3>
                                <div className="text-sm text-green-200 space-y-2">
                                    <p className="break-all">
                                        <strong>Mint:</strong>{" "}
                                        {creationResult.mintAddress}
                                    </p>
                                    <div className="mt-3 pt-3 border-t border-green-600/30">
                                        <p className="text-xs text-green-300 font-semibold mb-2">
                                            📈 Bonding Curve Active:
                                        </p>
                                        <ul className="text-xs text-green-200 space-y-1 ml-4 list-disc">
                                            <li>
                                                Initial price: ~
                                                {(
                                                    BONDING_CURVE_CONFIG.VIRTUAL_SOL_RESERVES /
                                                    BONDING_CURVE_CONFIG.VIRTUAL_TOKEN_RESERVES
                                                ).toFixed(8)}{" "}
                                                SOL
                                            </li>
                                            <li>
                                                Users can buy/sell on the curve
                                            </li>
                                            <li>
                                                Migration at{" "}
                                                {
                                                    BONDING_CURVE_CONFIG.MIGRATION_THRESHOLD
                                                }{" "}
                                                SOL
                                            </li>
                                            <li>
                                                60% of First buyer's tokens locked until
                                                conditions met
                                            </li>
                                            <li>
                                                Unlock requires{" "}
                                                {
                                                    BONDING_CURVE_CONFIG.HOLDER_THRESHOLD
                                                }{" "}
                                                holders and $
                                                {BONDING_CURVE_CONFIG.VOLUME_THRESHOLD_USD_CENTS /
                                                    100}{" "}
                                                trading volume
                                            </li>
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            <div className="max-w-6xl mx-auto">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Form Section */}
                    <div className="bg-[#192630] rounded-2xl shadow-2xl p-8 border border-gray-700">
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <h1 className="text-3xl font-bold text-white mb-2">
                                    Smart Token Creator
                                </h1>
                                <p className="text-gray-400 text-sm">
                                    Fair Launch via Bonding Curve
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                <div
                                    className={`w-2 h-2 rounded-full ${
                                        isFormValid()
                                            ? "bg-green-500"
                                            : "bg-gray-500"
                                    }`}
                                ></div>
                                <span className="text-xs text-gray-400">
                                    {isFormValid() ? "Ready" : "Fill form"}
                                </span>
                            </div>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            {/* Basic Info */}
                            <div className="space-y-4">
                                <h3 className="text-lg font-semibold text-white">
                                    Basic Information
                                </h3>

                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">
                                        Coin Name *
                                    </label>
                                    <input
                                        type="text"
                                        name="coinName"
                                        value={formData.coinName}
                                        onChange={handleInputChange}
                                        placeholder="Enter coin name"
                                        maxLength={32}
                                        className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                    {errors.coinName && (
                                        <p className="mt-1 text-sm text-red-400">
                                            {errors.coinName}
                                        </p>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">
                                        Ticker *
                                    </label>
                                    <input
                                        type="text"
                                        name="ticker"
                                        value={formData.ticker}
                                        onChange={handleInputChange}
                                        placeholder="Enter ticker symbol"
                                        maxLength={10}
                                        className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                    {errors.ticker && (
                                        <p className="mt-1 text-sm text-red-400">
                                            {errors.ticker}
                                        </p>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">
                                        Description
                                    </label>
                                    <textarea
                                        name="description"
                                        value={formData.description}
                                        onChange={handleInputChange}
                                        placeholder="Describe your token"
                                        rows={4}
                                        className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                            </div>

                            {/* Media Upload */}
                            <div className="space-y-4">
                                <h3 className="text-lg font-semibold text-white">
                                    Media
                                </h3>

                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">
                                        Coin Image/Video *
                                    </label>
                                    <div className="flex items-center gap-4">
                                        <label className="flex-1 cursor-pointer">
                                            <div className="border-2 border-dashed border-gray-600 rounded-lg p-6 hover:border-blue-500 transition-colors">
                                                <div className="text-center">
                                                    <svg
                                                        className="mx-auto h-12 w-12 text-gray-400"
                                                        fill="none"
                                                        stroke="currentColor"
                                                        viewBox="0 0 24 24"
                                                    >
                                                        <path
                                                            strokeLinecap="round"
                                                            strokeLinejoin="round"
                                                            strokeWidth="2"
                                                            d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                                                        />
                                                    </svg>
                                                    <p className="mt-2 text-sm text-gray-400">
                                                        {formData.coinMedia
                                                            ? formData.coinMedia
                                                                  .name
                                                            : "Upload image or video"}
                                                    </p>
                                                </div>
                                            </div>
                                            <input
                                                type="file"
                                                accept="image/*,video/mp4"
                                                onChange={(e) =>
                                                    handleFileChange(e, "coin")
                                                }
                                                className="hidden"
                                            />
                                        </label>
                                        {mediaPreview && (
                                            <div className="w-24 h-24 rounded-lg overflow-hidden border border-gray-600">
                                                {formData.coinMedia?.type.startsWith(
                                                    "video"
                                                ) ? (
                                                    <video
                                                        src={mediaPreview}
                                                        className="w-full h-full object-cover"
                                                    />
                                                ) : (
                                                    <img
                                                        src={mediaPreview}
                                                        alt="Preview"
                                                        className="w-full h-full object-cover"
                                                    />
                                                )}
                                            </div>
                                        )}
                                    </div>
                                    {errors.coinMedia && (
                                        <p className="mt-1 text-sm text-red-400">
                                            {errors.coinMedia}
                                        </p>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">
                                        Banner Image (Optional)
                                    </label>
                                    <div className="flex items-center gap-4">
                                        <label className="flex-1 cursor-pointer">
                                            <div className="border-2 border-dashed border-gray-600 rounded-lg p-6 hover:border-blue-500 transition-colors">
                                                <div className="text-center">
                                                    <svg
                                                        className="mx-auto h-12 w-12 text-gray-400"
                                                        fill="none"
                                                        stroke="currentColor"
                                                        viewBox="0 0 24 24"
                                                    >
                                                        <path
                                                            strokeLinecap="round"
                                                            strokeLinejoin="round"
                                                            strokeWidth="2"
                                                            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                                                        />
                                                    </svg>
                                                    <p className="mt-2 text-sm text-gray-400">
                                                        {formData.banner
                                                            ? formData.banner
                                                                  .name
                                                            : "Upload banner"}
                                                    </p>
                                                </div>
                                            </div>
                                            <input
                                                type="file"
                                                accept="image/*"
                                                onChange={(e) =>
                                                    handleFileChange(
                                                        e,
                                                        "banner"
                                                    )
                                                }
                                                className="hidden"
                                            />
                                        </label>
                                        {bannerPreview && (
                                            <div className="w-32 h-20 rounded-lg overflow-hidden border border-gray-600">
                                                <img
                                                    src={bannerPreview}
                                                    alt="Banner Preview"
                                                    className="w-full h-full object-cover"
                                                />
                                            </div>
                                        )}
                                    </div>
                                    {errors.banner && (
                                        <p className="mt-1 text-sm text-red-400">
                                            {errors.banner}
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* Social Links */}
                            <div className="space-y-4">
                                <h3 className="text-lg font-semibold text-white">
                                    Social Links (Optional)
                                </h3>

                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">
                                        Website
                                    </label>
                                    <input
                                        type="url"
                                        name="website"
                                        value={formData.website}
                                        onChange={handleInputChange}
                                        placeholder="https://yourwebsite.com"
                                        className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">
                                        Twitter
                                    </label>
                                    <input
                                        type="text"
                                        name="twitter"
                                        value={formData.twitter}
                                        onChange={handleInputChange}
                                        placeholder="@yourhandle"
                                        className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">
                                        Telegram
                                    </label>
                                    <input
                                        type="text"
                                        name="telegram"
                                        value={formData.telegram}
                                        onChange={handleInputChange}
                                        placeholder="@yourgroup"
                                        className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                            </div>

                            {/* Legal Agreements */}
                            <div className="space-y-4 pt-6 border-t border-gray-700">
                                <h3 className="text-lg font-semibold text-white">
                                    Legal Agreements *
                                </h3>

                                <div className="space-y-3">
                                    <label className="flex items-start gap-3 cursor-pointer group">
                                        <input
                                            type="checkbox"
                                            checked={
                                                agreements.generalStatement
                                            }
                                            onChange={(e) =>
                                                setAgreements((prev) => ({
                                                    ...prev,
                                                    generalStatement:
                                                        e.target.checked,
                                                }))
                                            }
                                            className="mt-1 w-5 h-5 rounded border-gray-600 text-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-gray-800"
                                        />
                                        <span className="text-sm text-gray-300 group-hover:text-white transition-colors">
                                            I have read and accept the{" "}
                                            <a
                                                href="/general-statement"
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-blue-400 hover:text-blue-300 underline transition-colors"
                                                onClick={(e) =>
                                                    e.stopPropagation()
                                                }
                                            >
                                                General Statement
                                            </a>{" "}
                                            regarding token creation and
                                            platform usage.
                                        </span>
                                    </label>
                                    {errors.generalStatement && (
                                        <p className="ml-8 text-sm text-red-400">
                                            {errors.generalStatement}
                                        </p>
                                    )}

                                    <label className="flex items-start gap-3 cursor-pointer group">
                                        <input
                                            type="checkbox"
                                            checked={agreements.legalAdvice}
                                            onChange={(e) =>
                                                setAgreements((prev) => ({
                                                    ...prev,
                                                    legalAdvice:
                                                        e.target.checked,
                                                }))
                                            }
                                            className="mt-1 w-5 h-5 rounded border-gray-600 text-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-gray-800"
                                        />
                                        <span className="text-sm text-gray-300 group-hover:text-white transition-colors">
                                            I have read and understand the{" "}
                                            <a
                                                href="/legal-advice"
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-blue-400 hover:text-blue-300 underline transition-colors"
                                                onClick={(e) =>
                                                    e.stopPropagation()
                                                }
                                            >
                                                Legal Advice
                                            </a>{" "}
                                            and acknowledge the legal
                                            implications of token creation.
                                        </span>
                                    </label>
                                    {errors.legalAdvice && (
                                        <p className="ml-8 text-sm text-red-400">
                                            {errors.legalAdvice}
                                        </p>
                                    )}

                                    <label className="flex items-start gap-3 cursor-pointer group">
                                        <input
                                            type="checkbox"
                                            checked={agreements.privacyPolicy}
                                            onChange={(e) =>
                                                setAgreements((prev) => ({
                                                    ...prev,
                                                    privacyPolicy:
                                                        e.target.checked,
                                                }))
                                            }
                                            className="mt-1 w-5 h-5 rounded border-gray-600 text-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-gray-800"
                                        />
                                        <span className="text-sm text-gray-300 group-hover:text-white transition-colors">
                                            I have read and accept the{" "}
                                            <a
                                                href="/privacy-policy"
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-blue-400 hover:text-blue-300 underline transition-colors"
                                                onClick={(e) =>
                                                    e.stopPropagation()
                                                }
                                            >
                                                Privacy Policy
                                            </a>{" "}
                                            regarding data collection and usage.
                                        </span>
                                    </label>
                                    {errors.privacyPolicy && (
                                        <p className="ml-8 text-sm text-red-400">
                                            {errors.privacyPolicy}
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* Submit Button */}
                            <div className="sticky bottom-0 bg-[#192630] pt-6 pb-4 -mx-8 px-8 border-t border-gray-700">
                                {!wallet.connected && (
                                    <div className="mb-4 p-3 bg-yellow-900/30 border border-yellow-600/50 rounded-lg">
                                        <p className="text-yellow-300 text-sm text-center">
                                            Please connect your wallet to create
                                            a token
                                        </p>
                                    </div>
                                )}
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
                                    ) : (
                                        <>
                                            <svg
                                                className="w-5 h-5"
                                                fill="currentColor"
                                                viewBox="0 0 20 20"
                                            >
                                                <path
                                                    fillRule="evenodd"
                                                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                                    clipRule="evenodd"
                                                />
                                            </svg>
                                            Create Token on Bonding Curve
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>

                    {/* Preview Section - Shows Bonding Curve Info */}
                    <div className="bg-[#192630] rounded-2xl shadow-2xl p-8 border border-gray-700 sticky top-28 h-fit">
                        <h2 className="text-2xl font-bold text-white mb-6">
                            Bonding Curve Launch
                        </h2>

                        {/* Bonding Curve Explanation */}
                        <div className="bg-gradient-to-br from-purple-900/30 to-blue-900/30 border border-purple-600/30 rounded-lg p-6 mb-6">
                            <h3 className="text-purple-300 font-semibold mb-3 flex items-center gap-2">
                                <svg
                                    className="w-5 h-5"
                                    fill="currentColor"
                                    viewBox="0 0 20 20"
                                >
                                    <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
                                </svg>
                                How It Works
                            </h3>
                            <ul className="text-sm text-blue-200 space-y-2">
                                <li className="flex items-start gap-2">
                                    <span className="text-purple-400 mt-0.5">
                                        1.
                                    </span>
                                    <span>
                                        Token launches on bonding curve - users
                                        buy/sell directly
                                    </span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-purple-400 mt-0.5">
                                        2.
                                    </span>
                                    <span>
                                        Price increases automatically as more
                                        SOL is deposited
                                    </span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-purple-400 mt-0.5">
                                        3.
                                    </span>
                                    <span>
                                        First buyer's tokens are locked until
                                        conditions met
                                    </span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-purple-400 mt-0.5">
                                        4.
                                    </span>
                                    <span>
                                        At{" "}
                                        {
                                            BONDING_CURVE_CONFIG.MIGRATION_THRESHOLD
                                        }{" "}
                                        SOL, migrates to Raydium pool
                                    </span>
                                </li>
                            </ul>
                        </div>

                        {/* Token Economics */}
                        <div className="bg-gray-800/30 rounded-lg p-4 mb-4">
                            <h3 className="text-white font-semibold mb-3 text-sm">
                                Token Economics
                            </h3>
                            <div className="space-y-2 text-xs">
                                <div className="flex justify-between">
                                    <span className="text-gray-400">
                                        Total Supply:
                                    </span>
                                    <span className="text-white font-medium">
                                        {BONDING_CURVE_CONFIG.TOTAL_SUPPLY.toLocaleString()}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-400">
                                        Initial Price:
                                    </span>
                                    <span className="text-white font-medium">
                                        ~
                                        {(
                                            BONDING_CURVE_CONFIG.VIRTUAL_SOL_RESERVES /
                                            BONDING_CURVE_CONFIG.VIRTUAL_TOKEN_RESERVES
                                        ).toFixed(8)}{" "}
                                        SOL
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-400">
                                        Virtual SOL:
                                    </span>
                                    <span className="text-white font-medium">
                                        {
                                            BONDING_CURVE_CONFIG.VIRTUAL_SOL_RESERVES
                                        }{" "}
                                        SOL
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-400">
                                        Virtual Tokens:
                                    </span>
                                    <span className="text-white font-medium">
                                        {(
                                            BONDING_CURVE_CONFIG.VIRTUAL_TOKEN_RESERVES /
                                            1e9
                                        ).toFixed(2)}
                                        B
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-400">
                                        Unlock Holder Threshold:
                                    </span>
                                    <span className="text-white font-medium">
                                        {BONDING_CURVE_CONFIG.HOLDER_THRESHOLD}{" "}
                                        holders
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-400">
                                        Unlock Volume Threshold:
                                    </span>
                                    <span className="text-white font-medium">
                                        $
                                        {BONDING_CURVE_CONFIG.VOLUME_THRESHOLD_USD_CENTS /
                                            100}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-400">
                                        Migration Threshold:
                                    </span>
                                    <span className="text-white font-medium">
                                        {
                                            BONDING_CURVE_CONFIG.MIGRATION_THRESHOLD
                                        }{" "}
                                        SOL
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Features */}
                        <div className="bg-gray-800/30 rounded-lg p-4 mb-4">
                            <h3 className="text-white font-semibold mb-3 text-sm">
                                Key Features
                            </h3>
                            <div className="space-y-2">
                                <div className="flex items-start gap-2">
                                    <svg
                                        className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0"
                                        fill="currentColor"
                                        viewBox="0 0 20 20"
                                    >
                                        <path
                                            fillRule="evenodd"
                                            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                            clipRule="evenodd"
                                        />
                                    </svg>
                                    <span className="text-xs text-gray-300">
                                        Fair launch with no pre-sale
                                    </span>
                                </div>
                                <div className="flex items-start gap-2">
                                    <svg
                                        className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0"
                                        fill="currentColor"
                                        viewBox="0 0 20 20"
                                    >
                                        <path
                                            fillRule="evenodd"
                                            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                            clipRule="evenodd"
                                        />
                                    </svg>
                                    <span className="text-xs text-gray-300">
                                        0.75% transfer fee to the creator on all
                                        trades
                                    </span>
                                </div>
                                <div className="flex items-start gap-2">
                                    <svg
                                        className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0"
                                        fill="currentColor"
                                        viewBox="0 0 20 20"
                                    >
                                        <path
                                            fillRule="evenodd"
                                            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                            clipRule="evenodd"
                                        />
                                    </svg>
                                    <span className="text-xs text-gray-300">
                                        First buyer tokens locked until{" "}
                                        {BONDING_CURVE_CONFIG.HOLDER_THRESHOLD}{" "}
                                        holders & $
                                        {BONDING_CURVE_CONFIG.VOLUME_THRESHOLD_USD_CENTS /
                                            100}{" "}
                                        volume
                                    </span>
                                </div>
                                <div className="flex items-start gap-2">
                                    <svg
                                        className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0"
                                        fill="currentColor"
                                        viewBox="0 0 20 20"
                                    >
                                        <path
                                            fillRule="evenodd"
                                            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                            clipRule="evenodd"
                                        />
                                    </svg>
                                    <span className="text-xs text-gray-300">
                                        Automatic migration to Raydium
                                    </span>
                                </div>
                                <div className="flex items-start gap-2">
                                    <svg
                                        className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0"
                                        fill="currentColor"
                                        viewBox="0 0 20 20"
                                    >
                                        <path
                                            fillRule="evenodd"
                                            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                            clipRule="evenodd"
                                        />
                                    </svg>
                                    <span className="text-xs text-gray-300">
                                        Revoked mint authority
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Token Preview */}
                        {(formData.coinName ||
                            formData.ticker ||
                            mediaPreview) && (
                            <div className="bg-gray-800/30 rounded-lg p-4">
                                <h3 className="text-white font-semibold mb-3 text-sm">
                                    Token Preview
                                </h3>
                                <div className="flex items-center gap-4">
                                    {mediaPreview && (
                                        <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-blue-500">
                                            {formData.coinMedia?.type.startsWith(
                                                "video"
                                            ) ? (
                                                <video
                                                    src={mediaPreview}
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <img
                                                    src={mediaPreview}
                                                    alt="Token"
                                                    className="w-full h-full object-cover"
                                                />
                                            )}
                                        </div>
                                    )}
                                    <div className="flex-1">
                                        <h4 className="text-white font-medium">
                                            {formData.coinName || "Your Token"}
                                        </h4>
                                        <p className="text-gray-400 text-sm">
                                            ${formData.ticker || "TICKER"}
                                        </p>
                                    </div>
                                </div>
                                {formData.description && (
                                    <p className="mt-3 text-xs text-gray-400 line-clamp-3">
                                        {formData.description}
                                    </p>
                                )}
                            </div>
                        )}

                        {/* Warning */}
                        <div className="mt-6 p-4 bg-yellow-900/20 border border-yellow-600/30 rounded-lg">
                            <div className="flex gap-2">
                                <svg
                                    className="w-5 h-5 text-yellow-400 flex-shrink-0"
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
                                        Important Notice
                                    </h4>
                                    <p className="text-yellow-200 text-xs">
                                        Token creation is irreversible.
                                        Double-check all information before
                                        launching. You'll need SOL for
                                        transaction fees. The first buyer will
                                        have their tokens locked until unlock
                                        conditions are met.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BondingCurveCreateCoin;
