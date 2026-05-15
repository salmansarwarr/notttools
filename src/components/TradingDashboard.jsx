import React, {
    useState,
    useEffect,
    useRef,
    useMemo,
    useCallback,
} from "react";
import { Connection, PublicKey } from "@solana/web3.js";
import { AnchorProvider, Program } from "@coral-xyz/anchor";
import { BN } from "@coral-xyz/anchor";
import bondingCurveIDL from "./bonding_curve.json";
import BondingCurveChart from "./BondingCurveChart";
import TradesTable from "./TradesTable";

const TradingDashboard = ({ mintAddress }) => {
    const [priceHistory, setPriceHistory] = useState([]);
    const [trades, setTrades] = useState([]);
    const [bondingCurveInfo, setBondingCurveInfo] = useState(null);
    const [currentSolPrice, setCurrentSolPrice] = useState(0);
    const [creationDate, setCreationDate] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [loadingError, setLoadingError] = useState(null);

    const prevBondingCurveRef = useRef(null);
    const txCacheRef = useRef(new Map());
    const accountSubscriptionId = useRef(null);
    const connectionRef = useRef(null);
    const programRef = useRef(null);

    const BONDING_CURVE_PROGRAM_ID = useMemo(
        () => new PublicKey("CPMWvEXzNTnrksm1PPXQzp2UUTXWxCKQaw9HhvDdf3nT"),
        [],
    );

    const RPC_URL = import.meta.env.VITE_RPC_URL;

    // Initialize connection and program once
    useEffect(() => {
        if (!connectionRef.current) {
            connectionRef.current = new Connection(RPC_URL, {
                commitment: "confirmed",
                confirmTransactionInitialTimeout: 60000,
            });
        }
        if (!programRef.current) {
            const provider = new AnchorProvider(connectionRef.current, {}, {});
            programRef.current = new Program(bondingCurveIDL, provider);
        }
    }, []);

    const sleep = useCallback(
        (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
        [],
    );

    const fetchWithRetry = useCallback(
        async (fetchFn, maxRetries = 3, initialDelay = 1000) => {
            let lastError;

            for (let i = 0; i < maxRetries; i++) {
                try {
                    return await fetchFn();
                } catch (error) {
                    lastError = error;

                    if (
                        error?.message?.includes("429") ||
                        error?.code === 429
                    ) {
                        const delay = initialDelay * Math.pow(2, i);
                        console.log(`⏳ Rate limited. Waiting ${delay}ms...`);
                        await sleep(delay);
                    } else {
                        throw error;
                    }
                }
            }

            throw lastError;
        },
        [sleep],
    );

    // Fetch SOL price
    useEffect(() => {
        const fetchSolPrice = async () => {
            try {
                const response = await fetch(
                    "https://api.jup.ag/price/v3?ids=So11111111111111111111111111111111111111112",
                    {
                        headers: {
                            "x-api-key": "60012c1b-4bd1-4e6f-a6a3-eb991ed23e95",
                        },
                    },
                );
                const price = await response.json();
                const newSolPrice =
                    price["So11111111111111111111111111111111111111112"]
                        .usdPrice;

                if (currentSolPrice > 0 && bondingCurveInfo) {
                    const priceChange =
                        Math.abs(newSolPrice - currentSolPrice) /
                        currentSolPrice;

                    if (priceChange > 0.005) {
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
        const interval = setInterval(fetchSolPrice, 30000);
        return () => clearInterval(interval);
    }, [currentSolPrice, bondingCurveInfo]);

    // Optimized calculation function
    const calculateBondingCurveData = useCallback((curveData, SOL_TO_USD) => {
        const virtualSolReserves = curveData.virtualSolReserves;
        const realSolReserves = curveData.realSolReserves;
        const virtualTokenReserves = curveData.virtualTokenReserves;
        const realTokenReserves = curveData.realTokenReserves;

        const totalSolReserves = virtualSolReserves.add(realSolReserves);
        const totalTokenReserves = virtualTokenReserves.add(realTokenReserves);

        const totalSolReservesNum =
            parseFloat(totalSolReserves.toString()) / 1e9;
        const totalTokenReservesNum =
            parseFloat(totalTokenReserves.toString()) / 1e9;

        const priceInSol =
            totalTokenReservesNum > 0
                ? totalSolReservesNum / totalTokenReservesNum
                : 0;
        const priceInUsd = priceInSol * SOL_TO_USD;

        const totalSupply = parseFloat(curveData.totalSupply.toString()) / 1e9;
        const marketCap = priceInUsd * totalSupply;

        const realSolNum = parseFloat(realSolReserves.toString()) / 1e9;
        const liquidityUSD = realSolNum * SOL_TO_USD;

        return {
            realSolReserves: realSolNum,
            realTokenReserves: parseFloat(realTokenReserves.toString()) / 1e9,
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
                    parseFloat(curveData.migrationThreshold.toString())) *
                100,
        };
    }, []);

    // Main data fetching effect
    useEffect(() => {
        if (!mintAddress || !connectionRef.current || !programRef.current)
            return;

        let isMounted = true;

        const fetchBondingCurveData = async () => {
            try {
                setLoadingError(null);

                const mint = new PublicKey(mintAddress);
                const [bondingCurve] = PublicKey.findProgramAddressSync(
                    [Buffer.from("bonding_curve"), mint.toBuffer()],
                    BONDING_CURVE_PROGRAM_ID,
                );

                console.log("📊 Fetching bonding curve data...");

                const curveData = await fetchWithRetry(() =>
                    programRef.current.account.bondingCurve.fetch(bondingCurve),
                );

                if (!isMounted) return;

                const SOL_TO_USD =
                    currentSolPrice > 0 ? currentSolPrice : 186.14;
                const bondingCurveData = calculateBondingCurveData(
                    curveData,
                    SOL_TO_USD,
                );

                setBondingCurveInfo(bondingCurveData);
                prevBondingCurveRef.current = bondingCurveData;

                console.log("📈 Current price:", bondingCurveData.priceInUsd);

                // Fetch transaction history in parallel with setting up WebSocket
                const historyPromise = fetchTransactionHistory(
                    connectionRef.current,
                    bondingCurve,
                    bondingCurveData.priceInUsd,
                    SOL_TO_USD,
                    bondingCurveData,
                );

                // Setup WebSocket immediately without waiting for history
                if (!bondingCurveData.isMigrated) {
                    accountSubscriptionId.current =
                        connectionRef.current.onAccountChange(
                            bondingCurve,
                            async (accountInfo) => {
                                if (!isMounted) return;

                                try {
                                    const newCurveData =
                                        programRef.current.coder.accounts.decode(
                                            "BondingCurve",
                                            accountInfo.data,
                                        );

                                    const newVirtualSol = new BN(
                                        newCurveData.virtualSolReserves.toString(),
                                    );
                                    const newRealSol = new BN(
                                        newCurveData.realSolReserves.toString(),
                                    );
                                    const newVirtualToken = new BN(
                                        newCurveData.virtualTokenReserves.toString(),
                                    );
                                    const newRealToken = new BN(
                                        newCurveData.realTokenReserves.toString(),
                                    );

                                    const newTotalSol =
                                        newVirtualSol.add(newRealSol);
                                    const newTotalToken =
                                        newVirtualToken.add(newRealToken);

                                    const newTotalSolNum =
                                        parseFloat(newTotalSol.toString()) /
                                        1e9;
                                    const newTotalTokenNum =
                                        parseFloat(newTotalToken.toString()) /
                                        1e9;
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
                                        newRealSolNum - prevRealSol,
                                    );

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
                                            return [
                                                ...prev.slice(-500),
                                                newPoint,
                                            ];
                                        });

                                        console.log(
                                            "🔄 New trade detected, fetching latest trades...",
                                        );
                                        fetchLatestTrades(
                                            connectionRef.current,
                                            bondingCurve,
                                            currentSOLPrice,
                                        );
                                    }

                                    const updatedInfo = {
                                        realSolReserves: newRealSolNum,
                                        realTokenReserves:
                                            parseFloat(
                                                newRealToken.toString(),
                                            ) / 1e9,
                                        totalSolReserves: newTotalSolNum,
                                        totalTokenReserves: newTotalTokenNum,
                                        priceInSol: newPriceInSol,
                                        priceInUsd: newPrice,
                                        marketCap:
                                            newPrice *
                                            bondingCurveData.totalSupply,
                                        totalSupply:
                                            bondingCurveData.totalSupply,
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
                                        updateError,
                                    );
                                }
                            },
                            "confirmed",
                        );
                }

                // Wait for history to complete
                await historyPromise;

                if (!isMounted) return;

                setIsLoading(false);
                console.log("✅ Data loaded successfully");
            } catch (error) {
                console.error("❌ Error fetching bonding curve data:", error);
                if (isMounted) {
                    setIsLoading(false);
                    setLoadingError(
                        error.message || "Failed to load chart data",
                    );
                }
            }
        };

        fetchBondingCurveData();

        return () => {
            isMounted = false;
            if (accountSubscriptionId.current) {
                connectionRef.current
                    .removeAccountChangeListener(accountSubscriptionId.current)
                    .catch(() => {});
            }
        };
    }, [
        mintAddress,
        currentSolPrice,
        BONDING_CURVE_PROGRAM_ID,
        fetchWithRetry,
        calculateBondingCurveData,
    ]);

    const fetchTransactionHistory = async (
        connection,
        bondingCurve,
        currentPrice,
        initialSOLPrice,
        bondingCurveData,
    ) => {
        try {
            console.log("📊 Fetching transaction history...");

            const signatures = await fetchWithRetry(() =>
                connection.getSignaturesForAddress(bondingCurve, {
                    limit: 200,
                }),
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
                setTrades([]);
                return;
            }

            const oldestTx = signatures[signatures.length - 1];
            if (oldestTx.blockTime) {
                setCreationDate(oldestTx.blockTime * 1000);
            }

            const pricePoints = [];
            const parsedTrades = [];

            // Increased parallel processing
            const BATCH_SIZE = 10; // Increased from 5
            const DELAY_BETWEEN_BATCHES = 250; // Reduced from 500ms
            const allTransactions = [];

            // Process all batches in parallel with controlled concurrency
            const batchPromises = [];

            for (let i = 0; i < signatures.length; i += BATCH_SIZE) {
                const batch = signatures.slice(i, i + BATCH_SIZE);

                const batchPromise = (async () => {
                    const txPromises = batch.map(async (sig) => {
                        if (txCacheRef.current.has(sig.signature)) {
                            return txCacheRef.current.get(sig.signature);
                        }

                        try {
                            const tx = await fetchWithRetry(() =>
                                connection.getTransaction(sig.signature, {
                                    maxSupportedTransactionVersion: 0,
                                    commitment: "confirmed",
                                }),
                            );

                            if (tx) {
                                txCacheRef.current.set(sig.signature, tx);
                            }

                            return tx;
                        } catch (error) {
                            return null;
                        }
                    });

                    return Promise.all(txPromises);
                })();

                batchPromises.push(batchPromise);

                // Add delay between batch starts (not between batch completions)
                if (i + BATCH_SIZE < signatures.length) {
                    await sleep(DELAY_BETWEEN_BATCHES);
                }
            }

            // Wait for all batches to complete
            const allBatchResults = await Promise.all(batchPromises);

            // Flatten results
            allBatchResults.forEach((batchTxs) => {
                allTransactions.push(...batchTxs.filter((tx) => tx !== null));
            });

            allTransactions.sort((a, b) => a.blockTime - b.blockTime);

            // Optimized transaction parsing with regex compiled once
            const buyRegex = /Buy:\s+(\d+)\s+tokens?\s+for\s+(\d+)\s+SOL/i;
            const sellRegex = /Sell:\s+(\d+)\s+tokens?\s+for\s+(\d+)\s+SOL/i;

            allTransactions.forEach((tx) => {
                if (!tx || !tx.blockTime || !tx.meta) return;

                try {
                    const timestamp = tx.blockTime * 1000;
                    const logMessages = tx.meta.logMessages || [];
                    const trader =
                        tx.transaction.message.accountKeys[0]?.toBase58() || "";
                    const signature = tx.transaction.signatures[0];

                    logMessages.forEach((log) => {
                        const buyMatch = log.match(buyRegex);
                        if (buyMatch) {
                            const tokenLamports = parseFloat(buyMatch[1]);
                            const solLamports = parseFloat(buyMatch[2]);

                            const tokenAmount = tokenLamports / 1e9;
                            const solAmount = solLamports / 1e9;

                            if (solAmount > 0 && tokenAmount > 0) {
                                const priceInSol = solAmount / tokenAmount;
                                const priceInUsd = priceInSol * initialSOLPrice;

                                if (isFinite(priceInUsd) && priceInUsd > 0) {
                                    pricePoints.push({
                                        timestamp,
                                        price: priceInUsd,
                                        volume: solAmount,
                                        type: "buy",
                                        solPrice: initialSOLPrice,
                                    });

                                    parsedTrades.push({
                                        id: signature,
                                        type: "Buy",
                                        timestamp,
                                        amount: solAmount,
                                        tokens: tokenAmount,
                                        price: priceInUsd,
                                        totalUsd: solAmount * initialSOLPrice,
                                        trader,
                                        signature,
                                    });
                                }
                            }
                        }

                        const sellMatch = log.match(sellRegex);
                        if (sellMatch) {
                            const tokenLamports = parseFloat(sellMatch[1]);
                            const solLamports = parseFloat(sellMatch[2]);

                            const tokenAmount = tokenLamports / 1e9;
                            const solAmount = solLamports / 1e9;

                            if (solAmount > 0 && tokenAmount > 0) {
                                const priceInSol = solAmount / tokenAmount;
                                const priceInUsd = priceInSol * initialSOLPrice;

                                if (isFinite(priceInUsd) && priceInUsd > 0) {
                                    pricePoints.push({
                                        timestamp,
                                        price: priceInUsd,
                                        volume: solAmount,
                                        type: "sell",
                                        solPrice: initialSOLPrice,
                                    });

                                    parsedTrades.push({
                                        id: signature,
                                        type: "Sell",
                                        timestamp,
                                        amount: solAmount,
                                        tokens: tokenAmount,
                                        price: priceInUsd,
                                        totalUsd: solAmount * initialSOLPrice,
                                        trader,
                                        signature,
                                    });
                                }
                            }
                        }
                    });
                } catch (parseError) {
                    console.warn(
                        "Error parsing transaction:",
                        parseError.message,
                    );
                }
            });

            const filledPricePoints = fillHistoricalGaps(
                pricePoints,
                currentPrice,
                initialSOLPrice,
            );

            setPriceHistory(filledPricePoints);

            parsedTrades.sort((a, b) => b.timestamp - a.timestamp);
            setTrades(parsedTrades);

            console.log(`✅ Loaded ${filledPricePoints.length} price points`);
            console.log(`✅ Loaded ${parsedTrades.length} trades`);
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
            setTrades([]);
        }
    };

    const fetchLatestTrades = async (
        connection,
        bondingCurve,
        currentSOLPrice,
    ) => {
        try {
            const latestSig = trades[0]?.signature;

            const signatures = await fetchWithRetry(() =>
                connection.getSignaturesForAddress(bondingCurve, {
                    limit: 10,
                    until: latestSig,
                }),
            );

            if (signatures.length === 0) return;

            const newTrades = [];
            const buyRegex = /Buy:\s+(\d+)\s+tokens?\s+for\s+(\d+)\s+SOL/i;
            const sellRegex = /Sell:\s+(\d+)\s+tokens?\s+for\s+(\d+)\s+SOL/i;

            // Process all new signatures in parallel
            const txPromises = signatures.map(async (sig) => {
                if (txCacheRef.current.has(sig.signature)) {
                    return null;
                }

                try {
                    const tx = await fetchWithRetry(() =>
                        connection.getTransaction(sig.signature, {
                            maxSupportedTransactionVersion: 0,
                            commitment: "confirmed",
                        }),
                    );

                    if (!tx || !tx.blockTime || !tx.meta) return null;

                    txCacheRef.current.set(sig.signature, tx);
                    return tx;
                } catch (error) {
                    console.warn("Failed to fetch new transaction:", error);
                    return null;
                }
            });

            const txResults = await Promise.all(txPromises);

            txResults.forEach((tx) => {
                if (!tx) return;

                const timestamp = tx.blockTime * 1000;
                const logMessages = tx.meta.logMessages || [];
                const trader =
                    tx.transaction.message.accountKeys[0]?.toBase58() || "";
                const signature = tx.transaction.signatures[0];

                logMessages.forEach((log) => {
                    const buyMatch = log.match(buyRegex);
                    if (buyMatch) {
                        const tokenLamports = parseFloat(buyMatch[1]);
                        const solLamports = parseFloat(buyMatch[2]);
                        const tokenAmount = tokenLamports / 1e9;
                        const solAmount = solLamports / 1e9;

                        if (solAmount > 0 && tokenAmount > 0) {
                            const priceInSol = solAmount / tokenAmount;
                            const priceInUsd = priceInSol * currentSOLPrice;

                            newTrades.push({
                                id: signature,
                                type: "Buy",
                                timestamp,
                                amount: solAmount,
                                tokens: tokenAmount,
                                price: priceInUsd,
                                totalUsd: solAmount * currentSOLPrice,
                                trader,
                                signature,
                            });
                        }
                    }

                    const sellMatch = log.match(sellRegex);
                    if (sellMatch) {
                        const tokenLamports = parseFloat(sellMatch[1]);
                        const solLamports = parseFloat(sellMatch[2]);
                        const tokenAmount = tokenLamports / 1e9;
                        const solAmount = solLamports / 1e9;

                        if (solAmount > 0 && tokenAmount > 0) {
                            const priceInSol = solAmount / tokenAmount;
                            const priceInUsd = priceInSol * currentSOLPrice;

                            newTrades.push({
                                id: signature,
                                type: "Sell",
                                timestamp,
                                amount: solAmount,
                                tokens: tokenAmount,
                                price: priceInUsd,
                                totalUsd: solAmount * currentSOLPrice,
                                trader,
                                signature,
                            });
                        }
                    }
                });
            });

            if (newTrades.length > 0) {
                setTrades((prev) => {
                    const combined = [...newTrades, ...prev];
                    return combined.slice(0, 200);
                });
                console.log(`✅ Added ${newTrades.length} new trades`);
            }
        } catch (error) {
            console.error("Error fetching latest trades:", error);
        }
    };

    const fillHistoricalGaps = useCallback(
        (pricePoints, currentPrice, currentSOLPrice) => {
            if (pricePoints.length === 0) {
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
            const MAX_GAP = 300000;

            for (let i = 0; i < pricePoints.length - 1; i++) {
                filled.push(pricePoints[i]);

                const current = pricePoints[i];
                const next = pricePoints[i + 1];
                const gap = next.timestamp - current.timestamp;

                if (gap > MAX_GAP) {
                    const numPoints = Math.min(10, Math.floor(gap / MAX_GAP));

                    for (let j = 1; j <= numPoints; j++) {
                        const ratio = j / (numPoints + 1);
                        filled.push({
                            timestamp: current.timestamp + gap * ratio,
                            price: current.price,
                            volume: 0,
                            type: "interpolated",
                            solPrice: current.solPrice,
                        });
                    }
                }
            }

            filled.push(pricePoints[pricePoints.length - 1]);

            filled.push({
                timestamp: Date.now(),
                price: currentPrice,
                volume: 0,
                type: "current",
                solPrice: currentSOLPrice,
            });

            return filled;
        },
        [],
    );

    // Heartbeat updates
    useEffect(() => {
        if (priceHistory.length === 0 || !bondingCurveInfo) return;

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
        }, 60000);

        return () => clearInterval(interval);
    }, [priceHistory.length, bondingCurveInfo, currentSolPrice]);

    return (
        <div className="w-full space-y-4">
            <BondingCurveChart
                priceHistory={priceHistory}
                bondingCurveInfo={bondingCurveInfo}
                currentSolPrice={currentSolPrice}
                creationDate={creationDate}
                isLoading={isLoading}
                loadingError={loadingError}
            />

            <TradesTable
                trades={trades}
                currentSolPrice={currentSolPrice}
                isLoading={isLoading}
            />
        </div>
    );
};

export default TradingDashboard;
