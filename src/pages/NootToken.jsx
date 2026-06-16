import React, { useState, useEffect } from "react";
import {
  Coins,
  Gamepad2,
  Trophy,
  Users,
  Shield,
  Zap,
  Star,
  ExternalLink,
  FileText,
} from "lucide-react";
import constants from "../constants";
import axios from "axios";
import { useTranslation } from "react-i18next";

const NootToken = () => {
  const { t } = useTranslation();
  const [settings, setSettings] = useState(null);
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);

  // Load settings from backend
  useEffect(() => {
    const loadSettings = async () => {
      try {
        setIsLoadingSettings(true);
        console.log("🔍 Loading settings from backend...");

        const response = await axios.get(
          `${constants.backend_url}/items/settings`
        );

        setSettings(response.data.data);
      } catch (error) {
        console.error("❌ Error loading settings:", error);
      } finally {
        setIsLoadingSettings(false);
      }
    };

    loadSettings();
  }, []);

  const features = [
    {
      icon: <Gamepad2 className="w-8 h-8 text-purple-400" />,
      title: t("noot_battle_internal_currency"),
      description: t("noot_battle_internal_currency_desc"),
    },
    {
      icon: <Zap className="w-8 h-8 text-blue-400" />,
      title: t("premium_features_access"),
      description: t("premium_features_access_desc"),
    },
    {
      icon: <Trophy className="w-8 h-8 text-orange-400" />,
      title: t("rankings_tournaments_participation"),
      description: t("rankings_tournaments_participation_desc"),
    },
    {
      icon: <Star className="w-8 h-8 text-cyan-400" />,
      title: t("future_developments_interaction"),
      description: t("future_developments_interaction_desc"),
    },
  ];

  const tokenInfo = [
    {
      label: t("token_name_label"),
      value: t("noot_token"),
      icon: <Coins className="w-5 h-5 text-purple-400" />,
    },
    {
      label: t("purpose"),
      value: t("utility_token"),
      icon: <Shield className="w-5 h-5 text-green-400" />,
    },
    {
      label: t("use_case"),
      value: t("noot_ecosystem_use_case"),
      icon: <Gamepad2 className="w-5 h-5 text-blue-400" />,
    },
    {
      label: t("developer"),
      value: t("noottools_sl"),
      icon: <Users className="w-5 h-5 text-orange-400" />,
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0A151E] via-[#0D1B2A] to-[#0A151E] pt-28 pb-20">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-3 bg-gradient-to-r from-purple-600/20 to-blue-600/20 border border-purple-500/30 rounded-2xl px-6 py-3 mb-6">
            <Coins className="w-5 h-5 text-purple-400 animate-pulse" />
            <span className="text-purple-300 font-semibold">{t('utility_token')}</span>
          </div>

          <h1 className="text-4xl md:text-5xl font-bold mb-6">
            <span className="bg-gradient-to-r from-purple-400 via-blue-400 to-cyan-400 bg-clip-text text-transparent">
              {t("noot_token")}
            </span>
          </h1>

          <p className="text-xl text-gray-300 max-w-3xl mx-auto leading-relaxed">
            {t('noot_token_desc')}
          </p>

          {/* Token Actions */}
          {!isLoadingSettings && settings && (
            <div className="flex flex-wrap items-center justify-center gap-4 mt-8">
              {/* Explorer Link */}
              {settings.noot_token_address && (
                <a
                  href={constants.getExplorerUrl(
                    settings.noot_token_address,
                    "address"
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white px-6 py-3 rounded-xl font-medium transition-all duration-300 hover:scale-105"
                >
                  <ExternalLink className="w-4 h-4" />
                  {t('view_explorer')}
                </a>
              )}

              {/* Whitepaper Link */}
              {settings.whitepaper && (
                <a
                  href={`${constants.backend_url}/assets/${settings.whitepaper}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white px-6 py-3 rounded-xl font-medium transition-all duration-300 hover:scale-105"
                >
                  <FileText className="w-4 h-4" />
                  {t('download_whitepaper')}
                </a>
              )}
            </div>
          )}
        </div>

        {/* Token Information Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {tokenInfo.map((info, index) => (
            <div
              key={index}
              className="bg-gradient-to-br from-[#192630] to-[#1a2332] border border-gray-700 rounded-2xl p-6 hover:border-purple-500/50 transition-all duration-300"
            >
              <div className="flex items-center gap-3 mb-3">
                {info.icon}
                <h3 className="text-gray-400 text-sm font-medium">
                  {info.label}
                </h3>
              </div>
              <p className="text-white font-semibold">{info.value}</p>
            </div>
          ))}
        </div>

        {/* Main Description */}
        <div className="bg-gradient-to-br from-[#192630] to-[#1a2332] border border-gray-700 rounded-2xl p-8 mb-16">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-white">{t('about_noot_token')}</h2>
          </div>

          <div className="prose prose-invert max-w-none">
            <p className="text-gray-300 leading-relaxed text-lg mb-6">
              {t("about_noot_token_paragraph_1")}{" "}
              <span className="text-purple-400 font-semibold">
                {t("noottools_sl")}
              </span>
              .
            </p>

            <div className="bg-red-900/20 border border-red-600/30 rounded-xl p-6">
              <div className="flex items-start gap-3">
                <Shield className="w-6 h-6 text-red-400 mt-1 flex-shrink-0" />
                <div>
                  <h3 className="text-red-300 font-semibold mb-2">
                    {t('important_warning')}
                  </h3>
                  <p className="text-red-200 text-sm leading-relaxed">
                    {t("noot_token_warning_desc")}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Features Grid */}
        <div className="mb-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white mb-4">
              {t("token_label")}{" "}
              <span className="text-purple-400">{t('planned_functionalities')}</span>
            </h2>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
              {t("discover_planned_ways")}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-8">
            {features.map((feature, index) => (
              <div
                key={index}
                className="bg-gradient-to-br from-[#192630] to-[#1a2332] border border-gray-700 rounded-2xl p-6 hover:border-gray-600 hover:transform hover:scale-105 transition-all duration-300 group"
              >
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-14 h-14 bg-gray-800/50 rounded-xl flex items-center justify-center group-hover:bg-gray-700/50 transition-colors">
                    {feature.icon}
                  </div>
                  <h3 className="text-xl font-bold text-white">
                    {feature.title}
                  </h3>
                </div>
                <p className="text-gray-300 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Gaming Ecosystem */}
        <div className="bg-gradient-to-br from-purple-600/10 to-blue-600/10 border border-purple-500/30 rounded-2xl p-8 mb-16">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-3 bg-purple-600/20 border border-purple-500/30 rounded-xl px-4 py-2 mb-4">
              <Gamepad2 className="w-5 h-5 text-purple-400" />
              <span className="text-purple-300 text-sm font-semibold">
                {t('noot_battle_eco')}
              </span>
            </div>
            <h2 className="text-3xl font-bold text-white mb-4">
              {t('noot_eco_integration')}
            </h2>
            <p className="text-gray-300 text-lg max-w-3xl mx-auto">
              {t("noot_integration_desc")}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <Gamepad2 className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">
                {t('internal_currency')}
              </h3>
              <p className="text-gray-400 text-sm">
                {t("used_for_improvements")}
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trophy className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">
                {t('competitive_features')}
              </h3>
              <p className="text-gray-400 text-sm">
                {t("access_tournaments_competitive")}
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <Zap className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">
                {t('premium_access_nav')}
              </h3>
              <p className="text-gray-400 text-sm">
                {t("unlock_advanced_features")}
              </p>
            </div>
          </div>
        </div>

        {/* Developer Information */}
        <div className="bg-gradient-to-br from-[#192630] to-[#1a2332] border border-gray-700 rounded-2xl p-8">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
              <Users className="w-6 h-6 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-white">
              {t('developed_by')}
            </h2>
          </div>

          <p className="text-gray-300 leading-relaxed text-lg">
            {t("noot_token_developer_desc")}{" "}
            {!isLoadingSettings && settings?.whitepaper && (
              <>
                {" "}
                {t("noot_whitepaper_available_desc")}
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  );
};

export default NootToken;
