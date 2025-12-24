import React, { useState, useEffect, useRef } from "react";

/**
 * Professional Trading Chart - GMGN.ai Style
 * - Responsive design for all screen sizes
 * - Touch support for mobile
 * - Improved styling and animations
 * - Proper candlestick rendering
 */
const BondingCurveChart = ({
    priceHistory,
    bondingCurveInfo,
    currentSolPrice,
    creationDate,
    isLoading,
    loadingError,
}) => {
    const canvasRef = useRef(null);
    const containerRef = useRef(null);
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
    const [candles, setCandles] = useState([]);
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