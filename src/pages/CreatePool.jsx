import React, { useState, useEffect } from "react";
import { useUnifiedWallet } from "../hooks/useUnifiedWallet";
import { useSolanaTokenFlow } from "../hooks/useSolanaTokenFlow";
import { useGlobalState } from "../hooks/useGlobalState";
import { useSearchParams } from "react-router-dom";
import { PublicKey } from "@solana/web3.js";
import { getUserStakes } from "../hooks/frontend-functions";
import constants from "../constants";
import axios from "axios";

const CreatePool = () => {
    const wallet = useUnifiedWallet();
    const { globalState } = useGlobalState();
    const [searchParams] = useSearchParams();
    const {
        createRaydiumPoolWithFee,
        initializeLPLock,
    } = useSolanaTokenFlow();

    const [formData, setFormData] = useState({
        mintAddress: "",
        initialPrice: "0.0001",
        baseAmount: "0.5",
    });

    const [tokenInfo, setTokenInfo] = useState(null);
    const [isLoadingToken, setIsLoadingToken] = useState(false);
    const [errors, setErrors] = useState({});
    const [isCreating, setIsCreating] = useState(false);
    const [creationResult, setCreationResult] = useState(null);

    // Staked NFT states
    const [hasStakedNFT, setHasStakedNFT] = useState(false);
    const [isCheckingStake, setIsCheckingStake] = useState(true);
    const [stakeError, setStakeError] = useState(null);
    const [commissionSettings, setCommissionSettings] = useState(null);
    const [isLoadingSettings, setIsLoadingSettings] = useState(true);

    // Modal states
    const [showCreationModal, setShowCreationModal] = useState(false);
    const [currentStep, setCurrentStep] = useState(1);
    const [stepStatus, setStepStatus] = useState({
        step1: "pending",
        step2: "pending",
    });
    const [creationProgress, setCreationProgress] = useState("");
    const [errorDetails, setErrorDetails] = useState(null);

    // Get mint address from URL parameters
    useEffect(() => {
        const mintParam = searchParams.get('mint');
        if (mintParam) {
            setFormData(prev => ({ ...prev, mintAddress: mintParam }));
            fetchTokenInfo(mintParam);
        }
    }, [searchParams]);

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
                    pool_creation_fee: "0.05", // Default if not set
                });
            } catch (error) {
                console.error("❌ Error loading commission settings:", error);
            } finally {
                setIsLoadingSettings(false);
            }
        };

        loadCommissionSettings();
    }, [globalState.authToken]);

    // Check user's staked NFTs
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
                const stakes = await getUserStakes(wallet);
                const hasStaked =
                    stakes && stakes.stakes && stakes.stakes.length > 0;
                setHasStakedNFT(hasStaked);
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

    const fetchTokenInfo = async (mintAddress) => {
        if (!mintAddress) return;
        
        try {
            setIsLoadingToken(true);
            // Fetch token metadata from your backend or on-chain
            const response = await fetch(`${constants.backend_url}/items/projects?filter[contract_address][_eq]=${mintAddress}`);
            if (response.ok) {
                const data = await response.json();
                if (data.data && data.data.length > 0) {
                    setTokenInfo(data.data[0]);
                }
            }
        } catch (error) {
            console.error("Error fetching token info:", error);
        } finally {
            setIsLoadingToken(false);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));
        
        if (errors[name]) {
            setErrors((prev) => {
                const newErrors = { ...prev };
                delete newErrors[name];
                return newErrors;
            });
        }

        // If mint address changes, fetch token info
        if (name === 'mintAddress' && value) {
            fetchTokenInfo(value);
        }
    };

    const validateForm = () => {
        const newErrors = {};

        if (!formData.mintAddress.trim()) {
            newErrors.mintAddress = "Mint address is required";
        } else {
            try {
                new PublicKey(formData.mintAddress);
            } catch {
                newErrors.mintAddress = "Invalid mint address";
            }
        }

        if (!formData.initialPrice || parseFloat(formData.initialPrice) <= 0) {
            newErrors.initialPrice = "Initial price must be greater than 0";
        }

        if (!formData.baseAmount || parseFloat(formData.baseAmount) <= 0) {
            newErrors.baseAmount = "SOL amount must be greater than 0";
        }

        return newErrors;
    };

    const executeStep1 = async (mintAddress) => {
        try {
            setStepStatus((prev) => ({ ...prev, step1: "loading" }));
            setCreationProgress("Creating Raydium liquidity pool...");

            const result = await createRaydiumPoolWithFee(mintAddress);

            setStepStatus((prev) => ({ ...prev, step1: "success" }));
            setCreationProgress("Pool created successfully! Locking LP tokens...");

            return result;
        } catch (error) {
            console.error("Step 1 failed:", error);
            setStepStatus((prev) => ({ ...prev, step1: "error" }));
            setErrorDetails({
                step: 1,
                message: error.message || "Failed to create pool",
                details: error.toString(),
            });
            throw error;
        }
    };

    const executeStep2 = async (lpMint) => {
        try {
            setStepStatus((prev) => ({ ...prev, step2: "loading" }));
            setCreationProgress("Locking LP tokens with unlock conditions...");

            const result = await initializeLPLock(lpMint);

            setStepStatus((prev) => ({ ...prev, step2: "success" }));
            setCreationProgress("LP tokens locked successfully!");

            return result;
        } catch (error) {
            console.error("Step 2 failed:", error);
            setStepStatus((prev) => ({ ...prev, step2: "error" }));
            setErrorDetails({
                step: 2,
                message: error.message || "Failed to lock LP tokens",
                details: error.toString(),
            });
            throw error;
        }
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

        // Open modal and start the process
        setShowCreationModal(true);
        setCurrentStep(1);
        setStepStatus({ step1: "pending", step2: "pending" });
        setCreationProgress("Ready to start pool creation...");
        setErrorDetails(null);
    };

    const startCreationProcess = async () => {
        setIsCreating(true);

        try {
            // Step 1: Create pool
            setCurrentStep(1);
            const poolResult = await executeStep1(formData.mintAddress);

            await new Promise((resolve) => setTimeout(resolve, 2000));

            // Step 2: Lock LP
            setCurrentStep(2);
            const lockResult = await executeStep2(poolResult.lpMint);

            // Update project in Directus
            await updateProjectInDirectus(
                formData.mintAddress,
                lockResult.lockInfo.toString(),
                lockResult.lockVault.toString(),
                poolResult.lpMint.toString(),
                poolResult.poolAddress
            );

            // Final success
            setCreationResult({
                poolAddress: poolResult.poolAddress,
                lpMint: poolResult.lpMint,
                lockInfo: lockResult.lockInfo,
            });
        } catch (error) {
            console.error("Creation process failed:", error);
        } finally {
            setIsCreating(false);
        }
    };

    const updateProjectInDirectus = async (mintAddress, lockInfo, lockVault, lpMint, poolAddress) => {
        try {
            setCreationProgress("Updating project with pool information...");

            const projectData = {
                lockinfo: lockInfo,
                lockvault: lockVault,
                lpmint: lpMint,
                pool_address: poolAddress,
                status: "published", // Update status to published now that pool is created
            };

            const response = await fetch(
                `${constants.backend_url}/items/projects?filter[contract_address][_eq]=${mintAddress}`,
                {
                    method: "PATCH",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${globalState.authToken}`,
                    },
                    body: JSON.stringify(projectData),
                }
            );

            if (response.ok) {
                setCreationProgress("Project updated successfully!");
            }
        } catch (directusError) {
            console.error("Error updating project in Directus:", directusError);
        }
    };

    const closeModal = () => {
        setShowCreationModal(false);
        setCurrentStep(1);
        setStepStatus({ step1: "pending", step2: "pending" });
        setCreationProgress("");
        setErrorDetails(null);
    };

    const getStepIcon = (stepNumber, status) => {
        if (status === "loading") {
            return <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>;
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
            formData.mintAddress.trim() &&
            formData.initialPrice &&
            parseFloat(formData.initialPrice) > 0 &&
            formData.baseAmount &&
            parseFloat(formData.baseAmount) > 0
        );
    };

    // Calculate total cost based on staked NFT status
    const getTotalCost = () => {
        const baseAmount = parseFloat(formData.baseAmount) || 0;
        const poolFee = hasStakedNFT ? 0 : parseFloat("0.05");
        const networkFee = 0;
        
        return (baseAmount + poolFee + networkFee).toFixed(2);
    };

    return (
        <div className="min-h-screen bg-[#0A151E] py-8 px-4 pt-28">
            {/* Creation Modal */}
            {showCreationModal && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-[#192630] rounded-2xl shadow-2xl p-8 border border-gray-700 max-w-md w-full max-h-[90vh] overflow-y-auto">
                        <h2 className="text-2xl font-bold text-white mb-6 text-center">Creating Liquidity Pool</h2>

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
                                    <h3 className={`font-semibold ${getStepColor(stepStatus.step1)}`}>Step 1: Create Liquidity Pool</h3>
                                    <p className="text-sm text-gray-300">Creating Raydium pool with initial liquidity</p>
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
                                    <h3 className={`font-semibold ${getStepColor(stepStatus.step2)}`}>Step 2: Lock LP Tokens</h3>
                                    <p className="text-sm text-gray-300">Locking 60% of LP with unlock conditions</p>
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
                                            window.location.href = `/token/${formData.mintAddress}`;
                                        }}
                                        className="flex-1 bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-6 rounded-lg transition-colors"
                                    >
                                        View Token
                                    </button>
                                    <button
                                        onClick={() => {
                                            closeModal();
                                            setFormData({
                                                mintAddress: "",
                                                initialPrice: "0.0001",
                                                baseAmount: "0.5",
                                            });
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
                                <h3 className="text-green-300 font-semibold mb-2 text-center">✅ Pool Created Successfully!</h3>
                                <div className="text-sm text-green-200 space-y-1">
                                    <p className="break-all"><strong>Pool:</strong> {creationResult.poolAddress}</p>
                                    <div className="mt-3 pt-3 border-t border-green-600/30">
                                        <p className="text-xs text-green-300">🔒 60% of LP tokens locked until:</p>
                                        <ul className="text-xs text-green-200 mt-1 ml-4 list-disc">
                                            <li>300+ unique holders</li>
                                            <li>$25000+ trading volume</li>
                                        </ul>
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
                        <h1 className="text-3xl font-bold text-white">Create Liquidity Pool</h1>
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
                            <div className="flex items-start gap-3">
                                <svg className="w-5 h-5 text-yellow-400 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                </svg>
                                <div>
                                    <h3 className="text-yellow-300 font-semibold mb-2">🔗 Wallet Required</h3>
                                    <p className="text-yellow-200 text-sm">Please connect your wallet to check your eligibility for pool creation.</p>
                                </div>
                            </div>
                        </div>
                    ) : !hasStakedNFT ? (
                        <div className="mb-6 p-4 bg-orange-900/30 border border-orange-600/50 rounded-lg">
                            <div className="flex items-start gap-3">
                                <svg className="w-5 h-5 text-orange-400 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd" />
                                </svg>
                                <div>
                                    <h3 className="text-orange-300 font-semibold mb-2">💰 Pool Creation Fee</h3>
                                    <p className="text-orange-200 text-sm mb-3">
                                        No staked NFTs detected. Pool creation fee: <strong>{commissionSettings?.pool_creation_fee} SOL</strong>
                                    </p>
                                    <div className="flex flex-col sm:flex-row gap-3">
                                        <a href="/nft-staking" className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                            </svg>
                                            Stake NFT for Free Pool Creation
                                        </a>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="mb-6 p-4 bg-green-900/30 border border-green-600/50 rounded-lg">
                            <div className="flex items-start gap-3">
                                <svg className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                                <div>
                                    <h3 className="text-green-300 font-semibold mb-1">✅ Eligible for Free Pool Creation</h3>
                                    <p className="text-green-200 text-sm">You have staked NFTs! Create your pool without any fees.</p>
                                </div>
                            </div>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-8">
                        {/* Token Selection */}
                        <div className="space-y-6">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                                    <span className="text-white font-bold text-sm">1</span>
                                </div>
                                <h2 className="text-xl font-semibold text-white">Select Token</h2>
                            </div>

                            <div className="space-y-4 pl-10">
                                <div>
                                    <label htmlFor="mintAddress" className="block text-sm font-medium text-gray-300 mb-2">
                                        Token Mint Address *
                                    </label>
                                    <input
                                        type="text"
                                        id="mintAddress"
                                        name="mintAddress"
                                        value={formData.mintAddress}
                                        onChange={handleInputChange}
                                        className={`w-full px-4 py-3 bg-gray-800/50 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all text-white placeholder-gray-400 ${
                                            errors.mintAddress ? "border-red-500 bg-red-900/20 shake" : "border-gray-600 hover:border-gray-500"
                                        }`}
                                        placeholder="Enter your token mint address..."
                                    />
                                    {errors.mintAddress && <p className="text-sm text-red-400 mt-1">{errors.mintAddress}</p>}
                                    
                                    {tokenInfo && (
                                        <div className="mt-3 p-3 bg-green-900/20 border border-green-600/30 rounded-lg">
                                            <div className="flex items-center gap-3">
                                                {tokenInfo.logo && (
                                                    <img src={`${constants.backend_url}/assets/${tokenInfo.logo}`} alt={tokenInfo.name} className="w-8 h-8 rounded-full" />
                                                )}
                                                <div>
                                                    <p className="text-white font-medium">{tokenInfo.name}</p>
                                                    <p className="text-green-300 text-sm">${tokenInfo.symbol}</p>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {isLoadingToken && (
                                        <div className="mt-3 p-3 bg-blue-900/20 border border-blue-600/30 rounded-lg">
                                            <div className="flex items-center gap-3">
                                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-400"></div>
                                                <p className="text-blue-300 text-sm">Loading token information...</p>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="bg-blue-900/20 border border-blue-600/30 rounded-lg p-4">
                                    <h3 className="text-blue-300 font-semibold text-sm mb-2">💡 Don't have a token yet?</h3>
                                    <p className="text-blue-200 text-sm mb-3">Create a token first to proceed with liquidity pool creation.</p>
                                    <a href="/create-token" className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                        </svg>
                                        Create New Token
                                    </a>
                                </div>
                            </div>
                        </div>

                        {/* Pool Configuration */}
                        <div className="space-y-6">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center">
                                    <span className="text-white font-bold text-sm">2</span>
                                </div>
                                <h2 className="text-xl font-semibold text-white">Pool Configuration</h2>
                            </div>

                            <div className="space-y-4 pl-10">
                                <div className="bg-blue-900/20 border border-blue-600/30 rounded-lg p-4">
                                    <h3 className="text-blue-300 font-semibold mb-3 flex items-center gap-2">
                                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                            <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
                                        </svg>
                                        Initial Liquidity Pool (Preset Values)
                                    </h3>

                                    <div className="space-y-3">
                                        {/* Preset Initial Price */}
                                        <div>
                                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                                Initial Price (SOL) *
                                            </label>
                                            <input
                                                type="number"
                                                id="initialPrice"
                                                name="initialPrice"
                                                value={formData.initialPrice}
                                                onChange={handleInputChange}
                                                className={`w-full px-4 py-3 bg-gray-800/50 border rounded-lg text-white placeholder-gray-400 ${
                                                    errors.initialPrice ? "border-red-500 bg-red-900/20" : "border-gray-600"
                                                }`}
                                                step="0.000001"
                                                min="0.000001"
                                            />
                                            {errors.initialPrice && <p className="text-sm text-red-400 mt-1">{errors.initialPrice}</p>}
                                            <p className="text-xs text-gray-400 mt-1">Fixed initial price (preset like Pump.fun)</p>
                                        </div>

                                        {/* Preset Liquidity */}
                                        <div>
                                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                                SOL Liquidity Amount *
                                            </label>
                                            <input
                                                type="number"
                                                id="baseAmount"
                                                name="baseAmount"
                                                value={formData.baseAmount}
                                                onChange={handleInputChange}
                                                className={`w-full px-4 py-3 bg-gray-800/50 border rounded-lg text-white placeholder-gray-400 ${
                                                    errors.baseAmount ? "border-red-500 bg-red-900/20" : "border-gray-600"
                                                }`}
                                                step="0.1"
                                                min="0.1"
                                            />
                                            {errors.baseAmount && <p className="text-sm text-red-400 mt-1">{errors.baseAmount}</p>}
                                            <p className="text-xs text-gray-400 mt-1">SOL amount to provide as liquidity</p>
                                        </div>
                                    </div>

                                    {/* LP Lock Info */}
                                    <div className="mt-4 pt-4 border-t border-blue-600/30">
                                        <p className="text-xs text-blue-200 mb-2"><strong>🔒 Automatic LP Lock:</strong></p>
                                        <ul className="text-xs text-blue-300 space-y-1 ml-4 list-disc">
                                            <li>60% of LP tokens will be automatically locked</li>
                                            <li>Unlock conditions: 300+ holders AND $25k+ volume</li>
                                            <li>Provides trust and security for your token</li>
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Cost Summary */}
                        {commissionSettings && (
                            <div className="bg-gradient-to-r from-purple-900/30 to-blue-900/30 border border-purple-600/30 rounded-lg p-6">
                                <h3 className="text-purple-300 font-semibold text-sm mb-3">Cost Summary</h3>
                                <div className="space-y-2 text-xs">
                                    <div className="flex justify-between text-gray-300">
                                        <span>Pool Creation:</span>
                                        <span className="font-medium">
                                            {hasStakedNFT ? (
                                                <span className="text-green-400">FREE (NFT Staked)</span>
                                            ) : (
                                                <span>{commissionSettings.pool_creation_fee} SOL</span>
                                            )}
                                        </span>
                                    </div>
                                    <div className="flex justify-between text-gray-300">
                                        <span>Pool Liquidity:</span>
                                        <span className="font-medium">{formData.baseAmount || "—"} SOL</span>
                                    </div>
                                    <div className="flex justify-between text-gray-300">
                                        <span>Network Fees (est.):</span>
                                        <span className="font-medium">~0.01 SOL</span>
                                    </div>
                                    <div className="pt-2 border-t border-purple-600/30">
                                        <div className="flex justify-between text-white font-bold">
                                            <span>Total Cost:</span>
                                            <span className="text-purple-300">
                                                {getTotalCost()} SOL
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

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
                                        Creating Pool...
                                    </>
                                ) : hasStakedNFT ? (
                                    <>
                                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                        </svg>
                                        Create Pool (FREE)
                                    </>
                                ) : (
                                    <>
                                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                            <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
                                        </svg>
                                        Create Pool ({getTotalCost()} SOL)
                                    </>
                                )}
                            </button>

                            {/* Helper Text */}
                            <div className="mt-3 text-center">
                                {!wallet.connected ? (
                                    <p className="text-yellow-400 text-sm flex items-center justify-center gap-2">
                                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                        </svg>
                                        Please connect your wallet to create a pool
                                    </p>
                                ) : !isFormValid() ? (
                                    <p className="text-gray-400 text-sm">Fill all required fields to continue</p>
                                ) : null}
                            </div>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default CreatePool;