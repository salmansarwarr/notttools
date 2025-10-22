import React, { useState } from "react";
import {
    X,
    Coins,
    Droplets,
    Download,
    BarChart3,
    Info,
    ChevronDown,
    ChevronUp,
    Palette,
    HelpCircle,
    Phone,
    Gamepad2,
    Recycle,
    ChartBarIncreasingIcon
} from "lucide-react";

export const Sidebar = ({ isOpen, onClose }) => {
    const [isInfoExpanded, setIsInfoExpanded] = useState(false);

    return (
        <>
            {/* Overlay */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-[9998] transition-opacity"
                    onClick={onClose}
                />
            )}

            {/* Sidebar */}
            <div
                className={`fixed top-0 left-0 h-full w-80 bg-slate-800 z-[9999] transform transition-transform duration-300 shadow-2xl ${
                    isOpen ? "translate-x-0" : "-translate-x-full"
                }`}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-6 ">
                    <button
                        onClick={() => {
                            onClose();
                            window.location.href = "/";
                        }}
                        className="flex items-center space-x-3 hover:opacity-80 transition-opacity cursor-pointer"
                    >
                        <img
                            src="/pengu.png"
                            alt="Noottools Logo"
                            className="w-12 h-12 rounded-sm"
                        />
                        <h2 className="text-white text-xl font-bold">
                            Noottools
                        </h2>
                    </button>
                    <button
                        onClick={onClose}
                        className="bg-[#3D5264] p-2 rounded-md hover:text-white transition-colors"
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="20"
                            height="17"
                            viewBox="0 0 20 17"
                            fill="none"
                        >
                            <path
                                fill-rule="evenodd"
                                clip-rule="evenodd"
                                d="M20 15.5833C20 15.9591 19.8495 16.3194 19.5816 16.5851C19.3137 16.8507 18.9503 17 18.5714 17L1.42857 17C1.04971 17 0.686285 16.8507 0.418428 16.5851C0.150572 16.3194 -9.10017e-08 15.9591 -1.23849e-07 15.5833C-1.56696e-07 15.2076 0.150572 14.8473 0.418428 14.5816C0.686285 14.3159 1.04971 14.1667 1.42857 14.1667L18.5714 14.1667C18.9503 14.1667 19.3137 14.3159 19.5816 14.5816C19.8495 14.8473 20 15.2076 20 15.5833ZM20 8.5C20 8.87573 19.8495 9.23606 19.5816 9.50174C19.3137 9.76741 18.9503 9.91667 18.5714 9.91667L10 9.91667C9.62114 9.91667 9.25771 9.76741 8.98986 9.50174C8.722 9.23606 8.57143 8.87573 8.57143 8.5C8.57143 8.1243 8.722 7.7639 8.98986 7.49828C9.25771 7.23265 9.62114 7.08333 10 7.08333L18.5714 7.08333C18.9503 7.08333 19.3137 7.23265 19.5816 7.49828C19.8495 7.7639 20 8.1243 20 8.5ZM20 1.41667C20 1.79237 19.8495 2.15277 19.5816 2.41839C19.3137 2.68402 18.9503 2.83333 18.5714 2.83333L1.42857 2.83334C1.04971 2.83334 0.686284 2.68402 0.418427 2.41839C0.150571 2.15277 -1.32949e-06 1.79237 -1.36234e-06 1.41667C-1.39518e-06 1.04097 0.15057 0.680569 0.418427 0.414943C0.686284 0.149318 1.04971 1.65669e-06 1.42857 1.62357e-06L18.5714 1.2489e-07C18.9503 9.17664e-08 19.3137 0.149317 19.5816 0.414942C19.8495 0.680567 20 1.04097 20 1.41667Z"
                                fill="#A9C6DB"
                            />
                        </svg>
                    </button>
                </div>

                {/* Navigation Menu */}
                <nav className="p-6 space-y-2">
                    <a
                        href="/create-pool"
                        className="flex items-center space-x-3 text-gray-300 hover:text-white hover:bg-slate-700 p-3 rounded-lg transition-colors"
                    >
                        <Droplets size={20} />
                        <span>SMART TOKEN CREATOR</span>
                    </a>

                    <a
                        href="/create-coin"
                        className="flex items-center space-x-3 text-gray-300 hover:text-white hover:bg-slate-700 p-3 rounded-lg transition-colors"
                    >
                        <Coins size={20} />
                        <span>TOKEN GENERATION</span>
                    </a>

                    <a
                        href="/tokens"
                        className="flex items-center space-x-3 text-gray-300 hover:text-white hover:bg-slate-700 p-3 rounded-lg transition-colors"
                    >
                        <ChartBarIncreasingIcon size={20} />
                        <span>NEW PAIRS</span>
                    </a>

                    <a
                        href="/nft-staking"
                        className="flex items-center space-x-3 text-gray-300 hover:text-white hover:bg-slate-700 p-3 rounded-lg transition-colors"
                    >
                        <Coins size={20} />
                        <span>STAKE NFTS</span>
                    </a>

                    <a
                        href="/add-liquidity"
                        className="flex items-center space-x-3 text-gray-300 hover:text-white hover:bg-slate-700 p-3 rounded-lg transition-colors"
                    >
                        <Droplets size={20} />
                        <span>ADD LIQUIDITY</span>
                    </a>

                    <a
                        href="/nft-minting"
                        className="flex items-center space-x-3 text-gray-300 hover:text-white hover:bg-slate-700 p-3 rounded-lg transition-colors"
                    >
                        <Palette size={20} />
                        <span>MINT NFT</span>
                    </a>

                    <a
                        href="/wallet"
                        className="flex items-center space-x-3 text-gray-300 hover:text-white hover:bg-slate-700 p-3 rounded-lg transition-colors"
                    >
                        <Download size={20} />
                        <span>DOWNLOAD WALLET</span>
                    </a>

                    <a
                        href="/noot-token"
                        className="flex items-center space-x-3 text-gray-300 hover:text-white hover:bg-slate-700 p-3 rounded-lg transition-colors"
                    >
                        <Gamepad2 size={20} />
                        <span>TOKEN NOOT</span>
                    </a>

                    <a
                        href="/detox"
                        className="flex items-center space-x-3 text-gray-300 hover:text-white hover:bg-slate-700 p-3 rounded-lg transition-colors"
                    >
                        <Recycle size={20} />
                        <span>DETOX & RECLAIM</span>
                    </a>

                    {/* Information Section with Dropdown */}
                    <div className="space-y-1">
                        <button
                            onClick={() => setIsInfoExpanded(!isInfoExpanded)}
                            className="flex items-center justify-between w-full text-gray-300 hover:text-white hover:bg-slate-700 p-3 rounded-lg transition-colors"
                        >
                            <div className="flex items-center space-x-3">
                                <Info size={20} />
                                <span>INFORMATION</span>
                            </div>
                            {isInfoExpanded ? (
                                <ChevronUp size={16} />
                            ) : (
                                <ChevronDown size={16} />
                            )}
                        </button>

                        {isInfoExpanded && (
                            <div className="ml-6 space-y-1">
                                <a
                                    href="/purpose"
                                    className="flex items-center space-x-3 text-gray-400 hover:text-white hover:bg-slate-700 p-2 rounded-lg transition-colors text-sm"
                                >
                                    <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                                    <span>PURPOSE</span>
                                </a>
                                <a
                                    href="/nfts"
                                    className="flex items-center space-x-3 text-gray-400 hover:text-white hover:bg-slate-700 p-2 rounded-lg transition-colors text-sm"
                                >
                                    <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                                    <span>NFT'S</span>
                                </a>
                                <a
                                    href="/how-we-do-it"
                                    className="flex items-center space-x-3 text-gray-400 hover:text-white hover:bg-slate-700 p-2 rounded-lg transition-colors text-sm"
                                >
                                    <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                                    <span>HOW WE WILL DO IT</span>
                                </a>
                            </div>
                        )}
                    </div>

                    <a
                        href="/contact"
                        className="flex items-center space-x-3 text-gray-300 hover:text-white hover:bg-slate-700 p-3 rounded-lg transition-colors"
                    >
                        <Phone size={20} />
                        <span>CONTACT</span>
                    </a>
                </nav>
            </div>
        </>
    );
};
