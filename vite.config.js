import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { nodePolyfills } from "vite-plugin-node-polyfills";
import mysql from 'mysql2/promise';

// https://vite.dev/config/
export default defineConfig({
  server: {
    port: 5173,
  },
  plugins: [
    react(),
    nodePolyfills({
      // Whether to polyfill `node:` protocol imports.
      protocolImports: true,
    }),
    {
      name: 'api-routes',
      configureServer(server) {
        server.middlewares.use(async (req, res, next) => {
          // Only handle /api/get-nft-config route
          if (req.url !== '/api/get-nft-config' || req.method !== 'GET') {
            return next();
          }

          let connection;
          
          try {
            console.log('📥 API Request received for NFT config');

            const dbConfig = {
              host: '31.97.117.202',
              port: 3306,
              database: 'noottools-panel',
              user: 'noottools-panel',
              password: 'noottools-12345-2025',
              connectionTimeout: 30000, // 10 seconds
            };

            connection = await mysql.createConnection(dbConfig);
            
            const [rows] = await connection.execute(
              'SELECT * FROM nft_config WHERE id = 1'
            );
            
            if (rows.length === 0) {
              res.statusCode = 404;
              res.setHeader('Content-Type', 'application/json');
              res.setHeader('Access-Control-Allow-Origin', '*');
              res.end(JSON.stringify({
                success: false,
                error: 'Configuration not found'
              }));
              return;
            }
            
            const config = rows[0];
            
            const responseData = {
              success: true,
              config: {
                minting_fee_sol: parseFloat(config.minting_fee_sol),
                minting_fee_lamports: parseInt(config.minting_fee_lamports),
                max_nfts_per_wallet: parseInt(config.max_nfts_per_wallet),
                staking_duration_months: parseInt(config.staking_duration_months),
                collection_mint: config.collection_mint,
                admin_wallet: config.admin_wallet,
                program_id: config.program_id,
                rpc_endpoint: config.rpc_endpoint,
                is_active: Boolean(config.is_active),
                updated_at: config.updated_at
              }
            };

            console.log('✅ Sending config:', responseData);
            
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.end(JSON.stringify(responseData));
            
          } catch (error) {
            console.error('❌ Database error:', error);
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.end(JSON.stringify({
              success: false,
              error: 'Database error: ' + error.message
            }));
          } finally {
            if (connection) {
              await connection.end();
            }
          }
        });
      },
    },
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
