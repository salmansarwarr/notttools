import React, { useState, useEffect } from "react";
import { Image } from "@heroui/react";
import {
  Image as ImageIcon,
  Palette,
  Star,
  Zap,
  Shield,
  TrendingUp,
  Crown,
  Sparkles,
  Coins,
  Users,
  Calendar,
  CheckCircle,
  RefreshCw,
} from "lucide-react";
import { getConfigInfo } from "../hooks/frontend-functions";

const Nfts = () => {
  const [activeTab, setActiveTab] = useState("overview");
  const [configInfo, setConfigInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [randomNfts, setRandomNfts] = useState([]);
  const [nftLoading, setNftLoading] = useState(false);
  const [imageLoadingStates, setImageLoadingStates] = useState({});

  // Fetch config info on component mount
  useEffect(() => {
    const fetchConfigInfo = async () => {
      try {
        setLoading(true);
        const data = await getConfigInfo();
        console.log("Config Info Data:", data); // Debug log
        setConfigInfo(data);
      } catch (error) {
        console.error("Error fetching config info:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchConfigInfo();
  }, []);

  // Fetch random NFTs (exactly like NftMinting page)
  async function fetchRandomNfts() {
    console.log("🚀 fetchRandomNfts FUNCTION CALLED!");
    setNftLoading(true);

    // İlk başta tüm resimleri loading olarak ayarla
    const initialLoadingStates = {};
    for (let i = 0; i < 4; i++) {
      initialLoadingStates[i] = true;
    }
    setImageLoadingStates(initialLoadingStates);

    try {
      const nftPromises = [];
      const usedIds = new Set();

      // 4 farklı random NFT getir
      while (nftPromises.length < 4) {
        const randomId = Math.floor(Math.random() * 5000) + 1;
        if (!usedIds.has(randomId)) {
          usedIds.add(randomId);
          nftPromises.push(
            fetch(`https://metadata.noottools.io/metadata/${randomId}.json`)
              .then((res) => res.json())
              .then((data) => ({
                name: data.name || `NOOT Genesis #${randomId}`,
                image:
                  data.image ||
                  `https://metadata.noottools.io/metadata/${randomId}.png`,
                id: randomId,
              }))
              .catch((err) => ({
                name: `NOOT Genesis #${randomId}`,
                image: `https://metadata.noottools.io/metadata/${randomId}.png`,
                id: randomId,
              }))
          );
        }
      }

      const nfts = await Promise.all(nftPromises);
      setRandomNfts(nfts);
    } catch (error) {
      console.error("Error loading preview NFTs:", error);
      // Fallback NFTs
      setRandomNfts(
        Array.from({ length: 4 }, (_, i) => ({
          name: `NOOT Genesis #${Math.floor(Math.random() * 5000) + 1}`,
          image: "/pengu.png",
          id: Math.floor(Math.random() * 5000) + 1,
        }))
      );
    } finally {
      setNftLoading(false);
    }
  }

  const handleImageLoad = (index) => {
    setImageLoadingStates((prev) => ({ ...prev, [index]: false }));
  };

  const handleImageError = (e, index) => {
    e.target.src = "/pengu.png";
    setImageLoadingStates((prev) => ({ ...prev, [index]: false }));
  };

  // Load random NFTs on component mount
  useEffect(() => {
    fetchRandomNfts();
  }, []);

  const roadmapItems = [
    {
      title: "NFT Membership Launch",
      description:
        "Launch exclusive NFT membership with unique benefits and staking rewards.",
      date: "Q4 2025",
      status: "completed",
    },
    {
      title: "Advanced Features",
      description: "Implement advanced portfolio management tools.",
      date: "Q1 2026",
      status: "in-progress",
    },
    {
      title: "Cross-Chain Integration",
      description:
        "Expand to Ethereum, BSC, and other major blockchain networks.",
      date: "Q2 2026",
      status: "upcoming",
    },
    {
      title: "Mobile Application",
      description:
        "Launch iOS and Android apps with full trading capabilities.",
      date: "Q3 2026",
      status: "upcoming",
    },
  ];

  const nftFeatures = [
    {
      icon: <Crown className="w-8 h-8 text-yellow-400" />,
      title: "Exclusive Access",
      description:
        "Gain priority access to new token launches and premium features.",
      benefits: ["Early access to IDOs", "VIP support", "Exclusive community"],
    },
    {
      icon: <Zap className="w-8 h-8 text-blue-400" />,
      title: "Free Token Creation",
      description:
        "Create unlimited tokens on Solana without any fees when you stake your NFT.",
      benefits: [
        "Free token deployment",
        "No transaction fees",
        "Unlimited creations",
      ],
    },
    {
      icon: <Shield className="w-8 h-8 text-green-400" />,
      title: "Premium Security",
      description: "Access advanced security features and insurance coverage.",
      benefits: [
        "Multi-sig protection",
        "Insurance coverage",
        "Priority recovery",
      ],
    },
    {
      icon: <TrendingUp className="w-8 h-8 text-purple-400" />,
      title: "Trading Advantages",
      description: "Get advanced trading tools and market insights.",
      benefits: ["Advanced charts", "Market signals", "Portfolio analytics"],
    },
  ];

  const tabs = [
    { id: "overview", label: "Overview", icon: <ImageIcon size={20} /> },
    { id: "benefits", label: "Benefits", icon: <Star size={20} /> },
    { id: "roadmap", label: "Roadmap", icon: <Calendar size={20} /> },
  ];

  const TabContent = () => {
    switch (activeTab) {
      case "overview":
        return (
          <div className="space-y-20">
            {/* Hero Section */}
            <div className="text-center space-y-8">
              <div className="inline-flex items-center gap-3 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 rounded-full px-6 py-3 border border-yellow-500/30">
                <Crown className="w-6 h-6 text-yellow-400" />
                <span className="text-yellow-400 font-semibold">
                  Exclusive NFT Membership
                </span>
              </div>

              <h1 className="text-5xl md:text-7xl font-bold bg-gradient-to-r from-white via-gray-200 to-gray-400 bg-clip-text text-transparent">
                NOOTTOOLS NFT
                <br />
                <span className="bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
                  Collection
                </span>
              </h1>

              <p className="text-xl text-gray-300 max-w-3xl mx-auto">
                Join our exclusive membership community and unlock premium
                features, enhanced rewards, and priority access to new
                opportunities on Solana.
              </p>

              <div className="flex flex-wrap justify-center gap-6 text-sm">
                <div className="flex items-center gap-2 bg-gray-800/50 rounded-lg px-4 py-2">
                  <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                  <span className="text-gray-300">Live Collection</span>
                </div>
                <div className="flex items-center gap-2 bg-gray-800/50 rounded-lg px-4 py-2">
                  <Users className="w-4 h-4 text-blue-400" />
                  <span className="text-gray-300">5,000 Total Supply</span>
                </div>
                <div className="flex items-center gap-2 bg-gray-800/50 rounded-lg px-4 py-2">
                  <Coins className="w-4 h-4 text-yellow-400" />
                  <span className="text-gray-300">Solana Blockchain</span>
                </div>
              </div>
            </div>

            {/* Live Collection Stats */}
            <div className="bg-gradient-to-br from-[#192630] to-[#1a2332] rounded-2xl p-8 border border-gray-700">
              <h2 className="text-3xl font-bold text-white text-center mb-8">
                Live Collection Stats
              </h2>

              {loading ? (
                <div className="grid md:grid-cols-3 gap-8">
                  <div className="text-center space-y-2">
                    <div className="text-3xl font-bold text-gray-600 animate-pulse">
                      Loading...
                    </div>
                    <div className="text-gray-400">Minted NFTs</div>
                  </div>
                  <div className="text-center space-y-2">
                    <div className="text-3xl font-bold text-gray-600 animate-pulse">
                      Loading...
                    </div>
                    <div className="text-gray-400">Total Staked</div>
                  </div>
                  <div className="text-center space-y-2">
                    <div className="text-3xl font-bold text-gray-600 animate-pulse">
                      Loading...
                    </div>
                    <div className="text-gray-400">Mint Price</div>
                  </div>
                </div>
              ) : configInfo ? (
                <div className="grid md:grid-cols-3 gap-8">
                  <div className="text-center space-y-2">
                    <div className="text-3xl font-bold text-yellow-400">
                      {configInfo.totalMinted
                        ? configInfo.totalMinted.toLocaleString()
                        : "0"}
                    </div>
                    <div className="text-gray-400">Minted NFTs</div>
                  </div>

                  <div className="text-center space-y-2">
                    <div className="text-3xl font-bold text-blue-400">
                      {configInfo.totalStaked
                        ? configInfo.totalStaked.toLocaleString()
                        : "0"}
                    </div>
                    <div className="text-gray-400">Total Transactions</div>
                  </div>

                  <div className="text-center space-y-2">
                    <div className="text-3xl font-bold text-green-400">
                      {configInfo.mintingFee
                        ? `${configInfo.mintingFee} SOL`
                        : "0.1 SOL"}
                    </div>
                    <div className="text-gray-400">Mint Price</div>
                  </div>
                </div>
              ) : (
                <div className="text-center text-gray-400">
                  Failed to load blockchain data
                </div>
              )}
            </div>

            {/* Random NFT Preview */}
            <div className="bg-gradient-to-br from-[#192630] to-[#1a2332] rounded-2xl p-8 border border-gray-700">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl text-center font-bold text-white">
                  Collection Preview
                </h2>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {randomNfts?.map((nft, index) => (
                  <div
                    key={index}
                    className="bg-gray-800/50 rounded-xl p-4 hover:bg-gray-800/70 transition-colors"
                  >
                    <div className="aspect-square bg-gray-700 rounded-lg mb-3 overflow-hidden relative">
                      {imageLoadingStates[index] && (
                        <div className="absolute inset-0 bg-gray-700 animate-pulse flex items-center justify-center">
                          <div className="w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
                        </div>
                      )}
                      <img
                        src={nft.image}
                        alt={nft.name || "NFT"}
                        className={`w-full h-full object-cover transition-opacity duration-300 ${
                          imageLoadingStates[index]
                            ? "opacity-0"
                            : "opacity-100"
                        }`}
                        onLoad={() => handleImageLoad(index)}
                        onError={(e) => handleImageError(e, index)}
                      />
                    </div>
                    <h3 className="text-white font-semibold text-center truncate">
                      {nft.name}
                    </h3>
                  </div>
                ))}
              </div>
            </div>

            {/* Call to Action */}
            <div className="text-center space-y-8">
              <h2 className="text-4xl font-bold text-white mb-6">
                Ready to Join the Elite?
              </h2>
              <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
                Mint your NFT membership today and unlock exclusive benefits in
                the NOOTTOOLS ecosystem.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <a
                  href="/nft-minting"
                  className="bg-gradient-to-r from-yellow-500 to-orange-500 text-black font-bold py-4 px-8 rounded-xl hover:from-yellow-400 hover:to-orange-400 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-yellow-500/25"
                >
                  Mint NFT Membership
                </a>
                <button className="border border-gray-600 text-white font-semibold py-4 px-8 rounded-xl hover:border-gray-500 hover:bg-gray-800/50 transition-all duration-300">
                  View Collection
                </button>
              </div>
            </div>
          </div>
        );

      case "benefits":
        return (
          <div className="space-y-20">
            <div className="text-center space-y-6">
              <h1 className="text-5xl font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
                Membership Benefits
              </h1>
              <p className="text-xl text-gray-300 max-w-3xl mx-auto">
                Unlock premium features and exclusive opportunities with your
                NFT membership.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              {nftFeatures.map((feature, index) => (
                <div
                  key={index}
                  className="bg-gradient-to-br from-[#192630] to-[#1a2332] rounded-2xl p-8 border border-gray-700 hover:border-gray-600 transition-all duration-300 transform hover:scale-105"
                >
                  <div className="w-16 h-16 bg-gray-800/50 rounded-xl mb-6 flex items-center justify-center">
                    {feature.icon}
                  </div>

                  <h3 className="text-2xl font-bold text-white mb-4">
                    {feature.title}
                  </h3>
                  <p className="text-gray-400 mb-6">{feature.description}</p>

                  <div className="space-y-3">
                    {feature.benefits.map((benefit, idx) => (
                      <div key={idx} className="flex items-center gap-3">
                        <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
                        <span className="text-gray-300">{benefit}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case "roadmap":
        return (
          <div className="space-y-20">
            <div className="text-center space-y-6">
              <h1 className="text-5xl font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
                Development Roadmap
              </h1>
              <p className="text-xl text-gray-300 max-w-3xl mx-auto">
                Follow our journey as we build the future of decentralized
                trading.
              </p>
            </div>

            <div className="space-y-8">
              {roadmapItems.map((item, index) => (
                <div
                  key={index}
                  className="relative bg-gradient-to-br from-[#192630] to-[#1a2332] rounded-2xl p-8 border border-gray-700 hover:border-gray-600 transition-all duration-300"
                >
                  <div className="flex items-start gap-6">
                    <div className="flex-shrink-0">
                      <div
                        className={`w-12 h-12 rounded-full flex items-center justify-center border-2 ${
                          item.status === "completed"
                            ? "bg-green-500 border-green-400"
                            : item.status === "in-progress"
                            ? "bg-blue-500 border-blue-400"
                            : "bg-gray-600 border-gray-500"
                        }`}
                      >
                        {item.status === "completed" ? (
                          <CheckCircle className="w-6 h-6 text-white" />
                        ) : item.status === "in-progress" ? (
                          <Zap className="w-6 h-6 text-white" />
                        ) : (
                          <Calendar className="w-6 h-6 text-white" />
                        )}
                      </div>
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center gap-4 mb-3">
                        <h3 className="text-2xl font-bold text-white">
                          {item.title}
                        </h3>
                        <span
                          className={`px-3 py-1 rounded-full text-sm font-semibold ${
                            item.status === "completed"
                              ? "bg-green-500/20 text-green-400 border border-green-500/30"
                              : item.status === "in-progress"
                              ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                              : "bg-gray-500/20 text-gray-400 border border-gray-500/30"
                          }`}
                        >
                          {item.status === "completed"
                            ? "Completed"
                            : item.status === "in-progress"
                            ? "In Progress"
                            : "Upcoming"}
                        </span>
                      </div>

                      <p className="text-gray-400 mb-4">{item.description}</p>

                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Calendar className="w-4 h-4" />
                        <span>{item.date}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black">
      <div className="container mx-auto px-4 pt-32 pb-12 max-w-7xl">
        {/* Navigation Tabs */}
        <div className="flex justify-center mb-12 px-4">
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-2 border border-gray-700 overflow-x-auto">
            <div className="flex gap-1 min-w-max">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-3 sm:px-6 py-3 rounded-xl font-semibold transition-all duration-300 text-sm sm:text-base whitespace-nowrap ${
                    activeTab === tab.id
                      ? "bg-gradient-to-r from-yellow-500 to-orange-500 text-black shadow-lg"
                      : "text-gray-400 hover:text-white hover:bg-gray-700/50"
                  }`}
                >
                  {tab.icon}
                  <span className="hidden sm:inline">{tab.label}</span>
                  <span className="sm:hidden">{tab.label.charAt(0)}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Tab Content */}
        <TabContent />
      </div>
    </div>
  );
};

export default Nfts;
