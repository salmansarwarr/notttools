/**
 * Solana Vanity Address Suffix Benchmark
 * Compares 3-char (NTL) vs 4-char (NTLS) suffix search time
 *
 * Usage: node vanity-benchmark.js
 */

import { randomBytes } from "crypto";

const BASE58 = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
const ADDR_LEN = 44; // typical Solana base58 address length

// Generate a random base58 string (simulates a keypair public key)
function randomBase58(len) {
    const bytes = randomBytes(len);
    let result = "";
    for (let i = 0; i < len; i++) {
        result += BASE58[bytes[i] % 58];
    }
    return result;
}

// Search for a suffix, return { address, attempts, ms }
function findVanitySuffix(suffix, maxAttempts = 50_000_000) {
    const start = Date.now();
    let attempts = 0;

    while (attempts < maxAttempts) {
        attempts++;
        const addr = randomBase58(ADDR_LEN);
        if (addr.endsWith(suffix)) {
            return {
                address: addr,
                attempts,
                ms: Date.now() - start,
            };
        }
    }

    return {
        address: null,
        attempts,
        ms: Date.now() - start,
        timedOut: true,
    };
}

// Run N trials for a given suffix and return stats
function benchmark(suffix, runs = 5) {
    console.log(`\n🔍 Benchmarking suffix: "${suffix}" (${runs} runs)`);
    console.log("─".repeat(50));

    const times = [];
    const attempts = [];

    for (let i = 1; i <= runs; i++) {
        const result = findVanitySuffix(suffix);
        times.push(result.ms);
        attempts.push(result.attempts);

        const flag = result.timedOut ? " ⚠️  timed out" : "";
        console.log(
            `  Run ${i}: ${result.ms.toFixed(0).padStart(6)}ms  |  ${result.attempts
                .toLocaleString()
                .padStart(12)} attempts${flag}`
        );
    }

    const avg = (arr) => arr.reduce((a, b) => a + b, 0) / arr.length;
    const min = (arr) => Math.min(...arr);
    const max = (arr) => Math.max(...arr);

    const avgMs = avg(times);
    const avgAtt = avg(attempts);

    console.log("─".repeat(50));
    console.log(`  Avg time   : ${avgMs.toFixed(0)}ms`);
    console.log(`  Min / Max  : ${min(times).toFixed(0)}ms / ${max(times).toFixed(0)}ms`);
    console.log(`  Avg attempts: ${Math.round(avgAtt).toLocaleString()}`);
    console.log(
        `  Theory (58^${suffix.length}): ${Math.pow(58, suffix.length).toLocaleString()}`
    );

    return { suffix, avgMs, avgAtt };
}

// ─── Main ────────────────────────────────────────────────────────────────────

const RUNS = 5; // increase for more accuracy

console.log("=".repeat(50));
console.log("  Solana Vanity Suffix Benchmark");
console.log("=".repeat(50));
console.log(`  Runs per suffix : ${RUNS}`);
console.log(`  Address length  : ${ADDR_LEN} chars`);
console.log(`  Alphabet size   : 58 (Base58)`);

const r3 = benchmark("NTL", RUNS);
const r4 = benchmark("NTLS", RUNS);

const ratio = r4.avgMs / r3.avgMs;
console.log("\n" + "=".repeat(50));
console.log("  Summary");
console.log("=".repeat(50));
console.log(`  3-char "NTL"  avg: ${r3.avgMs.toFixed(0)}ms`);
console.log(`  4-char "NTLS" avg: ${r4.avgMs.toFixed(0)}ms`);
console.log(`  4-char is ~${ratio.toFixed(1)}x slower (theoretical: 58x)`);
console.log(
    `\n  ✅ Recommendation: use 3-char suffix to save ~${(
        (1 - 1 / ratio) *
        100
    ).toFixed(0)}% of search time`
);
console.log("=".repeat(50));