import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { nodePolyfills } from "vite-plugin-node-polyfills";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    nodePolyfills({
      // Whether to polyfill `node:` protocol imports.
      protocolImports: true,
    }),
  ],
  define: {
    global: "globalThis",
    "process.env.NODE_ENV": '"development"',
    "process.env.BROWSER": '"true"',
    "process.browser": "true",
    __METAPLEX_SOLANA__: true,
  },
  optimizeDeps: {
    include: [
      "buffer",
      "process",
      "util",
      "stream",
      "crypto",
      "@metaplex-foundation/js",
      "@metaplex-foundation/umi",
      "@metaplex-foundation/umi-bundle-defaults",
      "@metaplex-foundation/umi-signer-wallet-adapters",
      "@metaplex-foundation/mpl-candy-machine",
    ],
  },
  build: {
    target: "es2020",
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ["react", "react-dom"],
          solana: [
            "@solana/web3.js",
            "@solana/wallet-adapter-react",
            "@solana/wallet-adapter-react-ui",
          ],
          metaplex: [
            "@metaplex-foundation/js",
            "@metaplex-foundation/umi",
            "@metaplex-foundation/umi-bundle-defaults",
            "@metaplex-foundation/umi-signer-wallet-adapters",
            "@metaplex-foundation/mpl-candy-machine",
          ],
          ui: ["framer-motion", "lucide-react", "@heroui/react"],
          polyfills: ["buffer", "process", "util"],
        },
      },
    },
    chunkSizeWarningLimit: 1000,
  },
});
