import React, { useState, useEffect } from "react";
import {
  Smartphone,
  Download,
  Shield,
  Zap,
  Coins,
  Star,
  Bell,
  CheckCircle,
  ArrowRight,
  Apple,
  Play,
  QrCode,
  Wallet as WalletIcon,
  TrendingUp,
  Lock,
  Globe,
  Users,
} from "lucide-react";
import { toast } from "react-toastify";
import constants from "../constants";
import axios from "axios";

const Wallet = () => {
  const [email, setEmail] = useState("");
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [settings, setSettings] = useState(null);
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);

  // Load settings from backend
  useEffect(() => {
    const loadSettings = async () => {
      try {
        setIsLoadingSettings(true);
        console.log("🔍 Loading wallet settings from backend...");

        const response = await axios.get(
          `${constants.backend_url}/items/settings`
        );
        setSettings(response.data.data);
      } catch (error) {
        console.error("❌ Error loading wallet settings:", error);
      } finally {
        setIsLoadingSettings(false);
      }
    };

    loadSettings();
  }, []);

  const handleNotifyMe = (e) => {
    e.preventDefault();
    if (!email) {
      toast.error("Please enter your email address");
      return;
    }

    // Placeholder for email subscription
    setIsSubscribed(true);
    toast.success("Thank you! We'll notify you when the app is ready.");
    setEmail("");
  };

  const features = [
    {
      icon: <Shield className="text-blue-400" size={24} />,
      title: "Bank-Level Security",
      description:
        "Multi-layer encryption and biometric authentication to keep your assets safe",
    },
    {
      icon: <Zap className="text-yellow-400" size={24} />,
      title: "Lightning Fast",
      description:
        "Instant transactions with minimal fees on the Solana network",
    },
    {
      icon: <Coins className="text-green-400" size={24} />,
      title: "Multi-Asset Support",
      description:
        "Store and manage SOL, SPL tokens, and NFTs all in one place",
    },
    {
      icon: <TrendingUp className="text-purple-400" size={24} />,
      title: "DeFi Integration",
      description:
        "Access staking, swapping, and yield farming directly from your wallet",
    },
    {
      icon: <QrCode className="text-pink-400" size={24} />,
      title: "QR Code Payments",
      description: "Send and receive payments instantly using QR codes",
    },
    {
      icon: <Globe className="text-cyan-400" size={24} />,
      title: "dApp Browser",
      description: "Explore the Solana ecosystem with built-in dApp browser",
    },
  ];

  const roadmapItems = [
    {
      phase: "Phase 1",
      title: "Core Wallet Features",
      status: "in-progress",
      items: [
        "Basic wallet functionality",
        "Send/Receive SOL & SPL tokens",
        "NFT gallery and management",
        "Transaction history",
      ],
    },
    {
      phase: "Phase 2",
      title: "Advanced Features",
      status: "planned",
      items: [
        "DeFi integrations",
        "Staking interface",
        "Token swapping",
        "Portfolio tracking",
      ],
    },
    {
      phase: "Phase 3",
      title: "Ecosystem Integration",
      status: "planned",
      items: [
        "Noottools platform integration",
        "Exclusive wallet features",
        "Community governance",
        "Advanced analytics",
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-[#0A151E] pt-28 pb-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Hero Section */}
        <div className="text-center mb-20">
          <div className="inline-flex items-center gap-3 bg-gradient-to-r from-blue-600/20 to-purple-600/20 border border-blue-500/30 rounded-2xl px-6 py-3 mb-6">
            <Smartphone className="text-blue-400" size={24} />
            <span className="text-blue-300 font-semibold">Mobile Wallet</span>
          </div>

          <h1 className="text-6xl font-bold text-white mb-6">
            <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              Noottools
            </span>
            <br />
            <span className="text-white">Mobile Wallet</span>
          </h1>

          <p className="text-gray-400 text-xl max-w-4xl mx-auto leading-relaxed mb-8">
            Experience the future of crypto with our upcoming mobile wallet.
            Designed for the Solana ecosystem with seamless integration to the
            Noottools platform.
          </p>

          <div className="inline-flex items-center gap-3 bg-orange-600/20 border border-orange-500/30 rounded-2xl px-6 py-3 text-orange-300 font-semibold">
            <Bell className="animate-pulse" size={20} />
            <span>Coming Soon - 2025</span>
          </div>
        </div>

        {/* Phone Mockup */}
        <div className="relative mb-20">
          <div className="max-w-sm mx-auto">
            <div className="relative">
              {/* Phone Frame */}
              <div className="flex w-full">
                <img src="/assets/wallet2.png" alt="" />
              </div>

              {/* Floating Elements */}
              <div className="absolute -top-4 right-4 w-20 h-20 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-full flex items-center justify-center border border-blue-500/30">
                <Shield className="text-blue-400" size={24} />
              </div>

              <div className="absolute -bottom-4 left-5 w-16 h-16 bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-full flex items-center justify-center border border-green-500/30">
                <Zap className="text-green-400" size={20} />
              </div>
            </div>
          </div>
        </div>

        {/* Download Section */}
        <div className="bg-gradient-to-br from-[#192630] to-[#1a2332] rounded-2xl p-8 border border-gray-700 mb-20">
          <div className="grid lg:grid-cols-2 gap-8 items-center">
            <div>
              <h2 className="text-3xl font-bold text-white mb-4">
                Be the First to Download
              </h2>
              <p className="text-gray-400 mb-6">
                Get notified when Noottools Mobile Wallet launches. Join
                thousands of users waiting for the most advanced Solana wallet
                experience.
              </p>

              <div className="grid grid-cols-2 gap-4 mb-6">
                {/* iOS App Store */}
                <div
                  className={`rounded-xl p-4 border transition-all duration-300 ${
                    !isLoadingSettings && settings?.wallet_app_store_link
                      ? "bg-gray-800/50 border-gray-600 hover:bg-gray-700/50 cursor-pointer transform hover:scale-105"
                      : "bg-gray-800/50 border-gray-600 opacity-60"
                  }`}
                  onClick={() => {
                    if (!isLoadingSettings && settings?.wallet_app_store_link) {
                      window.open(settings.wallet_app_store_link, "_blank");
                    }
                  }}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <Apple className="text-gray-400" size={20} />
                    <span className="text-gray-400 font-medium">iOS</span>
                  </div>
                  <div className="text-gray-500 text-sm">
                    {isLoadingSettings
                      ? "Loading..."
                      : settings?.wallet_app_store_link
                      ? "Download Now"
                      : "Coming Soon"}
                  </div>
                </div>

                {/* Google Play */}
                <div
                  className={`rounded-xl p-4 border transition-all duration-300 ${
                    !isLoadingSettings && settings?.wallet_google_play_link
                      ? "bg-gray-800/50 border-gray-600 hover:bg-gray-700/50 cursor-pointer transform hover:scale-105"
                      : "bg-gray-800/50 border-gray-600 opacity-60"
                  }`}
                  onClick={() => {
                    if (
                      !isLoadingSettings &&
                      settings?.wallet_google_play_link
                    ) {
                      window.open(settings.wallet_google_play_link, "_blank");
                    }
                  }}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <Play className="text-gray-400" size={20} />
                    <span className="text-gray-400 font-medium">Android</span>
                  </div>
                  <div className="text-gray-500 text-sm">
                    {isLoadingSettings
                      ? "Loading..."
                      : settings?.wallet_google_play_link
                      ? "Download Now"
                      : "Coming Soon"}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4 text-sm text-gray-400">
                <div className="flex items-center gap-2">
                  <Users className="text-blue-400" size={16} />
                  <span>5,000+ users waiting</span>
                </div>
                <div className="flex items-center gap-2">
                  <Star className="text-yellow-400" size={16} />
                  <span>Premium features</span>
                </div>
              </div>
            </div>

            <div>
              {!isSubscribed ? (
                <div className="bg-gray-800/50 rounded-2xl p-6 border border-gray-600">
                  <h3 className="text-xl font-bold text-white mb-4">
                    Get Early Access
                  </h3>
                  <form onSubmit={handleNotifyMe} className="space-y-4">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter your email address"
                      className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 transition-colors"
                      required
                    />
                    <button
                      type="submit"
                      className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white py-3 rounded-lg font-semibold transition-all duration-300 transform hover:scale-105 flex items-center justify-center gap-2"
                    >
                      <Bell size={16} />
                      Notify Me When Ready
                    </button>
                  </form>
                  <p className="text-gray-500 text-sm mt-4 text-center">
                    We'll send you a notification when the app is available for
                    download.
                  </p>
                </div>
              ) : (
                <div className="bg-green-600/20 border border-green-500/30 rounded-2xl p-6 text-center">
                  <CheckCircle
                    className="text-green-400 mx-auto mb-4"
                    size={48}
                  />
                  <h3 className="text-xl font-bold text-white mb-2">
                    You're on the List!
                  </h3>
                  <p className="text-gray-400">
                    We'll notify you as soon as the Noottools Mobile Wallet is
                    ready for download.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid md:grid-cols-4 gap-6 mb-20">
          <div className="text-center">
            <div className="text-4xl font-bold text-blue-400 mb-2">5,000+</div>
            <div className="text-gray-400">Users Waiting</div>
          </div>
          <div className="text-center">
            <div className="text-4xl font-bold text-green-400 mb-2">50+</div>
            <div className="text-gray-400">Features Planned</div>
          </div>
          <div className="text-center">
            <div className="text-4xl font-bold text-purple-400 mb-2">
              Q4 2025
            </div>
            <div className="text-gray-400">Expected Launch</div>
          </div>
          <div className="text-center">
            <div className="text-4xl font-bold text-yellow-400 mb-2">100%</div>
            <div className="text-gray-400">Free to Use</div>
          </div>
        </div>

        {/* FAQ */}
        <div className="max-w-4xl mx-auto">
          <h2 className="text-4xl font-bold text-white text-center mb-12">
            Frequently Asked Questions
          </h2>
          <div className="space-y-6">
            {[
              {
                question: "When will the mobile wallet be available?",
                answer:
                  "We're targeting Q4 2025 for the initial release. Beta testing will begin earlier for early subscribers.",
              },
              {
                question: "Will it be free to use?",
                answer:
                  "Yes! The Noottools Mobile Wallet will be completely free to download and use, with no hidden fees.",
              },
              {
                question: "What platforms will be supported?",
                answer:
                  "We're launching on both iOS and Android simultaneously, with feature parity across both platforms.",
              },
              {
                question: "How will it integrate with Noottools platform?",
                answer:
                  "The wallet will have deep integration with our token creation, staking, and NFT features for a seamless experience.",
              },
            ].map((faq, index) => (
              <div
                key={index}
                className="bg-gradient-to-br from-[#192630] to-[#1a2332] rounded-2xl p-6 border border-gray-700"
              >
                <h3 className="text-lg font-bold text-white mb-3">
                  {faq.question}
                </h3>
                <p className="text-gray-400">{faq.answer}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Wallet;
