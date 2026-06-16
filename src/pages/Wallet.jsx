import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();
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
      title: t("bank_level_security"),
      description: t("bank_level_security_desc"),
    },
    {
      icon: <Zap className="text-yellow-400" size={24} />,
      title: t("lightning_fast"),
      description: t("lightning_fast_desc"),
    },
    {
      icon: <Coins className="text-green-400" size={24} />,
      title: t("multi_asset_support"),
      description: t("multi_asset_support_desc"),
    },
    {
      icon: <TrendingUp className="text-purple-400" size={24} />,
      title: t("defi_integration"),
      description: t("defi_integration_desc"),
    },
    {
      icon: <QrCode className="text-pink-400" size={24} />,
      title: t("qr_code_payments"),
      description: t("qr_code_payments_desc"),
    },
    {
      icon: <Globe className="text-cyan-400" size={24} />,
      title: t("dapp_browser"),
      description: t("dapp_browser_desc"),
    },
  ];

  const roadmapItems = [
    {
      phase: t("phase_1"),
      title: t("core_wallet_features"),
      status: "in-progress",
      items: [
        t("basic_wallet_functionality"),
        t("send_receive_sol_spl"),
        t("nft_gallery_management"),
        t("transaction_history"),
      ],
    },
    {
      phase: t("phase_2"),
      title: t("advanced_features_phase"),
      status: "planned",
      items: [
        t("defi_integrations_phase"),
        t("staking_interface_phase"),
        t("token_swapping_phase"),
        t("portfolio_tracking_phase"),
      ],
    },
    {
      phase: t("phase_3"),
      title: t("ecosystem_integration_phase"),
      status: "planned",
      items: [
        t("noottools_platform_integration"),
        t("exclusive_wallet_features"),
        t("community_governance_phase"),
        t("advanced_analytics_phase"),
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
            <span className="text-blue-300 font-semibold">{t("mobile_wallet")}</span>
          </div>

          <h1 className="text-6xl font-bold text-white mb-6">
            <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              Noottools
            </span>
            <br />
            <span className="text-white">{t("mobile_wallet")}</span>
          </h1>

          <p className="text-gray-400 text-xl max-w-4xl mx-auto leading-relaxed mb-8">{t("wallet_hero_desc")}</p>
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
              <p className="text-gray-400 mb-6">{t("join_thousands")}</p>

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
                    <span className="text-gray-400 font-medium">{t("ios")}</span>
                  </div>
                  <div className="text-gray-500 text-sm">
                    {isLoadingSettings
                      ? t("loading")
                      : settings?.wallet_app_store_link
                      ? t("download_now")
                      : t("coming_soon")}
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
                    <span className="text-gray-400 font-medium">{t("android")}</span>
                  </div>
                  <div className="text-gray-500 text-sm">
                    {isLoadingSettings
                      ? t("loading")
                      : settings?.wallet_google_play_link
                      ? t("download_now")
                      : t("coming_soon")}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4 text-sm text-gray-400">
                {/* <div className="flex items-center gap-2">
                  <Users className="text-blue-400" size={16} />
                  <span>5,000+ users waiting</span>
                </div> */}
                <div className="flex items-center gap-2">
                  <Star className="text-yellow-400" size={16} />
                  <span>{t("premium_features")}</span>
                </div>
              </div>
            </div>

            {/*<div>
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
                      placeholder={t("enter_email")}
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
            </div>*/}
          </div>
        </div>

        {/* Stats */}
        <div className="grid md:grid-cols-1 justify-center items-center w-full gap-6 mb-20">
          {/* <div className="text-center">
            <div className="text-4xl font-bold text-blue-400 mb-2">5,000+</div>
            <div className="text-gray-400">{t("users_waiting")}</div>
          </div>
          <div className="text-center">
            <div className="text-4xl font-bold text-green-400 mb-2">50+</div>
            <div className="text-gray-400">{t("features_planned")}</div>
          </div>
          <div className="text-center">
            <div className="text-4xl font-bold text-purple-400 mb-2">
              Q4 2025
            </div>
            <div className="text-gray-400">{t("expected_launch")}</div>
          </div> */}
          {/* <div className="text-center">
            <div className="text-4xl font-bold text-yellow-400 mb-2">100%</div>
            <div className="text-gray-400">{t("free_to_use")}</div>
          </div> */}
        </div>

        {/* FAQ */}
        <div className="max-w-4xl mx-auto">
          <h2 className="text-4xl font-bold text-white text-center mb-12">
            Frequently Asked Questions
          </h2>
          <div className="space-y-6">
            {[
              // {
              //   question: "When will the mobile wallet be available?",
              //   answer:
              //     "We're targeting Q4 2025 for the initial release. Beta testing will begin earlier for early subscribers.",
              // },
              {
                question: t("is_it_free"),
                answer:
                  t("free_to_use_desc"),
              },
              {
                question: t("supported_platforms"),
                answer:
                  t("compatible_ios_android"),
              },
              // {
              //   question: "How will it integrate with Noottools platform?",
              //   answer:
              //     "The wallet will have deep integration with our token creation, staking, and NFT features for a seamless experience.",
              // },
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
