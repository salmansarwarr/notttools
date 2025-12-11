import React, { useState, useEffect, useRef, useCallback } from "react";
import { Connection, PublicKey } from "@solana/web3.js";
import { AnchorProvider, Program } from "@coral-xyz/anchor";
import { BN } from "@coral-xyz/anchor";
import bondingCurveIDL from "./bonding_curve.json";

/**
 * Professional Trading Chart - GMGN.ai Style
 * - Responsive design for all screen sizes
 * - Touch support for mobile
 * - Improved styling and animations
 * - Proper candlestick rendering
 */
const BondingCurveChart = ({ mintAddress }) => {
    const canvasRef = useRef(null);
    const containerRef = useRef(null);
    const [priceHistory, setPriceHistory] = useState([]);
    const [timeframe, setTimeframe] = useState("5m");
    const [hoveredCandle, setHoveredCandle] = useState(null);
    const [mousePos, setMousePos] = useState(null);
    const [stats, setStats] = useState({
        currentPrice: 0,
        priceChange: 0,
        priceChangePercent: 0,
        high24h: 0,
        low24h: 0,
        volume24h: 0,
        marketCap: 0,
        liquidityUSD: 0,
    });
    const [isLoading, setIsLoading] = useState(true);
    const [loadingError, setLoadingError] = useState(null);
    const [candles, setCandles] = useState([]);
    const [bondingCurveInfo, setBondingCurveInfo] = useState(null);
    const [currentSolPrice, setCurrentSolPrice] = useState(0);
    const [creationDate, setCreationDate] = useState(null);
    const [isMobile, setIsMobile] = useState(false);
    const [chartType, setChartType] = useState("auto"); // "auto", "candles", "line"

    const [viewState, setViewState] = useState({
        zoom: 1,
        offsetX: 0,
        startIndex: 0,
        endIndex: 100,
    });

    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState(null);

    const BONDING_CURVE_PROGRAM_ID = new PublicKey(
        "CPMWvEXzNTnrksm1PPXQzp2UUTXWxCKQaw9HhvDdf3nT"
    );

    const RPC_URL =
        "https://solana-mainnet.api.syndica.io/api-key/21P91u6oC24BUjduDPBnPEdmPWWz7fmFp3jtMBY52Mgq5j1CE9sjKbUv1TzPZGan2pKeDg289fHqvdP6UK5cAHhyJmuHSLE2qm";

    const prevBondingCurveRef = useRef(null);
    const viewStateRef = useRef(viewState);
    const candlesRef = useRef(candles);
    const isDraggingRef = useRef(false);
    const dragStartRef = useRef(null);
    const txCacheRef = useRef(new Map());

    // Detect mobile on mount and resize
    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 768);
        };

        checkMobile();
        window.addEventListener("resize", checkMobile);
        return () => window.removeEventListener("resize", checkMobile);
    }, []);

    useEffect(() => {
        viewStateRef.current = viewState;
    }, [viewState]);

    useEffect(() => {
        candlesRef.current = candles;
    }, [candles]);

    // RATE-LIMIT SAFE: Only update when SOL price actually changes
    useEffect(() => {
        const fetchSolPrice = async () => {
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
                const newSolPrice =
                    price["So11111111111111111111111111111111111111112"]
                        .usdPrice;

                // Only trigger update if SOL changed by more than 0.5%
                if (currentSolPrice > 0 && bondingCurveInfo) {
                    const priceChange =
                        Math.abs(newSolPrice - currentSolPrice) /
                        currentSolPrice;

                    if (priceChange > 0.005) {
                        // 0.5% threshold
                        const newTokenPriceUsd =
                            bondingCurveInfo.priceInSol * newSolPrice;

                        setPriceHistory((prev) => [
                            ...prev.slice(-500),
                            {
                                timestamp: Date.now(),
                                price: newTokenPriceUsd,
                                volume: 0,
                                type: "sol_price_update",
                                solPrice: newSolPrice,
                            },
                        ]);
                    }
                }

                setCurrentSolPrice(newSolPrice);
            } catch (error) {
                console.error("Error fetching SOL price:", error);
            }
        };

        fetchSolPrice();
        // SAFE: Only check every 30 seconds instead of 10
        const interval = setInterval(fetchSolPrice, 30000);
        return () => clearInterval(interval);
    }, [currentSolPrice, bondingCurveInfo]);

    // Add this function to fetch historical SOL prices
    const fetchHistoricalSOLPrices = async (timestamps) => {
        const prices = new Map();

        // Jupiter doesn't provide historical prices, so we'll use Birdeye API
        // You can also use CoinGecko, but they have rate limits

        try {
            // Group timestamps by day to reduce API calls
            const uniqueDays = [
                ...new Set(
                    timestamps.map((ts) => Math.floor(ts / 86400000) * 86400000)
                ),
            ];

            for (const dayTimestamp of uniqueDays) {
                try {
                    const response = await fetch(
                        `https://public-api.birdeye.so/defi/history_price?address=So11111111111111111111111111111111111111112&address_type=token&type=1D&time_from=${Math.floor(
                            dayTimestamp / 1000
                        )}&time_to=${Math.floor(dayTimestamp / 1000) + 86400}`,
                        {
                            headers: {
                                "X-API-KEY": "YOUR_BIRDEYE_API_KEY", // Get free key from birdeye.so
                            },
                        }
                    );

                    const data = await response.json();

                    if (data.success && data.data?.items?.length > 0) {
                        const price = data.data.items[0].value;
                        prices.set(dayTimestamp, price);
                    }

                    await sleep(200); // Rate limit protection
                } catch (err) {
                    console.warn("Failed to fetch historical SOL price:", err);
                }
            }
        } catch (error) {
            console.error("Error fetching historical SOL prices:", error);
        }

        return prices;
    };

    // Alternative: Use a simpler approach with CoinGecko (no API key needed but has rate limits)
    const fetchHistoricalSOLPricesCoinGecko = async (timestamps) => {
        const prices = new Map();

        try {
            const oldestTimestamp = Math.min(...timestamps);
            const newestTimestamp = Math.max(...timestamps);

            // CoinGecko market_chart endpoint
            const response = await fetch(
                `https://api.coingecko.com/api/v3/coins/solana/market_chart/range?vs_currency=usd&from=${Math.floor(
                    oldestTimestamp / 1000
                )}&to=${Math.floor(newestTimestamp / 1000)}`
            );

            const data = await response.json();

            if (data.prices) {
                // CoinGecko returns [timestamp, price] pairs
                data.prices.forEach(([timestamp, price]) => {
                    prices.set(timestamp, price);
                });
            }
        } catch (error) {
            console.error(
                "Error fetching historical SOL prices from CoinGecko:",
                error
            );
        }

        return prices;
    };

    // Helper function to get closest price for a timestamp
    const getSOLPriceForTimestamp = (
        timestamp,
        historicalPrices,
        fallbackPrice
    ) => {
        if (historicalPrices.size === 0) return fallbackPrice;

        // Find the closest historical price
        let closestTimestamp = null;
        let minDiff = Infinity;

        for (const [ts] of historicalPrices) {
            const diff = Math.abs(ts - timestamp);
            if (diff < minDiff) {
                minDiff = diff;
                closestTimestamp = ts;
            }
        }

        return closestTimestamp
            ? historicalPrices.get(closestTimestamp)
            : fallbackPrice;
    };

    const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

    const fetchWithRetry = async (
        connection,
        fetchFn,
        maxRetries = 3,
        initialDelay = 1000
    ) => {
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

    // Replace the polling approach with WebSocket subscription
    useEffect(() => {
        if (!mintAddress) return;

        const connection = new Connection(RPC_URL, "confirmed");
        let accountSubscriptionId = null;
        let priceUpdateTimeout = null;
        let isMounted = true;

        const fetchBondingCurveData = async () => {
            try {
                setLoadingError(null);

                const provider = new AnchorProvider(connection, {}, {});
                const program = new Program(bondingCurveIDL, provider);

                const mint = new PublicKey(mintAddress);
                const [bondingCurve] = PublicKey.findProgramAddressSync(
                    [Buffer.from("bonding_curve"), mint.toBuffer()],
                    BONDING_CURVE_PROGRAM_ID
                );

                console.log("📊 Fetching bonding curve data...");

                const curveData = await fetchWithRetry(connection, () =>
                    program.account.bondingCurve.fetch(bondingCurve)
                );

                if (!isMounted) return;

                // Calculate initial price...
                const virtualSolReserves = curveData.virtualSolReserves;
                const realSolReserves = curveData.realSolReserves;
                const virtualTokenReserves = curveData.virtualTokenReserves;
                const realTokenReserves = curveData.realTokenReserves;

                const totalSolReserves =
                    virtualSolReserves.add(realSolReserves);
                const totalTokenReserves =
                    virtualTokenReserves.add(realTokenReserves);

                const totalSolReservesNum =
                    parseFloat(totalSolReserves.toString()) / 1e9;
                const totalTokenReservesNum =
                    parseFloat(totalTokenReserves.toString()) / 1e9;

                const priceInSol =
                    totalTokenReservesNum > 0
                        ? totalSolReservesNum / totalTokenReservesNum
                        : 0;

                const SOL_TO_USD =
                    currentSolPrice > 0 ? currentSolPrice : 186.14;
                const priceInUsd = priceInSol * SOL_TO_USD;

                const totalSupply =
                    parseFloat(curveData.totalSupply.toString()) / 1e9;
                const marketCap = priceInUsd * totalSupply;

                const realSolNum = parseFloat(realSolReserves.toString()) / 1e9;
                const liquidityUSD = realSolNum * SOL_TO_USD;

                if (!isMounted) return;

                const bondingCurveData = {
                    realSolReserves: realSolNum,
                    realTokenReserves:
                        parseFloat(realTokenReserves.toString()) / 1e9,
                    totalSolReserves: totalSolReservesNum,
                    totalTokenReserves: totalTokenReservesNum,
                    priceInSol,
                    priceInUsd,
                    marketCap,
                    totalSupply,
                    liquidityUSD,
                    solPriceUSD: SOL_TO_USD,
                    isMigrated: curveData.isMigrated,
                    progress:
                        (parseFloat(realSolReserves.toString()) /
                            parseFloat(
                                curveData.migrationThreshold.toString()
                            )) *
                        100,
                };

                setBondingCurveInfo(bondingCurveData);
                prevBondingCurveRef.current = bondingCurveData;

                console.log("📈 Current price:", priceInUsd);

                await fetchTransactionHistory(
                    connection,
                    bondingCurve,
                    priceInUsd,
                    SOL_TO_USD,
                    bondingCurveData
                );

                if (!isMounted) return;

                setIsLoading(false);
                console.log("✅ Data loaded successfully");

                // ===== RATE-LIMIT SAFE: WebSocket Subscription =====
                // This uses only 1 connection and gets updates automatically
                if (!bondingCurveData.isMigrated) {
                    accountSubscriptionId = connection.onAccountChange(
                        bondingCurve,
                        async (accountInfo) => {
                            if (!isMounted) return;

                            try {
                                const newCurveData =
                                    program.coder.accounts.decode(
                                        "BondingCurve",
                                        accountInfo.data
                                    );

                                const newVirtualSol = new BN(
                                    newCurveData.virtualSolReserves.toString()
                                );
                                const newRealSol = new BN(
                                    newCurveData.realSolReserves.toString()
                                );
                                const newVirtualToken = new BN(
                                    newCurveData.virtualTokenReserves.toString()
                                );
                                const newRealToken = new BN(
                                    newCurveData.realTokenReserves.toString()
                                );

                                const newTotalSol =
                                    newVirtualSol.add(newRealSol);
                                const newTotalToken =
                                    newVirtualToken.add(newRealToken);

                                const newTotalSolNum =
                                    parseFloat(newTotalSol.toString()) / 1e9;
                                const newTotalTokenNum =
                                    parseFloat(newTotalToken.toString()) / 1e9;
                                const newRealSolNum =
                                    parseFloat(newRealSol.toString()) / 1e9;

                                const currentSOLPrice =
                                    currentSolPrice > 0
                                        ? currentSolPrice
                                        : SOL_TO_USD;

                                const newPriceInSol =
                                    newTotalTokenNum > 0
                                        ? newTotalSolNum / newTotalTokenNum
                                        : 0;
                                const newPrice =
                                    newPriceInSol * currentSOLPrice;
                                const newLiquidityUSD =
                                    newRealSolNum * currentSOLPrice;

                                const prevRealSol =
                                    prevBondingCurveRef.current
                                        ?.realSolReserves || 0;
                                const solDiff = Math.abs(
                                    newRealSolNum - prevRealSol
                                );

                                // Only add price point if there was actual trading activity
                                if (solDiff > 0.0001) {
                                    const tradeType =
                                        newRealSolNum > prevRealSol
                                            ? "buy"
                                            : "sell";

                                    setPriceHistory((prev) => {
                                        const newPoint = {
                                            timestamp: Date.now(),
                                            price: newPrice,
                                            volume: solDiff,
                                            type: tradeType,
                                            solPrice: currentSOLPrice,
                                            liquidityUSD: newLiquidityUSD,
                                        };
                                        return [...prev.slice(-500), newPoint];
                                    });
                                }

                                const updatedInfo = {
                                    realSolReserves: newRealSolNum,
                                    realTokenReserves:
                                        parseFloat(newRealToken.toString()) /
                                        1e9,
                                    totalSolReserves: newTotalSolNum,
                                    totalTokenReserves: newTotalTokenNum,
                                    priceInSol: newPriceInSol,
                                    priceInUsd: newPrice,
                                    marketCap:
                                        newPrice * bondingCurveData.totalSupply,
                                    totalSupply: bondingCurveData.totalSupply,
                                    liquidityUSD: newLiquidityUSD,
                                    solPriceUSD: currentSOLPrice,
                                    isMigrated: newCurveData.isMigrated,
                                    progress: bondingCurveData.progress,
                                };

                                setBondingCurveInfo(updatedInfo);
                                prevBondingCurveRef.current = updatedInfo;
                            } catch (updateError) {
                                console.error(
                                    "Error processing update:",
                                    updateError
                                );
                            }
                        },
                        "confirmed"
                    );
                }
            } catch (error) {
                console.error("❌ Error fetching bonding curve data:", error);
                if (isMounted) {
                    setIsLoading(false);
                    setLoadingError(
                        error.message || "Failed to load chart data"
                    );
                }
            }
        };

        fetchBondingCurveData();

        return () => {
            isMounted = false;
            if (accountSubscriptionId) {
                connection
                    .removeAccountChangeListener(accountSubscriptionId)
                    .catch(() => {});
            }
            if (priceUpdateTimeout) {
                clearTimeout(priceUpdateTimeout);
            }
        };
    }, [mintAddress, currentSolPrice]);

    const fetchTransactionHistory = async (
        connection,
        bondingCurve,
        currentPrice,
        initialSOLPrice,
        bondingCurveData
    ) => {
        try {
            console.log("📊 Fetching transaction history...");

            const signatures = await fetchWithRetry(connection, () =>
                connection.getSignaturesForAddress(bondingCurve, { limit: 200 })
            );

            console.log(`Found ${signatures.length} transactions`);

            if (signatures.length === 0) {
                const now = Date.now();
                setPriceHistory([
                    {
                        timestamp: now - 3600000,
                        price: currentPrice,
                        volume: 0,
                        type: "init",
                        solPrice: initialSOLPrice,
                    },
                    {
                        timestamp: now,
                        price: currentPrice,
                        volume: 0,
                        type: "current",
                        solPrice: initialSOLPrice,
                    },
                ]);
                setCreationDate(now - 3600000);
                return;
            }

            const oldestTx = signatures[signatures.length - 1];
            if (oldestTx.blockTime) {
                setCreationDate(oldestTx.blockTime * 1000);
            }

            // NEW: Collect all timestamps first
            const allTimestamps = signatures
                .filter((sig) => sig.blockTime)
                .map((sig) => sig.blockTime * 1000);

            // NEW: Fetch historical SOL prices
            console.log("📈 Fetching historical SOL prices...");
            const historicalSOLPrices = await fetchHistoricalSOLPricesCoinGecko(
                allTimestamps
            );
            console.log(
                `✅ Loaded ${historicalSOLPrices.size} historical SOL prices`
            );

            const pricePoints = [];
            const BATCH_SIZE = 5;
            const DELAY_BETWEEN_BATCHES = 500;
            const allTransactions = [];

            for (let i = 0; i < signatures.length; i += BATCH_SIZE) {
                const batch = signatures.slice(i, i + BATCH_SIZE);

                const txPromises = batch.map(async (sig) => {
                    if (txCacheRef.current.has(sig.signature)) {
                        return txCacheRef.current.get(sig.signature);
                    }

                    try {
                        const tx = await fetchWithRetry(connection, () =>
                            connection.getTransaction(sig.signature, {
                                maxSupportedTransactionVersion: 0,
                                commitment: "confirmed",
                            })
                        );

                        if (tx) {
                            txCacheRef.current.set(sig.signature, tx);
                        }

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

            allTransactions.sort((a, b) => a.blockTime - b.blockTime);

            allTransactions.forEach((tx, txIndex) => {
                if (!tx || !tx.blockTime || !tx.meta) return;

                try {
                    const timestamp = tx.blockTime * 1000;
                    const logMessages = tx.meta.logMessages || [];

                    logMessages.forEach((log) => {
                        const buyMatch = log.match(
                            /Buy:\s+(\d+)\s+tokens?\s+for\s+(\d+)\s+SOL/i
                        );
                        if (buyMatch) {
                            const tokenLamports = parseFloat(buyMatch[1]);
                            const solLamports = parseFloat(buyMatch[2]);

                            const tokenAmount = tokenLamports / 1e9;
                            const solAmount = solLamports / 1e9;

                            if (solAmount > 0 && tokenAmount > 0) {
                                const priceInSol = solAmount / tokenAmount;
                                const priceInUsd = priceInSol * initialSOLPrice;

                                if (isFinite(priceInUsd) && priceInUsd > 0) {
                                    console.log(
                                        `✅ BUY: ${tokenAmount.toFixed(
                                            2
                                        )} tokens for ${solAmount.toFixed(
                                            9
                                        )} SOL (${solLamports} lamports) = $${priceInUsd.toFixed(
                                            10
                                        )}`
                                    );

                                    pricePoints.push({
                                        timestamp: timestamp,
                                        price: priceInUsd,
                                        volume: solAmount,
                                        type: "buy",
                                        solPrice: initialSOLPrice,
                                    });
                                }
                            }
                        }

                        const sellMatch = log.match(
                            /Sell:\s+(\d+)\s+tokens?\s+for\s+(\d+)\s+SOL/i
                        );
                        if (sellMatch) {
                            const tokenLamports = parseFloat(sellMatch[1]);
                            const solLamports = parseFloat(sellMatch[2]);

                            const tokenAmount = tokenLamports / 1e9;
                            const solAmount = solLamports / 1e9;

                            if (solAmount > 0 && tokenAmount > 0) {
                                const priceInSol = solAmount / tokenAmount;
                                const priceInUsd = priceInSol * initialSOLPrice;

                                if (isFinite(priceInUsd) && priceInUsd > 0) {
                                    console.log(
                                        `✅ SELL: ${tokenAmount.toFixed(
                                            2
                                        )} tokens for ${solAmount.toFixed(
                                            9
                                        )} SOL (${solLamports} lamports) = $${priceInUsd.toFixed(
                                            10
                                        )} | Price per token: ${priceInSol.toFixed(
                                            12
                                        )} SOL`
                                    );

                                    pricePoints.push({
                                        timestamp: timestamp,
                                        price: priceInUsd,
                                        volume: solAmount,
                                        type: "sell",
                                        solPrice: initialSOLPrice,
                                    });
                                }
                            }
                        }
                    });
                } catch (parseError) {
                    console.warn(
                        "Error parsing transaction:",
                        parseError.message
                    );
                }
            });

            if (pricePoints.length > 0) {
                console.log("\n📈 Sample price points:");
                console.table(
                    pricePoints.slice(0, 10).map((p) => ({
                        time: new Date(p.timestamp).toLocaleString(),
                        type: p.type,
                        price: p.price.toFixed(10),
                        volume: p.volume.toFixed(9),
                        solPrice: p.solPrice,
                    }))
                );

                console.log("\n💰 Price range:");
                const prices = pricePoints.map((p) => p.price);
                console.log(`Min: $${Math.min(...prices).toFixed(10)}`);
                console.log(`Max: $${Math.max(...prices).toFixed(10)}`);
            }

            // NEW: Add interpolated points for SOL price changes between trades
            const interpolatedPoints = [];
            for (let i = 0; i < pricePoints.length - 1; i++) {
                const current = pricePoints[i];
                const next = pricePoints[i + 1];

                interpolatedPoints.push(current);

                // If there's a significant time gap and SOL price changed
                const timeDiff = next.timestamp - current.timestamp;
                const solPriceChange =
                    Math.abs(next.solPrice - current.solPrice) /
                    current.solPrice;

                if (timeDiff > 300000 && solPriceChange > 0.02) {
                    // 5 min gap and >2% SOL change
                    // Add intermediate points for SOL price changes
                    const numPoints = Math.min(
                        5,
                        Math.floor(timeDiff / 300000)
                    );

                    for (let j = 1; j <= numPoints; j++) {
                        const ratio = j / (numPoints + 1);
                        const interpTimestamp =
                            current.timestamp + timeDiff * ratio;
                        const interpSOLPrice =
                            current.solPrice +
                            (next.solPrice - current.solPrice) * ratio;

                        // Assume token's SOL price stayed constant, recalculate USD price
                        const tokenPriceInSOL =
                            current.price / current.solPrice;
                        const interpUSDPrice = tokenPriceInSOL * interpSOLPrice;

                        interpolatedPoints.push({
                            timestamp: interpTimestamp,
                            price: interpUSDPrice,
                            volume: 0,
                            type: "sol_update",
                            solPrice: interpSOLPrice,
                        });
                    }
                }
            }

            if (pricePoints.length > 0) {
                interpolatedPoints.push(pricePoints[pricePoints.length - 1]);
            }

            // Add current point
            interpolatedPoints.push({
                timestamp: Date.now(),
                price: currentPrice,
                volume: 0,
                type: "current",
                solPrice: initialSOLPrice,
            });

            const validPricePoints = interpolatedPoints.filter(
                (p) => p.price > 0 && isFinite(p.price) && p.timestamp > 0
            );

            if (validPricePoints.length > 0) {
                console.log(
                    `✅ Loaded ${validPricePoints.length} price points (including SOL price interpolations)`
                );
                setPriceHistory(validPricePoints);
            } else {
                const now = Date.now();
                setPriceHistory([
                    {
                        timestamp: now - 3600000,
                        price: currentPrice,
                        volume: 0,
                        type: "init",
                        solPrice: initialSOLPrice,
                    },
                    {
                        timestamp: now,
                        price: currentPrice,
                        volume: 0,
                        type: "current",
                        solPrice: initialSOLPrice,
                    },
                ]);
            }

            // Add this at the END of fetchTransactionHistory - NO ADDITIONAL RPC CALLS
            const fillHistoricalGaps = (
                pricePoints,
                currentPrice,
                currentSOLPrice
            ) => {
                if (pricePoints.length === 0) {
                    // No data at all - create minimal synthetic history
                    const now = Date.now();
                    return [
                        {
                            timestamp: now - 3600000,
                            price: currentPrice,
                            volume: 0,
                            type: "synthetic",
                            solPrice: currentSOLPrice,
                        },
                        {
                            timestamp: now,
                            price: currentPrice,
                            volume: 0,
                            type: "current",
                            solPrice: currentSOLPrice,
                        },
                    ];
                }

                const filled = [];
                const MAX_GAP = 300000; // 5 minutes

                for (let i = 0; i < pricePoints.length - 1; i++) {
                    filled.push(pricePoints[i]);

                    const current = pricePoints[i];
                    const next = pricePoints[i + 1];
                    const gap = next.timestamp - current.timestamp;

                    // Fill gaps larger than 5 minutes
                    if (gap > MAX_GAP) {
                        const numPoints = Math.min(
                            10,
                            Math.floor(gap / MAX_GAP)
                        ); // Max 10 points per gap

                        for (let j = 1; j <= numPoints; j++) {
                            const ratio = j / (numPoints + 1);
                            filled.push({
                                timestamp: current.timestamp + gap * ratio,
                                price: current.price, // Keep price flat during no-trade periods
                                volume: 0,
                                type: "interpolated",
                                solPrice: current.solPrice,
                            });
                        }
                    }
                }

                filled.push(pricePoints[pricePoints.length - 1]);
                return filled;
            };

            // Use this at the end of fetchTransactionHistory
            const filledPricePoints = fillHistoricalGaps(
                validPricePoints,
                currentPrice,
                initialSOLPrice
            );
            setPriceHistory(filledPricePoints);

            // Add after setPriceHistory in fetchTransactionHistory
            console.log("📊 First 20 price points:");
            console.table(
                priceHistory.slice(0, 20).map((p) => ({
                    time: new Date(p.timestamp).toLocaleTimeString(),
                    price: p.price.toFixed(10),
                    type: p.type,
                    volume: p.volume.toFixed(6),
                }))
            );

            console.log("📊 Last 20 price points:");
            console.table(
                priceHistory.slice(-20).map((p) => ({
                    time: new Date(p.timestamp).toLocaleTimeString(),
                    price: p.price.toFixed(10),
                    type: p.type,
                    volume: p.volume.toFixed(6),
                }))
            );
        } catch (error) {
            console.error("❌ Error fetching transaction history:", error);
            const now = Date.now();
            setPriceHistory([
                {
                    timestamp: now - 3600000,
                    price: currentPrice,
                    volume: 0,
                    type: "init",
                    solPrice: initialSOLPrice,
                },
                {
                    timestamp: now,
                    price: currentPrice,
                    volume: 0,
                    type: "current",
                    solPrice: initialSOLPrice,
                },
            ]);
        }
    };

    useEffect(() => {
        if (priceHistory.length === 0 || !bondingCurveInfo) return;

        const now = Date.now();
        const oneDayAgo = now - 24 * 60 * 60 * 1000;
        const recentData = priceHistory.filter((p) => p.timestamp >= oneDayAgo);

        const current = priceHistory[priceHistory.length - 1];
        const oldest = recentData[0] || current;

        const priceChange = current.price - oldest.price;
        const priceChangePercent =
            oldest.price > 0 ? (priceChange / oldest.price) * 100 : 0;

        const high24h =
            recentData.length > 0
                ? Math.max(...recentData.map((p) => p.price))
                : current.price;

        const low24h =
            recentData.length > 0
                ? Math.min(...recentData.map((p) => p.price))
                : current.price;

        const volume24h = recentData.reduce(
            (sum, p) => sum + (p.volume || 0),
            0
        );

        setStats({
            currentPrice: bondingCurveInfo.priceInUsd,
            priceChange,
            priceChangePercent,
            high24h,
            low24h,
            volume24h,
            marketCap: bondingCurveInfo.marketCap,
            liquidityUSD: bondingCurveInfo.liquidityUSD,
        });
    }, [priceHistory, bondingCurveInfo]);

    const generateSyntheticCandles = (
        bondingCurveData,
        timeframe,
        creationTime
    ) => {
        if (!bondingCurveData) return [];

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
        const now = Date.now();
        const startTime = creationTime || now - 3600000;

        const candles = [];
        const currentPrice = bondingCurveData.priceInUsd;

        for (
            let time = Math.floor(startTime / interval) * interval;
            time <= now;
            time += interval
        ) {
            candles.push({
                timestamp: time,
                open: currentPrice,
                high: currentPrice,
                low: currentPrice,
                close: currentPrice,
                volume: 0,
                buyVolume: 0,
                sellVolume: 0,
                hasRealData: false,
                synthetic: true,
            });
        }

        return candles;
    };

    useEffect(() => {
        let finalCandles = [];

        if (priceHistory.length === 0 || priceHistory.length < 2) {
            if (bondingCurveInfo) {
                console.log(
                    "📊 Generating synthetic candles for low-volume token"
                );
                finalCandles = generateSyntheticCandles(
                    bondingCurveInfo,
                    timeframe,
                    creationDate || Date.now() - 3600000
                );
            }
        } else {
            finalCandles = aggregateToCandles(priceHistory, timeframe);
        }

        if (finalCandles.length > 0) {
            setCandles(finalCandles);
            setViewState({
                zoom: 1,
                offsetX: 0,
                startIndex: Math.max(
                    0,
                    finalCandles.length - (isMobile ? 50 : 100)
                ),
                endIndex: finalCandles.length,
            });
        }
    }, [priceHistory, timeframe, isMobile, bondingCurveInfo, creationDate]);

    // Add this helper function to generate continuous candles
    const generateContinuousCandles = (data, tf) => {
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

        const interval = intervals[tf];

        // Sort data by timestamp
        const sortedData = [...data].sort((a, b) => a.timestamp - b.timestamp);

        const firstTimestamp = sortedData[0].timestamp;
        const lastTimestamp = sortedData[sortedData.length - 1].timestamp;

        // Calculate all possible candle timestamps
        const startCandle = Math.floor(firstTimestamp / interval) * interval;
        const endCandle = Math.floor(lastTimestamp / interval) * interval;

        const candleMap = new Map();

        // Initialize all candles with the previous close price
        let currentPrice = sortedData[0].price;

        for (let time = startCandle; time <= endCandle; time += interval) {
            candleMap.set(time, {
                timestamp: time,
                open: currentPrice,
                high: currentPrice,
                low: currentPrice,
                close: currentPrice,
                volume: 0,
                buyVolume: 0,
                sellVolume: 0,
                hasRealData: false,
            });
        }

        // Fill in actual trade data
        sortedData.forEach((point) => {
            const candleTime =
                Math.floor(point.timestamp / interval) * interval;
            const candle = candleMap.get(candleTime);

            if (candle) {
                if (!candle.hasRealData) {
                    // First data point for this candle
                    candle.open = point.price;
                    candle.high = point.price;
                    candle.low = point.price;
                    candle.close = point.price;
                    candle.hasRealData = true;
                } else {
                    // Update candle with new data
                    candle.high = Math.max(candle.high, point.price);
                    candle.low = Math.min(candle.low, point.price);
                    candle.close = point.price; // Last price in the interval
                }

                candle.volume += point.volume || 0;

                if (point.type === "buy") {
                    candle.buyVolume += point.volume || 0;
                } else if (point.type === "sell") {
                    candle.sellVolume += point.volume || 0;
                }
            }
        });

        // Convert map to array and forward-fill prices for empty candles
        const result = [];
        let lastClose = sortedData[0].price;

        for (let time = startCandle; time <= endCandle; time += interval) {
            const candle = candleMap.get(time);

            if (candle.hasRealData) {
                lastClose = candle.close;
                result.push(candle);
            } else {
                // Empty candle - use last close price for all OHLC
                result.push({
                    timestamp: time,
                    open: lastClose,
                    high: lastClose,
                    low: lastClose,
                    close: lastClose,
                    volume: 0,
                    buyVolume: 0,
                    sellVolume: 0,
                    hasRealData: false,
                });
            }
        }

        return result;
    };

    // REPLACE your aggregateToCandles function with this improved version
    const aggregateToCandles = (data, tf) => {
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

        const interval = intervals[tf];

        // Sort data by timestamp
        const sortedData = [...data].sort((a, b) => a.timestamp - b.timestamp);

        console.log(
            "🔍 Aggregating candles from data points:",
            sortedData.length
        );

        // Group data points by candle time
        const candleGroups = new Map();

        sortedData.forEach((point) => {
            const candleTime =
                Math.floor(point.timestamp / interval) * interval;

            if (!candleGroups.has(candleTime)) {
                candleGroups.set(candleTime, []);
            }
            candleGroups.get(candleTime).push(point);
        });

        console.log("📊 Candle groups created:", candleGroups.size);

        // Create candles from groups
        const candles = [];
        let lastKnownPrice = sortedData[0].price;

        // Get all candle times and sort them
        const candleTimes = Array.from(candleGroups.keys()).sort(
            (a, b) => a - b
        );

        // Fill in gaps between candles
        const firstTime = candleTimes[0];
        const lastTime = candleTimes[candleTimes.length - 1];

        for (let time = firstTime; time <= lastTime; time += interval) {
            if (candleGroups.has(time)) {
                // This candle has real data
                const points = candleGroups.get(time);
                points.sort((a, b) => a.timestamp - b.timestamp);

                const candle = {
                    timestamp: time,
                    open: points[0].price,
                    high: Math.max(...points.map((p) => p.price)),
                    low: Math.min(...points.map((p) => p.price)),
                    close: points[points.length - 1].price,
                    volume: points.reduce((sum, p) => sum + (p.volume || 0), 0),
                    buyVolume: points
                        .filter((p) => p.type === "buy")
                        .reduce((sum, p) => sum + (p.volume || 0), 0),
                    sellVolume: points
                        .filter((p) => p.type === "sell")
                        .reduce((sum, p) => sum + (p.volume || 0), 0),
                    hasRealData: true,
                };

                candles.push(candle);
                lastKnownPrice = candle.close;
            } else {
                // No data for this candle - use last known price
                candles.push({
                    timestamp: time,
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

        console.log("✅ Total candles created:", candles.length);
        console.log(
            "📊 Candles with real data:",
            candles.filter((c) => c.hasRealData).length
        );

        return candles;
    };

    // Add this effect to create synthetic price points for better continuity
    useEffect(() => {
        if (priceHistory.length < 2 || !bondingCurveInfo) return;

        const now = Date.now();
        const lastPoint = priceHistory[priceHistory.length - 1];
        const timeSinceLastUpdate = now - lastPoint.timestamp;

        // If more than 1 minute since last update, add a current price point
        if (timeSinceLastUpdate > 60000) {
            const currentPriceUSD = bondingCurveInfo.priceInUsd;

            setPriceHistory((prev) => {
                const needsUpdate =
                    prev[prev.length - 1].timestamp < now - 60000;
                if (!needsUpdate) return prev;

                return [
                    ...prev.slice(-500),
                    {
                        timestamp: now,
                        price: currentPriceUSD,
                        volume: 0,
                        type: "heartbeat",
                        solPrice: currentSolPrice,
                    },
                ];
            });
        }

        // Set up interval to add price points every minute
        const interval = setInterval(() => {
            if (!bondingCurveInfo) return;

            setPriceHistory((prev) => [
                ...prev.slice(-500),
                {
                    timestamp: Date.now(),
                    price: bondingCurveInfo.priceInUsd,
                    volume: 0,
                    type: "heartbeat",
                    solPrice: currentSolPrice,
                },
            ]);
        }, 60000); // Every minute

        return () => clearInterval(interval);
    }, [priceHistory, bondingCurveInfo, currentSolPrice]);

    // Touch support for mobile
    const handleTouchStart = (e) => {
        if (!canvasRef.current) return;
        const touch = e.touches[0];
        const rect = canvasRef.current.getBoundingClientRect();
        isDraggingRef.current = true;
        dragStartRef.current = {
            x: touch.clientX - rect.left,
            y: touch.clientY - rect.top,
        };
        setIsDragging(true);
        setDragStart({
            x: touch.clientX - rect.left,
            y: touch.clientY - rect.top,
        });
    };

    const handleTouchMove = (e) => {
        if (!canvasRef.current) return;
        const touch = e.touches[0];
        const rect = canvasRef.current.getBoundingClientRect();
        const x = touch.clientX - rect.left;
        const y = touch.clientY - rect.top;

        setMousePos({ x, y });

        if (isDraggingRef.current && dragStartRef.current) {
            e.preventDefault();
            const dx = x - dragStartRef.current.x;
            const chartWidth = rect.width - (isMobile ? 60 : 80);
            const currentView = viewStateRef.current;
            const candlesPerPixel =
                (currentView.endIndex - currentView.startIndex) / chartWidth;
            const candleShift = Math.round(dx * candlesPerPixel * 1.5);

            const newStart = Math.max(0, currentView.startIndex - candleShift);
            const newEnd = Math.min(
                candlesRef.current.length,
                currentView.endIndex - candleShift
            );

            if (newEnd - newStart > 10 && newStart !== currentView.startIndex) {
                setViewState({
                    zoom: currentView.zoom,
                    offsetX: currentView.offsetX,
                    startIndex: newStart,
                    endIndex: newEnd,
                });
            }

            dragStartRef.current = { x, y };
            setDragStart({ x, y });
        }

        if (candlesRef.current.length > 0) {
            const currentView = viewStateRef.current;
            const visibleCandles = candlesRef.current.slice(
                currentView.startIndex,
                currentView.endIndex
            );
            const chartWidth = rect.width - (isMobile ? 60 : 80);
            const candleSpacing = chartWidth / visibleCandles.length;
            const chartX = x - (isMobile ? 30 : 40);
            const candleIndex = Math.floor(chartX / candleSpacing);

            if (candleIndex >= 0 && candleIndex < visibleCandles.length) {
                setHoveredCandle(visibleCandles[candleIndex]);
            } else {
                setHoveredCandle(null);
            }
        }
    };

    const handleTouchEnd = () => {
        isDraggingRef.current = false;
        dragStartRef.current = null;
        setIsDragging(false);
        setDragStart(null);
    };

    const handleMouseDown = (e) => {
        if (!canvasRef.current) return;
        e.preventDefault();
        const rect = canvasRef.current.getBoundingClientRect();
        isDraggingRef.current = true;
        dragStartRef.current = {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
        };
        setIsDragging(true);
        setDragStart({ x: e.clientX - rect.left, y: e.clientY - rect.top });
        canvasRef.current.style.cursor = "grabbing";
    };

    const handleMouseMove = (e) => {
        if (!canvasRef.current) return;
        const rect = canvasRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        setMousePos({ x, y });

        if (isDraggingRef.current && dragStartRef.current) {
            const dx = x - dragStartRef.current.x;
            const chartWidth = rect.width - 80;
            const currentView = viewStateRef.current;
            const candlesPerPixel =
                (currentView.endIndex - currentView.startIndex) / chartWidth;
            const candleShift = Math.round(dx * candlesPerPixel * 1.5);

            const newStart = Math.max(0, currentView.startIndex - candleShift);
            const newEnd = Math.min(
                candlesRef.current.length,
                currentView.endIndex - candleShift
            );

            if (newEnd - newStart > 10 && newStart !== currentView.startIndex) {
                setViewState({
                    zoom: currentView.zoom,
                    offsetX: currentView.offsetX,
                    startIndex: newStart,
                    endIndex: newEnd,
                });
            }

            dragStartRef.current = { x, y };
            setDragStart({ x, y });
        } else if (canvasRef.current) {
            canvasRef.current.style.cursor = "crosshair";
        }

        if (candlesRef.current.length > 0) {
            const currentView = viewStateRef.current;
            const visibleCandles = candlesRef.current.slice(
                currentView.startIndex,
                currentView.endIndex
            );
            const chartWidth = rect.width - 80;
            const candleSpacing = chartWidth / visibleCandles.length;
            const chartX = x - 40;
            const candleIndex = Math.floor(chartX / candleSpacing);

            if (candleIndex >= 0 && candleIndex < visibleCandles.length) {
                setHoveredCandle(visibleCandles[candleIndex]);
            } else {
                setHoveredCandle(null);
            }
        }
    };

    const handleMouseUp = () => {
        isDraggingRef.current = false;
        dragStartRef.current = null;
        setIsDragging(false);
        setDragStart(null);
        if (canvasRef.current) canvasRef.current.style.cursor = "crosshair";
    };

    const handleMouseLeave = () => {
        isDraggingRef.current = false;
        dragStartRef.current = null;
        setIsDragging(false);
        setDragStart(null);
        setMousePos(null);
        setHoveredCandle(null);
        if (canvasRef.current) canvasRef.current.style.cursor = "crosshair";
    };

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const handleWheel = (e) => {
            e.preventDefault();
            e.stopPropagation();

            if (candlesRef.current.length === 0) return;

            const rect = canvas.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const chartWidth = rect.width - (isMobile ? 60 : 80);
            const mouseRatio = Math.max(
                0,
                Math.min(1, (mouseX - (isMobile ? 30 : 40)) / chartWidth)
            );

            const delta = e.deltaY > 0 ? 1.15 : 0.87;
            const currentView = viewStateRef.current;
            const currentRange = currentView.endIndex - currentView.startIndex;
            const newRange = Math.max(
                10,
                Math.min(
                    candlesRef.current.length,
                    Math.round(currentRange * delta)
                )
            );

            const mouseCandleIndex =
                currentView.startIndex + Math.floor(currentRange * mouseRatio);
            const leftRange = Math.floor(newRange * mouseRatio);
            const rightRange = newRange - leftRange;

            let newStart = mouseCandleIndex - leftRange;
            let newEnd = mouseCandleIndex + rightRange;

            if (newStart < 0) {
                newStart = 0;
                newEnd = newRange;
            }
            if (newEnd > candlesRef.current.length) {
                newEnd = candlesRef.current.length;
                newStart = Math.max(0, candlesRef.current.length - newRange);
            }
            setViewState({
                zoom: currentView.zoom * delta,
                offsetX: currentView.offsetX,
                startIndex: Math.max(0, newStart),
                endIndex: Math.min(candlesRef.current.length, newEnd),
            });
        };

        canvas.addEventListener("wheel", handleWheel, { passive: false });
        return () => canvas.removeEventListener("wheel", handleWheel);
    }, [isMobile]);

    const resetView = () => {
        setViewState({
            zoom: 1,
            offsetX: 0,
            startIndex: Math.max(0, candles.length - (isMobile ? 50 : 100)),
            endIndex: candles.length,
        });
    };

    // Add these state variables at the top with your other useState declarations
    const [visibleTimeLabels, setVisibleTimeLabels] = useState([]);

    // Add this helper function to format timestamps
    const formatTimestamp = (timestamp, timeframe) => {
        const date = new Date(timestamp);

        if (timeframe === "1D") {
            return date.toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
            });
        } else if (timeframe === "4h" || timeframe === "1h") {
            return date.toLocaleTimeString("en-US", {
                hour: "2-digit",
                minute: "2-digit",
                hour12: false,
            });
        } else {
            return date.toLocaleTimeString("en-US", {
                hour: "2-digit",
                minute: "2-digit",
                hour12: false,
            });
        }
    };

    // Replace the entire canvas drawing useEffect with this updated version:
    useEffect(() => {
        if (!canvasRef.current || candles.length === 0) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");
        const dpr = window.devicePixelRatio || 1;

        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        ctx.scale(dpr, dpr);

        const width = rect.width;
        const height = rect.height;

        // Responsive padding - INCREASED BOTTOM PADDING for timestamps
        const padding = isMobile
            ? { top: 15, right: 55, bottom: 45, left: 5 } // Increased from 30 to 45
            : { top: 20, right: 70, bottom: 50, left: 10 }; // Increased from 40 to 50

        const chartHeight = height - padding.top - padding.bottom;
        const chartWidth = width - padding.left - padding.right;

        // Background with gradient
        const gradient = ctx.createLinearGradient(0, 0, 0, height);
        gradient.addColorStop(0, "#0a0a0a");
        gradient.addColorStop(1, "#000000");
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);

        const visibleCandles = candles.slice(
            viewState.startIndex,
            viewState.endIndex
        );
        if (visibleCandles.length === 0) return;

        // Calculate price range
        const prices = visibleCandles.flatMap((c) => [c.high, c.low]);
        const minPrice = Math.min(...prices);
        const maxPrice = Math.max(...prices);
        let priceRange = maxPrice - minPrice;

        if (priceRange === 0 || !isFinite(priceRange)) {
            priceRange = maxPrice * 0.1;
        }

        const paddingPercent = priceRange * 0.15;
        const adjustedMin = minPrice - paddingPercent;
        const adjustedMax = maxPrice + paddingPercent;
        const adjustedRange = adjustedMax - adjustedMin;

        const priceToY = (price) => {
            return (
                padding.top +
                chartHeight -
                ((price - adjustedMin) / adjustedRange) * chartHeight
            );
        };

        // Draw horizontal grid lines
        ctx.strokeStyle = "#1a1a1a";
        ctx.lineWidth = 1;
        const gridLines = isMobile ? 4 : 5;

        for (let i = 0; i <= gridLines; i++) {
            const y = padding.top + (chartHeight / gridLines) * i;
            ctx.beginPath();
            ctx.moveTo(padding.left, y);
            ctx.lineTo(padding.left + chartWidth, y);
            ctx.stroke();
        }

        // Draw price labels
        ctx.fillStyle = "#666";
        ctx.font = isMobile ? "9px monospace" : "10px monospace";
        ctx.textAlign = "left";

        for (let i = 0; i <= gridLines; i++) {
            const ratio = 1 - i / gridLines;
            const price = adjustedMin + adjustedRange * ratio;
            const y = padding.top + (chartHeight / gridLines) * i;
            ctx.fillText(
                formatPrice(price),
                padding.left + chartWidth + (isMobile ? 3 : 5),
                y + 3
            );
        }

        // 🔥 DRAW TIMESTAMP LABELS AT BOTTOM (GMGN Style)
        const totalCandleSpace = chartWidth / visibleCandles.length;
        const minLabelSpacing = isMobile ? 80 : 100; // Minimum pixels between labels
        const maxLabels = Math.floor(chartWidth / minLabelSpacing);
        const labelInterval = Math.max(
            1,
            Math.floor(visibleCandles.length / maxLabels)
        );

        ctx.fillStyle = "#666";
        ctx.font = isMobile ? "9px monospace" : "10px monospace";
        ctx.textAlign = "center";

        const timeLabels = [];

        visibleCandles.forEach((candle, i) => {
            if (i % labelInterval === 0 || i === visibleCandles.length - 1) {
                const x = padding.left + (i + 0.5) * totalCandleSpace;
                const labelY = height - padding.bottom + 20;

                // Draw vertical line from chart to label
                ctx.strokeStyle = "#1a1a1a";
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(x, padding.top + chartHeight);
                ctx.lineTo(x, labelY - 8);
                ctx.stroke();

                // Draw timestamp label
                const timeLabel = formatTimestamp(candle.timestamp, timeframe);
                ctx.fillStyle = "#888";
                ctx.fillText(timeLabel, x, labelY);

                timeLabels.push({
                    x,
                    label: timeLabel,
                    timestamp: candle.timestamp,
                });
            }
        });

        setVisibleTimeLabels(timeLabels);

        // Draw horizontal line at bottom of chart (GMGN style)
        ctx.strokeStyle = "#333";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(padding.left, padding.top + chartHeight);
        ctx.lineTo(padding.left + chartWidth, padding.top + chartHeight);
        ctx.stroke();

        // 🔥 GMGN.AI STYLE: Determine if we should show line or candles
        const hasSignificantTrades = visibleCandles.filter(
            (c) => c.hasRealData && c.volume > 0
        ).length;
        const totalVolume = visibleCandles.reduce(
            (sum, c) => sum + c.volume,
            0
        );
        const shouldShowLine =
            chartType === "line" ||
            (chartType === "auto" &&
                (hasSignificantTrades < 3 || totalVolume < 0.01));

        if (shouldShowLine) {
            // 🎨 GMGN.AI LINE CHART STYLE
            // Create smooth line path
            ctx.beginPath();
            ctx.strokeStyle = "#8b7bff";
            ctx.lineWidth = isMobile ? 2 : 2.5;
            ctx.lineJoin = "round";
            ctx.lineCap = "round";

            visibleCandles.forEach((candle, i) => {
                const x = padding.left + (i + 0.5) * totalCandleSpace;
                const y = priceToY(candle.close);

                if (i === 0) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }
            });

            // Add glow effect
            ctx.shadowColor = "#8b7bff";
            ctx.shadowBlur = isMobile ? 6 : 8;
            ctx.stroke();
            ctx.shadowBlur = 0;

            // Draw gradient fill under line (GMGN.ai style)
            ctx.beginPath();
            ctx.moveTo(
                padding.left + 0.5 * totalCandleSpace,
                priceToY(visibleCandles[0].close)
            );

            visibleCandles.forEach((candle, i) => {
                const x = padding.left + (i + 0.5) * totalCandleSpace;
                const y = priceToY(candle.close);
                ctx.lineTo(x, y);
            });

            // Complete the fill area
            ctx.lineTo(
                padding.left + (visibleCandles.length - 0.5) * totalCandleSpace,
                padding.top + chartHeight
            );
            ctx.lineTo(
                padding.left + 0.5 * totalCandleSpace,
                padding.top + chartHeight
            );
            ctx.closePath();

            const fillGradient = ctx.createLinearGradient(
                0,
                padding.top,
                0,
                padding.top + chartHeight
            );
            fillGradient.addColorStop(0, "rgba(139, 123, 255, 0.2)");
            fillGradient.addColorStop(1, "rgba(139, 123, 255, 0)");
            ctx.fillStyle = fillGradient;
            ctx.fill();

            // Draw data points
            visibleCandles.forEach((candle, i) => {
                if (candle.hasRealData || candle.volume > 0) {
                    const x = padding.left + (i + 0.5) * totalCandleSpace;
                    const y = priceToY(candle.close);

                    // Outer glow circle
                    ctx.beginPath();
                    ctx.arc(x, y, isMobile ? 4 : 5, 0, Math.PI * 2);
                    ctx.fillStyle = "rgba(139, 123, 255, 0.3)";
                    ctx.fill();

                    // Inner circle
                    ctx.beginPath();
                    ctx.arc(x, y, isMobile ? 2.5 : 3, 0, Math.PI * 2);
                    ctx.fillStyle = "#8b7bff";
                    ctx.fill();
                }
            });
        } else {
            // 🕯️ TRADITIONAL CANDLES (for high-volume tokens)
            const maxCandleWidth = isMobile ? 12 : 20;
            const candleWidth = Math.max(
                2,
                Math.min(totalCandleSpace * 0.7, maxCandleWidth)
            );
            const wickWidth = Math.max(1, candleWidth * 0.15);

            visibleCandles.forEach((candle, i) => {
                const centerX = padding.left + (i + 0.5) * totalCandleSpace;

                const openY = priceToY(candle.open);
                const closeY = priceToY(candle.close);
                const highY = priceToY(candle.high);
                const lowY = priceToY(candle.low);

                const isGreen = candle.close >= candle.open;
                const color = isGreen ? "#00c087" : "#ff4976";

                // Draw wick
                ctx.strokeStyle = color;
                ctx.lineWidth = wickWidth;
                ctx.beginPath();
                ctx.moveTo(centerX, highY);
                ctx.lineTo(centerX, lowY);
                ctx.stroke();

                // Draw body
                const bodyTop = Math.min(openY, closeY);
                const bodyHeight = Math.max(1, Math.abs(closeY - openY));

                ctx.fillStyle = color;
                ctx.fillRect(
                    centerX - candleWidth / 2,
                    bodyTop,
                    candleWidth,
                    bodyHeight
                );
            });
        }

        // Current price line (always show)
        if (
            stats.currentPrice > 0 &&
            stats.currentPrice >= adjustedMin &&
            stats.currentPrice <= adjustedMax
        ) {
            const currentY = priceToY(stats.currentPrice);

            ctx.shadowColor = "#8b7bff";
            ctx.shadowBlur = isMobile ? 8 : 10;

            ctx.strokeStyle = "#8b7bff";
            ctx.setLineDash([5, 3]);
            ctx.lineWidth = isMobile ? 1 : 1.5;
            ctx.beginPath();
            ctx.moveTo(padding.left, currentY);
            ctx.lineTo(padding.left + chartWidth, currentY);
            ctx.stroke();
            ctx.setLineDash([]);

            ctx.shadowBlur = 0;

            // Price label
            ctx.fillStyle = "#8b7bff";
            const priceText = formatPrice(stats.currentPrice);
            ctx.font = isMobile ? "bold 9px monospace" : "bold 10px monospace";
            const textWidth = ctx.measureText(priceText).width;
            const labelPadding = isMobile ? 4 : 6;
            const labelX = padding.left + chartWidth + (isMobile ? 2 : 3);

            ctx.fillRect(labelX, currentY - 8, textWidth + labelPadding, 16);
            ctx.fillStyle = "#000";
            ctx.textAlign = "left";
            ctx.fillText(priceText, labelX + labelPadding / 2, currentY + 3);
        }

        // Crosshair and tooltip
        if (mousePos && hoveredCandle && (!isMobile || width > 600)) {
            const candleIndex = visibleCandles.indexOf(hoveredCandle);
            if (candleIndex >= 0) {
                const x = padding.left + (candleIndex + 0.5) * totalCandleSpace;

                // Crosshair lines
                ctx.strokeStyle = "rgba(139, 123, 255, 0.3)";
                ctx.setLineDash([3, 3]);
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(x, padding.top);
                ctx.lineTo(x, padding.top + chartHeight);
                ctx.stroke();

                ctx.beginPath();
                ctx.moveTo(padding.left, mousePos.y);
                ctx.lineTo(padding.left + chartWidth, mousePos.y);
                ctx.stroke();
                ctx.setLineDash([]);

                // Tooltip
                const tooltipWidth = isMobile ? 150 : 170;
                const tooltipHeight = shouldShowLine
                    ? isMobile
                        ? 70
                        : 80
                    : isMobile
                    ? 110
                    : 120;
                const tooltipX =
                    mousePos.x < width / 2
                        ? mousePos.x + 15
                        : mousePos.x - tooltipWidth - 15;
                const tooltipY = Math.max(
                    10,
                    Math.min(
                        height - tooltipHeight - 10,
                        mousePos.y - tooltipHeight / 2
                    )
                );

                const tooltipGradient = ctx.createLinearGradient(
                    tooltipX,
                    tooltipY,
                    tooltipX,
                    tooltipY + tooltipHeight
                );
                tooltipGradient.addColorStop(0, "rgba(25, 25, 25, 0.98)");
                tooltipGradient.addColorStop(1, "rgba(15, 15, 15, 0.98)");

                ctx.fillStyle = tooltipGradient;
                ctx.strokeStyle = "#444";
                ctx.lineWidth = 1;

                const radius = 8;
                ctx.beginPath();
                ctx.moveTo(tooltipX + radius, tooltipY);
                ctx.lineTo(tooltipX + tooltipWidth - radius, tooltipY);
                ctx.quadraticCurveTo(
                    tooltipX + tooltipWidth,
                    tooltipY,
                    tooltipX + tooltipWidth,
                    tooltipY + radius
                );
                ctx.lineTo(
                    tooltipX + tooltipWidth,
                    tooltipY + tooltipHeight - radius
                );
                ctx.quadraticCurveTo(
                    tooltipX + tooltipWidth,
                    tooltipY + tooltipHeight,
                    tooltipX + tooltipWidth - radius,
                    tooltipY + tooltipHeight
                );
                ctx.lineTo(tooltipX + radius, tooltipY + tooltipHeight);
                ctx.quadraticCurveTo(
                    tooltipX,
                    tooltipY + tooltipHeight,
                    tooltipX,
                    tooltipY + tooltipHeight - radius
                );
                ctx.lineTo(tooltipX, tooltipY + radius);
                ctx.quadraticCurveTo(
                    tooltipX,
                    tooltipY,
                    tooltipX + radius,
                    tooltipY
                );
                ctx.closePath();
                ctx.fill();
                ctx.stroke();

                ctx.fillStyle = "#fff";
                ctx.font = isMobile ? "10px monospace" : "11px monospace";
                ctx.textAlign = "left";

                const lineHeight = isMobile ? 15 : 16;
                const lines = shouldShowLine
                    ? [
                          `${new Date(hoveredCandle.timestamp).toLocaleString(
                              "en-US",
                              {
                                  month: "short",
                                  day: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                              }
                          )}`,
                          `Price: ${formatPrice(hoveredCandle.close)}`,
                          `Vol: ${hoveredCandle.volume.toFixed(4)} SOL`,
                      ]
                    : [
                          `${new Date(hoveredCandle.timestamp).toLocaleString(
                              "en-US",
                              {
                                  month: "short",
                                  day: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                              }
                          )}`,
                          `O: ${formatPrice(hoveredCandle.open)}`,
                          `H: ${formatPrice(hoveredCandle.high)}`,
                          `L: ${formatPrice(hoveredCandle.low)}`,
                          `C: ${formatPrice(hoveredCandle.close)}`,
                          `Vol: ${hoveredCandle.volume.toFixed(4)} SOL`,
                      ];

                lines.forEach((line, i) => {
                    ctx.fillText(
                        line,
                        tooltipX + 10,
                        tooltipY + 20 + i * lineHeight
                    );
                });
            }
        }
    }, [
        candles,
        stats,
        viewState,
        mousePos,
        hoveredCandle,
        isMobile,
        chartType,
        timeframe, // Add timeframe dependency
    ]);

    const formatPrice = (value) => {
        if (!value || !isFinite(value)) return "—";
        if (value < 0.000001) return value.toExponential(2);
        if (value < 0.01) return value.toFixed(8);
        if (value < 1) return value.toFixed(6);
        return value.toFixed(4);
    };

    const formatMarketCap = (value) => {
        if (value >= 1000000) return `$${(value / 1000000).toFixed(2)}M`;
        if (value >= 1000) return `$${(value / 1000).toFixed(2)}K`;
        return `$${value.toFixed(0)}`;
    };

    const timeframes = ["1s", "5s", "15s", "1m", "5m", "15m", "1h", "4h", "1D"];

    return (
        <div className="w-full bg-gradient-to-b from-gray-950 to-black rounded-xl overflow-hidden border border-gray-800 shadow-2xl">
            {/* Header - Responsive */}
            <div className="bg-gradient-to-r from-gray-950 via-gray-900 to-gray-950 px-3 md:px-4 py-2.5 md:py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-gray-800">
                {/* Price Info */}
                <div className="flex flex-wrap items-center gap-2 md:gap-4 w-full sm:w-auto">
                    <div className="flex items-center gap-2">
                        <span className="text-xl md:text-2xl font-bold text-white">
                            {formatPrice(stats.currentPrice)}
                        </span>
                        <span
                            className={`text-xs md:text-sm font-semibold px-2 py-0.5 rounded ${
                                stats.priceChangePercent >= 0
                                    ? "bg-green-500/20 text-green-400"
                                    : "bg-red-500/20 text-red-400"
                            }`}
                        >
                            {stats.priceChangePercent >= 0 ? "+" : ""}
                            {stats.priceChangePercent.toFixed(2)}%
                        </span>
                    </div>

                    {bondingCurveInfo && (
                        <div className="flex items-center gap-2 md:gap-3 text-xs text-gray-400">
                            <span className="whitespace-nowrap">
                                Liq:{" "}
                                <span className="text-blue-400 font-semibold">
                                    {formatMarketCap(stats.liquidityUSD)}
                                </span>
                            </span>
                            <span className="whitespace-nowrap">
                                MCap:{" "}
                                <span className="text-cyan-400 font-semibold">
                                    {formatMarketCap(stats.marketCap)}
                                </span>
                            </span>
                        </div>
                    )}
                </div>

                {/* Timeframe Buttons - Responsive */}
                <div className="flex items-center gap-1 overflow-x-auto w-full sm:w-auto scrollbar-hide">
                    {timeframes.map((tf) => (
                        <button
                            key={tf}
                            onClick={() => setTimeframe(tf)}
                            className={`px-2 md:px-2.5 py-1 text-xs font-medium rounded transition-all whitespace-nowrap ${
                                timeframe === tf
                                    ? "bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-lg shadow-violet-500/50"
                                    : "text-gray-400 hover:text-gray-200 hover:bg-gray-800"
                            }`}
                        >
                            {tf}
                        </button>
                    ))}
                </div>

                {/* Chart Type Toggle - Add after timeframe buttons */}
                <div className="flex items-center gap-1 border-l border-gray-700 pl-2 ml-2">
                    <button
                        onClick={() => setChartType("line")}
                        className={`px-2 md:px-2.5 py-1 text-xs font-medium rounded transition-all ${
                            chartType === "line"
                                ? "bg-purple-600 text-white"
                                : "text-gray-400 hover:text-gray-200 hover:bg-gray-800"
                        }`}
                        title="Line Chart"
                    >
                        📈
                    </button>
                    <button
                        onClick={() => setChartType("candles")}
                        className={`px-2 md:px-2.5 py-1 text-xs font-medium rounded transition-all ${
                            chartType === "candles"
                                ? "bg-purple-600 text-white"
                                : "text-gray-400 hover:text-gray-200 hover:bg-gray-800"
                        }`}
                        title="Candlestick Chart"
                    >
                        🕯️
                    </button>
                    <button
                        onClick={() => setChartType("auto")}
                        className={`px-2 md:px-2.5 py-1 text-xs font-medium rounded transition-all ${
                            chartType === "auto"
                                ? "bg-purple-600 text-white"
                                : "text-gray-400 hover:text-gray-200 hover:bg-gray-800"
                        }`}
                        title="Auto (Line for low volume, Candles for high volume)"
                    >
                        ⚡
                    </button>
                </div>
            </div>

            {/* Chart - Responsive */}
            <div ref={containerRef} className="relative bg-black">
                {isLoading ? (
                    <div className="flex items-center justify-center h-[300px] sm:h-[400px] md:h-[500px]">
                        <div className="text-center">
                            <div className="animate-spin rounded-full h-10 w-10 md:h-12 md:w-12 border-3 border-gray-700 border-t-violet-500 mb-3 mx-auto"></div>
                            <p className="text-gray-500 text-sm">
                                {loadingError || "Loading chart..."}
                            </p>
                        </div>
                    </div>
                ) : (
                    <canvas
                        ref={canvasRef}
                        className="w-full h-[300px] sm:h-[400px] md:h-[500px] cursor-crosshair touch-none"
                        onMouseDown={handleMouseDown}
                        onMouseMove={handleMouseMove}
                        onMouseUp={handleMouseUp}
                        onMouseLeave={handleMouseLeave}
                        onTouchStart={handleTouchStart}
                        onTouchMove={handleTouchMove}
                        onTouchEnd={handleTouchEnd}
                    />
                )}
            </div>

            {/* Add scrollbar hide utility if not already in your CSS */}
            <style jsx>{`
                .scrollbar-hide::-webkit-scrollbar {
                    display: none;
                }
                .scrollbar-hide {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                }
            `}</style>
        </div>
    );
};

export default BondingCurveChart;