import React, { useState, useEffect, useRef, useCallback } from "react";

/**
 * Bonding Curve Chart with Dummy Data for Testing
 * - Generates realistic price movements
 * - Simulates buy/sell activity
 * - No blockchain connection required
 */
const BondingCurveChart = ({ mintAddress = "DUMMY123..." }) => {
    const canvasRef = useRef(null);
    const containerRef = useRef(null);
    const [priceHistory, setPriceHistory] = useState([]);
    const [timeframe, setTimeframe] = useState("1m");
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
    const [candles, setCandles] = useState([]);
    const [bondingCurveInfo, setBondingCurveInfo] = useState(null);
    const [currentSolPrice, setCurrentSolPrice] = useState(186.50);
    const [creationDate, setCreationDate] = useState(null);

    const [viewState, setViewState] = useState({
        zoom: 1,
        offsetX: 0,
        startIndex: 0,
        endIndex: 100,
    });

    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState(null);
    const [smoothTransition, setSmoothTransition] = useState(false);

    const viewStateRef = useRef(viewState);
    const candlesRef = useRef(candles);
    const isDraggingRef = useRef(false);
    const dragStartRef = useRef(null);

    useEffect(() => {
        viewStateRef.current = viewState;
    }, [viewState]);

    useEffect(() => {
        candlesRef.current = candles;
    }, [candles]);

    // Generate dummy data on mount
    useEffect(() => {
        const generateDummyData = () => {
            console.log("🎲 Generating dummy data...");
            
            const now = Date.now();
            const twoHoursAgo = now - (2 * 60 * 60 * 1000);
            setCreationDate(twoHoursAgo);

            // Generate realistic price movement
            const points = [];
            let currentPrice = 0.00001234; // Starting price
            let trend = 1; // Upward trend initially
            
            // Generate 500 price points over 2 hours
            for (let i = 0; i < 500; i++) {
                const timestamp = twoHoursAgo + (i * 14400); // ~14 seconds apart
                
                // Random walk with momentum
                const volatility = 0.05;
                const momentum = 0.7;
                const randomChange = (Math.random() - 0.5) * volatility;
                trend = trend * momentum + randomChange * (1 - momentum);
                
                // Apply price change
                currentPrice = currentPrice * (1 + trend);
                
                // Random volume
                const volume = Math.random() * 0.5 + 0.1;
                const type = Math.random() > 0.5 ? "buy" : "sell";
                
                points.push({
                    timestamp,
                    price: currentPrice,
                    volume,
                    type,
                    solPrice: currentSolPrice,
                    liquidityUSD: 5000 + Math.random() * 2000,
                    date: new Date(timestamp).toLocaleString(),
                });
            }

            // Add current point
            points.push({
                timestamp: now,
                price: currentPrice,
                volume: 0,
                type: "current",
                solPrice: currentSolPrice,
                liquidityUSD: 6500,
                date: new Date(now).toLocaleString(),
            });

            setPriceHistory(points);

            // Set bonding curve info
            const totalSupply = 1000000000; // 1B tokens
            const marketCap = currentPrice * totalSupply;
            
            setBondingCurveInfo({
                realSolReserves: 35.5,
                realTokenReserves: 450000000,
                totalSolReserves: 40.2,
                totalTokenReserves: 500000000,
                priceInSol: currentPrice / currentSolPrice,
                priceInUsd: currentPrice,
                marketCap,
                totalSupply,
                liquidityUSD: 6620,
                solPriceUSD: currentSolPrice,
                isMigrated: false,
                progress: 47.3,
            });

            setIsLoading(false);
            console.log("✅ Dummy data generated successfully");
        };

        generateDummyData();

        // Simulate live updates every 5 seconds
        const interval = setInterval(() => {
            setPriceHistory(prev => {
                if (prev.length === 0) return prev;
                
                const lastPoint = prev[prev.length - 1];
                const priceChange = (Math.random() - 0.48) * 0.02; // Slight upward bias
                const newPrice = lastPoint.price * (1 + priceChange);
                const volume = Math.random() * 0.3 + 0.05;
                const type = priceChange > 0 ? "buy" : "sell";
                
                const newPoint = {
                    timestamp: Date.now(),
                    price: newPrice,
                    volume,
                    type,
                    solPrice: currentSolPrice,
                    liquidityUSD: 6500 + Math.random() * 200,
                    date: new Date().toLocaleString(),
                };
                
                return [...prev.slice(-500), newPoint];
            });
        }, 5000);

        return () => clearInterval(interval);
    }, [currentSolPrice]);

    // Calculate stats
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

    // Aggregate to candles
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

            const avgSolPrice = points.reduce((sum, p) => sum + (p.solPrice || currentSolPrice), 0) / points.length;
            const avgLiquidity = points.reduce((sum, p) => sum + (p.liquidityUSD || 0), 0) / points.length;

            result.push({
                timestamp: candleTime,
                open: points[0].price,
                high: Math.max(...points.map((p) => p.price)),
                low: Math.min(...points.map((p) => p.price)),
                close: points[points.length - 1].price,
                volume: points.reduce((sum, p) => sum + (p.volume || 0), 0),
                type: points[0].type,
                solPrice: avgSolPrice,
                liquidityUSD: avgLiquidity,
                date: new Date(candleTime).toLocaleString(),
            });
        });

        return result.sort((a, b) => a.timestamp - b.timestamp);
    };

    // Mouse handlers
    const handleMouseDown = (e) => {
        if (!canvasRef.current) return;
        e.preventDefault();
        const rect = canvasRef.current.getBoundingClientRect();
        isDraggingRef.current = true;
        dragStartRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
        setIsDragging(true);
        setDragStart({ x: e.clientX - rect.left, y: e.clientY - rect.top });
        setSmoothTransition(false);
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
            const chartWidth = rect.width - 120;
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
            const chartWidth = rect.width - 120;
            const candleWidth = Math.max(2, chartWidth / visibleCandles.length - 2);
            const candleSpacing = candleWidth + 2;
            const chartX = x - 30;
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
            const chartWidth = rect.width - 120;
            const mouseRatio = Math.max(0, Math.min(1, (mouseX - 30) / chartWidth));

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

            setSmoothTransition(true);
            setViewState({
                zoom: currentView.zoom * delta,
                offsetX: currentView.offsetX,
                startIndex: Math.max(0, newStart),
                endIndex: Math.min(candlesRef.current.length, newEnd),
            });

            setTimeout(() => setSmoothTransition(false), 150);
        };

        canvas.addEventListener("wheel", handleWheel, { passive: false });
        return () => canvas.removeEventListener("wheel", handleWheel);
    }, []);

    const resetView = () => {
        setSmoothTransition(true);
        setViewState({
            zoom: 1,
            offsetX: 0,
            startIndex: Math.max(0, candles.length - 100),
            endIndex: candles.length,
        });
        setTimeout(() => setSmoothTransition(false), 300);
    };

    // Drawing code
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
        const chartHeight = height * 0.72;

        // Background
        const bgGradient = ctx.createLinearGradient(0, 0, 0, height);
        bgGradient.addColorStop(0, "#0a0a0f");
        bgGradient.addColorStop(1, "#000000");
        ctx.fillStyle = bgGradient;
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

        const padding = priceRange * 0.1;
        const adjustedMin = minPrice - padding;
        const adjustedMax = maxPrice + padding;

        // Grid
        ctx.lineWidth = 1;
        for (let i = 0; i <= 8; i++) {
            const y = (chartHeight / 8) * i;
            const gridGradient = ctx.createLinearGradient(30, y, width - 100, y);
            gridGradient.addColorStop(0, `rgba(100, 100, 150, 0)`);
            gridGradient.addColorStop(0.5, `rgba(139, 92, 246, 0.06)`);
            gridGradient.addColorStop(1, `rgba(100, 100, 150, 0)`);
            ctx.strokeStyle = gridGradient;
            ctx.beginPath();
            ctx.moveTo(30, y);
            ctx.lineTo(width - 100, y);
            ctx.stroke();
        }

        // Draw candles
        const chartWidth = width - 130;
        const candleWidth = Math.max(2, Math.floor(chartWidth / visibleCandles.length) - 2);
        const candleSpacing = candleWidth + 2;

        visibleCandles.forEach((candle, i) => {
            const x = 30 + i * candleSpacing + candleWidth / 2;
            const openY = chartHeight - ((candle.open - adjustedMin) / (adjustedMax - adjustedMin)) * chartHeight;
            const closeY = chartHeight - ((candle.close - adjustedMin) / (adjustedMax - adjustedMin)) * chartHeight;
            const highY = chartHeight - ((candle.high - adjustedMin) / (adjustedMax - adjustedMin)) * chartHeight;
            const lowY = chartHeight - ((candle.low - adjustedMin) / (adjustedMax - adjustedMin)) * chartHeight;

            const isGreen = candle.close >= candle.open;
            const color = isGreen ? "#10b981" : "#ef4444";

            // Wick
            ctx.strokeStyle = color;
            ctx.lineWidth = Math.max(2, candleWidth * 0.2);
            ctx.beginPath();
            ctx.moveTo(x, highY);
            ctx.lineTo(x, lowY);
            ctx.stroke();

            // Body
            const bodyTop = Math.min(openY, closeY);
            const bodyHeight = Math.max(4, Math.abs(closeY - openY));
            ctx.fillStyle = isGreen ? "#10b981" : "#ef4444";
            ctx.fillRect(x - candleWidth / 2, bodyTop, candleWidth, bodyHeight);
        });

        // Current price line
        if (stats.currentPrice > 0) {
            const currentY = chartHeight - ((stats.currentPrice - adjustedMin) / (adjustedMax - adjustedMin)) * chartHeight;
            ctx.strokeStyle = "#a78bfa";
            ctx.setLineDash([8, 4]);
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.moveTo(30, currentY);
            ctx.lineTo(width - 110, currentY);
            ctx.stroke();
            ctx.setLineDash([]);
        }

        // Y-axis labels
        ctx.fillStyle = "#9ca3af";
        ctx.font = "11px monospace";
        ctx.textAlign = "left";
        for (let i = 0; i <= 4; i++) {
            const y = (chartHeight / 4) * i;
            const price = adjustedMax - ((adjustedMax - adjustedMin) / 4) * i;
            const priceText = price < 0.000001 ? price.toExponential(2) : 
                            price < 0.01 ? price.toFixed(8) : price.toFixed(6);
            ctx.fillText(priceText, width - 95, y + 4);
        }

    }, [candles, stats, viewState]);

    const formatPrice = (value) => {
        if (!value || !isFinite(value)) return "—";
        if (value < 0.000001) return value.toExponential(2);
        if (value < 0.01) return value.toFixed(8);
        return value.toFixed(6);
    };

    const formatMarketCap = (value) => {
        if (value >= 1000000) return `${(value / 1000000).toFixed(2)}M`;
        if (value >= 1000) return `${(value / 1000).toFixed(2)}K`;
        return `${value.toFixed(0)}`;
    };

    const formatDate = (timestamp) => {
        const date = new Date(timestamp);
        return date.toLocaleString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    const timeframes = ["1s", "5s", "15s", "1m", "5m", "15m", "1h", "4h", "1D"];

    return (
        <div className="w-full bg-gradient-to-b from-gray-950 to-black rounded-xl overflow-hidden border border-gray-800 shadow-2xl">
            <div className="border-b border-gray-800/50 backdrop-blur-xl bg-black/40 px-5 py-3 flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3 flex-wrap">
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-500/10 rounded-full border border-amber-500/20">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                        </span>
                        <span className="text-amber-400 text-xs font-semibold">🎲 DEMO MODE - Dummy Data</span>
                    </div>
                    
                    {creationDate && (
                        <div className="text-xs text-gray-400">
                            Created: <span className="text-violet-400 font-semibold">{formatDate(creationDate)}</span>
                        </div>
                    )}
                    
                    <div className="text-xs text-gray-400">
                        SOL: <span className="text-amber-400 font-semibold">${currentSolPrice.toFixed(2)}</span>
                    </div>
                </div>

                <div className="flex items-center gap-1 bg-gray-900/50 rounded-lg p-1 border border-gray-800/50">
                    {timeframes.map((tf) => (
                        <button
                            key={tf}
                            onClick={() => setTimeframe(tf)}
                            className={`px-3 py-1.5 text-xs font-semibold transition-all rounded-md ${
                                timeframe === tf
                                    ? "bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-lg"
                                    : "text-gray-400 hover:text-gray-200 hover:bg-gray-800/50"
                            }`}
                        >
                            {tf}
                        </button>
                    ))}
                </div>

                <button
                    onClick={resetView}
                    className="px-4 py-2 text-xs font-semibold text-white bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 rounded-lg transition-all"
                >
                    Reset View
                </button>
            </div>

            <div className="border-b border-gray-800/50 px-5 py-4 bg-gradient-to-r from-black/60 via-gray-900/40 to-black/60 backdrop-blur-xl">
                <div className="flex items-baseline gap-6 flex-wrap text-sm">
                    <div className="flex items-baseline gap-3">
                        <span className="text-3xl font-bold text-white tracking-tight">
                            {formatPrice(stats.currentPrice)}
                        </span>
                        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-bold text-sm ${
                            stats.priceChangePercent >= 0
                                ? "bg-emerald-500/10 text-emerald-400"
                                : "bg-red-500/10 text-red-400"
                        }`}>
                            {stats.priceChangePercent >= 0 ? "+" : ""}{Math.abs(stats.priceChangePercent).toFixed(2)}%
                        </div>
                    </div>

                    {bondingCurveInfo && (
                        <>
                            <div className="flex items-center gap-2">
                                <span className="text-gray-400 text-xs">Liquidity:</span>
                                <span className="text-blue-400 font-semibold">${formatMarketCap(stats.liquidityUSD)}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-gray-400 text-xs">MCap:</span>
                                <span className="text-cyan-400 font-semibold">${formatMarketCap(stats.marketCap)}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-gray-400 text-xs">24h Vol:</span>
                                <span className="text-purple-400 font-semibold">{stats.volume24h.toFixed(2)} SOL</span>
                            </div>
                        </>
                    )}
                </div>
            </div>

            <div ref={containerRef} className="relative bg-gradient-to-b from-black via-gray-950 to-black">
                {isLoading ? (
                    <div className="flex items-center justify-center h-[600px]">
                        <div className="text-center">
                            <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-800 border-t-violet-500 mb-4"></div>
                            <p className="text-gray-400 text-sm font-medium">Generating dummy data...</p>
                        </div>
                    </div>
                ) : (
                    <canvas
                        ref={canvasRef}
                        className="w-full h-[600px] cursor-crosshair"
                        onMouseDown={handleMouseDown}
                        onMouseMove={handleMouseMove}
                        onMouseUp={handleMouseUp}
                        onMouseLeave={handleMouseLeave}
                    />
                )}
                
                {hoveredCandle && mousePos && (
                    <div 
                        className="absolute bg-gray-900/95 border border-gray-700 rounded-lg p-3 text-xs pointer-events-none backdrop-blur-sm"
                        style={{
                            left: Math.min(mousePos.x + 10, window.innerWidth - 220),
                            top: mousePos.y + 10,
                        }}
                    >
                        <div className="font-semibold text-white mb-1">{hoveredCandle.date}</div>
                        <div className="space-y-0.5">
                            <div className="flex justify-between gap-4">
                                <span className="text-gray-400">Open:</span>
                                <span className="text-white font-mono">{formatPrice(hoveredCandle.open)}</span>
                            </div>
                            <div className="flex justify-between gap-4">
                                <span className="text-gray-400">High:</span>
                                <span className="text-emerald-400 font-mono">{formatPrice(hoveredCandle.high)}</span>
                            </div>
                            <div className="flex justify-between gap-4">
                                <span className="text-gray-400">Low:</span>
                                <span className="text-red-400 font-mono">{formatPrice(hoveredCandle.low)}</span>
                            </div>
                            <div className="flex justify-between gap-4">
                                <span className="text-gray-400">Close:</span>
                                <span className="text-white font-mono">{formatPrice(hoveredCandle.close)}</span>
                            </div>
                            <div className="flex justify-between gap-4 pt-1 border-t border-gray-700">
                                <span className="text-gray-400">Volume:</span>
                                <span className="text-violet-400 font-mono">{hoveredCandle.volume.toFixed(3)} SOL</span>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default BondingCurveChart;