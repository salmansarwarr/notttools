import React, { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const languages = [
    { code: "en", name: "English", flag: "🇺🇸" },
    { code: "ru", name: "Русский", flag: "🇷🇺" },
    { code: "es", name: "Español", flag: "🇪🇸" },
    { code: "fr", name: "Français", flag: "🇫🇷" },
    { code: "de", name: "Deutsch", flag: "🇩🇪" },
    { code: "zh", name: "中文", flag: "🇨🇳" },
    { code: "ja", name: "日本語", flag: "🇯🇵" },
    { code: "ar", name: "العربية", flag: "🇸🇦" },
    { code: "pt", name: "Português", flag: "🇵🇹" },
    { code: "it", name: "Italiano", flag: "🇮🇹" },
    { code: "hi", name: "हिन्दी", flag: "🇮🇳" },
    { code: "ko", name: "한국어", flag: "🇰🇷" },
    { code: "id", name: "Bahasa Indonesia", flag: "🇮🇩" },
    { code: "tr", name: "Türkçe", flag: "🇹🇷" },
];

const LanguageSelector = () => {
    const { i18n } = useTranslation();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    const currentLanguage =
        languages.find((lang) => lang.code === i18n.language) || languages[0];

    const toggleDropdown = () => setIsOpen(!isOpen);

    const handleLanguageChange = (code) => {
        i18n.changeLanguage(code);
        setIsOpen(false);
    };

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (
                dropdownRef.current &&
                !dropdownRef.current.contains(event.target)
            ) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () =>
            document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <div className="relative inline-block text-left mr-4" ref={dropdownRef}>
            <div>
                <button
                    onClick={toggleDropdown}
                    className="flex items-center space-x-2 bg-[#0D1B2A]/60 backdrop-blur-md border border-white/10 rounded-xl px-4 py-2 text-white hover:border-cyan-500/50 transition-all duration-300 shadow-[0_0_20px_rgba(0,0,0,0.3)] group"
                >
                    <span className="text-xl group-hover:scale-110 transition-transform duration-200">
                        {currentLanguage.flag}
                    </span>
                    <span className="font-bold text-sm hidden sm:inline  text-[#FF00FF] drop-shadow-[0_0_8px_rgba(255,0,255,0.5)]">
                        {currentLanguage.name}
                    </span>
                    <ChevronDown
                        className={`w-4 h-4 text-cyan-400 transition-transform duration-300 ${
                            isOpen ? "rotate-180" : ""
                        }`}
                    />
                </button>
            </div>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        className="absolute right-0 mt-2 w-64 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] bg-[#0D1B2A]/90 backdrop-blur-xl border border-[#243340] ring-1 ring-white/10 z-50 overflow-hidden"
                    >
                        {/* Neon Accent Line */}
                        <div className="absolute top-0 left-0 w-[2px] h-full bg-gradient-to-b from-cyan-400 via-blue-500 to-purple-600" />

                        <div className="py-2 max-h-[400px] overflow-y-auto custom-scrollbar">
                            {languages.map((lang) => (
                                <button
                                    key={lang.code}
                                    onClick={() =>
                                        handleLanguageChange(lang.code)
                                    }
                                    className={`flex items-center w-full px-6 py-3.5 text-sm transition-all duration-200 group relative ${
                                        i18n.language === lang.code
                                            ? "bg-blue-600/10 text-blue-400"
                                            : "text-gray-400 hover:bg-white/5 hover:text-white"
                                    }`}
                                >
                                    <span className="text-2xl mr-4 group-hover:scale-110 transition-transform duration-200">
                                        {lang.flag}
                                    </span>
                                    <span className="font-semibold tracking-wide">
                                        {lang.name}
                                    </span>
                                    {i18n.language === lang.code && (
                                        <motion.div
                                            layoutId="activeIndicator"
                                            className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-400 shadow-[0_0_12px_#3b82f6]"
                                        />
                                    )}
                                </button>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
            <style jsx>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: #192630;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: #243340;
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: #3b82f6;
                }
            `}</style>
        </div>
    );
};

export default LanguageSelector;
