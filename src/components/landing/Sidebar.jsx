import React, { useState } from "react";
import {
    X,
    Coins,
    Droplets,
    Download,
    Info,
    ChevronDown,
    ChevronUp,
    Palette,
    Phone,
    Gamepad2,
    Recycle,
} from "lucide-react";
import { useTranslation } from "react-i18next";

const ACCENT = {
    purple: {
        bg: "from-purple-500/15 to-violet-500/15",
        border: "border-purple-500/25 hover:border-purple-400/55",
        icon: "text-purple-300",
        glow: "hover:shadow-[0_0_18px_rgba(168,85,247,0.28)]",
    },
    blue: {
        bg: "from-blue-500/15 to-cyan-500/15",
        border: "border-blue-500/25 hover:border-blue-400/55",
        icon: "text-blue-300",
        glow: "hover:shadow-[0_0_18px_rgba(59,130,246,0.28)]",
    },
    cyan: {
        bg: "from-cyan-500/15 to-teal-500/15",
        border: "border-cyan-500/25 hover:border-cyan-400/55",
        icon: "text-cyan-300",
        glow: "hover:shadow-[0_0_18px_rgba(6,182,212,0.28)]",
    },
    pink: {
        bg: "from-pink-500/15 to-rose-500/15",
        border: "border-pink-500/25 hover:border-pink-400/55",
        icon: "text-pink-300",
        glow: "hover:shadow-[0_0_18px_rgba(236,72,153,0.28)]",
    },
    gold: {
        bg: "from-amber-500/15 to-yellow-500/15",
        border: "border-amber-500/25 hover:border-amber-400/55",
        icon: "text-amber-300",
        glow: "hover:shadow-[0_0_18px_rgba(245,158,11,0.28)]",
    },
    green: {
        bg: "from-emerald-500/15 to-teal-500/15",
        border: "border-emerald-500/25 hover:border-emerald-400/55",
        icon: "text-emerald-300",
        glow: "hover:shadow-[0_0_18px_rgba(16,185,129,0.28)]",
    },
};

const NavItem = ({ href, icon, label, accent = "purple" }) => {
    const c = ACCENT[accent] || ACCENT.purple;
    return (
        <a
            href={href}
            className={`group flex items-center space-x-3 bg-gradient-to-r ${c.bg} border ${c.border} ${c.glow} rounded-xl px-4 py-3 transition-all duration-300`}
        >
            <span
                className={`flex-shrink-0 ${c.icon} opacity-80 group-hover:opacity-100 transition-opacity`}
            >
                {icon}
            </span>
            <span className="font-medium text-gray-200 group-hover:text-white transition-colors text-sm">
                {label}
            </span>
        </a>
    );
};

export const Sidebar = ({ isOpen, onClose }) => {
    const { t } = useTranslation();
    const [isInfoExpanded, setIsInfoExpanded] = useState(false);

    return (
        <>
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9998] transition-opacity"
                    onClick={onClose}
                />
            )}

            <div
                className={`fixed top-0 left-0 h-full w-80 z-[9999] transform transition-transform duration-300 ${isOpen ? "translate-x-0" : "-translate-x-full"}`}
                style={{
                    background:
                        "linear-gradient(180deg, #0a1424 0%, #080e18 100%)",
                    borderRight: "1px solid rgba(168,85,247,0.15)",
                    boxShadow:
                        "4px 0 40px rgba(0,0,0,0.6), inset -1px 0 0 rgba(168,85,247,0.08)",
                }}
            >
                {/* Header */}
                <div
                    className="flex items-center justify-between px-6 py-5"
                    style={{ borderBottom: "1px solid rgba(168,85,247,0.12)" }}
                >
                    <button
                        onClick={() => {
                            onClose();
                            window.location.href = "/";
                        }}
                        className="flex items-center space-x-3 hover:opacity-90 transition-opacity cursor-pointer group"
                    >
                        <div className="relative">
                            <div className="absolute inset-0 rounded-full bg-purple-500/25 blur-md group-hover:bg-purple-500/45 transition-all duration-300" />
                            <img
                                src="/logo.jpeg"
                                alt="Noottools Logo"
                                className="relative w-11 h-11 rounded-full ring-1 ring-purple-500/30"
                            />
                        </div>
                        <div>
                            <h2 className="font-bold text-lg bg-gradient-to-r from-purple-300 via-blue-300 to-cyan-300 bg-clip-text text-transparent">
                                Noottools
                            </h2>
                            <p className="text-xs text-purple-400/70">
                                Web3 Platform
                            </p>
                        </div>
                    </button>

                    <button
                        onClick={onClose}
                        className="flex items-center justify-center w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-300 hover:bg-purple-500/25 hover:border-purple-400/50 hover:text-white transition-all duration-300"
                    >
                        <X size={16} />
                    </button>
                </div>

                {/* Section label */}
                <div className="px-6 pt-5 pb-2">
                    <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                        Navigation
                    </p>
                </div>

                {/* Nav */}
                <nav
                    className="px-4 pb-4 space-y-2 overflow-y-auto"
                    style={{ maxHeight: "calc(100vh - 160px)" }}
                >
                    <NavItem
                        href="/create-coin"
                        icon={<Coins size={18} />}
                        label={t("token_generation")}
                        accent="purple"
                    />
                    <NavItem
                        href="/nft-staking"
                        icon={<Coins size={18} />}
                        label={t("stake_nfts")}
                        accent="gold"
                    />
                    <NavItem
                        href="/add-liquidity"
                        icon={<Droplets size={18} />}
                        label={t("add_liquidity")}
                        accent="blue"
                    />
                    <NavItem
                        href="/nft-minting"
                        icon={<Palette size={18} />}
                        label={t("mint_nft")}
                        accent="pink"
                    />
                    <NavItem
                        href="/wallet"
                        icon={<Download size={18} />}
                        label={t("download_wallet")}
                        accent="cyan"
                    />
                    <NavItem
                        href="/noot-token"
                        icon={<Gamepad2 size={18} />}
                        label={t("token_noot")}
                        accent="green"
                    />
                    <NavItem
                        href="/detox"
                        icon={<Recycle size={18} />}
                        label={t("detox_reclaim")}
                        accent="blue"
                    />

                    {/* Information dropdown */}
                    <div className="space-y-1">
                        <button
                            onClick={() => setIsInfoExpanded(!isInfoExpanded)}
                            className="group flex items-center justify-between w-full bg-gradient-to-r from-slate-500/10 to-slate-600/10 border border-slate-600/25 hover:border-slate-400/40 rounded-xl px-4 py-3 transition-all duration-300"
                        >
                            <div className="flex items-center space-x-3">
                                <Info
                                    size={18}
                                    className="text-slate-400 group-hover:text-slate-200 transition-colors"
                                />
                                <span className="font-medium text-gray-300 group-hover:text-white text-sm transition-colors">
                                    {t("information")}
                                </span>
                            </div>
                            {isInfoExpanded ? (
                                <ChevronUp
                                    size={14}
                                    className="text-slate-400"
                                />
                            ) : (
                                <ChevronDown
                                    size={14}
                                    className="text-slate-400"
                                />
                            )}
                        </button>

                        {isInfoExpanded && (
                            <div className="ml-4 space-y-1 border-l-2 border-purple-500/20 pl-3">
                                {[
                                    { href: "/purpose", label: t("purpose") },
                                    { href: "/nfts", label: t("nfts") },
                                    {
                                        href: "/how-we-do-it",
                                        label: t("how_we_do_it"),
                                    },
                                ].map((item) => (
                                    <a
                                        key={item.href}
                                        href={item.href}
                                        className="flex items-center space-x-2 text-gray-400 hover:text-purple-300 hover:bg-purple-500/10 px-3 py-2 rounded-lg transition-all duration-200 text-sm"
                                    >
                                        <span className="w-1.5 h-1.5 rounded-full bg-purple-500/60 flex-shrink-0" />
                                        <span>{item.label}</span>
                                    </a>
                                ))}
                            </div>
                        )}
                    </div>

                    <NavItem
                        href="/contact"
                        icon={<Phone size={18} />}
                        label={t("contact")}
                        accent="cyan"
                    />
                </nav>

                {/* Bottom glow */}
                <div
                    className="absolute bottom-0 left-0 right-0 h-24 pointer-events-none"
                    style={{
                        background:
                            "linear-gradient(0deg, rgba(168,85,247,0.06) 0%, transparent 100%)",
                    }}
                />
            </div>
        </>
    );
};
