import React from "react";
import {
  Target,
  Zap,
  Users,
  Globe,
  TrendingUp,
  Shield,
  Coins,
  Rocket,
  Heart,
  CheckCircle,
  ArrowRight,
  Star,
} from "lucide-react";

const Purpose = () => {
  const missions = [
    {
      icon: <Zap className="text-yellow-400" size={32} />,
      title: "NFT-Powered Access",
      description:
        "Revolutionary membership model where NFTs unlock premium token creation features when staked",
      details:
        "Our exclusive NFTs provide premium platform access through commitment-based staking - stake anytime but commit to a 6-month period.",
    },
    {
      icon: <Users className="text-blue-400" size={32} />,
      title: "Community Ownership",
      description:
        "NFT holders become true platform stakeholders with exclusive benefits and priority support",
      details:
        "Building a community where ownership matters and membership provides real value.",
    },
    {
      icon: <Globe className="text-green-400" size={32} />,
      title: "Solana Innovation",
      description:
        "Leveraging Solana's speed and efficiency for seamless token creation and NFT utilities",
      details:
        "Fast, cost-effective blockchain operations with enterprise-grade security and reliability.",
    },
    {
      icon: <Shield className="text-purple-400" size={32} />,
      title: "Commitment Staking",
      description:
        "Stake your NFTs for premium access with a minimum 6-month commitment period",
      details:
        "Strategic staking with commitment - stake multiple times but each stake requires a 6-month commitment period.",
    },
  ];

  const values = [
    {
      title: "Exclusivity",
      description:
        "Premium NFT membership with limited supply and unique benefits",
      icon: <Rocket className="text-orange-400" size={24} />,
    },
    {
      title: "Commitment",
      description:
        "Stake your NFTs to unlock premium features with a 6-month commitment period",
      icon: <Globe className="text-blue-400" size={24} />,
    },
    {
      title: "Community",
      description: "NFT holders form an exclusive community of Web3 builders",
      icon: <Heart className="text-red-400" size={24} />,
    },
    {
      title: "Utility",
      description:
        "Real utility with premium token creation features for staked NFTs",
      icon: <Users className="text-green-400" size={24} />,
    },
  ];

  const achievements = [
    { number: "10,000+", label: "Tokens Created", color: "text-blue-400" },
    { number: "50,000+", label: "Active Users", color: "text-green-400" },
    { number: "$100M+", label: "Total Value Locked", color: "text-purple-400" },
    { number: "99.9%", label: "Uptime", color: "text-yellow-400" },
  ];

  return (
    <div className="min-h-screen bg-[#0A151E] pt-28 pb-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Hero Section */}
        <div className="text-center mb-20">
          <div className="inline-flex items-center gap-3 bg-gradient-to-r from-blue-600/20 to-purple-600/20 border border-blue-500/30 rounded-2xl px-6 py-3 mb-6">
            <Target className="text-blue-400" size={24} />
            <span className="text-blue-300 font-semibold">Our Purpose</span>
          </div>

          <h1 className="text-6xl font-bold text-white mb-6">
            <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              NFT Membership
            </span>
            <br />
            <span className="text-white">Revolution</span>
          </h1>

          <p className="text-gray-400 text-xl max-w-4xl mx-auto leading-relaxed">
            Introducing a new paradigm where NFTs aren't just collectibles -
            they're keys to unlimited Web3 creation. Mint, stake with
            commitment, and unlock premium token creation features on Solana.
          </p>
        </div>

        {/* Mission Cards */}
        <div className="grid md:grid-cols-2 gap-8 mb-20">
          {missions.map((mission, index) => (
            <div
              key={index}
              className="bg-gradient-to-br from-[#192630] to-[#1a2332] rounded-2xl p-8 border border-gray-700 hover:border-gray-600 transition-all duration-300 transform hover:scale-105 group"
            >
              <div className="w-16 h-16 bg-gray-800/50 rounded-xl mb-6 flex items-center justify-center group-hover:scale-110 transition-transform">
                {mission.icon}
              </div>

              <h3 className="text-2xl font-bold text-white mb-4">
                {mission.title}
              </h3>
              <p className="text-gray-400 mb-4">{mission.description}</p>
              <p className="text-gray-300 text-sm">{mission.details}</p>
            </div>
          ))}
        </div>

        {/* Our Values */}
        <div className="mb-20">
          <h2 className="text-4xl font-bold text-white text-center mb-12">
            Our Core Values
          </h2>
          <div className="grid md:grid-cols-4 gap-6">
            {values.map((value, index) => (
              <div
                key={index}
                className="bg-gradient-to-br from-[#192630] to-[#1a2332] rounded-2xl p-6 border border-gray-700 text-center hover:border-gray-600 transition-all duration-300"
              >
                <div className="w-14 h-14 bg-gray-800/50 rounded-xl mx-auto mb-4 flex items-center justify-center">
                  {value.icon}
                </div>
                <h3 className="text-xl font-bold text-white mb-3">
                  {value.title}
                </h3>
                <p className="text-gray-400 text-sm">{value.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Vision Section */}
        <div className="grid lg:grid-cols-2 gap-12 items-center mb-20">
          <div>
            <h2 className="text-4xl font-bold text-white mb-6">
              The Future of NFT Utility
            </h2>
            <p className="text-gray-400 text-lg mb-6">
              We're pioneering a new model where NFTs provide real, tangible
              value beyond speculation. Our membership system creates
              sustainable utility that benefits both creators and holders
              long-term.
            </p>

            <div className="space-y-4">
              {[
                "Mint exclusive membership NFTs on Solana",
                "Stake anytime with 6-month commitment periods",
                "Build unlimited Web3 projects with enhanced features",
                "Join an exclusive community of innovators",
              ].map((item, index) => (
                <div key={index} className="flex items-center gap-3">
                  <CheckCircle
                    className="text-green-400 flex-shrink-0"
                    size={20}
                  />
                  <span className="text-gray-300">{item}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="relative">
            <div className="bg-gradient-to-br from-blue-600/20 to-purple-600/20 rounded-2xl p-8 border border-blue-500/30">
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-gray-800/50 rounded-lg p-4 text-center">
                  <TrendingUp
                    className="text-green-400 mx-auto mb-2"
                    size={24}
                  />
                  <div className="text-white font-bold">Limited</div>
                  <div className="text-gray-400 text-sm">Supply NFTs</div>
                </div>
                <div className="bg-gray-800/50 rounded-lg p-4 text-center">
                  <Coins className="text-yellow-400 mx-auto mb-2" size={24} />
                  <div className="text-white font-bold">Premium</div>
                  <div className="text-gray-400 text-sm">Features</div>
                </div>
                <div className="bg-gray-800/50 rounded-lg p-4 text-center">
                  <Shield className="text-blue-400 mx-auto mb-2" size={24} />
                  <div className="text-white font-bold">6-Month</div>
                  <div className="text-gray-400 text-sm">Commitment</div>
                </div>
                <div className="bg-gray-800/50 rounded-lg p-4 text-center">
                  <Star className="text-purple-400 mx-auto mb-2" size={24} />
                  <div className="text-white font-bold">Unlimited</div>
                  <div className="text-gray-400 text-sm">Access</div>
                </div>
              </div>

              <div className="text-center">
                <div className="text-2xl font-bold text-white mb-2">
                  NFT Membership Platform
                </div>
                <div className="text-gray-400">
                  Revolutionary utility model where NFTs unlock real platform
                  benefits and value.
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Call to Action */}
        <div className="text-center bg-gradient-to-r from-blue-600/10 to-purple-600/10 rounded-2xl p-12 border border-blue-500/30">
          <h2 className="text-4xl font-bold text-white mb-6">
            Start Your NFT Membership
          </h2>
          <p className="text-gray-400 text-lg mb-8 max-w-2xl mx-auto">
            Mint your exclusive NFT today and unlock premium token creation
            features. Join the revolution where NFTs provide real utility and
            lasting value through commitment-based staking.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="/nft-minting"
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-4 rounded-xl font-semibold transition-all duration-300 transform hover:scale-105 flex items-center justify-center gap-2"
            >
              <Rocket size={20} />
              Mint NFT Now
            </a>

            <a
              href="/nfts"
              className="border border-gray-600 hover:border-gray-500 text-gray-300 hover:text-white px-8 py-4 rounded-xl font-semibold transition-all duration-300 flex items-center justify-center gap-2"
            >
              <Users size={20} />
              Learn More
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Purpose;
