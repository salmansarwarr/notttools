import React, { useState, useEffect } from "react";
import {
  Play,
  ArrowRight,
  Zap,
  Shield,
  Send,
  CheckCircle,
  AlertCircle,
  Droplets,
  Users,
  ExternalLink,
} from "lucide-react";
import { Button, Link } from "@heroui/react";
import { useMutation } from "@tanstack/react-query";
import constants from "../constants";

const Landing = () => {
  const [subscriptionEmail, setSubscriptionEmail] = useState("");
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subscriptionError, setSubscriptionError] = useState(null);
  const [partners, setPartners] = useState([]);

  // Fetch partners from backend
  useEffect(() => {
    const fetchPartners = async () => {
      try {
        const response = await fetch(`${constants.backend_url}/items/partners`);
        if (response.ok) {
          const data = await response.json();
          setPartners(data.data || []);
        } else {
          console.error("Failed to fetch partners:", response.statusText);
          // Fallback to static partners if backend fails
          setPartners([
            {
              logo: "/assets/colloborators/1.png",
              link: "https://bit2me.com/es/registro?prm=5R5WRLD&utm_medium=app&utm_source=new_ref&utm_campaign=5x5world&mkt_kind=referral&code=GR7-8RE-QIB",
            },
            {
              logo: "/assets/colloborators/2.png",
              link: "https://www.yoseyomo.com?referral=raEca3hCX3Dg",
            },
            {
              logo: "/assets/colloborators/3.png",
              link: "https://www.c4e.club/",
            },
            {
              logo: "/assets/colloborators/4.png",
              link: "https://www.superpioneros.com/",
            },
            {
              logo: "/assets/colloborators/5.png",
              link: "https://deks.xyz/?rc=a2d0640f-2630-4fdb-9d69-edf89f9925f0",
            },
          ]);
        }
      } catch (error) {
        console.error("Error fetching partners:", error);
        // Fallback to static partners if request fails
        setPartners([
          {
            logo: "/assets/colloborators/1.png",
            link: "https://bit2me.com/es/registro?prm=5R5WRLD&utm_medium=app&utm_source=new_ref&utm_campaign=5x5world&mkt_kind=referral&code=GR7-8RE-QIB",
          },
          {
            logo: "/assets/colloborators/2.png",
            link: "https://www.yoseyomo.com?referral=raEca3hCX3Dg",
          },
          {
            logo: "/assets/colloborators/3.png",
            link: "https://www.c4e.club/",
          },
          {
            logo: "/assets/colloborators/4.png",
            link: "https://www.superpioneros.com/",
          },
          {
            logo: "/assets/colloborators/5.png",
            link: "https://deks.xyz/?rc=a2d0640f-2630-4fdb-9d69-edf89f9925f0",
          },
        ]);
      }
    };

    fetchPartners();
  }, []);

  // Subscription mutation
  const subscriptionMutation = useMutation({
    mutationFn: async (email) => {
      const response = await fetch(
        `${constants.backend_url}/items/email_subscribers`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email }),
        }
      );

      // Check if response is successful (including 204)
      if (!response.ok && response.status !== 204) {
        throw new Error("Failed to subscribe");
      }

      // Handle empty response for 204 status
      if (response.status === 204) {
        return { success: true };
      }

      return response.json();
    },
    onSuccess: () => {
      setIsSubscribed(true);
      setSubscriptionError(null);
      setSubscriptionEmail("");
    },
    onError: (error) => {
      console.error("Subscription error:", error);
      setSubscriptionError("Failed to subscribe. Please try again later.");
    },
  });

  const handleSubscription = (e) => {
    e.preventDefault();
    if (!subscriptionEmail) {
      setSubscriptionError("Please enter your email address");
      return;
    }
    setSubscriptionError(null);
    subscriptionMutation.mutate(subscriptionEmail);
  };

  return (
    <>
      {/* Hero Section */}
      <section className="pt-40 pb-20 bg-gradient-to-br from-[#0A151E] via-[#0D1B2A] to-[#0A151E]">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-3 bg-gradient-to-r from-purple-600/20 to-blue-600/20 border border-purple-500/30 rounded-2xl px-6 py-3 mb-8">
              <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse"></div>
              <span className="text-purple-300 font-semibold">
                Web3 Innovation Platform
              </span>
            </div>

            <h1 className="text-5xl md:text-7xl font-bold mb-6">
              <span className="bg-gradient-to-r from-purple-400 via-blue-400 to-cyan-400 bg-clip-text text-transparent">
                Create, Launch & Scale
              </span>
              <br />
              <span className="text-white">Your Web3 Projects</span>
            </h1>

            <p className="text-xl text-gray-300 max-w-4xl mx-auto leading-relaxed mb-12">
              Mint and stake our exclusive NFTs to unlock 6 months of FREE token
              creation on Solana. Build your Web3 projects without any platform
              fees when you hold our staked NFTs.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                as={Link}
                href="/create-coin"
                className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white px-8 py-4 rounded-2xl font-semibold transition-all duration-300 transform hover:scale-105"
              >
                Start Building
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Main Tools Section */}
      <section className="pb-5 pt-20 bg-[#0A151E]">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">
              Powerful Tools for{" "}
              <span className="text-purple-400">Web3 Builders</span>
            </h2>
            <p className="text-gray-400 text-lg max-w-3xl mx-auto">
              Everything you need to launch, manage, and scale your blockchain
              projects
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-6xl mx-auto">
            {/* Token Creator */}
            <div
              className="p-8 rounded-2xl relative overflow-hidden min-h-[350px] flex flex-col justify-end group hover:transform hover:scale-105 transition-all duration-300"
              style={{
                backgroundImage: "url('/card_background_1.png')",
                backgroundSize: "cover",
                backgroundPosition: "center",
              }}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-purple-600/20 to-blue-600/20 group-hover:from-purple-600/30 group-hover:to-blue-600/30 transition-all duration-300"></div>
              <div className="relative z-10">
                <div className="inline-flex items-center gap-2 bg-purple-600/20 border border-purple-500/30 rounded-xl px-4 py-2 mb-4">
                  <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                  <span className="text-purple-300 text-sm font-semibold">
                    Customizable Supply
                  </span>
                </div>
                <h3 className="text-3xl font-bold text-white mb-4">
                  TOKEN CREATOR
                </h3>
                <p className="text-gray-300 mb-6">
                  Create unlimited custom tokens with our exclusive NFT
                  membership. Stake our NFTs and enjoy 6 months of completely
                  FREE token creation on Solana.
                </p>
                <Button
                  as={Link}
                  href="/create-coin"
                  className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-xl transition-all duration-300 transform hover:scale-105"
                >
                  Create Token
                </Button>
              </div>
            </div>

            {/* Add Liquidity */}
            <div
              className="p-8 rounded-2xl relative overflow-hidden min-h-[350px] flex flex-col justify-end group hover:transform hover:scale-105 transition-all duration-300"
              style={{
                backgroundImage: "url('/card_background_2.png')",
                backgroundSize: "cover",
                backgroundPosition: "center",
              }}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 to-cyan-600/20 group-hover:from-blue-600/30 group-hover:to-cyan-600/30 transition-all duration-300"></div>
              <div className="relative z-10">
                <div className="inline-flex items-center gap-2 bg-blue-600/20 border border-blue-500/30 rounded-xl px-4 py-2 mb-4">
                  <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                  <span className="text-blue-300 text-sm font-semibold">
                    Liquidity Provider
                  </span>
                </div>
                <h3 className="text-3xl font-bold text-white mb-4">
                  ADD LIQUIDITY
                </h3>
                <p className="text-gray-300 mb-6">
                  Learn how to manually add liquidity to Raydium pools. Our
                  comprehensive guide helps you maximize returns on your token
                  investments.
                </p>
                <Button
                  as={Link}
                  href="/add-liquidity"
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl transition-all duration-300 transform hover:scale-105"
                >
                  Add Liquidity
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Additional Tools */}
      <section className="pb-20 bg-[#0A151E]">
        <div className="container mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* NFT Minting */}
            <div className="p-8 rounded-2xl bg-gradient-to-br from-[#192630] to-[#1a2332] border border-gray-700 hover:border-gray-600 relative overflow-hidden min-h-[380px] flex flex-col justify-end group hover:transform hover:scale-105 transition-all duration-300">
              <div className="absolute top-0 right-0 w-72 h-72 opacity-80 group-hover:opacity-100 transition-opacity">
                <img
                  src="/category_background.png"
                  alt="NFT Minting"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="relative z-10">
                <Button
                  as={Link}
                  href="/nft-minting"
                  className="w-14 h-14 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 rounded-xl mb-4 flex items-center justify-center transition-all duration-300 transform hover:scale-110"
                >
                  <Shield className="text-white" size={24} />
                </Button>
                <h3 className="text-xl font-bold text-white mb-2">
                  NFT MINTING
                </h3>
                <p className="text-sm text-gray-300">
                  Mint Premium NFTs for Platform Access
                </p>
              </div>
            </div>

            {/* NFT Staking */}
            <div className="p-8 rounded-2xl bg-gradient-to-br from-[#192630] to-[#1a2332] border border-gray-700 hover:border-gray-600 relative overflow-hidden min-h-[380px] flex flex-col justify-end group hover:transform hover:scale-105 transition-all duration-300">
              <div className="absolute top-0 right-0 w-72 h-68 opacity-80 group-hover:opacity-100 transition-opacity">
                <img
                  src="/lorem_ipsum.png"
                  alt="NFT Staking"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="relative z-10">
                <Button
                  as={Link}
                  href="/nft-staking"
                  className="w-14 h-14 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 rounded-xl mb-4 flex items-center justify-center transition-all duration-300 transform hover:scale-110"
                >
                  <Zap className="text-white" size={24} />
                </Button>
                <h3 className="text-xl font-bold text-white mb-2">
                  NFT STAKING
                </h3>
                <p className="text-sm text-gray-300">
                  Stake for 6 Months Free Token Creation
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Ecosystem Overview */}
      <section className="py-20 bg-gradient-to-br from-[#0A151E] to-[#0D1B2A]">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">
              Complete <span className="text-blue-400">NFT Membership</span>{" "}
              Platform
            </h2>
            <p className="text-gray-400 text-lg max-w-3xl mx-auto">
              Mint our exclusive NFTs, stake them for 6 months, and unlock
              unlimited free token creation
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-7xl mx-auto">
            {/* Development */}
            <div className="text-center group">
              <div className="bg-gradient-to-br from-purple-600/20 to-blue-600/20 border border-purple-500/30 rounded-2xl p-8 mb-6 group-hover:from-purple-600/30 group-hover:to-blue-600/30 transition-all duration-300">
                <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Send className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">
                  NFT Membership
                </h3>
                <p className="text-gray-400 text-sm">
                  Mint and stake NFTs for premium platform access
                </p>
              </div>
            </div>

            {/* Trading */}
            <div className="text-center group">
              <div className="bg-gradient-to-br from-green-600/20 to-teal-600/20 border border-green-500/30 rounded-2xl p-8 mb-6 group-hover:from-green-600/30 group-hover:to-teal-600/30 transition-all duration-300">
                <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-teal-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Droplets className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">
                  Token Creation
                </h3>
                <p className="text-gray-400 text-sm">
                  Free unlimited token creation for staked NFT holders
                </p>
              </div>
            </div>

            {/* NFTs */}
            <div className="text-center group">
              <div className="bg-gradient-to-br from-pink-600/20 to-purple-600/20 border border-pink-500/30 rounded-2xl p-8 mb-6 group-hover:from-pink-600/30 group-hover:to-purple-600/30 transition-all duration-300">
                <div className="w-16 h-16 bg-gradient-to-br from-pink-500 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Shield className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">
                  Liquidity Guide
                </h3>
                <p className="text-gray-400 text-sm">
                  Learn manual liquidity addition to Raydium pools
                </p>
              </div>
            </div>

            {/* Community */}
            <div className="text-center group">
              <div className="bg-gradient-to-br from-orange-600/20 to-red-600/20 border border-orange-500/30 rounded-2xl p-8 mb-6 group-hover:from-orange-600/30 group-hover:to-red-600/30 transition-all duration-300">
                <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Community</h3>
                <p className="text-gray-400 text-sm">
                  Connect with builders and innovators
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="py-20 bg-gradient-to-br from-[#0D1B2A] to-[#0A151E]">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">
              Why Choose <span className="text-purple-400">Noottools</span>?
            </h2>
            <p className="text-gray-400 text-lg max-w-3xl mx-auto">
              Our NFT membership model provides exclusive access to premium Web3
              tools and services
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {/* Fast & Secure */}
            <div className="bg-gradient-to-br from-[#192630] to-[#1a2332] border border-gray-700 rounded-2xl p-8 hover:border-blue-500/50 transition-all duration-300 group">
              <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                <Zap className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">
                Free Token Creation
              </h3>
              <p className="text-gray-300 leading-relaxed">
                Stake our NFTs for 6 months and create unlimited tokens on
                Solana completely free. No platform fees, no hidden costs - just
                pure Web3 innovation.
              </p>
            </div>

            {/* User-Friendly */}
            <div className="bg-gradient-to-br from-[#192630] to-[#1a2332] border border-gray-700 rounded-2xl p-8 hover:border-green-500/50 transition-all duration-300 group">
              <div className="w-14 h-14 bg-gradient-to-br from-green-500 to-teal-500 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                <CheckCircle className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">
                Exclusive Membership
              </h3>
              <p className="text-gray-300 leading-relaxed">
                Our NFTs grant exclusive access to premium features. Once
                staked, enjoy 6 months of unlimited token creation and priority
                platform support.
              </p>
            </div>

            {/* Full Support */}
            <div className="bg-gradient-to-br from-[#192630] to-[#1a2332] border border-gray-700 rounded-2xl p-8 hover:border-purple-500/50 transition-all duration-300 group">
              <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                <Users className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">
                One-Time Staking
              </h3>
              <p className="text-gray-300 leading-relaxed">
                Each NFT can only be staked once, making them unique and
                valuable. Stake wisely to maximize your 6-month free access
                period.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Collaborators Section */}
      <section className="py-20 bg-gradient-to-br from-[#0D1B2A] to-[#0A151E]">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-3 bg-gradient-to-r from-blue-600/20 to-purple-600/20 border border-blue-500/30 rounded-2xl px-6 py-3 mb-8">
              <Users className="w-5 h-5 text-blue-400" />
              <span className="text-blue-300 font-semibold">
                Trusted Partners
              </span>
            </div>
            <h2 className="text-4xl font-bold text-white mb-4">
              Our <span className="text-blue-400">Collaborators</span>
            </h2>
            <p className="text-gray-400 text-lg max-w-3xl mx-auto">
              Working with industry leaders and innovative projects to build the
              future of Web3
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-8 max-w-6xl mx-auto">
            {partners.map((partner, index) => (
              <a
                key={index}
                href={partner.link}
                className="group block"
                target="_blank"
                rel="noopener noreferrer"
              >
                <div className="bg-gradient-to-br from-[#192630] to-[#1a2332] border border-gray-700 hover:border-blue-500/50 p-1 rounded-2xl transition-all duration-300 hover:transform hover:scale-105 group-hover:shadow-2xl relative overflow-hidden">
                  {/* Gradient overlay on hover */}
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-purple-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl"></div>

                  <div className="relative z-10">
                    {/* Logo container */}
                    <div className="bg-gradient-to-br from-gray-800/70 to-gray-900/70 backdrop-blur-sm group-hover:from-gray-700/70 group-hover:to-gray-800/70 rounded-xl flex items-center justify-center p-3 transition-all duration-300 relative overflow-hidden aspect-square border border-gray-600/30 group-hover:border-blue-500/30">
                      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                      {/* Semi-transparent overlay for better logo visibility */}
                      <div className="absolute inset-0 bg-gray-800/20 group-hover:bg-gray-700/20 transition-colors duration-300"></div>
                      <img
                        src={
                          partner.logo.startsWith("http")
                            ? partner.logo
                            : `${constants.backend_url}/assets/${partner.logo}`
                        }
                        alt={`Partner ${index + 1}`}
                        className="w-full h-full object-contain rounded-lg group-hover:scale-110 transition-transform duration-300 relative z-10 filter group-hover:brightness-110 drop-shadow-lg"
                        style={{
                          filter:
                            "drop-shadow(0 2px 8px rgba(0,0,0,0.3)) contrast(1.1) brightness(1.05)",
                        }}
                      />
                    </div>

                    {/* External link icon */}
                    <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <ExternalLink className="w-4 h-4 text-blue-400" />
                    </div>
                  </div>
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* Roadmap Section */}
      <section className="py-20 bg-[#0A151E]">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">
              Our <span className="text-blue-400">Roadmap</span>
            </h2>
            <p className="text-gray-400 text-lg max-w-3xl mx-auto">
              Exciting features and improvements coming to Noottools
            </p>
          </div>

          <div className="max-w-4xl mx-auto">
            <div className="space-y-8">
              {[
                {
                  quarter: "Q4 2025",
                  title: "NFT Launch & Staking",
                  description:
                    "Genesis NFT collection mint, one-time staking implementation, and 6-month membership activation",
                  status: "completed",
                  color: "from-purple-500 to-pink-500",
                },
                {
                  quarter: "Q1 2026",
                  title: "Platform Expansion",
                  description:
                    "Enhanced token creation tools, advanced liquidity guides, and community governance features",
                  status: "in-progress",
                  color: "from-blue-500 to-purple-500",
                },
                {
                  quarter: "Q2 2026",
                  title: "Multi-Chain Support",
                  description:
                    "Support for Ethereum, Polygon, and other major blockchain networks with cross-chain NFT utility",
                  status: "upcoming",
                  color: "from-green-500 to-teal-500",
                },
              ].map((item, index) => (
                <div key={index} className="group">
                  {/* Mobile-First Layout - Badge inside card */}
                  <div className="bg-gradient-to-br from-[#192630] to-[#1a2332] border border-gray-700 rounded-2xl p-6 group-hover:border-gray-600 transition-all duration-300">
                    {/* Header with Quarter Badge and Status */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-3">
                      <div
                        className={`inline-block px-4 py-2 rounded-full text-sm font-semibold bg-gradient-to-r ${item.color} text-white w-fit`}
                      >
                        {item.quarter}
                      </div>
                      <div
                        className={`px-3 py-1 rounded-full text-xs font-medium w-fit ${
                          item.status === "completed"
                            ? "bg-green-500/20 text-green-400"
                            : item.status === "in-progress"
                            ? "bg-blue-500/20 text-blue-400"
                            : "bg-purple-500/20 text-purple-400"
                        }`}
                      >
                        {item.status === "completed"
                          ? "✓ Completed"
                          : item.status === "in-progress"
                          ? "🚧 In Progress"
                          : "🚀 Coming Soon"}
                      </div>
                    </div>

                    {/* Title and Description */}
                    <h3 className="text-xl font-bold text-white mb-3">
                      {item.title}
                    </h3>
                    <p className="text-gray-300">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Newsletter Subscription */}
      <section className="py-20 bg-[#0A151E]">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto text-center">
            <div className="bg-gradient-to-br from-[#192630] to-[#1a2332] rounded-3xl p-12 border border-gray-700">
              <h2 className="text-4xl font-bold text-white mb-4">
                Stay Updated with{" "}
                <span className="text-purple-400">Noottools</span>
              </h2>
              <p className="text-gray-400 text-lg mb-8">
                Get the latest updates, feature announcements, and exclusive
                insights delivered straight to your inbox.
              </p>

              {!isSubscribed ? (
                <div className="max-w-md mx-auto">
                  <form onSubmit={handleSubscription}>
                    {/* Desktop Layout */}
                    <div className="hidden sm:flex gap-4 mb-4">
                      <input
                        type="email"
                        value={subscriptionEmail}
                        onChange={(e) => setSubscriptionEmail(e.target.value)}
                        placeholder="Enter your email address"
                        className="flex-1 bg-gray-800/50 border border-gray-600 rounded-xl px-6 py-4 text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 transition-colors"
                        required
                      />
                      <button
                        type="submit"
                        disabled={subscriptionMutation.isPending}
                        className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:from-gray-600 disabled:to-gray-700 text-white px-8 py-4 rounded-xl font-semibold transition-all duration-300 transform hover:scale-105 disabled:scale-100 disabled:cursor-not-allowed"
                      >
                        {subscriptionMutation.isPending ? (
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        ) : (
                          "Subscribe"
                        )}
                      </button>
                    </div>

                    {/* Mobile Layout */}
                    <div className="flex flex-col gap-4 sm:hidden mb-4">
                      <input
                        type="email"
                        value={subscriptionEmail}
                        onChange={(e) => setSubscriptionEmail(e.target.value)}
                        placeholder="Enter your email address"
                        className="w-full bg-gray-800/50 border border-gray-600 rounded-xl px-6 py-4 text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 transition-colors"
                        required
                      />
                      <button
                        type="submit"
                        disabled={subscriptionMutation.isPending}
                        className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:from-gray-600 disabled:to-gray-700 text-white px-8 py-4 rounded-xl font-semibold transition-all duration-300 transform hover:scale-105 disabled:scale-100 disabled:cursor-not-allowed"
                      >
                        {subscriptionMutation.isPending ? (
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        ) : (
                          "Subscribe"
                        )}
                      </button>
                    </div>
                  </form>

                  {/* Error Message */}
                  {subscriptionError && (
                    <div className="flex items-center gap-2 bg-red-500/20 border border-red-500/30 rounded-xl px-4 py-3 text-red-400">
                      <AlertCircle size={20} />
                      <span className="font-medium">{subscriptionError}</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center">
                  <div className="mb-4">
                    <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                      <CheckCircle className="text-green-400" size={32} />
                    </div>
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-2">
                    Thank you for subscribing!
                  </h3>
                  <p className="text-gray-400 mb-4">
                    We'll keep you updated with the latest from Noottools.
                  </p>
                  <div className="bg-green-500/20 border border-green-500/30 rounded-xl px-4 py-3 text-green-400 font-medium">
                    🎉 You're all set! Check your inbox for a confirmation
                    email.
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-br from-[#0A151E] to-[#0D1B2A]">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-4xl font-bold text-white mb-4">
            Ready to Start Building?
          </h2>
          <p className="text-gray-400 text-lg mb-8 max-w-2xl mx-auto">
            Join thousands of developers and creators who are already building
            the future of Web3 with Noottools.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              as={Link}
              href="/create-coin"
              className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white px-8 py-4 rounded-2xl font-semibold transition-all duration-300 transform hover:scale-105"
            >
              Create Your First Token
            </Button>
            <Button
              as={Link}
              href="/contact"
              className="bg-gray-800/50 hover:bg-gray-700/50 text-white px-8 py-4 rounded-2xl font-semibold transition-all duration-300 transform hover:scale-105 border border-gray-600"
            >
              Get in Touch
            </Button>
          </div>
        </div>
      </section>
    </>
  );
};

export default Landing;
