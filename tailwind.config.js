// tailwind.config.js
const { heroui } = require("@heroui/react");

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./node_modules/@nextui-org/theme/dist/**/*.{js,ts,jsx,tsx}",
    "./node_modules/@heroui/theme/dist/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        light: "hsl(var(--light))",
        neon: {
          purple: "#a855f7",
          violet: "#8b5cf6",
          blue: "#3b82f6",
          cyan: "#06b6d4",
          pink: "#ec4899",
          gold: "#f59e0b",
          green: "#10b981",
        },
        brand: {
          bg: "#080e18",
          surface: "#0f1824",
          card: "#152030",
          border: "#1e3048",
          muted: "#94a3b8",
        },
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic":
          "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
        "hero-mesh":
          "radial-gradient(ellipse at 20% 50%, rgba(168,85,247,0.15) 0%, transparent 50%), radial-gradient(ellipse at 80% 20%, rgba(6,182,212,0.12) 0%, transparent 50%), radial-gradient(ellipse at 50% 80%, rgba(59,130,246,0.1) 0%, transparent 60%)",
        "card-glow":
          "linear-gradient(135deg, rgba(168,85,247,0.08) 0%, rgba(59,130,246,0.08) 100%)",
      },
      boxShadow: {
        "neon-purple": "0 0 20px rgba(168,85,247,0.4), 0 0 60px rgba(168,85,247,0.15)",
        "neon-blue": "0 0 20px rgba(59,130,246,0.4), 0 0 60px rgba(59,130,246,0.15)",
        "neon-cyan": "0 0 20px rgba(6,182,212,0.4), 0 0 60px rgba(6,182,212,0.15)",
        "glow-sm": "0 2px 20px rgba(168,85,247,0.2)",
        "glass": "0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)",
      },
      animation: {
        "float": "float 6s ease-in-out infinite",
        "glow-pulse": "glowPulse 3s ease-in-out infinite",
        "gradient-shift": "gradientShift 8s ease infinite",
        "slide-up": "slideUp 0.5s ease-out",
        "fade-in": "fadeIn 0.6s ease-out",
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-10px)" },
        },
        glowPulse: {
          "0%, 100%": { boxShadow: "0 0 20px rgba(168,85,247,0.3)" },
          "50%": { boxShadow: "0 0 40px rgba(168,85,247,0.6)" },
        },
        gradientShift: {
          "0%, 100%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
        },
        slideUp: {
          from: { opacity: 0, transform: "translateY(20px)" },
          to: { opacity: 1, transform: "translateY(0)" },
        },
        fadeIn: {
          from: { opacity: 0 },
          to: { opacity: 1 },
        },
      },
      backdropBlur: {
        xs: "2px",
      },
    },
  },
  darkMode: "class",
  plugins: [
    heroui({}),
  ],
};