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
    Layers,
    Coins,
} from "lucide-react";
import { Button, Link } from "@heroui/react";
import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import constants from "../constants";

const Landing = () => {
    const { t } = useTranslation();
    const [subscriptionEmail, setSubscriptionEmail] = useState("");
    const [isSubscribed, setIsSubscribed] = useState(false);
    const [subscriptionError, setSubscriptionError] = useState(null);
    const [partners, setPartners] = useState([]);

    // Fetch partners from backend
    useEffect(() => {
        const fetchPartners = async () => {
            try {
                const response = await fetch(
                    `${constants.backend_url}/items/partners`,
                );
                if (response.ok) {
                    const data = await response.json();
                    setPartners(data.data || []);
                } else {
                    console.error(
                        "Failed to fetch partners:",
                        response.statusText,
                    );
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
                },
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
            setSubscriptionError(
                "Failed to subscribe. Please try again later.",
            );
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
        <div className="bg-scanlines min-h-screen grid-bg overflow-x-hidden relative">
            {/* Background Glows */}
            <div className="glow-spot top-[-10%] left-[-10%] bg-purple-600/20" />
            <div className="glow-spot top-[20%] right-[-10%] bg-blue-600/20" />
            <div className="glow-spot bottom-[10%] left-[20%] bg-cyan-600/10" />

            {/* Hero Section */}
            <section className="relative pt-48 pb-32 flex flex-col items-center text-center px-6">
                <div className="container mx-auto max-w-6xl z-10">
                    {/* Badges */}
                    <div className="flex flex-wrap justify-center gap-3 mb-10">
                        <div className="badge-sol">
                            <Shield size={14} /> {t("total_security_control")}
                        </div>
                        <div className="badge-sol border-blue-500/40 bg-blue-500/10 text-blue-400">
                            <Layers size={14} /> {t("branded_metadata")}
                        </div>
                        <div className="badge-sol border-cyan-500/40 bg-cyan-500/10 text-cyan-400">
                            <Zap size={14} /> {t("zero_code_deployment")}
                        </div>
                    </div>

                    <h1 className="text-6xl md:text-8xl font-black mb-6 tracking-tighter leading-[1.1]">
                        <span className="text-sol-gradient block">
                            {t("create_launch_scale")}
                        </span>
                        <span className="text-white block mt-2">
                            {t("in_seconds")}
                        </span>
                    </h1>

                    <p className="text-xl md:text-2xl text-slate-400 max-w-3xl mx-auto font-medium leading-relaxed mb-12">
                        {t("hero_description")}
                    </p>

                    <div className="flex flex-wrap justify-center gap-6">
                        <Button
                            as={Link}
                            href="/create-coin"
                            className="btn-solantify scale-110"
                        >
                            {t("start_building")}
                        </Button>
                    </div>
                </div>
            </section>

            {/* Secondary Headline Section */}
            <section className="py-24 flex flex-col items-center text-center px-6 bg-black/40 border-y border-white/5">
                <div className="container mx-auto max-w-6xl">
                    <h2 className="text-4xl md:text-6xl font-black mb-6 tracking-tight">
                        <span className="text-green-400">
                            {t("the_essential")}
                        </span>{" "}
                        <span className="text-white">
                            {t("solana_meme_coin")}
                        </span>{" "}
                        <span className="text-sol-gradient">
                            {t("launchpad")}
                        </span>
                    </h2>
                    <p className="text-xl text-slate-400 max-w-3xl mx-auto leading-relaxed mb-20">
                        {t("ready_to_go_viral")}
                    </p>

                    {/* Steps Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                        {[
                            {
                                id: 1,
                                title: t("step_1_title"),
                                icon: <Coins size={28} />,
                                desc: t("step_1_desc"),
                            },
                            {
                                id: 2,
                                title: t("step_2_title"),
                                icon: <Layers size={28} />,
                                desc: t("step_2_desc"),
                            },
                            {
                                id: 3,
                                title: t("step_3_title"),
                                icon: <Send size={28} />,
                                desc: t("step_3_desc"),
                            },
                            {
                                id: 4,
                                title: t("step_4_title"),
                                icon: <Shield size={28} />,
                                desc: t("step_4_desc"),
                            },
                        ].map((step) => (
                            <div
                                key={step.id}
                                className="card-neon p-10 rounded-[2.5rem] flex flex-col items-center group relative overflow-hidden"
                            >
                                <div className="absolute top-6 left-6 w-10 h-10 rounded-full bg-green-500 text-black font-black flex items-center justify-center text-lg z-10 shadow-[0_0_15px_rgba(34,197,94,0.5)]">
                                    {step.id}
                                </div>
                                <div className="w-20 h-20 rounded-[2rem] bg-white/5 border border-white/10 flex items-center justify-center mb-8 group-hover:border-purple-500/50 group-hover:bg-purple-500/5 transition-all">
                                    <div className="text-purple-400 group-hover:scale-110 group-hover:text-white transition-all duration-300">
                                        {step.icon}
                                    </div>
                                </div>
                                <h3 className="text-xl font-bold text-white mb-4 text-center">
                                    {step.title}
                                </h3>
                                <p className="text-slate-400 text-center leading-relaxed font-medium">
                                    {step.desc}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Main Tools Section */}
            <section className="py-32 relative overflow-hidden">
                <div className="container mx-auto px-6 max-w-7xl relative z-10">
                    <div className="text-center mb-20">
                        <h2 className="text-5xl md:text-7xl font-black text-white mb-8 tracking-tighter">
                            {t("powerful_tools")}{" "}
                            <span className="text-sol-gradient">
                                {t("web3_builders")}
                            </span>
                        </h2>
                        <p className="text-slate-400 text-2xl max-w-3xl mx-auto leading-relaxed font-medium">
                            {t("tools_description")}
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 gap-12 max-w-6xl mx-auto">
                        {/* Token Creator */}
                        <div className="card-neon p-12 rounded-[3rem] flex flex-col items-center text-center group">
                            <div className="w-24 h-24 rounded-[2.5rem] bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mb-10 group-hover:shadow-[0_0_40px_rgba(217,70,239,0.3)] group-hover:bg-purple-500/20 transition-all">
                                <Coins size={40} className="text-purple-400" />
                            </div>
                            <div className="badge-sol mb-8 px-6 py-2 text-sm uppercase tracking-widest">
                                {t("solana_spl")}
                            </div>
                            <h3 className="text-4xl md:text-5xl font-black text-white mb-8 tracking-tight">
                                {t("token_creator")}
                            </h3>
                            <p className="text-slate-400 mb-12 text-xl leading-relaxed font-medium">
                                Create unlimited custom tokens with our
                                exclusive NFT membership. Stake our NFTs and
                                enjoy 6 months of completely FREE token creation
                                on Solana.
                            </p>
                            <Button
                                as={Link}
                                href="/create-coin"
                                className="btn-solantify w-full py-6 text-2xl"
                            >
                                {t("launch_token")}
                            </Button>
                        </div>

                        {/* Add Liquidity */}
                        <div className="card-neon p-12 rounded-[3rem] flex flex-col items-center text-center group">
                            <div className="w-24 h-24 rounded-[2.5rem] bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center mb-10 group-hover:shadow-[0_0_40px_rgba(6,182,212,0.3)] group-hover:bg-cyan-500/20 transition-all">
                                <Droplets size={40} className="text-cyan-400" />
                            </div>
                            <div className="badge-sol border-cyan-500/40 bg-cyan-500/10 text-cyan-400 mb-8 px-6 py-2 text-sm uppercase tracking-widest">
                                {t("raydium_dex")}
                            </div>
                            <h3 className="text-4xl md:text-5xl font-black text-white mb-8 tracking-tight">
                                {t("add_liquidity")}
                            </h3>
                            <p className="text-slate-400 mb-12 text-xl leading-relaxed font-medium">
                                Learn how to manually add liquidity to Raydium
                                pools. Our comprehensive guide helps you
                                maximize returns on your token investments.
                            </p>
                            <Button
                                as={Link}
                                href="/add-liquidity"
                                className="btn-solantify !from-cyan-500 !to-blue-600 w-full py-6 text-2xl shadow-[0_0_25px_rgba(6,182,212,0.4)]"
                            >
                                {t("add_liquidity")}
                            </Button>
                        </div>
                    </div>
                </div>
            </section>

            {/* Additional Tools */}
            <section className="pb-20" style={{ background: "#080e18" }}>
                <div className="container mx-auto px-6">
                    <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                        {/* NFT Minting */}
                        <div
                            className="p-8 rounded-2xl relative overflow-hidden min-h-[380px] flex flex-col justify-end group transition-all duration-300"
                            style={{
                                background:
                                    "linear-gradient(135deg, #111e2e 0%, #0f1a2a 100%)",
                                border: "1px solid rgba(168,85,247,0.15)",
                            }}
                        >
                            <div
                                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-all duration-300"
                                style={{
                                    background:
                                        "radial-gradient(ellipse at top right, rgba(168,85,247,0.08) 0%, transparent 60%)",
                                    boxShadow:
                                        "inset 0 0 0 1px rgba(168,85,247,0.35)",
                                }}
                            />
                            <div className="absolute top-0 right-0 w-72 h-72 opacity-70 group-hover:opacity-90 transition-opacity">
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
                                    className="w-14 h-14 rounded-2xl mb-4 flex items-center justify-center transition-all duration-300 hover:scale-110"
                                    style={{
                                        background:
                                            "linear-gradient(135deg, #a855f7, #ec4899)",
                                        boxShadow:
                                            "0 0 22px rgba(168,85,247,0.5)",
                                    }}
                                >
                                    <Shield className="text-white" size={24} />
                                </Button>
                                <h3 className="text-xl font-black text-white mb-2">
                                    {t("nft_minting")}
                                </h3>
                                <p className="text-sm text-slate-400">
                                    Mint Premium NFTs for Platform Access
                                </p>
                            </div>
                        </div>

                        {/* NFT Staking */}
                        <div
                            className="p-8 rounded-2xl relative overflow-hidden min-h-[380px] flex flex-col justify-end group transition-all duration-300"
                            style={{
                                background:
                                    "linear-gradient(135deg, #111e2e 0%, #0f1a2a 100%)",
                                border: "1px solid rgba(245,158,11,0.15)",
                            }}
                        >
                            <div
                                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-all duration-300"
                                style={{
                                    background:
                                        "radial-gradient(ellipse at top right, rgba(245,158,11,0.08) 0%, transparent 60%)",
                                    boxShadow:
                                        "inset 0 0 0 1px rgba(245,158,11,0.35)",
                                }}
                            />
                            <div className="absolute top-0 right-0 w-72 h-68 opacity-70 group-hover:opacity-90 transition-opacity">
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
                                    className="w-14 h-14 rounded-2xl mb-4 flex items-center justify-center transition-all duration-300 hover:scale-110"
                                    style={{
                                        background:
                                            "linear-gradient(135deg, #f59e0b, #f97316)",
                                        boxShadow:
                                            "0 0 22px rgba(245,158,11,0.5)",
                                    }}
                                >
                                    <Zap className="text-white" size={24} />
                                </Button>
                                <h3 className="text-xl font-black text-white mb-2">
                                    {t("nft_staking")}
                                </h3>
                                <p className="text-sm text-slate-400">
                                    Stake for 6 Months Free Token Creation
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Ecosystem Overview */}
            <section
                className="py-20 relative overflow-hidden"
                style={{
                    background:
                        "linear-gradient(180deg, #080e18 0%, #0a1220 100%)",
                }}
            >
                <div className="container mx-auto px-6">
                    <div className="text-center mb-16">
                        <h2 className="text-4xl md:text-5xl font-black text-white mb-4">
                            {t("complete_nft_platform")}
                        </h2>
                        <p className="text-slate-400 text-lg max-w-3xl mx-auto">
                            {t("complete_nft_desc")}
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
                        {[
                            {
                                icon: <Send className="w-7 h-7 text-white" />,
                                title: t("membership_title"),
                                desc: t("membership_desc"),
                                grad: "from-purple-600 to-violet-700",
                                glow: "rgba(168,85,247,0.3)",
                                ring: "rgba(168,85,247,0.2)",
                            },
                            {
                                icon: (
                                    <Droplets className="w-7 h-7 text-white" />
                                ),
                                title: t("token_creation"),
                                desc: t("token_creation_desc"),
                                grad: "from-emerald-600 to-teal-700",
                                glow: "rgba(16,185,129,0.3)",
                                ring: "rgba(16,185,129,0.2)",
                            },
                            {
                                icon: <Shield className="w-7 h-7 text-white" />,
                                title: t("add_liquidity"),
                                desc: t("liquidity_guide_desc"),
                                grad: "from-pink-600 to-rose-700",
                                glow: "rgba(236,72,153,0.3)",
                                ring: "rgba(236,72,153,0.2)",
                            },
                            {
                                icon: <Users className="w-7 h-7 text-white" />,
                                title: t("community"),
                                desc: t("community_desc"),
                                grad: "from-orange-600 to-red-700",
                                glow: "rgba(249,115,22,0.3)",
                                ring: "rgba(249,115,22,0.2)",
                            },
                        ].map((item, i) => (
                            <div key={i} className="text-center group">
                                <div
                                    className="rounded-2xl p-8 mb-4 transition-all duration-300"
                                    style={{
                                        background: `rgba(13,24,37,0.8)`,
                                        border: `1px solid ${item.ring}`,
                                        boxShadow: `0 4px 24px rgba(0,0,0,0.3)`,
                                    }}
                                >
                                    <div
                                        className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 transition-all duration-300 group-hover:scale-110"
                                        style={{
                                            background: `linear-gradient(135deg, ${item.grad.replace("from-", "").replace("to-", "")})`,
                                            boxShadow: `0 0 20px ${item.glow}`,
                                        }}
                                    >
                                        {item.icon}
                                    </div>
                                    <h3 className="text-lg font-bold text-white mb-2">
                                        {item.title}
                                    </h3>
                                    <p className="text-slate-400 text-sm">
                                        {item.desc}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Why Choose Us */}
            <section className="py-20" style={{ background: "#0a1220" }}>
                <div className="container mx-auto px-6">
                    <div className="text-center mb-16">
                        <h2 className="text-4xl md:text-5xl font-black text-white mb-4">
                            {t("why_choose_us")}
                        </h2>
                        <p className="text-slate-400 text-lg max-w-3xl mx-auto">
                            {t("why_choose_desc")}
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
                        {[
                            {
                                icon: <Zap className="w-7 h-7 text-white" />,
                                title: t("token_creation"),
                                body: "Stake our NFTs for 6 months and create unlimited tokens on Solana completely free. No platform fees, no hidden costs.",
                                grad: "from-blue-500 to-violet-600",
                                glow: "rgba(139,92,246,0.35)",
                                hover: "rgba(139,92,246,0.35)",
                            },
                            {
                                icon: (
                                    <CheckCircle className="w-7 h-7 text-white" />
                                ),
                                title: t("membership_title"),
                                body: "Our NFTs grant exclusive access to premium features. Once staked, enjoy 6 months of unlimited token creation and priority support.",
                                grad: "from-emerald-500 to-teal-600",
                                glow: "rgba(16,185,129,0.35)",
                                hover: "rgba(16,185,129,0.35)",
                            },
                            {
                                icon: <Users className="w-7 h-7 text-white" />,
                                title: t("one_time_staking"),
                                body: t("one_time_staking_desc"),
                                grad: "from-purple-500 to-pink-600",
                                glow: "rgba(168,85,247,0.35)",
                                hover: "rgba(168,85,247,0.35)",
                            },
                        ].map((item, i) => (
                            <div
                                key={i}
                                className="group rounded-2xl p-8 transition-all duration-300 hover:-translate-y-2"
                                style={{
                                    background:
                                        "linear-gradient(135deg, #111e2e 0%, #0f1a2a 100%)",
                                    border: "1px solid rgba(255,255,255,0.05)",
                                    boxShadow: "0 4px 24px rgba(0,0,0,0.3)",
                                }}
                                onMouseEnter={(e) =>
                                    (e.currentTarget.style.boxShadow = `0 8px 40px ${item.glow}, 0 0 0 1px ${item.hover}`)
                                }
                                onMouseLeave={(e) =>
                                    (e.currentTarget.style.boxShadow =
                                        "0 4px 24px rgba(0,0,0,0.3)")
                                }
                            >
                                <div
                                    className="w-14 h-14 rounded-xl flex items-center justify-center mb-6 transition-all duration-300 group-hover:scale-110"
                                    style={{
                                        background: `linear-gradient(135deg, ${item.grad.replace("from-", "").replace("to-", "")})`,
                                        boxShadow: `0 0 18px ${item.glow}`,
                                    }}
                                >
                                    {item.icon}
                                </div>
                                <h3 className="text-2xl font-black text-white mb-4">
                                    {item.title}
                                </h3>
                                <p className="text-slate-300 leading-relaxed">
                                    {item.body}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Collaborators Section */}
            <section
                className="py-20"
                style={{
                    background:
                        "linear-gradient(180deg, #0a1220 0%, #080e18 100%)",
                }}
            >
                <div className="container mx-auto px-6">
                    <div className="text-center mb-16">
                        <div
                            className="inline-flex items-center gap-3 mb-8 px-5 py-2.5 rounded-2xl"
                            style={{
                                background: "rgba(59,130,246,0.12)",
                                border: "1px solid rgba(59,130,246,0.3)",
                            }}
                        >
                            <Users className="w-5 h-5 text-blue-400" />
                            <span className="text-blue-300 font-semibold text-sm">
                                {t("trusted_partners")}
                            </span>
                        </div>
                        <h2 className="text-4xl md:text-5xl font-black text-white mb-4">
                            {t("trusted_partners")}
                        </h2>
                        <p className="text-slate-400 text-lg max-w-3xl mx-auto">
                            {t("collaborators_desc")}
                        </p>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6 max-w-6xl mx-auto">
                        {partners.map((partner, index) => (
                            <a
                                key={index}
                                href={partner.link}
                                className="group block"
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                <div
                                    className="rounded-2xl p-1 transition-all duration-300 hover:-translate-y-2 relative overflow-hidden"
                                    style={{
                                        background:
                                            "linear-gradient(135deg, #111e2e, #0f1a2a)",
                                        border: "1px solid rgba(59,130,246,0.15)",
                                    }}
                                    onMouseEnter={(e) =>
                                        (e.currentTarget.style.boxShadow =
                                            "0 12px 40px rgba(59,130,246,0.25), 0 0 0 1px rgba(59,130,246,0.4)")
                                    }
                                    onMouseLeave={(e) =>
                                        (e.currentTarget.style.boxShadow =
                                            "none")
                                    }
                                >
                                    <div
                                        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl"
                                        style={{
                                            background:
                                                "radial-gradient(ellipse at center, rgba(59,130,246,0.08), transparent 70%)",
                                        }}
                                    />
                                    <div
                                        className="relative z-10 rounded-xl overflow-hidden aspect-square flex items-center justify-center p-3"
                                        style={{
                                            background: "rgba(6,12,21,0.6)",
                                        }}
                                    >
                                        <img
                                            src={
                                                partner.logo.startsWith("http")
                                                    ? partner.logo
                                                    : `${constants.backend_url}/assets/${partner.logo}`
                                            }
                                            alt={`Partner ${index + 1}`}
                                            className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-300"
                                            style={{
                                                filter: "drop-shadow(0 2px 8px rgba(0,0,0,0.4)) brightness(1.05)",
                                            }}
                                        />
                                    </div>
                                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                        <ExternalLink className="w-3.5 h-3.5 text-blue-400" />
                                    </div>
                                </div>
                            </a>
                        ))}
                    </div>
                </div>
            </section>

            {/* Roadmap Section */}
            <section className="py-20" style={{ background: "#080e18" }}>
                <div className="container mx-auto px-6">
                    <div className="text-center mb-16">
                        <h2 className="text-4xl md:text-5xl font-black text-white mb-4">
                            {t("roadmap")}
                        </h2>
                        <p className="text-slate-400 text-lg max-w-3xl mx-auto">
                            {t("roadmap_desc")}
                        </p>
                    </div>
                    <div className="max-w-4xl mx-auto space-y-6">
                        {[
                            {
                                quarter: "Q4 2025",
                                title: "NFT Launch & Staking",
                                description:
                                    "Genesis NFT collection mint, one-time staking implementation, and 6-month membership activation",
                                status: "completed",
                                grad: "from-purple-500 to-pink-500",
                            },
                            {
                                quarter: "Q1 2026",
                                title: "Platform Expansion",
                                description:
                                    "Enhanced token creation tools, advanced liquidity guides, and community governance features",
                                status: "in-progress",
                                grad: "from-blue-500 to-violet-500",
                            },
                            {
                                quarter: "Q2 2026",
                                title: "Multi-Chain Support",
                                description:
                                    "Support for Ethereum, Polygon, and other major blockchain networks with cross-chain NFT utility",
                                status: "upcoming",
                                grad: "from-emerald-500 to-teal-500",
                            },
                        ].map((item, index) => (
                            <div
                                key={index}
                                className="group rounded-2xl p-6 transition-all duration-300"
                                style={{
                                    background:
                                        "linear-gradient(135deg, #111e2e 0%, #0f1a2a 100%)",
                                    border: "1px solid rgba(255,255,255,0.06)",
                                }}
                            >
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-3">
                                    <div
                                        className={`inline-block px-4 py-2 rounded-full text-sm font-bold bg-gradient-to-r ${item.grad} text-white w-fit shadow-lg`}
                                    >
                                        {item.quarter}
                                    </div>
                                    <div
                                        className={`px-3 py-1 rounded-full text-xs font-semibold w-fit ${item.status === "completed" ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" : item.status === "in-progress" ? "bg-blue-500/20 text-blue-300 border border-blue-500/30" : "bg-purple-500/20 text-purple-300 border border-purple-500/30"}`}
                                    >
                                        {item.status === "completed"
                                            ? "✓ Completed"
                                            : item.status === "in-progress"
                                              ? "🚧 In Progress"
                                              : "🚀 Coming Soon"}
                                    </div>
                                </div>
                                <h3 className="text-xl font-black text-white mb-2">
                                    {item.title}
                                </h3>
                                <p className="text-slate-400">
                                    {item.description}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="container mx-auto px-6">
                    <div className="text-center mb-16">
                        <h2 className="text-4xl font-bold text-white mb-4">
                            {t("roadmap")}
                        </h2>
                        <p className="text-gray-400 text-lg max-w-3xl mx-auto">
                            {t("roadmap_desc")}
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
                                                        : item.status ===
                                                            "in-progress"
                                                          ? "bg-blue-500/20 text-blue-400"
                                                          : "bg-purple-500/20 text-purple-400"
                                                }`}
                                            >
                                                {item.status === "completed"
                                                    ? "✓ Completed"
                                                    : item.status ===
                                                        "in-progress"
                                                      ? "🚧 In Progress"
                                                      : "🚀 Coming Soon"}
                                            </div>
                                        </div>

                                        {/* Title and Description */}
                                        <h3 className="text-xl font-bold text-white mb-3">
                                            {item.title}
                                        </h3>
                                        <p className="text-gray-300">
                                            {item.description}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* Newsletter */}
            <section className="py-20" style={{ background: "#0a1220" }}>
                <div className="container mx-auto px-6">
                    <div className="max-w-4xl mx-auto text-center">
                        <div
                            className="rounded-3xl p-12"
                            style={{
                                background:
                                    "linear-gradient(135deg, #111e2e 0%, #0f1a2a 100%)",
                                border: "1px solid rgba(168,85,247,0.2)",
                                boxShadow:
                                    "0 0 60px rgba(168,85,247,0.08), inset 0 1px 0 rgba(255,255,255,0.04)",
                            }}
                        >
                            <h2 className="text-4xl font-black text-white mb-4">
                                {t("stay_updated")}
                            </h2>
                            <p className="text-slate-400 text-lg mb-8">
                                {t("newsletter_desc")}
                            </p>
                            {!isSubscribed ? (
                                <div className="max-w-md mx-auto">
                                    <form onSubmit={handleSubscription}>
                                        <div className="hidden sm:flex gap-3 mb-4">
                                            <input
                                                type="email"
                                                value={subscriptionEmail}
                                                onChange={(e) =>
                                                    setSubscriptionEmail(
                                                        e.target.value,
                                                    )
                                                }
                                                placeholder={t("enter_email")}
                                                className="flex-1 rounded-xl px-5 py-3.5 text-white placeholder-slate-500 focus:outline-none transition-all"
                                                style={{
                                                    background:
                                                        "rgba(6,12,21,0.8)",
                                                    border: "1px solid rgba(168,85,247,0.25)",
                                                }}
                                                required
                                            />
                                            <button
                                                type="submit"
                                                disabled={
                                                    subscriptionMutation.isPending
                                                }
                                                className="font-semibold text-white px-7 py-3.5 rounded-xl transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:scale-100"
                                                style={{
                                                    background:
                                                        "linear-gradient(135deg, #a855f7, #3b82f6)",
                                                    boxShadow:
                                                        "0 0 20px rgba(168,85,247,0.35)",
                                                }}
                                            >
                                                {subscriptionMutation.isPending ? (
                                                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                                                ) : (
                                                    t("subscribe")
                                                )}
                                            </button>
                                        </div>
                                        <div className="flex flex-col gap-3 sm:hidden mb-4">
                                            <input
                                                type="email"
                                                value={subscriptionEmail}
                                                onChange={(e) =>
                                                    setSubscriptionEmail(
                                                        e.target.value,
                                                    )
                                                }
                                                placeholder={t("enter_email")}
                                                className="w-full rounded-xl px-5 py-3.5 text-white placeholder-slate-500 focus:outline-none"
                                                style={{
                                                    background:
                                                        "rgba(6,12,21,0.8)",
                                                    border: "1px solid rgba(168,85,247,0.25)",
                                                }}
                                                required
                                            />
                                            <button
                                                type="submit"
                                                disabled={
                                                    subscriptionMutation.isPending
                                                }
                                                className="w-full font-semibold text-white px-7 py-3.5 rounded-xl transition-all duration-300 hover:scale-105 disabled:opacity-50"
                                                style={{
                                                    background:
                                                        "linear-gradient(135deg, #a855f7, #3b82f6)",
                                                    boxShadow:
                                                        "0 0 20px rgba(168,85,247,0.35)",
                                                }}
                                            >
                                                {subscriptionMutation.isPending ? (
                                                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mx-auto" />
                                                ) : (
                                                    t("subscribe")
                                                )}
                                            </button>
                                        </div>
                                    </form>
                                    {subscriptionError && (
                                        <div
                                            className="flex items-center gap-2 rounded-xl px-4 py-3 text-red-300"
                                            style={{
                                                background:
                                                    "rgba(239,68,68,0.12)",
                                                border: "1px solid rgba(239,68,68,0.3)",
                                            }}
                                        >
                                            <AlertCircle size={18} />
                                            <span className="font-medium text-sm">
                                                {subscriptionError}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="text-center">
                                    <div
                                        className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
                                        style={{
                                            background: "rgba(16,185,129,0.15)",
                                            border: "1px solid rgba(16,185,129,0.3)",
                                        }}
                                    >
                                        <CheckCircle
                                            className="text-emerald-400"
                                            size={32}
                                        />
                                    </div>
                                    <h3 className="text-2xl font-black text-white mb-2">
                                        {t("successfully_subscribed")}
                                    </h3>
                                    <p className="text-slate-400 mb-4">
                                        {t("thanks_joining")}
                                    </p>
                                    <div
                                        className="rounded-xl px-4 py-3 font-medium"
                                        style={{
                                            background: "rgba(16,185,129,0.12)",
                                            border: "1px solid rgba(16,185,129,0.3)",
                                            color: "#34d399",
                                        }}
                                    >
                                        🎉 You're all set! Check your inbox for
                                        a confirmation email.
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section
                className="py-20 relative overflow-hidden"
                style={{
                    background:
                        "linear-gradient(180deg, #0a1220 0%, #060c15 100%)",
                }}
            >
                <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-64 bg-purple-600/8 rounded-full blur-3xl" />
                </div>
                <div className="container mx-auto px-6 text-center relative z-10">
                    <h2 className="text-4xl md:text-5xl font-black text-white mb-4">
                        {t("ready_to_build")}
                    </h2>
                    <p className="text-slate-400 text-lg mb-10 max-w-2xl mx-auto">
                        {t("newsletter_desc")}
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <Button
                            as={Link}
                            href="/create-coin"
                            className="font-semibold text-white px-9 py-4 rounded-2xl transition-all duration-300 hover:scale-105"
                            style={{
                                background:
                                    "linear-gradient(135deg, #a855f7 0%, #3b82f6 100%)",
                                boxShadow: "0 0 30px rgba(168,85,247,0.4)",
                            }}
                        >
                            {t("token_generation")}
                        </Button>
                        <Button
                            as={Link}
                            href="/contact"
                            className="font-semibold px-9 py-4 rounded-2xl transition-all duration-300 hover:scale-105"
                            style={{
                                background: "rgba(255,255,255,0.05)",
                                border: "1px solid rgba(168,85,247,0.25)",
                                color: "#e2e8f0",
                            }}
                        >
                            {t("contact")}
                        </Button>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default Landing;
