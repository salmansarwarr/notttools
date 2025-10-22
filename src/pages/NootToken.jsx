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

const NootToken = () => {
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
      title: "Internal Currency in NOOTBATTLE",
      description:
        "Acquire improvements, skills and characters within the game. Used as payment in internal transactions and special events.",
    },
    {
      icon: <Zap className="w-8 h-8 text-blue-400" />,
      title: "Access to Premium Features",
      description:
        "Unlock advanced features in NOOTTOOLS and special benefits within NOOTBATTLE.",
    },
    {
      icon: <Trophy className="w-8 h-8 text-orange-400" />,
      title: "Participation in Rankings & Tournaments",
      description:
        "Enter tournaments and improve your position in internal rankings in competitive mode.",
    },
    {
      icon: <Star className="w-8 h-8 text-cyan-400" />,
      title: "Interaction with Future Developments",
      description:
        "The NOOTTOOLS ecosystem will grow with new integrations and modules that may require NOOT tokens.",
    },
  ];

  const tokenInfo = [
    {
      label: "Token Name",
      value: "NOOT Token",
      icon: <Coins className="w-5 h-5 text-purple-400" />,
    },
    {
      label: "Purpose",
      value: "Utility Token",
      icon: <Shield className="w-5 h-5 text-green-400" />,
    },
    {
      label: "Use Case",
      value: "NOOTTOOLS & NOOTBATTLE Ecosystem",
      icon: <Gamepad2 className="w-5 h-5 text-blue-400" />,
    },
    {
      label: "Developer",
      value: "NOOTTOOLS, SL",
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
            <span className="text-purple-300 font-semibold">Utility Token</span>
          </div>

          <h1 className="text-4xl md:text-5xl font-bold mb-6">
            <span className="bg-gradient-to-r from-purple-400 via-blue-400 to-cyan-400 bg-clip-text text-transparent">
              NOOT Token
            </span>
          </h1>

          <p className="text-xl text-gray-300 max-w-3xl mx-auto leading-relaxed">
            The utility token designed to be used solely within the NOOTTOOLS
            ecosystem and, in particular, as an internal currency in the
            NOOTBATTLE video game.
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
                  View on Solana Explorer
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
                  Download Whitepaper
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
            <h2 className="text-2xl font-bold text-white">About NOOT Token</h2>
          </div>

          <div className="prose prose-invert max-w-none">
            <p className="text-gray-300 leading-relaxed text-lg mb-6">
              The NOOT token is a utility token designed to be used solely
              within the NOOTTOOLS ecosystem and, in particular, as an internal
              currency in the NOOTBATTLE video game. Its planned functionalities
              include serving as internal currency, providing access to premium
              features, enabling participation in rankings and tournaments, and
              facilitating interaction with future developments in the ecosystem
              developed by{" "}
              <span className="text-purple-400 font-semibold">
                NOOTTOOLS, SL
              </span>
              .
            </p>

            <div className="bg-red-900/20 border border-red-600/30 rounded-xl p-6">
              <div className="flex items-start gap-3">
                <Shield className="w-6 h-6 text-red-400 mt-1 flex-shrink-0" />
                <div>
                  <h3 className="text-red-300 font-semibold mb-2">
                    Important Warning
                  </h3>
                  <p className="text-red-200 text-sm leading-relaxed">
                    The NOOT token does not constitute a financial instrument.
                    It does not grant participation, dividends, interests or
                    economic rights of any kind. NOOTTOOLS, SL does not
                    guarantee that NOOT has or will have a monetary value. Its
                    purpose is exclusively utilitarian and is limited to the
                    NOOTTOOLS and NOOTBATTLE ecosystem.
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
              Token{" "}
              <span className="text-purple-400">Planned Functionalities</span>
            </h2>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
              Discover all the planned ways you can use NOOT tokens within the
              NOOTTOOLS and NOOTBATTLE ecosystem
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
                NootBattle Ecosystem
              </span>
            </div>
            <h2 className="text-3xl font-bold text-white mb-4">
              NOOTTOOLS Ecosystem Integration
            </h2>
            <p className="text-gray-300 text-lg max-w-3xl mx-auto">
              NOOT tokens are designed to be integrated seamlessly into the
              entire NOOTTOOLS ecosystem, with NOOTBATTLE being the primary
              gaming platform, providing utility and value across all future
              developments.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <Gamepad2 className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">
                Internal Currency
              </h3>
              <p className="text-gray-400 text-sm">
                Used for improvements, skills and characters within NOOTBATTLE
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trophy className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">
                Competitive Features
              </h3>
              <p className="text-gray-400 text-sm">
                Access tournaments and improve rankings in competitive mode
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <Zap className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">
                Premium Access
              </h3>
              <p className="text-gray-400 text-sm">
                Unlock advanced features in NOOTTOOLS and special benefits
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
              Developed by NOOTTOOLS, SL
            </h2>
          </div>

          <p className="text-gray-300 leading-relaxed text-lg">
            NOOTTOOLS, SL is committed to creating innovative gaming experiences
            that push the boundaries of what's possible in the Web3 gaming
            space. The NOOT token represents our dedication to providing players
            with meaningful utility within the NOOTTOOLS and NOOTBATTLE
            ecosystem.
            {!isLoadingSettings && settings?.whitepaper && (
              <>
                {" "}
                The whitepaper is available for detailed information about the
                token's specifications and roadmap.
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  );
};

export default NootToken;
