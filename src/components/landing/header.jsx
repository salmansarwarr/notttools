import React from "react";
import { Link } from "react-router-dom";
import LanguageSelector from "./LanguageSelector";
import WalletLogin from "../Walletlogin";

export const Header = ({ isHeroInView, onSidebarToggle }) => {
    return (
        <header className="fixed top-0 left-0 right-0 z-[100] px-3 md:px-4 py-3 md:py-4 transition-all duration-500">
            <div
                className={`container mx-auto px-3 md:px-6 py-2 md:py-3 flex justify-between items-center rounded-2xl border transition-all duration-500 ${
                    isHeroInView
                        ? "bg-black/20 backdrop-blur-md border-white/5"
                        : "bg-black/80 backdrop-blur-xl border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.5)]"
                }`}
            >
                {/* Left — Brand */}
                <div className="flex items-center gap-2 md:gap-4">
                    <button
                        onClick={onSidebarToggle}
                        className="p-1.5 md:p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-colors shrink-0"
                    >
                        <svg
                            width="18"
                            height="18"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="text-white"
                        >
                            <line x1="3" y1="12" x2="21" y2="12"></line>
                            <line x1="3" y1="6" x2="21" y2="6"></line>
                            <line x1="3" y1="18" x2="21" y2="18"></line>
                        </svg>
                    </button>

                    <Link to="/" className="flex items-center gap-2 group">
                        <span className="text-xl md:text-2xl font-black tracking-tighter text-white group-hover:opacity-80 transition-opacity">
                            <span className="text-sol-gradient">NOOT</span>TOOLS
                        </span>
                    </Link>
                </div>

                {/* Right — Actions */}
                <div className="flex items-center gap-2 md:gap-3">
                    {/* <div className="hidden md:block">
                        <LanguageSelector />
                    </div> */}
                    <div className="btn-solantify-wrapper">
                        <WalletLogin />
                    </div>
                </div>
            </div>
        </header>
    );
};
