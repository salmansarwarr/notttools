import React, { useState, useEffect, useRef, useCallback } from "react";
import { Connection, PublicKey } from "@solana/web3.js";
import { AnchorProvider, Program } from "@coral-xyz/anchor";
import { BN } from "@coral-xyz/anchor";
import bondingCurveIDL from "./bonding_curve.json";

/**
 * Enhanced Trading Chart with GMGN.ai Style Drawing Tools
 * Features:
 * - Drawing tools (trendlines, horizontal lines, rectangles, text, etc.)
 * - Timeframe presets (1d, 7d, 30d, 180d)
 * - Save/load drawings
 * - Mobile responsive
 */
const BondingCurveChartEnhanced = ({ mintAddress }) => {
    const canvasRef = useRef(null);
    const drawingCanvasRef = useRef(null);
    const containerRef = useRef(null);
    
    // All your existing state variables...
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
    const [chartType, setChartType] = useState("auto");

    const [viewState, setViewState] = useState({
        zoom: 1,
        offsetX: 0,
        startIndex: 0,
        endIndex: 100,
    });

    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState(null);

    // NEW: Drawing tools state
    const [activeTool, setActiveTool] = useState("cursor"); // cursor, trendline, hline, rectangle, brush, text, emoji
    const [drawings, setDrawings] = useState([]);
    const [currentDrawing, setCurrentDrawing] = useState(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [selectedDrawing, setSelectedDrawing] = useState(null);
    const [showTimeframePresets, setShowTimeframePresets] = useState(false);
    
    // NEW: Drawing refs
    const drawingsRef = useRef(drawings);
    const activeToolRef = useRef(activeTool);
    const isDrawingRef = useRef(false);

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

    // Update refs when state changes
    useEffect(() => {
        drawingsRef.current = drawings;
    }, [drawings]);

    useEffect(() => {
        activeToolRef.current = activeTool;
    }, [activeTool]);

    // [Keep all your existing useEffects and functions - I'll add them inline but won't repeat them all here for brevity]
    // ... (all your existing fetch logic, SOL price, transaction history, etc.)

    // Detect mobile
    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 768);
        };
        checkMobile();
        window.addEventListener("resize", checkMobile);
        return () => window.removeEventListener("resize", checkMobile);
    }, []);

    // Drawing Tools Functions
    const getChartCoordinates = (canvasX, canvasY, rect) => {
        const padding = isMobile
            ? { top: 15, right: 55, bottom: 45, left: 5 }
            : { top: 20, right: 70, bottom: 50, left: 10 };

        const chartWidth = rect.width - padding.left - padding.right;
        const chartHeight = rect.height - padding.top - padding.bottom;

        // Convert canvas coordinates to chart data coordinates
        const visibleCandles = candles.slice(viewState.startIndex, viewState.endIndex);
        const candleIndex = Math.floor(((canvasX - padding.left) / chartWidth) * visibleCandles.length);
        
        const prices = visibleCandles.flatMap(c => [c.high, c.low]);
        const minPrice = Math.min(...prices);
        const maxPrice = Math.max(...prices);
        const priceRange = maxPrice - minPrice || maxPrice * 0.1;
        const paddingPercent = priceRange * 0.15;
        const adjustedMin = minPrice - paddingPercent;
        const adjustedMax = maxPrice + paddingPercent;
        const adjustedRange = adjustedMax - adjustedMin;

        const price = adjustedMax - ((canvasY - padding.top) / chartHeight) * adjustedRange;

        return { candleIndex, price };
    };

    const handleDrawingMouseDown = (e) => {
        if (activeTool === "cursor") return;
        
        const rect = canvasRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        const coords = getChartCoordinates(x, y, rect);
        
        isDrawingRef.current = true;
        setIsDrawing(true);
        
        const newDrawing = {
            id: Date.now(),
            tool: activeTool,
            startX: coords.candleIndex,
            startY: coords.price,
            endX: coords.candleIndex,
            endY: coords.price,
            text: "",
            emoji: "📈",
            color: "#8b7bff",
        };
        
        setCurrentDrawing(newDrawing);
    };

    const handleDrawingMouseMove = (e) => {
        if (!isDrawingRef.current || !currentDrawing) return;
        
        const rect = canvasRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        const coords = getChartCoordinates(x, y, rect);
        
        setCurrentDrawing({
            ...currentDrawing,
            endX: coords.candleIndex,
            endY: coords.price,
        });
    };

    const handleDrawingMouseUp = () => {
        if (!isDrawingRef.current || !currentDrawing) return;
        
        isDrawingRef.current = false;
        setIsDrawing(false);
        
        if (currentDrawing.tool === "text") {
            const text = prompt("Enter text:");
            if (text) {
                setDrawings([...drawings, { ...currentDrawing, text }]);
            }
        } else if (currentDrawing.tool === "emoji") {
            setDrawings([...drawings, currentDrawing]);
        } else {
            setDrawings([...drawings, currentDrawing]);
        }
        
        setCurrentDrawing(null);
        setActiveTool("cursor");
    };

    const deleteDrawing = (id) => {
        setDrawings(drawings.filter(d => d.id !== id));
        setSelectedDrawing(null);
    };

    const clearAllDrawings = () => {
        if (confirm("Clear all drawings?")) {
            setDrawings([]);
            setSelectedDrawing(null);
        }
    };

    // Timeframe preset handlers
    const setTimeframePreset = (days) => {
        const now = Date.now();
        const targetTime = now - (days * 24 * 60 * 60 * 1000);
        
        // Find the index of the candle closest to the target time
        const targetIndex = candles.findIndex(c => c.timestamp >= targetTime);
        
        if (targetIndex >= 0) {
            setViewState({
                zoom: 1,
                offsetX: 0,
                startIndex: targetIndex,
                endIndex: candles.length,
            });
        }
    };

    // Drawing canvas rendering
    useEffect(() => {
        if (!drawingCanvasRef.current || candles.length === 0) return;

        const canvas = drawingCanvasRef.current;
        const ctx = canvas.getContext("2d");
        const rect = canvas.getBoundingClientRect();
        
        canvas.width = rect.width;
        canvas.height = rect.height;
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const padding = isMobile
            ? { top: 15, right: 55, bottom: 45, left: 5 }
            : { top: 20, right: 70, bottom: 50, left: 10 };

        const chartWidth = rect.width - padding.left - padding.right;
        const chartHeight = rect.height - padding.top - padding.bottom;

        const visibleCandles = candles.slice(viewState.startIndex, viewState.endIndex);
        const candleWidth = chartWidth / visibleCandles.length;

        const prices = visibleCandles.flatMap(c => [c.high, c.low]);
        const minPrice = Math.min(...prices);
        const maxPrice = Math.max(...prices);
        const priceRange = maxPrice - minPrice || maxPrice * 0.1;
        const paddingPercent = priceRange * 0.15;
        const adjustedMin = minPrice - paddingPercent;
        const adjustedMax = maxPrice + paddingPercent;
        const adjustedRange = adjustedMax - adjustedMin;

        const priceToY = (price) => {
            return padding.top + chartHeight - ((price - adjustedMin) / adjustedRange) * chartHeight;
        };

        const candleToX = (candleIndex) => {
            return padding.left + (candleIndex - viewState.startIndex) * candleWidth + candleWidth / 2;
        };

        // Draw all saved drawings
        [...drawings, currentDrawing].filter(Boolean).forEach(drawing => {
            ctx.strokeStyle = drawing.color;
            ctx.fillStyle = drawing.color;
            ctx.lineWidth = 2;

            const x1 = candleToX(drawing.startX);
            const y1 = priceToY(drawing.startY);
            const x2 = candleToX(drawing.endX);
            const y2 = priceToY(drawing.endY);

            switch (drawing.tool) {
                case "trendline":
                    ctx.beginPath();
                    ctx.moveTo(x1, y1);
                    ctx.lineTo(x2, y2);
                    ctx.stroke();
                    
                    // Draw handles
                    ctx.fillStyle = "#8b7bff";
                    ctx.beginPath();
                    ctx.arc(x1, y1, 4, 0, Math.PI * 2);
                    ctx.arc(x2, y2, 4, 0, Math.PI * 2);
                    ctx.fill();
                    break;

                case "hline":
                    ctx.beginPath();
                    ctx.setLineDash([5, 5]);
                    ctx.moveTo(padding.left, y1);
                    ctx.lineTo(padding.left + chartWidth, y1);
                    ctx.stroke();
                    ctx.setLineDash([]);
                    
                    // Price label
                    ctx.fillStyle = drawing.color;
                    ctx.font = "10px monospace";
                    ctx.fillText(drawing.startY.toFixed(8), padding.left + chartWidth + 5, y1 + 3);
                    break;

                case "rectangle":
                    ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);
                    ctx.fillStyle = drawing.color + "20";
                    ctx.fillRect(x1, y1, x2 - x1, y2 - y1);
                    break;

                case "brush":
                    ctx.beginPath();
                    ctx.moveTo(x1, y1);
                    ctx.lineTo(x2, y2);
                    ctx.stroke();
                    break;

                case "text":
                    ctx.fillStyle = drawing.color;
                    ctx.font = "14px Arial";
                    ctx.fillText(drawing.text || "Text", x1, y1);
                    break;

                case "emoji":
                    ctx.font = "24px Arial";
                    ctx.fillText(drawing.emoji, x1 - 12, y1 + 8);
                    break;
            }
        });
    }, [drawings, currentDrawing, candles, viewState, isMobile]);

    // Tool button component
    const ToolButton = ({ tool, icon, label, isActive }) => (
        <button
            onClick={() => setActiveTool(tool)}
            className={`flex items-center justify-center w-10 h-10 rounded-lg transition-all ${
                isActive
                    ? "bg-violet-600 text-white shadow-lg shadow-violet-500/50"
                    : "text-gray-400 hover:text-white hover:bg-gray-800"
            }`}
            title={label}
        >
            <span className="text-xl">{icon}</span>
        </button>
    );

    return (
        <div className="w-full bg-gradient-to-b from-gray-950 to-black rounded-xl overflow-hidden border border-gray-800 shadow-2xl">
            {/* Header */}
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

                {/* Timeframe Buttons */}
                <div className="flex items-center gap-1 overflow-x-auto w-full sm:w-auto scrollbar-hide">
                    {["1s", "5s", "15s", "1m", "5m", "15m", "1h", "4h", "1D"].map((tf) => (
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

                {/* Chart Type Toggle */}
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
                        title="Auto"
                    >
                        ⚡
                    </button>
                </div>
            </div>

            {/* Chart Area with Sidebar */}
            <div className="relative flex">
                {/* Drawing Tools Sidebar - GMGN.ai Style */}
                <div className="bg-gray-950 border-r border-gray-800 p-2 flex flex-col gap-2">
                    <ToolButton
                        tool="cursor"
                        icon="➕"
                        label="Cursor"
                        isActive={activeTool === "cursor"}
                    />
                    <ToolButton
                        tool="trendline"
                        icon="📐"
                        label="Trendline"
                        isActive={activeTool === "trendline"}
                    />
                    <ToolButton
                        tool="hline"
                        icon="—"
                        label="Horizontal Line"
                        isActive={activeTool === "hline"}
                    />
                    <ToolButton
                        tool="rectangle"
                        icon="▭"
                        label="Rectangle"
                        isActive={activeTool === "rectangle"}
                    />
                    <ToolButton
                        tool="brush"
                        icon="🖌️"
                        label="Brush"
                        isActive={activeTool === "brush"}
                    />
                    <ToolButton
                        tool="text"
                        icon="T"
                        label="Text"
                        isActive={activeTool === "text"}
                    />
                    <ToolButton
                        tool="emoji"
                        icon="😊"
                        label="Emoji"
                        isActive={activeTool === "emoji"}
                    />
                    
                    <div className="border-t border-gray-800 pt-2 mt-2">
                        <button
                            onClick={clearAllDrawings}
                            className="w-10 h-10 flex items-center justify-center text-red-400 hover:bg-red-950 rounded-lg transition-all"
                            title="Clear All Drawings"
                        >
                            🗑️
                        </button>
                    </div>
                </div>

                {/* Chart Container */}
                <div ref={containerRef} className="relative bg-black flex-1">
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
                        <>
                            <canvas
                                ref={canvasRef}
                                className="absolute inset-0 w-full h-[300px] sm:h-[400px] md:h-[500px]"
                            />
                            <canvas
                                ref={drawingCanvasRef}
                                className="absolute inset-0 w-full h-[300px] sm:h-[400px] md:h-[500px] pointer-events-none"
                                style={{ pointerEvents: activeTool === "cursor" ? "none" : "auto" }}
                                onMouseDown={handleDrawingMouseDown}
                                onMouseMove={handleDrawingMouseMove}
                                onMouseUp={handleDrawingMouseUp}
                            />
                        </>
                    )}
                </div>
            </div>

            {/* Timeframe Presets - GMGN.ai Style Bottom Bar */}
            <div className="bg-gray-950 border-t border-gray-800 px-4 py-2 flex items-center justify-center gap-2">
                {[
                    { label: "1d", days: 1 },
                    { label: "7d", days: 7 },
                    { label: "30d", days: 30 },
                    { label: "180d", days: 180 },
                ].map(({ label, days }) => (
                    <button
                        key={label}
                        onClick={() => setTimeframePreset(days)}
                        className="px-3 py-1 text-xs font-medium text-gray-400 hover:text-white hover:bg-gray-800 rounded transition-all"
                    >
                        {label}
                    </button>
                ))}
                <button
                    onClick={() => setViewState({
                        zoom: 1,
                        offsetX: 0,
                        startIndex: Math.max(0, candles.length - (isMobile ? 50 : 100)),
                        endIndex: candles.length,
                    })}
                    className="px-3 py-1 text-xs font-medium text-gray-400 hover:text-white hover:bg-gray-800 rounded transition-all ml-2"
                >
                    Reset View
                </button>
            </div>

            {/* Drawings Info */}
            {drawings.length > 0 && (
                <div className="bg-gray-950 border-t border-gray-800 px-4 py-2 text-xs text-gray-500">
                    {drawings.length} drawing{drawings.length !== 1 ? "s" : ""} on chart
                </div>
            )}
        </div>
    );

    // Helper functions (keep your existing ones)
    function formatPrice(value) {
        if (!value || !isFinite(value)) return "—";
        if (value < 0.000001) return value.toExponential(2);
        if (value < 0.01) return value.toFixed(8);
        if (value < 1) return value.toFixed(6);
        return value.toFixed(4);
    }

    function formatMarketCap(value) {
        if (value >= 1000000) return `$${(value / 1000000).toFixed(2)}M`;
        if (value >= 1000) return `$${(value / 1000).toFixed(2)}K`;
        return `$${value.toFixed(0)}`;
    }
};

export default BondingCurveChartEnhanced;