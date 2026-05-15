// vanityWorker.js
// Place this file in your /public folder (e.g. /public/vanityWorker.js)
// It runs in a separate thread — no React/Vite imports allowed here.
// Uses @solana/web3.js loaded via importScripts from a CDN.

importScripts("https://unpkg.com/@solana/web3.js@1.98.0/lib/index.iife.min.js");

const { Keypair } = solanaWeb3;

self.onmessage = ({ data: { suffix, workerId } }) => {
    let attempts = 0;

    while (true) {
        attempts++;
        const kp = Keypair.generate();

        if (kp.publicKey.toBase58().endsWith(suffix)) {
            self.postMessage({
                secretKey: Array.from(kp.secretKey),
                address: kp.publicKey.toBase58(),
                attempts,
                workerId,
            });
            return; // worker stops itself after finding a result
        }

        // Report progress every 5000 attempts so the UI can show a live counter
        if (attempts % 5000 === 0) {
            self.postMessage({ progress: true, attempts, workerId });
        }
    }
};