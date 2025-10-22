import React, { useState } from "react";
import {
  Cog,
  Code,
  Shield,
  Zap,
  Users,
  CheckCircle,
  ArrowRight,
  Database,
  Cloud,
  Lock,
  Cpu,
  Globe,
  Smartphone,
  BarChart3,
  Target,
  Layers,
  GitBranch,
} from "lucide-react";

const HowWeDoIt = () => {
  const [activeTab, setActiveTab] = useState("development");

  const tabs = [
    { id: "development", label: "Membership Flow", icon: <Code size={20} /> },
    { id: "security", label: "NFT Security", icon: <Shield size={20} /> },
    {
      id: "infrastructure",
      label: "Technology",
      icon: <Database size={20} />,
    },
    {
      id: "user-experience",
      label: "User Benefits",
      icon: <Users size={20} />,
    },
  ];

  const developmentProcess = [
    {
      step: "01",
      title: "Mint Your NFT",
      description:
        "Purchase an exclusive Genesis NFT from our limited collection on Solana",
      details: [
        "Limited supply of 5,000 NFTs",
        "0.5 SOL mint price",
        "Instant ownership verification",
        "Stored securely in your wallet",
      ],
      icon: <Target className="text-blue-400" size={24} />,
    },
    {
      step: "02",
      title: "Stake for Membership",
      description:
        "Stake your NFT once to activate 6 months of free token creation",
      details: [
        "One-time staking mechanism",
        "Immediate membership activation",
        "Cannot be re-staked after use",
        "Increases NFT rarity and value",
      ],
      icon: <Layers className="text-purple-400" size={24} />,
    },
    {
      step: "03",
      title: "Create Unlimited Tokens",
      description: "Build unlimited Solana tokens completely free for 6 months",
      details: [
        "No platform fees during membership",
        "Advanced token configuration",
        "Instant deployment to Solana",
        "Professional-grade smart contracts",
      ],
      icon: <GitBranch className="text-green-400" size={24} />,
    },
    {
      step: "04",
      title: "Add Liquidity Manually",
      description:
        "Follow our comprehensive guide to add liquidity to Raydium pools",
      details: [
        "Step-by-step liquidity guide",
        "Manual Raydium pool creation",
        "Maximize token visibility",
        "Community trading support",
      ],
      icon: <BarChart3 className="text-yellow-400" size={24} />,
    },
  ];

  const technologies = [
    {
      category: "Frontend",
      color: "from-blue-500 to-cyan-500",
      icon: <Globe className="text-blue-400" size={32} />,
      techs: [
        "React",
        "TypeScript",
        "Tailwind CSS",
        "Web3.js",
        "Solana Wallet Adapter",
      ],
    },
    {
      category: "Backend",
      color: "from-green-500 to-emerald-500",
      icon: <Database className="text-green-400" size={32} />,
      techs: ["Node.js", "PostgreSQL", "Redis", "Directus", "REST APIs"],
    },
    {
      category: "Blockchain",
      color: "from-purple-500 to-pink-500",
      icon: <Cpu className="text-purple-400" size={32} />,
      techs: ["Solana", "Rust", "Anchor", "Metaplex", "SPL Token"],
    },
    {
      category: "Infrastructure",
      color: "from-orange-500 to-red-500",
      icon: <Cloud className="text-orange-400" size={32} />,
      techs: ["AWS", "Docker", "Kubernetes", "CI/CD", "Monitoring"],
    },
  ];

  const securityMeasures = [
    {
      title: "NFT Smart Contract Security",
      description:
        "Our NFT contracts are audited and secured with industry-leading standards",
      features: [
        "Multiple security audits",
        "One-time staking enforcement",
        "Ownership verification",
        "Anti-manipulation protocols",
      ],
      icon: <Lock className="text-red-400" size={24} />,
    },
    {
      title: "Membership Verification",
      description:
        "Automated verification system for NFT ownership and staking status",
      features: [
        "Real-time ownership checks",
        "Staking status verification",
        "Membership expiry tracking",
        "Fraud prevention systems",
      ],
      icon: <Shield className="text-blue-400" size={24} />,
    },
    {
      title: "Token Creation Security",
      description:
        "Secure token creation with verified smart contract templates",
      features: [
        "Audited token contracts",
        "Secure deployment process",
        "Anti-rug protection",
        "Verified metadata standards",
      ],
      icon: <Globe className="text-green-400" size={24} />,
    },
  ];

  const getTabContent = () => {
    switch (activeTab) {
      case "development":
        return (
          <div className="space-y-8">
            <div className="text-center mb-12">
              <h3 className="text-3xl font-bold text-white mb-4">
                NFT Membership Flow
              </h3>
              <p className="text-gray-400 max-w-2xl mx-auto">
                Our revolutionary NFT membership system provides real utility
                through a simple 4-step process that unlocks 6 months of free
                token creation on Solana.
              </p>
            </div>

            <div className="space-y-8">
              {developmentProcess.map((process, index) => (
                <div
                  key={index}
                  className="bg-gray-800/50 rounded-xl p-6 border border-gray-700"
                >
                  <div className="flex items-start gap-6">
                    <div className="w-16 h-16 bg-gray-700/50 rounded-xl flex items-center justify-center flex-shrink-0">
                      {process.icon}
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center gap-4 mb-3">
                        <span className="text-3xl font-bold text-gray-600">
                          {process.step}
                        </span>
                        <h4 className="text-xl font-bold text-white">
                          {process.title}
                        </h4>
                      </div>

                      <p className="text-gray-400 mb-4">
                        {process.description}
                      </p>

                      <div className="grid md:grid-cols-2 gap-3">
                        {process.details.map((detail, idx) => (
                          <div key={idx} className="flex items-center gap-2">
                            <CheckCircle
                              className="text-green-400 flex-shrink-0"
                              size={16}
                            />
                            <span className="text-gray-300 text-sm">
                              {detail}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case "security":
        return (
          <div className="space-y-8">
            <div className="text-center mb-12">
              <h3 className="text-3xl font-bold text-white mb-4">
                NFT Security Framework
              </h3>
              <p className="text-gray-400 max-w-2xl mx-auto">
                Security is paramount in our NFT membership system. We implement
                multiple layers of protection to ensure your NFTs and membership
                benefits are always secure.
              </p>
            </div>

            <div className="grid md:grid-cols-1 gap-6">
              {securityMeasures.map((measure, index) => (
                <div
                  key={index}
                  className="bg-gray-800/50 rounded-xl p-6 border border-gray-700"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-gray-700/50 rounded-xl flex items-center justify-center">
                      {measure.icon}
                    </div>

                    <div>
                      <h4 className="text-xl font-bold text-white mb-2">
                        {measure.title}
                      </h4>
                      <p className="text-gray-400 mb-4">
                        {measure.description}
                      </p>

                      <div className="grid md:grid-cols-2 gap-3">
                        {measure.features.map((feature, idx) => (
                          <div key={idx} className="flex items-center gap-2">
                            <CheckCircle
                              className="text-green-400 flex-shrink-0"
                              size={16}
                            />
                            <span className="text-gray-300 text-sm">
                              {feature}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case "infrastructure":
        return (
          <div className="space-y-8">
            <div className="text-center mb-12">
              <h3 className="text-3xl font-bold text-white mb-4">
                Technology Stack
              </h3>
              <p className="text-gray-400 max-w-2xl mx-auto">
                We use cutting-edge technologies and robust infrastructure to
                deliver fast, reliable, and scalable solutions.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {technologies.map((tech, index) => (
                <div
                  key={index}
                  className="bg-gray-800/50 rounded-xl p-6 border border-gray-700"
                >
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-16 h-16 bg-gray-700/50 rounded-xl flex items-center justify-center">
                      {tech.icon}
                    </div>
                    <div>
                      <h4 className="text-xl font-bold text-white">
                        {tech.category}
                      </h4>
                      <div
                        className={`w-20 h-1 rounded-full bg-gradient-to-r ${tech.color} mt-2`}
                      ></div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {tech.techs.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                        <span className="text-gray-300">{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case "user-experience":
        return (
          <div className="space-y-8">
            <div className="text-center mb-12">
              <h3 className="text-3xl font-bold text-white mb-4">
                Membership Benefits
              </h3>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {[
                {
                  title: "Free Token Creation",
                  description:
                    "Create unlimited Solana tokens with zero platform fees for 6 months",
                  icon: <Smartphone className="text-blue-400" size={24} />,
                  features: [
                    "No platform fees",
                    "Unlimited token creation",
                    "Advanced configurations",
                  ],
                },
                {
                  title: "Exclusive Access",
                  description:
                    "Premium platform features available only to NFT holders",
                  icon: <Zap className="text-yellow-400" size={24} />,
                  features: [
                    "Priority support",
                    "Early feature access",
                    "VIP community",
                  ],
                },
                {
                  title: "One-Time Value",
                  description:
                    "Each NFT can only be staked once, creating permanent scarcity",
                  icon: <Users className="text-green-400" size={24} />,
                  features: [
                    "Permanent rarity increase",
                    "Strategic staking decisions",
                    "Long-term value growth",
                  ],
                },
              ].map((item, index) => (
                <div
                  key={index}
                  className="bg-gray-800/50 rounded-xl p-6 border border-gray-700"
                >
                  <div className="w-12 h-12 bg-gray-700/50 rounded-xl flex items-center justify-center mb-4">
                    {item.icon}
                  </div>

                  <h4 className="text-xl font-bold text-white mb-2">
                    {item.title}
                  </h4>
                  <p className="text-gray-400 mb-4">{item.description}</p>

                  <div className="space-y-2">
                    {item.features.map((feature, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <CheckCircle
                          className="text-green-400 flex-shrink-0"
                          size={16}
                        />
                        <span className="text-gray-300 text-sm">{feature}</span>
                      </div>
                    ))}
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
    <div className="min-h-screen bg-[#0A151E] pt-28 pb-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Hero Section */}
        <div className="text-center mb-20">
          <div className="inline-flex items-center gap-3 bg-gradient-to-r from-green-600/20 to-blue-600/20 border border-green-500/30 rounded-2xl px-6 py-3 mb-6">
            <Cog className="text-green-400" size={24} />
            <span className="text-green-300 font-semibold">How We Do It</span>
          </div>

          <h1 className="text-6xl font-bold text-white mb-6">
            <span className="bg-gradient-to-r from-green-400 to-blue-400 bg-clip-text text-transparent">
              NFT Membership
            </span>
            <br />
            <span className="text-white">How It Works</span>
          </h1>

          <p className="text-gray-400 text-xl max-w-4xl mx-auto leading-relaxed">
            Discover how our revolutionary NFT membership system works: mint
            exclusive NFTs, stake them once for 6 months of free token creation,
            and build unlimited Web3 projects.
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex flex-wrap justify-center gap-2 mb-12">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all duration-300 ${
                activeTab === tab.id
                  ? "bg-gradient-to-r from-green-600 to-blue-600 text-white shadow-lg"
                  : "bg-gray-800/50 text-gray-300 hover:bg-gray-700/50 hover:text-white"
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="bg-gradient-to-br from-[#192630] to-[#1a2332] rounded-2xl p-8 border border-gray-700 mb-20">
          {getTabContent()}
        </div>

        {/* Quality Assurance */}
        <div className="grid lg:grid-cols-2 gap-8 items-center mb-20">
          <div>
            <h2 className="text-4xl font-bold text-white mb-6">
              Quality Assurance
            </h2>
            <p className="text-gray-400 text-lg mb-6">
              Every line of code is thoroughly tested and reviewed. We maintain
              the highest standards of quality through comprehensive testing,
              code reviews, and continuous monitoring.
            </p>

            <div className="space-y-4">
              {[
                "Automated testing pipelines",
                "Manual QA testing",
                "Security audits",
                "Performance benchmarks",
                "User acceptance testing",
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

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-800/50 rounded-xl p-6 text-center border border-gray-700">
              <div className="text-3xl font-bold text-green-400 mb-2">
                99.9%
              </div>
              <div className="text-gray-400">Uptime</div>
            </div>
            <div className="bg-gray-800/50 rounded-xl p-6 text-center border border-gray-700">
              <div className="text-3xl font-bold text-blue-400 mb-2">100%</div>
              <div className="text-gray-400">Code Coverage</div>
            </div>
            <div className="bg-gray-800/50 rounded-xl p-6 text-center border border-gray-700">
              <div className="text-3xl font-bold text-purple-400 mb-2">
                &lt;1s
              </div>
              <div className="text-gray-400">Response Time</div>
            </div>
            <div className="bg-gray-800/50 rounded-xl p-6 text-center border border-gray-700">
              <div className="text-3xl font-bold text-yellow-400 mb-2">
                24/7
              </div>
              <div className="text-gray-400">Monitoring</div>
            </div>
          </div>
        </div>

        {/* Innovation */}
        <div className="bg-gradient-to-br from-[#192630] to-[#1a2332] rounded-2xl p-8 border border-gray-700 mb-20">
          <div className="text-center mb-8">
            <h2 className="text-4xl font-bold text-white mb-4">
              Continuous Innovation
            </h2>
            <p className="text-gray-400 max-w-2xl mx-auto">
              We're always pushing the boundaries of what's possible in Web3,
              staying ahead of trends and implementing cutting-edge solutions.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                title: "Research & Development",
                description: "Exploring new technologies and methodologies",
                icon: <Target className="text-blue-400" size={24} />,
              },
              {
                title: "Community Feedback",
                description:
                  "Listening to our users and implementing their ideas",
                icon: <Users className="text-green-400" size={24} />,
              },
              {
                title: "Industry Partnerships",
                description: "Collaborating with leading Web3 companies",
                icon: <Globe className="text-purple-400" size={24} />,
              },
            ].map((item, index) => (
              <div
                key={index}
                className="bg-gray-800/50 rounded-xl p-6 border border-gray-700 text-center"
              >
                <div className="w-14 h-14 bg-gray-700/50 rounded-xl mx-auto mb-4 flex items-center justify-center">
                  {item.icon}
                </div>
                <h3 className="text-xl font-bold text-white mb-3">
                  {item.title}
                </h3>
                <p className="text-gray-400">{item.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="text-center bg-gradient-to-r from-green-600/10 to-blue-600/10 rounded-2xl p-12 border border-green-500/30">
          <h2 className="text-4xl font-bold text-white mb-6">
            Ready to Start Your NFT Membership?
          </h2>
          <p className="text-gray-400 text-lg mb-8 max-w-2xl mx-auto">
            Join our exclusive membership program and unlock 6 months of free
            token creation. Mint your NFT today and become part of the Web3
            revolution.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="/nft-minting"
              className="bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white px-8 py-4 rounded-xl font-semibold transition-all duration-300 transform hover:scale-105 flex items-center justify-center gap-2"
            >
              <Code size={20} />
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

export default HowWeDoIt;
