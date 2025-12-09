import React, { useState, useEffect, useRef, useCallback } from "react";
import { Connection, PublicKey } from "@solana/web3.js";
import { AnchorProvider, Program } from "@coral-xyz/anchor";
import { BN } from "@coral-xyz/anchor";
import bondingCurveIDL from "./bonding_curve.json";

/**
 * Professional Trading Chart - GMGN.ai Style
 * - Proper candlestick rendering
 * - Clean, professional UI
 * - Real-time price updates
 * - Accurate historical data
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
    
    const RPC_URL = "https://solana-mainnet.api.syndica.io/api-key/21P91u6oC24BUjduDPBnPEdmPWWz7fmFp3jtMBY52Mgq5j1CE9sjKbUv1TzPZGan2pKeDg289fHqvdP6UK5cAHhyJmuHSLE2qm";

    const prevBondingCurveRef = useRef(null);
    const viewStateRef = useRef(viewState);
    const candlesRef = useRef(candles);
    const isDraggingRef = useRef(false);
    const dragStartRef = useRef(null);
    const txCacheRef = useRef(new Map());

    useEffect(() => {
        viewStateRef.current = viewState;
    }, [viewState]);

    useEffect(() => {
        candlesRef.current = candles;
    }, [candles]);

    // Fetch SOL price
    useEffect(() => {
        const fetchSolPrice = async () => {
            try {
                const price = await (
                    await fetch(
                        'https://api.jup.ag/price/v3?ids=So11111111111111111111111111111111111111112',
                    {
                      headers: {
                        'x-api-key': '60012c1b-4bd1-4e6f-a6a3-eb991ed23e95',
                      },
                    }
                  )
                ).json();
                console.log(price)
                setCurrentSolPrice(price['So11111111111111111111111111111111111111112'].usdPrice);
            } catch (error) {
                console.error("Error fetching SOL price:", error);
                setCurrentSolPrice(186.14);
            }
        };

        fetchSolPrice();
        const interval = setInterval(fetchSolPrice, 30000);
        return () => clearInterval(interval);
    }, []);

    const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    const fetchWithRetry = async (connection, fetchFn, maxRetries = 3, initialDelay = 1000) => {
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

    useEffect(() => {
        if (!mintAddress) return;

        const connection = new Connection(RPC_URL, "confirmed");
        let accountSubscriptionId = null;
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

                const curveData = await fetchWithRetry(
                    connection,
                    () => program.account.bondingCurve.fetch(bondingCurve)
                );

                if (!isMounted) return;

                const virtualSolReserves = curveData.virtualSolReserves;
                const realSolReserves = curveData.realSolReserves;
                const virtualTokenReserves = curveData.virtualTokenReserves;
                const realTokenReserves = curveData.realTokenReserves;

                const totalSolReserves = virtualSolReserves.add(realSolReserves);
                const totalTokenReserves = virtualTokenReserves.add(realTokenReserves);

                const totalSolReservesNum = parseFloat(totalSolReserves.toString()) / 1e9;
                const totalTokenReservesNum = parseFloat(totalTokenReserves.toString()) / 1e9;

                const priceInSol = totalTokenReservesNum > 0
                    ? totalSolReservesNum / totalTokenReservesNum
                    : 0;

                const SOL_TO_USD = currentSolPrice > 0 ? currentSolPrice : 186.14;
                const priceInUsd = priceInSol * SOL_TO_USD;

                const totalSupply = parseFloat(curveData.totalSupply.toString()) / 1e9;
                const marketCap = priceInUsd * totalSupply;
                
                const realSolNum = parseFloat(realSolReserves.toString()) / 1e9;
                const liquidityUSD = realSolNum * SOL_TO_USD;

                if (!isMounted) return;

                const bondingCurveData = {
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
                    progress: (parseFloat(realSolReserves.toString()) /
                        parseFloat(curveData.migrationThreshold.toString())) * 100,
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

                if (!bondingCurveData.isMigrated) {
                    accountSubscriptionId = connection.onAccountChange(
                        bondingCurve,
                        async (accountInfo) => {
                            if (!isMounted) return;

                            try {
                                const newCurveData = program.coder.accounts.decode(
                                    "BondingCurve",
                                    accountInfo.data
                                );

                                const newVirtualSol = new BN(newCurveData.virtualSolReserves.toString());
                                const newRealSol = new BN(newCurveData.realSolReserves.toString());
                                const newVirtualToken = new BN(newCurveData.virtualTokenReserves.toString());
                                const newRealToken = new BN(newCurveData.realTokenReserves.toString());

                                const newTotalSol = newVirtualSol.add(newRealSol);
                                const newTotalToken = newVirtualToken.add(newRealToken);

                                const newTotalSolNum = parseFloat(newTotalSol.toString()) / 1e9;
                                const newTotalTokenNum = parseFloat(newTotalToken.toString()) / 1e9;
                                const newRealSolNum = parseFloat(newRealSol.toString()) / 1e9;

                                const currentSOLPrice = currentSolPrice > 0 ? currentSolPrice : SOL_TO_USD;
                                
                                const newPriceInSol = newTotalTokenNum > 0
                                    ? newTotalSolNum / newTotalTokenNum
                                    : 0;
                                const newPrice = newPriceInSol * currentSOLPrice;
                                const newLiquidityUSD = newRealSolNum * currentSOLPrice;

                                const prevRealSol = prevBondingCurveRef.current?.realSolReserves || 0;
                                const solDiff = Math.abs(newRealSolNum - prevRealSol);

                                if (solDiff > 0.0001) {
                                    const tradeType = newRealSolNum > prevRealSol ? "buy" : "sell";

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
                                    realTokenReserves: parseFloat(newRealToken.toString()) / 1e9,
                                    totalSolReserves: newTotalSolNum,
                                    totalTokenReserves: newTotalTokenNum,
                                    priceInSol: newPriceInSol,
                                    priceInUsd: newPrice,
                                    marketCap: newPrice * bondingCurveData.totalSupply,
                                    totalSupply: bondingCurveData.totalSupply,
                                    liquidityUSD: newLiquidityUSD,
                                    solPriceUSD: currentSOLPrice,
                                    isMigrated: newCurveData.isMigrated,
                                    progress: bondingCurveData.progress,
                                };

                                setBondingCurveInfo(updatedInfo);
                                prevBondingCurveRef.current = updatedInfo;
                            } catch (updateError) {
                                console.error("Error processing update:", updateError);
                            }
                        },
                        "confirmed"
                    );
                }

            } catch (error) {
                console.error("❌ Error fetching bonding curve data:", error);
                if (isMounted) {
                    setIsLoading(false);
                    setLoadingError(error.message || "Failed to load chart data");
                }
            }
        };

        fetchBondingCurveData();

        return () => {
            isMounted = false;
            if (accountSubscriptionId) {
                connection.removeAccountChangeListener(accountSubscriptionId).catch(() => {});
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

            const signatures = await fetchWithRetry(
                connection,
                () => connection.getSignaturesForAddress(bondingCurve, { limit: 200 })
            );

            console.log(`Found ${signatures.length} transactions`);

            if (signatures.length === 0) {
                const now = Date.now();
                setPriceHistory([
                    { timestamp: now - 3600000, price: currentPrice, volume: 0, type: "init" },
                    { timestamp: now, price: currentPrice, volume: 0, type: "current" },
                ]);
                setCreationDate(now - 3600000);
                return;
            }

            const oldestTx = signatures[signatures.length - 1];
            if (oldestTx.blockTime) {
                setCreationDate(oldestTx.blockTime * 1000);
            }

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
                        const tx = await fetchWithRetry(
                            connection,
                            () => connection.getTransaction(sig.signature, {
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

            allTransactions.forEach((tx) => {
                if (!tx || !tx.blockTime || !tx.meta) return;

                try {
                    const timestamp = tx.blockTime * 1000;
                    const logMessages = tx.meta.logMessages || [];

                    logMessages.forEach((log) => {
                        const buyMatch = log.match(/Buy: (\d+) SOL for (\d+) tokens/);
                        if (buyMatch) {
                            const solLamports = parseFloat(buyMatch[1]);
                            const tokenLamports = parseFloat(buyMatch[2]);
                            
                            const solAmount = solLamports / 1e9;
                            const tokenAmount = tokenLamports / 1e9;
                            
                            const priceInSol = solAmount / tokenAmount;
                            const priceInUsd = priceInSol * initialSOLPrice;

                            if (isFinite(priceInUsd) && priceInUsd > 0) {
                                pricePoints.push({
                                    timestamp: timestamp,
                                    price: priceInUsd,
                                    volume: solAmount,
                                    type: "buy",
                                });
                            }
                        }

                        const sellMatch = log.match(/Sell: (\d+) tokens for (\d+) SOL/);
                        if (sellMatch) {
                            const tokenLamports = parseFloat(sellMatch[1]);
                            const solLamports = parseFloat(sellMatch[2]);
                            
                            const tokenAmount = tokenLamports / 1e9;
                            const solAmount = solLamports / 1e9;
                            
                            const priceInSol = solAmount / tokenAmount;
                            const priceInUsd = priceInSol * initialSOLPrice;

                            if (isFinite(priceInUsd) && priceInUsd > 0) {
                                pricePoints.push({
                                    timestamp: timestamp,
                                    price: priceInUsd,
                                    volume: solAmount,
                                    type: "sell",
                                });
                            }
                        }
                    });
                } catch (parseError) {
                    console.warn("Error parsing transaction:", parseError.message);
                }
            });

            pricePoints.push({
                timestamp: Date.now(),
                price: currentPrice,
                volume: 0,
                type: "current",
            });

            const validPricePoints = pricePoints.filter(p => 
                p.price > 0 && 
                isFinite(p.price) && 
                p.timestamp > 0
            );

            if (validPricePoints.length > 0) {
                console.log(`✅ Loaded ${validPricePoints.length} price points`);
                setPriceHistory(validPricePoints);
            } else {
                const now = Date.now();
                setPriceHistory([
                    { timestamp: now - 3600000, price: currentPrice, volume: 0, type: "init" },
                    { timestamp: now, price: currentPrice, volume: 0, type: "current" },
                ]);
            }
        } catch (error) {
            console.error("❌ Error fetching transaction history:", error);
            const now = Date.now();
            setPriceHistory([
                { timestamp: now - 3600000, price: currentPrice, volume: 0, type: "init" },
                { timestamp: now, price: currentPrice, volume: 0, type: "current" },
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
        const priceChangePercent = oldest.price > 0 ? (priceChange / oldest.price) * 100 : 0;

        const high24h = recentData.length > 0
            ? Math.max(...recentData.map((p) => p.price))
            : current.price;

        const low24h = recentData.length > 0
            ? Math.min(...recentData.map((p) => p.price))
            : current.price;

        const volume24h = recentData.reduce((sum, p) => sum + (p.volume || 0), 0);

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

    useEffect(() => {
        if (priceHistory.length === 0) return;

        const aggregated = aggregateToCandles(priceHistory, timeframe);
        setCandles(aggregated);

        setViewState({
            zoom: 1,
            offsetX: 0,
            startIndex: Math.max(0, aggregated.length - 100),
            endIndex: aggregated.length,
        });
    }, [priceHistory, timeframe]);

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
        const candleGroups = new Map();

        data.forEach((point) => {
            const candleTime = Math.floor(point.timestamp / interval) * interval;

            if (!candleGroups.has(candleTime)) {
                candleGroups.set(candleTime, []);
            }
            candleGroups.get(candleTime).push(point);
        });

        const result = [];
        candleGroups.forEach((points, candleTime) => {
            points.sort((a, b) => a.timestamp - b.timestamp);

            result.push({
                timestamp: candleTime,
                open: points[0].price,
                high: Math.max(...points.map((p) => p.price)),
                low: Math.min(...points.map((p) => p.price)),
                close: points[points.length - 1].price,
                volume: points.reduce((sum, p) => sum + (p.volume || 0), 0),
                buyVolume: points.filter(p => p.type === 'buy').reduce((sum, p) => sum + (p.volume || 0), 0),
                sellVolume: points.filter(p => p.type === 'sell').reduce((sum, p) => sum + (p.volume || 0), 0),
            });
        });

        return result.sort((a, b) => a.timestamp - b.timestamp);
    };

    const handleMouseDown = (e) => {
        if (!canvasRef.current) return;
        e.preventDefault();
        const rect = canvasRef.current.getBoundingClientRect();
        isDraggingRef.current = true;
        dragStartRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
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
            const candlesPerPixel = (currentView.endIndex - currentView.startIndex) / chartWidth;
            const candleShift = Math.round(dx * candlesPerPixel * 1.5);

            const newStart = Math.max(0, currentView.startIndex - candleShift);
            const newEnd = Math.min(candlesRef.current.length, currentView.endIndex - candleShift);

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
            const visibleCandles = candlesRef.current.slice(currentView.startIndex, currentView.endIndex);
            const chartWidth = rect.width - 80;
            const candleWidth = Math.max(1, (chartWidth / visibleCandles.length) * 0.7);
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
            const chartWidth = rect.width - 80;
            const mouseRatio = Math.max(0, Math.min(1, (mouseX - 40) / chartWidth));

            const delta = e.deltaY > 0 ? 1.15 : 0.87;
            const currentView = viewStateRef.current;
            const currentRange = currentView.endIndex - currentView.startIndex;
            const newRange = Math.max(10, Math.min(candlesRef.current.length, Math.round(currentRange * delta)));

            const mouseCandleIndex = currentView.startIndex + Math.floor(currentRange * mouseRatio);
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
    }, []);

    const resetView = () => {
        setViewState({
            zoom: 1,
            offsetX: 0,
            startIndex: Math.max(0, candles.length - 100),
            endIndex: candles.length,
        });
    };

    // FIXED DRAWING CODE - Proper Candlesticks
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
        const padding = { top: 20, right: 70, bottom: 40, left: 10 };
        const chartHeight = height - padding.top - padding.bottom;
        const chartWidth = width - padding.left - padding.right;

        // Background
        ctx.fillStyle = "#0a0a0a";
        ctx.fillRect(0, 0, width, height);

        const visibleCandles = candles.slice(viewState.startIndex, viewState.endIndex);
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
            return padding.top + chartHeight - ((price - adjustedMin) / adjustedRange) * chartHeight;
        };

        // Draw horizontal grid lines
        ctx.strokeStyle = "#1a1a1a";
        ctx.lineWidth = 1;
        const gridLines = 5;
        
        for (let i = 0; i <= gridLines; i++) {
            const y = padding.top + (chartHeight / gridLines) * i;
            ctx.beginPath();
            ctx.moveTo(padding.left, y);
            ctx.lineTo(padding.left + chartWidth, y);
            ctx.stroke();
        }

        // Draw price labels
        ctx.fillStyle = "#666";
        ctx.font = "10px monospace";
        ctx.textAlign = "left";
        
        for (let i = 0; i <= gridLines; i++) {
            const ratio = 1 - (i / gridLines);
            const price = adjustedMin + adjustedRange * ratio;
            const y = padding.top + (chartHeight / gridLines) * i;
            ctx.fillText(formatPrice(price), padding.left + chartWidth + 5, y + 3);
        }

        // Calculate candle dimensions
        const totalCandleSpace = chartWidth / visibleCandles.length;
        const candleWidth = Math.max(1, Math.min(totalCandleSpace * 0.7, 20));
        const wickWidth = Math.max(1, candleWidth * 0.15);

        // Draw candles
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
            
            if (isGreen) {
                ctx.fillStyle = color;
                ctx.fillRect(centerX - candleWidth / 2, bodyTop, candleWidth, bodyHeight);
            } else {
                ctx.fillStyle = color;
                ctx.fillRect(centerX - candleWidth / 2, bodyTop, candleWidth, bodyHeight);
            }
        });

        // Current price line
        if (stats.currentPrice > 0 && stats.currentPrice >= adjustedMin && stats.currentPrice <= adjustedMax) {
            const currentY = priceToY(stats.currentPrice);
            
            ctx.strokeStyle = "#8b7bff";
            ctx.setLineDash([5, 3]);
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(padding.left, currentY);
            ctx.lineTo(padding.left + chartWidth, currentY);
            ctx.stroke();
            ctx.setLineDash([]);
            
            // Price label
            ctx.fillStyle = "#8b7bff";
            const priceText = formatPrice(stats.currentPrice);
            ctx.font = "bold 10px monospace";
            const textWidth = ctx.measureText(priceText).width;
            ctx.fillRect(padding.left + chartWidth + 3, currentY - 8, textWidth + 6, 16);
            ctx.fillStyle = "#000";
            ctx.textAlign = "left";
            ctx.fillText(priceText, padding.left + chartWidth + 6, currentY + 3);
        }

        // Crosshair and tooltip
        if (mousePos && hoveredCandle) {
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
                const tooltipX = mousePos.x < width / 2 ? mousePos.x + 15 : mousePos.x - 185;
                const tooltipY = Math.max(10, Math.min(height - 130, mousePos.y - 65));
                
                ctx.fillStyle = "rgba(20, 20, 20, 0.95)";
                ctx.strokeStyle = "#333";
                ctx.lineWidth = 1;
                ctx.fillRect(tooltipX, tooltipY, 170, 120);
                ctx.strokeRect(tooltipX, tooltipY, 170, 120);
                
                ctx.fillStyle = "#fff";
                ctx.font = "11px monospace";
                ctx.textAlign = "left";
                
                const lines = [
                    `Time: ${new Date(hoveredCandle.timestamp).toLocaleString('en-US', { 
                        month: 'short', 
                        day: 'numeric', 
                        hour: '2-digit', 
                        minute: '2-digit' 
                    })}`,
                    `O: ${formatPrice(hoveredCandle.open)}`,
                    `H: ${formatPrice(hoveredCandle.high)}`,
                    `L: ${formatPrice(hoveredCandle.low)}`,
                    `C: ${formatPrice(hoveredCandle.close)}`,
                    `Vol: ${hoveredCandle.volume.toFixed(4)} SOL`,
                ];
                
                lines.forEach((line, i) => {
                    ctx.fillText(line, tooltipX + 10, tooltipY + 20 + i * 16);
                });
            }
        }

    }, [candles, stats, viewState, mousePos, hoveredCandle]);

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
        <div className="w-full bg-black rounded-lg overflow-hidden border border-gray-800">
            {/* Header */}
            <div className="bg-gray-950 px-4 py-2.5 flex items-center justify-between border-b border-gray-800">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <span className="text-2xl font-bold text-white">{formatPrice(stats.currentPrice)}</span>
                        <span className={`text-sm font-semibold ${stats.priceChangePercent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {stats.priceChangePercent >= 0 ? '+' : ''}{stats.priceChangePercent.toFixed(2)}%
                        </span>
                    </div>
                    
                    {bondingCurveInfo && (
                        <div className="flex items-center gap-3 text-xs text-gray-400">
                            <span>Liq: <span className="text-blue-400 font-semibold">{formatMarketCap(stats.liquidityUSD)}</span></span>
                            <span>MCap: <span className="text-cyan-400 font-semibold">{formatMarketCap(stats.marketCap)}</span></span>
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-1">
                    {timeframes.map((tf) => (
                        <button
                            key={tf}
                            onClick={() => setTimeframe(tf)}
                            className={`px-2.5 py-1 text-xs font-medium rounded transition-all ${
                                timeframe === tf
                                    ? "bg-violet-600 text-white"
                                    : "text-gray-400 hover:text-gray-200 hover:bg-gray-800"
                            }`}
                        >
                            {tf}
                        </button>
                    ))}
                </div>
            </div>

            {/* Chart */}
            <div ref={containerRef} className="relative bg-black">
                {isLoading ? (
                    <div className="flex items-center justify-center h-[500px]">
                        <div className="text-center">
                            <div className="animate-spin rounded-full h-10 w-10 border-3 border-gray-700 border-t-violet-500 mb-3"></div>
                            <p className="text-gray-500 text-sm">{loadingError || "Loading chart..."}</p>
                        </div>
                    </div>
                ) : (
                    <canvas
                        ref={canvasRef}
                        className="w-full h-[500px] cursor-crosshair"
                        onMouseDown={handleMouseDown}
                        onMouseMove={handleMouseMove}
                        onMouseUp={handleMouseUp}
                        onMouseLeave={handleMouseLeave}
                    />
                )}
            </div>
        </div>
    );
};

export default BondingCurveChart;