import React, { useState } from "react";
import {
  ArrowRight,
  ExternalLink,
  Droplets,
  Coins,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Copy,
  Eye,
  Wallet,
  RefreshCw,
  Plus,
  DollarSign,
  BarChart3,
} from "lucide-react";
import { useTranslation } from "react-i18next";

const AddLiquidity = () => {
  const { t } = useTranslation();
  const [activeStep, setActiveStep] = useState(1);
  const [copiedText, setCopiedText] = useState(null);

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const steps = [
    {
      id: 1,
      title: t("visit_raydium"),
      description: t("raydium_leader_desc"),
      image: "/images/raydium-homepage.png", // You'll need to add these images
    },
    {
      id: 2,
      title: t("connect_wallet_title"),
      description: t("solana_wallets_desc"),
      image: "/images/connect-wallet.png",
    },
    {
      id: 3,
      title: t("go_liquidity_tab"),
      description: t("select_liquidity_menu"),
      image: "/images/liquidity-tab.png",
    },
    {
      id: 4,
      title: t("select_token_pair"),
      description: t("choose_pair_desc"),
      image: "/images/select-tokens.png",
    },
    {
      id: 5,
      title: t("enter_amounts"),
      description: t("specify_amounts_desc"),
      image: "/images/enter-amounts.png",
    },
    {
      id: 6,
      title: t("confirm_transaction"),
      description: t("approve_transaction_desc"),
      image: "/images/confirm-transaction.png",
    },
  ];

  const benefits = [
    {
      icon: <DollarSign className="w-8 h-8 text-green-400" />,
      title: t("earn_trading_fees"),
      description: t("earn_fees_desc"),
    },
    {
      icon: <TrendingUp className="w-8 h-8 text-blue-400" />,
      title: t("yield_farming"),
      description: t("yield_farming_desc"),
    },
    {
      icon: <BarChart3 className="w-8 h-8 text-purple-400" />,
      title: t("compound_interest"),
      description: t("compound_interest_desc"),
    },
  ];

  const risks = [
    {
      title: t("impermanent_loss"),
      description: t("impermanent_loss_desc"),
      severity: "medium",
    },
    {
      title: t("smart_contract_risk"),
      description: t("smart_contract_risk_desc"),
      severity: "low",
    },
    {
      title: t("market_volatility"),
      description: t("market_volatility_desc"),
      severity: "high",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0A151E] via-[#0D1B2A] to-[#0A151E] pt-28 pb-20">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-3 bg-gradient-to-r from-blue-600/20 to-purple-600/20 border border-blue-500/30 rounded-2xl px-6 py-3 mb-6">
            <Droplets className="w-5 h-5 text-blue-400 animate-pulse" />
            <span className="text-blue-300 font-semibold">{t('liquidity_guide')}</span>
          </div>

          <h1 className="text-4xl md:text-5xl font-bold mb-6">
            <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent">
              {t('how_to_add_liquidity')}
            </span>
          </h1>

          <p className="text-xl text-gray-300 max-w-3xl mx-auto leading-relaxed">
            {t('liquidity_desc')}
          </p>

          {/* Page Address Display */}
          <div className="mt-8 max-w-2xl mx-auto">
            <div className="bg-gradient-to-br from-blue-600/10 to-purple-600/10 border border-blue-500/30 rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <ExternalLink className="w-5 h-5 text-blue-400" />
                <span className="text-blue-300 font-semibold">
                  {t('page_address')}
                </span>
              </div>
              <div className="flex items-center gap-3 bg-gray-800/50 rounded-xl p-4">
                <code className="text-gray-300 text-sm flex-1 font-mono">
                  https://noottools.io/add-liquidity
                </code>
                <button
                  onClick={() =>
                    copyToClipboard("https://noottools.io/add-liquidity")
                  }
                  className="p-2 bg-blue-600/20 hover:bg-blue-600/30 rounded-lg transition-colors"
                  title={t("copy_address")}
                >
                  {copiedText === "https://noottools.io/add-liquidity" ? (
                    <CheckCircle className="w-4 h-4 text-green-400" />
                  ) : (
                    <Copy className="w-4 h-4 text-blue-400" />
                  )}
                </button>
              </div>
              <p className="text-gray-400 text-sm mt-3">
                {t('direct_link_guide')}
              </p>
            </div>
          </div>

          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <a
              href="https://raydium.io"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-300 transform hover:scale-105"
            >
              <ExternalLink className="w-5 h-5" />
              {t('visit_raydium')}
            </a>
          </div>
        </div>

        {/* Step by Step Guide */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-white mb-8 text-center">
            {t('step_by_step_guide')}
          </h2>

          {/* Step Navigation */}
          <div className="flex flex-wrap justify-center gap-2 mb-12">
            {steps.map((step) => (
              <button
                key={step.id}
                onClick={() => setActiveStep(step.id)}
                className={`px-4 py-2 rounded-lg font-medium transition-all duration-300 ${
                  activeStep === step.id
                    ? "bg-blue-600 text-white"
                    : "bg-gray-800/50 text-gray-400 hover:bg-gray-700/50 hover:text-white"
                }`}
              >
                {step.id}. {step.title}
              </button>
            ))}
          </div>

          {/* Active Step Content */}
          <div className="bg-gradient-to-br from-[#192630] to-[#1a2332] rounded-2xl p-8 border border-gray-700">
            {steps.map(
              (step) =>
                activeStep === step.id && (
                  <div
                    key={step.id}
                    className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center"
                  >
                    <div>
                      <div className="flex items-center gap-4 mb-6">
                        <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-xl">
                          {step.id}
                        </div>
                        <div>
                          <h3 className="text-2xl font-bold text-white">
                            {step.title}
                          </h3>
                          <p className="text-gray-400">{step.description}</p>
                        </div>
                      </div>

                      {step.id === 1 && (
                        <div className="space-y-4">
                          <p className="text-gray-300 leading-relaxed">
                            Raydium is the leading AMM (Automated Market Maker)
                            platform running on Solana blockchain. It offers
                            decentralized trading and liquidity mining
                            opportunities.
                          </p>
                          <div className="flex items-center gap-2 text-blue-400">
                            <CheckCircle className="w-5 h-5" />
                            <span>{t("low_transaction_fees")}</span>
                          </div>
                          <div className="flex items-center gap-2 text-blue-400">
                            <CheckCircle className="w-5 h-5" />
                            <span>{t("fast_transaction_speeds")}</span>
                          </div>
                          <div className="flex items-center gap-2 text-blue-400">
                            <CheckCircle className="w-5 h-5" />
                            <span>{t("high_apy_rates")}</span>
                          </div>
                        </div>
                      )}

                      {step.id === 2 && (
                        <div className="space-y-4">
                          <p className="text-gray-300 leading-relaxed">
                            Connect your Solana wallet to Raydium. Most popular
                            options:
                          </p>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="bg-gray-800/50 p-4 rounded-lg">
                              <h4 className="text-white font-semibold mb-2">
                                Phantom
                              </h4>
                              <p className="text-gray-400 text-sm">
                                Most popular Solana wallet
                              </p>
                            </div>
                            <div className="bg-gray-800/50 p-4 rounded-lg">
                              <h4 className="text-white font-semibold mb-2">
                                Solflare
                              </h4>
                              <p className="text-gray-400 text-sm">
                                Secure and user-friendly
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      {step.id === 3 && (
                        <div className="space-y-4">
                          <p className="text-gray-300 leading-relaxed">
                            Find and click the "Liquidity" tab from the left
                            menu on the homepage. In this section you can view
                            existing pools and add new liquidity.
                          </p>
                          <div className="bg-blue-900/20 p-4 rounded-lg border border-blue-600/30">
                            <div className="flex items-center gap-2 mb-2">
                              <AlertCircle className="w-5 h-5 text-blue-400" />
                              <span className="text-blue-300 font-semibold">
                                Tip
                              </span>
                            </div>
                            <p className="text-blue-200 text-sm">
                              If you're using it for the first time, prefer
                              adding liquidity to existing pools instead of
                              "{t("create_pool")}".
                            </p>
                          </div>
                        </div>
                      )}

                      {step.id === 4 && (
                        <div className="space-y-4">
                          <p className="text-gray-300 leading-relaxed">
                            Select the token pair you want to add liquidity to.
                            Popular pairs generally have higher volume.
                          </p>
                          <div className="space-y-3">
                            <div className="flex items-center justify-between bg-gray-800/50 p-3 rounded-lg">
                              <span className="text-white">SOL/USDC</span>
                              <span className="text-green-400">
                                High Volume
                              </span>
                            </div>
                            <div className="flex items-center justify-between bg-gray-800/50 p-3 rounded-lg">
                              <span className="text-white">RAY/SOL</span>
                              <span className="text-green-400">High APY</span>
                            </div>
                            <div className="flex items-center justify-between bg-gray-800/50 p-3 rounded-lg">
                              <span className="text-white">mSOL/SOL</span>
                              <span className="text-blue-400">Stable</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {step.id === 5 && (
                        <div className="space-y-4">
                          <p className="text-gray-300 leading-relaxed">
                            Enter the amount you want to add for both tokens.
                            The system will automatically calculate the correct
                            ratio.
                          </p>
                          <div className="bg-amber-900/20 p-4 rounded-lg border border-amber-600/30">
                            <div className="flex items-center gap-2 mb-2">
                              <AlertCircle className="w-5 h-5 text-amber-400" />
                              <span className="text-amber-300 font-semibold">
                                Warning
                              </span>
                            </div>
                            <p className="text-amber-200 text-sm">
                              Token amounts are automatically adjusted according
                              to the pool's current ratio. You cannot change
                              this ratio.
                            </p>
                          </div>
                        </div>
                      )}

                      {step.id === 6 && (
                        <div className="space-y-4">
                          <p className="text-gray-300 leading-relaxed">
                            In the final step, review the transaction details
                            and approve from your wallet. LP tokens will
                            automatically arrive in your wallet.
                          </p>
                          <div className="space-y-3">
                            <div className="flex items-center gap-2 text-green-400">
                              <CheckCircle className="w-5 h-5" />
                              <span>Transaction fee: ~0.0001 SOL</span>
                            </div>
                            <div className="flex items-center gap-2 text-green-400">
                              <CheckCircle className="w-5 h-5" />
                              <span>{t("lp_received_instantly")}</span>
                            </div>
                            <div className="flex items-center gap-2 text-green-400">
                              <CheckCircle className="w-5 h-5" />
                              <span>{t("start_earning_immediately")}</span>
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="flex gap-3 mt-6">
                        {step.id > 1 && (
                          <button
                            onClick={() => setActiveStep(step.id - 1)}
                            className="px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                          >
                            {t('previous')}
                          </button>
                        )}
                        {step.id < steps.length && (
                          <button
                            onClick={() => setActiveStep(step.id + 1)}
                            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2"
                          >
                            {t('next')}
                            <ArrowRight className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* <div className="lg:order-last">
                      <div className="bg-gray-800/30 rounded-xl p-4 border border-gray-600">
                        <div className="aspect-video bg-gray-900/50 rounded-lg flex items-center justify-center">
                          <div className="text-center">
                            <Droplets className="w-16 h-16 text-blue-400 mx-auto mb-4" />
                            <p className="text-gray-400">
                              Step {step.id} Image
                            </p>
                            <p className="text-gray-500 text-sm mt-2">
                              {step.title}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div> */}
                  </div>
                )
            )}
          </div>
        </div>

        {/* Risks Section */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-white mb-8 text-center">
            {t('risks_to_consider')}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {risks.map((risk, index) => (
              <div
                key={index}
                className="bg-gradient-to-br from-[#192630] to-[#1a2332] rounded-2xl p-6 border border-gray-700"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div
                    className={`w-4 h-4 rounded-full ${
                      risk.severity === "high"
                        ? "bg-red-500"
                        : risk.severity === "medium"
                        ? "bg-yellow-500"
                        : "bg-green-500"
                    }`}
                  ></div>
                  <h3 className="text-lg font-bold text-white">{risk.title}</h3>
                </div>
                <p className="text-gray-300">{risk.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Links */}
        <div className="bg-gradient-to-br from-[#192630] to-[#1a2332] rounded-2xl p-8 border border-gray-700">
          <h2 className="text-2xl font-bold text-white mb-6 text-center">
            {t('useful_links')}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <a
              href="https://raydium.io"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 bg-gray-800/50 hover:bg-gray-700/50 p-4 rounded-lg transition-all duration-300 text-white hover:text-blue-400"
            >
              <ExternalLink className="w-5 h-5" />
              <span>{t('raydium_homepage')}</span>
            </a>
            <a
              href="https://docs.raydium.io"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 bg-gray-800/50 hover:bg-gray-700/50 p-4 rounded-lg transition-all duration-300 text-white hover:text-blue-400"
            >
              <ExternalLink className="w-5 h-5" />
              <span>{t('raydium_docs')}</span>
            </a>
            <a
              href="https://raydium.io/farms"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 bg-gray-800/50 hover:bg-gray-700/50 p-4 rounded-lg transition-all duration-300 text-white hover:text-blue-400"
            >
              <ExternalLink className="w-5 h-5" />
              <span>{t('yield_farms')}</span>
            </a>
            <a
              href="https://raydium.io/pools"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 bg-gray-800/50 hover:bg-gray-700/50 p-4 rounded-lg transition-all duration-300 text-white hover:text-blue-400"
            >
              <ExternalLink className="w-5 h-5" />
              <span>{t('liquidity_pools')}</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddLiquidity;
