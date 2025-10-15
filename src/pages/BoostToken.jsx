import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useUnifiedWallet } from "../hooks/useUnifiedWallet";
import {
  Connection,
  PublicKey,
  Transaction,
  SystemProgram,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import axios from "axios";
import constants from "../constants";
import { useGlobalState } from "../hooks/useGlobalState";
import WalletLogin from "../components/Walletlogin";
import Loading from "../components/Loading";
import { toast } from "react-toastify";
import { Star, Zap, Rocket, TrendingUp, Shield, Award } from "lucide-react";

const BoostToken = () => {
  const { globalState } = useGlobalState();
  const { connected, publicKey, sendTransaction } = useUnifiedWallet();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isProcessing, setIsProcessing] = useState(false);

  // Global state'den user ve auth durumunu al
  const user = globalState?.user;
  const authToken = globalState?.authToken;
  const isLoggedIn = !!user && !!authToken && connected;

  useEffect(() => {
    console.log("BoostToken globalState:", globalState);
    console.log("User:", user);
    console.log("AuthToken:", authToken);
    console.log("Connected:", connected);
    console.log("IsLoggedIn:", isLoggedIn);
  }, [globalState, user, authToken, connected, isLoggedIn]);

  // Settings Query - Feature price ve payment wallet için
  const { data: settings, isLoading: settingsLoading } = useQuery({
    queryKey: ["settings"],
    queryFn: async () => {
      const { data } = await axios.get(
        `${constants.backend_url}/items/settings`
      );
      console.log("Settings data:", data.data);
      return data.data;
    },
  });

  // User Projects Query - AUTH KALDIRIYORUM
  const { data: userProjects = [], isLoading: projectsLoading } = useQuery({
    queryKey: ["user-projects", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      console.log("Fetching projects for user:", user.id);

      const { data } = await axios.get(
        `${constants.backend_url}/items/projects`,
        {
          params: {
            fields: [
              "id",
              "name",
              "symbol",
              "logo",
              "description",
              "featured",
              "featuring_end_date",
              "date_created",
            ].join(","),
            filter: JSON.stringify({ user: { _eq: user.id } }),
            sort: "-date_created",
          },
        }
      );

      console.log("Projects response:", data);
      return data.data || [];
    },
    enabled: !!user?.id,
  });

  // Payment verification mutation
  const paymentMutation = useMutation({
    mutationFn: async ({ signature, price, projectId }) => {
      console.log("🚀 Payment verification request:", {
        signature,
        price,
        projectId,
        authToken: authToken ? "Present" : "Missing",
        user: user ? `ID: ${user.id}` : "Missing",
      });

      const requestData = {
        tx: signature,
        price: price,
        currency: "SOL",
        project_id: projectId,
      };

      console.log("📤 Request payload:", requestData);

      const { data } = await axios.post(
        `${constants.backend_url}/get-price/verify-payment`,
        requestData,
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      console.log("📥 Response:", data);
      return data;
    },
    onSuccess: (data) => {
      console.log("✅ Payment success:", data);
      if (data.verified && data.featured) {
        toast.success(
          `Project featured successfully! Featured for ${data.featuring_days} days.`
        );
        queryClient.invalidateQueries(["user-projects"]);
      } else {
        toast.error("Payment verification failed. Please try again.");
      }
      setIsProcessing(false);
    },
    onError: (error) => {
      console.error("❌ Payment error:", error.response?.data || error);
      const errorMessage =
        error.response?.data?.error || "Payment verification failed";
      toast.error(errorMessage);
      setIsProcessing(false);
    },
  });

  const handleFeatureProject = async (projectId) => {
    if (!connected || !publicKey || !settings) {
      toast.error("Please connect your wallet first");
      return;
    }

    if (!authToken || !user) {
      toast.error("Please login first");
      return;
    }

    if (!settings.payment_wallet || !settings.feature_price_sol) {
      toast.error("Payment configuration not available");
      return;
    }

    // Double-check: Proje zaten featured mı?
    const project = userProjects.find((p) => p.id === projectId);
    if (project?.featured) {
      toast.warning("This project is already featured!");
      return;
    }

    setIsProcessing(true);

    try {
      // Constants'tan network al - basit ve net
      const connection = new Connection(
        constants.network.endpoint,
        constants.solana.commitment
      );

      const solAmount = parseFloat(settings.feature_price_sol);
      const lamportsAmount = Math.floor(solAmount * LAMPORTS_PER_SOL);

      console.log("Payment Details:", {
        projectId,
        solAmount,
        lamportsAmount,
        paymentWallet: settings.payment_wallet,
        userWallet: publicKey.toBase58(),
        network: constants.SOLANA_NETWORK,
      });

      // User'ın SOL balance kontrolü
      const balance = await connection.getBalance(publicKey);
      const balanceInSol = balance / LAMPORTS_PER_SOL;

      console.log("User SOL balance:", balanceInSol);

      if (balance < lamportsAmount) {
        toast.error(
          `Insufficient SOL balance. Required: ${solAmount} SOL, Available: ${balanceInSol.toFixed(
            3
          )} SOL`
        );
        setIsProcessing(false);
        return;
      }

      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: new PublicKey(settings.payment_wallet),
          lamports: lamportsAmount,
        })
      );

      const { blockhash } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = publicKey;

      console.log("Transaction ready to send:", {
        from: publicKey.toBase58(),
        to: settings.payment_wallet,
        amount: `${solAmount} SOL (${lamportsAmount} lamports)`,
        network: constants.SOLANA_NETWORK,
      });

      const signature = await sendTransaction(transaction, connection);

      console.log("Transaction signature:", signature);
      toast.info("Transaction sent! Verifying payment...");

      // Payment verification
      await paymentMutation.mutateAsync({
        signature,
        price: solAmount,
        projectId,
      });
    } catch (error) {
      console.error("Payment error:", error);

      if (error.message.includes("insufficient funds")) {
        toast.error("Insufficient SOL balance for this transaction");
      } else if (error.message.includes("User rejected")) {
        toast.error("Transaction cancelled by user");
      } else if (error.message.includes("failed to send transaction")) {
        toast.error("Transaction failed. Please try again.");
      } else {
        toast.error(`Payment failed: ${error.message}`);
      }

      setIsProcessing(false);
    }
  };

  const getTimeAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));

    if (diffInDays === 0) return "Today";
    if (diffInDays === 1) return "1 day ago";
    if (diffInDays < 30) return `${diffInDays} days ago`;
    return date.toLocaleDateString();
  };

  // Loading state
  if (projectsLoading && isLoggedIn) {
    return <Loading darkMode={true} />;
  }

  return (
    <div className="min-h-screen bg-[#0A151E] pt-28 pb-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header Section */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-3 bg-gradient-to-r from-purple-600/20 to-blue-600/20 border border-purple-500/30 rounded-2xl px-6 py-3 mb-6">
            <Rocket className="text-purple-400" size={24} />
            <span className="text-purple-300 font-semibold">
              Boost Your Token
            </span>
          </div>

          <h1 className="text-5xl font-bold text-white mb-6 bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
            Feature Your Project
          </h1>

          <p className="text-gray-400 text-xl max-w-3xl mx-auto leading-relaxed">
            Boost your token's visibility and reach thousands of potential
            investors. Featured projects get priority placement, enhanced
            discoverability, and premium exposure across our platform.
          </p>
        </div>

        {/* Feature Benefits */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          <div className="bg-gradient-to-br from-[#192630] to-[#1a2332] rounded-2xl p-6 border border-gray-700">
            <div className="w-14 h-14 bg-purple-600/20 rounded-xl mb-4 flex items-center justify-center">
              <TrendingUp className="text-purple-400" size={24} />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">
              Priority Placement
            </h3>
            <p className="text-gray-400">
              Your project appears at the top of listings and gets featured on
              our homepage slider.
            </p>
          </div>

          <div className="bg-gradient-to-br from-[#192630] to-[#1a2332] rounded-2xl p-6 border border-gray-700">
            <div className="w-14 h-14 bg-blue-600/20 rounded-xl mb-4 flex items-center justify-center">
              <Shield className="text-blue-400" size={24} />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Trust Badge</h3>
            <p className="text-gray-400">
              Featured projects receive a premium badge that builds investor
              confidence.
            </p>
          </div>

          <div className="bg-gradient-to-br from-[#192630] to-[#1a2332] rounded-2xl p-6 border border-gray-700">
            <div className="w-14 h-14 bg-green-600/20 rounded-xl mb-4 flex items-center justify-center">
              <Award className="text-green-400" size={24} />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">
              Enhanced Visibility
            </h3>
            <p className="text-gray-400">
              Get maximum exposure with special highlighting and promotional
              placement.
            </p>
          </div>
        </div>

        {/* Pricing Card */}
        {settings && settings.feature_price_sol && (
          <div className="max-w-md mx-auto mb-12">
            <div className="bg-gradient-to-br from-purple-600/10 to-blue-600/10 border-2 border-purple-500/30 rounded-2xl p-8 text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-blue-500 rounded-2xl mx-auto mb-4 flex items-center justify-center">
                <Zap className="text-white" size={24} />
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">
                Feature Package
              </h3>
              <div className="text-4xl font-bold text-transparent bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text mb-4">
                {parseFloat(settings.feature_price_sol).toFixed(2)} SOL
              </div>
              <p className="text-gray-400 text-sm">
                {settings.featuring_days || 30} days featured placement •
                Instant activation
              </p>
            </div>
          </div>
        )}

        {/* Main Content - WalletLogin Component Kullanımı */}
        {!isLoggedIn ? (
          <div className="max-w-2xl mx-auto">
            <div className="bg-gradient-to-br from-[#192630] to-[#1a2332] rounded-2xl p-8 border border-gray-700 text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-blue-500 rounded-2xl mx-auto mb-6 flex items-center justify-center">
                <Rocket className="text-white" size={32} />
              </div>

              <h2 className="text-2xl font-bold text-white mb-4">
                Ready to Boost Your Token?
              </h2>
              <p className="text-gray-400 mb-8">
                Connect your wallet and login to feature your projects
              </p>

              <WalletLogin />
            </div>
          </div>
        ) : userProjects.length === 0 ? (
          <div className="max-w-2xl mx-auto">
            <div className="bg-gradient-to-br from-[#192630] to-[#1a2332] rounded-2xl p-8 border border-gray-700 text-center">
              <div className="text-gray-400 text-6xl mb-6">🚀</div>
              <h2 className="text-2xl font-bold text-white mb-4">
                No Projects Found
              </h2>
              <p className="text-gray-400 mb-8">
                Create your first token to start featuring projects
              </p>
              <button
                onClick={() => navigate("/create-coin")}
                className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white px-8 py-3 rounded-xl font-semibold transition-all duration-300 transform hover:scale-105"
              >
                Create Your First Token
              </button>
            </div>
          </div>
        ) : (
          <div>
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-3xl font-bold text-white">Your Projects</h2>
              <div className="text-sm text-gray-400">
                {userProjects.length} project
                {userProjects.length !== 1 ? "s" : ""} found
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {userProjects.map((project) => (
                <div
                  key={project.id}
                  className="bg-gradient-to-br from-[#192630] to-[#1a2332] rounded-2xl border border-gray-700 hover:border-gray-600 transition-all duration-300 p-6 group"
                >
                  <div className="flex gap-4 mb-4">
                    {/* Project Logo */}
                    <div className="flex-shrink-0">
                      <div className="w-16 h-16 rounded-xl overflow-hidden bg-gray-800">
                        {project.logo ? (
                          <img
                            src={`${constants.backend_url}/assets/${project.logo}`}
                            alt={project.name}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center">
                            <span className="text-white text-lg font-bold">
                              {project.name?.charAt(0)?.toUpperCase() || "?"}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Project Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="text-lg font-bold text-white truncate">
                              {project.name || "Unnamed Project"}
                            </h3>
                            {project.featured && (
                              <Star
                                className="text-yellow-400 fill-current flex-shrink-0"
                                size={18}
                              />
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-sm text-gray-400">
                              ${project.symbol?.toUpperCase() || "TKN"}
                            </span>
                          </div>
                        </div>
                        <div className="text-xs text-gray-500 ml-2">
                          {getTimeAgo(project.date_created)}
                        </div>
                      </div>

                      {project.description && (
                        <p className="text-gray-400 text-sm mb-4 line-clamp-2">
                          {project.description}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Status & Action */}
                  <div className="border-t border-gray-700 pt-4">
                    {project.featured ? (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                          <span className="text-green-400 font-semibold">
                            Featured
                          </span>
                        </div>
                        <div className="text-xs text-gray-500">
                          {project.featuring_end_date
                            ? `Ends: ${new Date(
                                project.featuring_end_date
                              ).toLocaleDateString()}`
                            : "Premium placement active"}
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleFeatureProject(project.id)}
                        disabled={isProcessing || paymentMutation.isPending}
                        className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:from-gray-600 disabled:to-gray-700 text-white py-3 rounded-xl font-semibold transition-all duration-300 transform hover:scale-105 disabled:scale-100 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        {isProcessing || paymentMutation.isPending ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            Processing...
                          </>
                        ) : (
                          <>
                            <Zap size={16} />
                            Feature Project (
                            {parseFloat(
                              settings?.feature_price_sol || 0
                            ).toFixed(2)}{" "}
                            SOL)
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* FAQ Section */}
        <div className="mt-20">
          <h2 className="text-3xl font-bold text-white text-center mb-12">
            Frequently Asked Questions
          </h2>
          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            <div className="bg-gradient-to-br from-[#192630] to-[#1a2332] rounded-2xl p-6 border border-gray-700">
              <h3 className="text-lg font-bold text-white mb-3">
                How long does featuring last?
              </h3>
              <p className="text-gray-400">
                Featured status lasts for {settings?.featuring_days || 30} days
                once purchased. After that, you can renew the featured status.
              </p>
            </div>

            <div className="bg-gradient-to-br from-[#192630] to-[#1a2332] rounded-2xl p-6 border border-gray-700">
              <h3 className="text-lg font-bold text-white mb-3">
                What payment methods are accepted?
              </h3>
              <p className="text-gray-400">
                We only accept SOL payments directly from your connected Solana
                wallet for security and transparency.
              </p>
            </div>

            <div className="bg-gradient-to-br from-[#192630] to-[#1a2332] rounded-2xl p-6 border border-gray-700">
              <h3 className="text-lg font-bold text-white mb-3">
                Is the payment secure?
              </h3>
              <p className="text-gray-400">
                Yes, all payments are processed on-chain using Solana's secure
                blockchain technology. No middlemen involved.
              </p>
            </div>

            <div className="bg-gradient-to-br from-[#192630] to-[#1a2332] rounded-2xl p-6 border border-gray-700">
              <h3 className="text-lg font-bold text-white mb-3">
                Can I feature multiple projects?
              </h3>
              <p className="text-gray-400">
                Absolutely! You can feature as many projects as you want. Each
                project requires a separate payment.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BoostToken;
