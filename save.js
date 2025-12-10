// extractChartData.js
import { Connection, PublicKey } from "@solana/web3.js";
import pkg from '@coral-xyz/anchor';
const { AnchorProvider, Program, BN } = pkg;
import { existsSync, mkdirSync, writeFileSync } from "fs";
import path from "path";
import fs from 'fs'

// Import your IDL
const bondingCurveIDL = JSON.parse(fs.readFileSync('./bonding_curve.json', "utf8"));

const BONDING_CURVE_PROGRAM_ID = new PublicKey(
    "CPMWvEXzNTnrksm1PPXQzp2UUTXWxCKQaw9HhvDdf3nT"
);

const RPC_URL =
    "https://solana-mainnet.api.syndica.io/api-key/21P91u6oC24BUjduDPBnPEdmPWWz7fmFp3jtMBY52Mgq5j1CE9sjKbUv1TzPZGan2pKeDg289fHqvdP6UK5cAHhyJmuHSLE2qm";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const fetchWithRetry = async (fetchFn, maxRetries = 3, initialDelay = 1000) => {
    let lastError;

    for (let i = 0; i < maxRetries; i++) {
        try {
            return await fetchFn();
        } catch (error) {
            lastError = error;

            if (error?.message?.includes("429") || error?.code === 429) {
                const delay = initialDelay * Math.pow(2, i);
                console.log(`⏳ Rate limited. Waiting ${delay}ms...`);
                await sleep(delay);
            } else {
                throw error;
            }
        }
    }

    throw lastError;
};

const fetchSOLPrice = async () => {
    try {
        const response = await fetch(
            "https://api.jup.ag/price/v3?ids=So11111111111111111111111111111111111111112",
            {
                headers: {
                    "x-api-key": "60012c1b-4bd1-4e6f-a6a3-eb991ed23e95",
                },
            }
        );
        const price = await response.json();
        return price["So11111111111111111111111111111111111111112"].usdPrice;
    } catch (error) {
        console.error("Error fetching SOL price:", error);
        return 186.14; // Fallback price
    }
};

const fetchHistoricalSOLPrices = async (timestamps) => {
    const prices = new Map();

    try {
        if (timestamps.length === 0) return prices;

        const oldestTimestamp = Math.min(...timestamps);
        const newestTimestamp = Math.max(...timestamps);

        console.log("📈 Fetching historical SOL prices from CoinGecko...");

        const response = await fetch(
            `https://api.coingecko.com/api/v3/coins/solana/market_chart/range?vs_currency=usd&from=${Math.floor(
                oldestTimestamp / 1000
            )}&to=${Math.floor(newestTimestamp / 1000)}`
        );

        const data = await response.json();

        if (data.prices) {
            data.prices.forEach(([timestamp, price]) => {
                prices.set(timestamp, price);
            });
            console.log(`✅ Loaded ${prices.size} historical SOL prices`);
        }
    } catch (error) {
        console.error("Error fetching historical SOL prices:", error);
    }

    return prices;
};

const getSOLPriceForTimestamp = (timestamp, historicalPrices, fallbackPrice) => {
    if (historicalPrices.size === 0) return fallbackPrice;

    let closestTimestamp = null;
    let minDiff = Infinity;

    for (const [ts] of historicalPrices) {
        const diff = Math.abs(ts - timestamp);
        if (diff < minDiff) {
            minDiff = diff;
            closestTimestamp = ts;
        }
    }

    return closestTimestamp ? historicalPrices.get(closestTimestamp) : fallbackPrice;
};

const extractChartData = async (mintAddress) => {
    console.log(`\n🚀 Starting data extraction for: ${mintAddress}\n`);

    const connection = new Connection(RPC_URL, "confirmed");
    const provider = new AnchorProvider(connection, {}, {});
    const program = new Program(bondingCurveIDL, provider);

    const mint = new PublicKey(mintAddress);
    const [bondingCurve] = PublicKey.findProgramAddressSync(
        [Buffer.from("bonding_curve"), mint.toBuffer()],
        BONDING_CURVE_PROGRAM_ID
    );

    console.log("📊 Fetching current SOL price...");
    const currentSOLPrice = await fetchSOLPrice();
    console.log(`✅ Current SOL price: $${currentSOLPrice.toFixed(2)}`);

    console.log("\n📊 Fetching bonding curve data...");
    const curveData = await fetchWithRetry(() =>
        program.account.bondingCurve.fetch(bondingCurve)
    );

    // Calculate current price
    const virtualSolReserves = curveData.virtualSolReserves;
    const realSolReserves = curveData.realSolReserves;
    const virtualTokenReserves = curveData.virtualTokenReserves;
    const realTokenReserves = curveData.realTokenReserves;

    const totalSolReserves = virtualSolReserves.add(realSolReserves);
    const totalTokenReserves = virtualTokenReserves.add(realTokenReserves);

    const totalSolReservesNum = parseFloat(totalSolReserves.toString()) / 1e9;
    const totalTokenReservesNum = parseFloat(totalTokenReserves.toString()) / 1e9;
    const realSolNum = parseFloat(realSolReserves.toString()) / 1e9;

    const priceInSol = totalTokenReservesNum > 0 ? totalSolReservesNum / totalTokenReservesNum : 0;
    const currentPrice = priceInSol * currentSOLPrice;

    const totalSupply = parseFloat(curveData.totalSupply.toString()) / 1e9;
    const marketCap = currentPrice * totalSupply;
    const liquidityUSD = realSolNum * currentSOLPrice;

    const bondingCurveInfo = {
        realSolReserves: realSolNum,
        realTokenReserves: parseFloat(realTokenReserves.toString()) / 1e9,
        totalSolReserves: totalSolReservesNum,
        totalTokenReserves: totalTokenReservesNum,
        priceInSol,
        priceInUsd: currentPrice,
        marketCap,
        totalSupply,
        liquidityUSD,
        solPriceUSD: currentSOLPrice,
        isMigrated: curveData.isMigrated,
        progress: (parseFloat(realSolReserves.toString()) / parseFloat(curveData.migrationThreshold.toString())) * 100,
    };

    console.log(`✅ Current token price: $${currentPrice.toFixed(10)}`);
    console.log(`   Market Cap: $${marketCap.toFixed(2)}`);
    console.log(`   Liquidity: $${liquidityUSD.toFixed(2)}`);

    console.log("\n📊 Fetching transaction history...");
    const signatures = await fetchWithRetry(() =>
        connection.getSignaturesForAddress(bondingCurve, { limit: 1000 })
    );

    console.log(`✅ Found ${signatures.length} transactions`);

    if (signatures.length === 0) {
        console.log("⚠️  No transactions found");
        return null;
    }

    const oldestTx = signatures[signatures.length - 1];
    const creationDate = oldestTx.blockTime ? oldestTx.blockTime * 1000 : null;

    // Collect timestamps for historical SOL prices
    const allTimestamps = signatures
        .filter((sig) => sig.blockTime)
        .map((sig) => sig.blockTime * 1000);

    const historicalSOLPrices = await fetchHistoricalSOLPrices(allTimestamps);

    console.log("\n📊 Fetching transaction details...");
    const pricePoints = [];
    const BATCH_SIZE = 5;
    const DELAY_BETWEEN_BATCHES = 500;
    const allTransactions = [];

    for (let i = 0; i < signatures.length; i += BATCH_SIZE) {
        const batch = signatures.slice(i, i + BATCH_SIZE);
        process.stdout.write(`\r   Progress: ${i + batch.length}/${signatures.length}`);

        const txPromises = batch.map(async (sig) => {
            try {
                const tx = await fetchWithRetry(() =>
                    connection.getTransaction(sig.signature, {
                        maxSupportedTransactionVersion: 0,
                        commitment: "confirmed",
                    })
                );
                return tx;
            } catch (error) {
                return null;
            }
        });

        const txs = await Promise.all(txPromises);
        allTransactions.push(...txs.filter((tx) => tx !== null));

        if (i + BATCH_SIZE < signatures.length) {
            await sleep(DELAY_BETWEEN_BATCHES);
        }
    }

    console.log("\n\n📊 Processing transactions...");
    allTransactions.sort((a, b) => a.blockTime - b.blockTime);

    allTransactions.forEach((tx) => {
        if (!tx || !tx.blockTime || !tx.meta) return;

        try {
            const timestamp = tx.blockTime * 1000;
            const solPriceAtTime = getSOLPriceForTimestamp(timestamp, historicalSOLPrices, currentSOLPrice);
            const logMessages = tx.meta.logMessages || [];

            logMessages.forEach((log) => {
                const buyMatch = log.match(/Buy:\s+(\d+)\s+tokens?\s+for\s+(\d+)\s+SOL/i);
                if (buyMatch) {
                    const tokenLamports = parseFloat(buyMatch[1]);
                    const solLamports = parseFloat(buyMatch[2]);
                    const tokenAmount = tokenLamports / 1e9;
                    const solAmount = solLamports / 1e9;

                    if (solAmount > 0 && tokenAmount > 0) {
                        const priceInSol = solAmount / tokenAmount;
                        const priceInUsd = priceInSol * solPriceAtTime;

                        if (isFinite(priceInUsd) && priceInUsd > 0) {
                            pricePoints.push({
                                timestamp,
                                price: priceInUsd,
                                volume: solAmount,
                                type: "buy",
                                solPrice: solPriceAtTime,
                            });
                        }
                    }
                }

                const sellMatch = log.match(/Sell:\s+(\d+)\s+tokens?\s+for\s+(\d+)\s+SOL/i);
                if (sellMatch) {
                    const tokenLamports = parseFloat(sellMatch[1]);
                    const solLamports = parseFloat(sellMatch[2]);
                    const tokenAmount = tokenLamports / 1e9;
                    const solAmount = solLamports / 1e9;

                    if (solAmount > 0 && tokenAmount > 0) {
                        const priceInSol = solAmount / tokenAmount;
                        const priceInUsd = priceInSol * solPriceAtTime;

                        if (isFinite(priceInUsd) && priceInUsd > 0) {
                            pricePoints.push({
                                timestamp,
                                price: priceInUsd,
                                volume: solAmount,
                                type: "sell",
                                solPrice: solPriceAtTime,
                            });
                        }
                    }
                }
            });
        } catch (parseError) {
            console.warn("⚠️  Error parsing transaction:", parseError.message);
        }
    });

    console.log(`\n✅ Extracted ${pricePoints.length} price points`);

    // Add current price point
    pricePoints.push({
        timestamp: Date.now(),
        price: currentPrice,
        volume: 0,
        type: "current",
        solPrice: currentSOLPrice,
    });

    // Generate candles for different timeframes
    const timeframes = ["1s", "5s", "15s", "1m", "5m", "15m", "1h", "4h", "1D"];
    const candlesByTimeframe = {};

    timeframes.forEach((tf) => {
        candlesByTimeframe[tf] = aggregateToCandles(pricePoints, tf);
        console.log(`   ${tf}: ${candlesByTimeframe[tf].length} candles`);
    });

    // Prepare export data
    const exportData = {
        metadata: {
            exportedAt: new Date().toISOString(),
            mintAddress,
            currentSOLPrice,
            creationDate: creationDate ? new Date(creationDate).toISOString() : null,
            totalTransactions: signatures.length,
            totalPricePoints: pricePoints.length,
        },
        bondingCurveInfo,
        priceHistory: pricePoints.map((p) => ({
            timestamp: p.timestamp,
            timestampISO: new Date(p.timestamp).toISOString(),
            price: p.price,
            volume: p.volume,
            type: p.type,
            solPrice: p.solPrice,
        })),
        candles: candlesByTimeframe,
        analysis: {
            priceRange: {
                min: Math.min(...pricePoints.map((p) => p.price)),
                max: Math.max(...pricePoints.map((p) => p.price)),
                current: currentPrice,
            },
            volumeAnalysis: {
                total: pricePoints.reduce((sum, p) => sum + (p.volume || 0), 0),
                buyVolume: pricePoints.filter((p) => p.type === "buy").reduce((sum, p) => sum + (p.volume || 0), 0),
                sellVolume: pricePoints.filter((p) => p.type === "sell").reduce((sum, p) => sum + (p.volume || 0), 0),
                totalTrades: pricePoints.filter((p) => p.volume > 0).length,
            },
            dataTypes: {
                buy: pricePoints.filter((p) => p.type === "buy").length,
                sell: pricePoints.filter((p) => p.type === "sell").length,
                current: pricePoints.filter((p) => p.type === "current").length,
            },
        },
    };

    return exportData;
};

const aggregateToCandles = (data, timeframe) => {
    if (data.length === 0) return [];

    const intervals = {
        "1s": 1000,
        "5s": 5000,
        "15s": 15000,
        "1m": 60000,
        "5m": 300000,
        "15m": 900000,
        "1h": 3600000,
        "4h": 14400000,
        "1D": 86400000,
    };

    const interval = intervals[timeframe];
    const sortedData = [...data].sort((a, b) => a.timestamp - b.timestamp);
    const candleGroups = new Map();

    sortedData.forEach((point) => {
        const candleTime = Math.floor(point.timestamp / interval) * interval;
        if (!candleGroups.has(candleTime)) {
            candleGroups.set(candleTime, []);
        }
        candleGroups.get(candleTime).push(point);
    });

    const candles = [];
    let lastKnownPrice = sortedData[0].price;
    const candleTimes = Array.from(candleGroups.keys()).sort((a, b) => a - b);
    const firstTime = candleTimes[0];
    const lastTime = candleTimes[candleTimes.length - 1];

    for (let time = firstTime; time <= lastTime; time += interval) {
        if (candleGroups.has(time)) {
            const points = candleGroups.get(time);
            points.sort((a, b) => a.timestamp - b.timestamp);

            const candle = {
                timestamp: time,
                timestampISO: new Date(time).toISOString(),
                open: points[0].price,
                high: Math.max(...points.map((p) => p.price)),
                low: Math.min(...points.map((p) => p.price)),
                close: points[points.length - 1].price,
                volume: points.reduce((sum, p) => sum + (p.volume || 0), 0),
                buyVolume: points.filter((p) => p.type === "buy").reduce((sum, p) => sum + (p.volume || 0), 0),
                sellVolume: points.filter((p) => p.type === "sell").reduce((sum, p) => sum + (p.volume || 0), 0),
                hasRealData: true,
            };

            candles.push(candle);
            lastKnownPrice = candle.close;
        } else {
            candles.push({
                timestamp: time,
                timestampISO: new Date(time).toISOString(),
                open: lastKnownPrice,
                high: lastKnownPrice,
                low: lastKnownPrice,
                close: lastKnownPrice,
                volume: 0,
                buyVolume: 0,
                sellVolume: 0,
                hasRealData: false,
            });
        }
    }

    return candles;
};

const saveToFile = (data, mintAddress) => {
    const outputDir = "chart-data";
    if (!existsSync(outputDir)) {
        mkdirSync(outputDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `chart-data-${mintAddress}-${timestamp}.json`;

    writeFileSync(filename, JSON.stringify(data, null, 2));
    console.log(`\n✅ Data saved to: ${filepath}`);

    // Also save CSV for price history
    const csvLines = [
        "Timestamp,ISO Date,Price USD,Volume SOL,Type,SOL Price",
        ...data.priceHistory.map(
            (p) => `${p.timestamp},${p.timestampISO},${p.price},${p.volume},${p.type},${p.solPrice}`
        ),
    ];

    const csvFilename = `price-history-${mintAddress}-${timestamp}.csv`;
    writeFileSync(csvFilename, csvLines.join("\n"));
    console.log(`✅ CSV saved to: ${csvFilename}`);
};

// Main execution
const main = async () => {
    const mintAddress = 'DvcDmgDsq5PBpokrj7pY2XvbiEbhPGYDemPV6X92HYc7';

    if (!mintAddress) {
        console.error("❌ Please provide a mint address as argument");
        console.log("Usage: node extractChartData.js <MINT_ADDRESS>");
        process.exit(1);
    }

    try {
        const data = await extractChartData(mintAddress);
        if (data) {
            saveToFile(data, mintAddress);
            console.log("\n📊 ===== EXTRACTION SUMMARY =====");
            console.log(`Total transactions: ${data.metadata.totalTransactions}`);
            console.log(`Total price points: ${data.metadata.totalPricePoints}`);
            console.log(`Buy transactions: ${data.analysis.dataTypes.buy}`);
            console.log(`Sell transactions: ${data.analysis.dataTypes.sell}`);
            console.log(`Price range: $${data.analysis.priceRange.min.toFixed(10)} - $${data.analysis.priceRange.max.toFixed(10)}`);
            console.log(`Total volume: ${data.analysis.volumeAnalysis.total.toFixed(4)} SOL`);
            console.log("\n✅ Extraction complete!");
        }
    } catch (error) {
        console.error("\n❌ Error during extraction:", error);
        process.exit(1);
    }
};

main();