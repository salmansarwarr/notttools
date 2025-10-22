import React, { useEffect, useRef, useState } from "react";
import { createChart, LineSeries, ColorType } from "lightweight-charts";
import axios from "axios";
import constants from "../constants";

const TradingChart = ({ project }) => {
  const chartContainerRef = useRef(null);
  const chartRef = useRef(null);
  const seriesRef = useRef(null);
  const [trades, setTrades] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [timeFilter, setTimeFilter] = useState("24h");
  const [aggregatedData, setAggregatedData] = useState([]);
  const [currencyPrices, setCurrencyPrices] = useState({});
  const [lastKnownPrice, setLastKnownPrice] = useState(null); // SON BİLİNEN FİYAT

  // Zaman filtresi seçenekleri
  const timeFilters = [
    { value: "1h", label: "1H", hours: 1 },
    { value: "4h", label: "4H", hours: 4 },
    { value: "24h", label: "24H", hours: 24 },
    { value: "7d", label: "7D", hours: 24 * 7 },
    { value: "30d", label: "30D", hours: 24 * 30 },
    { value: "90d", label: "3M", hours: 24 * 90 },
    { value: "1y", label: "1Y", hours: 24 * 365 },
    { value: "all", label: "ALL", hours: null },
  ];

  // Currency USD fiyatlarını çek
  const fetchCurrencyPrices = async (currencies) => {
    try {
      if (!currencies.length) return {};

      const uniqueCurrencies = [...new Set(currencies)];
      const currencyString = uniqueCurrencies.join(",");

      console.log(`Fetching USD prices for: ${currencyString}`);

      const response = await axios.get(
        `${constants.backend_url}/get-price/prices/${currencyString}`,
        {
          params: { currency: "USD" },
          timeout: 10000,
        }
      );

      if (response.data.success) {
        const prices = {};
        Object.keys(response.data.prices).forEach((currency) => {
          const priceData = response.data.prices[currency];
          if (priceData.price) {
            prices[currency.toLowerCase()] = priceData.price;
          }
        });
        console.log("Currency prices fetched:", prices);
        return prices;
      }

      return {};
    } catch (error) {
      console.error("Error fetching currency prices:", error);
      return {};
    }
  };

  // USD değerine çevir
  const convertToUSD = (amount, currency, prices) => {
    const currencyKey = currency.toLowerCase();
    const price = prices[currencyKey];

    if (price && price > 0) {
      return amount * price;
    }

    // Fallback: Eğer currency zaten USD ise veya price bulunamazsa
    return currency.toLowerCase() === "usd" ? amount : 0;
  };

  // SON BİLİNEN FİYATI AL - BURAYI EKLEDİM
  const fetchLastKnownPrice = async (projectId) => {
    try {
      console.log("🔍 Son bilinen fiyat alınıyor...");

      const response = await axios.get(
        `${constants.backend_url}/items/trades`,
        {
          params: {
            filter: JSON.stringify({ project: { _eq: projectId } }),
            fields: [
              "token_amount",
              "currency_amount",
              "timestamp",
              "currency",
            ].join(","),
            sort: ["-timestamp"], // En yeniden eskiye
            limit: 1,
          },
        }
      );

      const latestTrade = response.data.data?.[0];
      console.log("Son trade:", latestTrade);

      if (latestTrade) {
        const tokenAmount = parseFloat(latestTrade.token_amount);
        const currencyAmount = parseFloat(latestTrade.currency_amount);
        const currency = latestTrade.currency || "usd";

        if (tokenAmount > 0 && currencyAmount > 0) {
          // Currency fiyatını çek
          const prices = await fetchCurrencyPrices([currency]);
          const usdAmount = convertToUSD(currencyAmount, currency, prices);

          if (usdAmount > 0) {
            const price = usdAmount / tokenAmount;
            console.log("✅ Son bilinen fiyat hesaplandı:", price);

            return {
              price: price,
              timestamp: latestTrade.timestamp,
              currency: currency,
            };
          }
        }
      }

      console.log("❌ Son bilinen fiyat bulunamadı");
      return null;
    } catch (error) {
      console.error("Son fiyat alma hatası:", error);
      return null;
    }
  };

  // Veri agregasyonu
  const aggregateTradeData = (trades, timeframe, currencyPrices) => {
    if (!trades.length) return [];

    const now = new Date();
    let filteredTrades = trades;

    // Zaman filtreleme
    if (timeframe !== "all") {
      const filterHours = timeFilters.find((f) => f.value === timeframe)?.hours;
      const cutoffTime = new Date(now.getTime() - filterHours * 60 * 60 * 1000);

      filteredTrades = trades.filter((trade) => {
        const tradeTime = new Date(trade.timestamp);
        return tradeTime >= cutoffTime;
      });
    }

    if (!filteredTrades.length) return [];

    // Interval belirleme
    let intervalMinutes;
    switch (timeframe) {
      case "1h":
        intervalMinutes = 1;
        break; // 1 dakika
      case "4h":
        intervalMinutes = 5;
        break; // 5 dakika
      case "24h":
        intervalMinutes = 15;
        break; // 15 dakika
      case "7d":
        intervalMinutes = 60;
        break; // 1 saat
      case "30d":
        intervalMinutes = 240;
        break; // 4 saat
      case "90d":
        intervalMinutes = 720;
        break; // 12 saat
      case "1y":
        intervalMinutes = 1440;
        break; // 1 gün
      case "all":
        intervalMinutes = 1440;
        break; // 1 gün
      default:
        intervalMinutes = 60;
    }

    const intervalMs = intervalMinutes * 60 * 1000;
    const grouped = {};

    // Trades'leri zaman intervallerine göre grupla
    filteredTrades.forEach((trade) => {
      const tradeTime = new Date(trade.timestamp);
      const intervalKey =
        Math.floor(tradeTime.getTime() / intervalMs) * intervalMs;

      if (!grouped[intervalKey]) {
        grouped[intervalKey] = [];
      }
      grouped[intervalKey].push(trade);
    });

    // Her interval için OHLCV hesapla
    const aggregated = Object.keys(grouped)
      .map((intervalKey) => {
        const intervalTrades = grouped[intervalKey];

        const pricesWithVolumes = intervalTrades
          .map((trade) => {
            const tokenAmount = parseFloat(trade.token_amount);
            const currencyAmount = parseFloat(trade.currency_amount);
            const currency = trade.currency || "usd";

            const usdAmount = convertToUSD(
              currencyAmount,
              currency,
              currencyPrices
            );

            if (tokenAmount > 0 && usdAmount > 0) {
              return {
                price: usdAmount / tokenAmount,
                volume: usdAmount,
                timestamp: new Date(trade.timestamp),
              };
            }
            return null;
          })
          .filter(Boolean)
          .sort((a, b) => a.timestamp - b.timestamp); // Zamana göre sırala

        if (pricesWithVolumes.length === 0) return null;

        const priceValues = pricesWithVolumes.map((p) => p.price);
        const totalVolume = pricesWithVolumes.reduce(
          (sum, p) => sum + p.volume,
          0
        );

        return {
          time: Math.floor(parseInt(intervalKey) / 1000), // Unix timestamp (seconds)
          value: priceValues[priceValues.length - 1], // Close price (son fiyat)
          open: priceValues[0], // Open price (ilk fiyat)
          high: Math.max(...priceValues), // High price
          low: Math.min(...priceValues), // Low price
          close: priceValues[priceValues.length - 1], // Close price
          volume: totalVolume, // USD hacim
          trades: intervalTrades.length, // Trade sayısı
        };
      })
      .filter(Boolean)
      .sort((a, b) => a.time - b.time);

    return aggregated;
  };

  // Trades fetch
  const fetchTrades = async (projectId, timeframe) => {
    try {
      setLoading(true);
      setError(null);

      let allTrades = [];
      let offset = 0;
      const limit = 1000;
      let hasMore = true;

      const now = new Date();
      let dateFilter = {};

      if (timeframe !== "all") {
        const filterHours = timeFilters.find(
          (f) => f.value === timeframe
        )?.hours;
        const startDate = new Date(
          now.getTime() - filterHours * 60 * 60 * 1000
        );
        dateFilter = {
          timestamp: {
            _gte: startDate.toISOString(),
          },
        };
      }

      while (hasMore && allTrades.length < 50000) {
        const filter = {
          project: { _eq: projectId },
          ...dateFilter,
        };

        const response = await axios.get(
          `${constants.backend_url}/items/trades`,
          {
            params: {
              filter: JSON.stringify(filter),
              fields: [
                "token_amount",
                "currency_amount",
                "timestamp",
                "currency",
              ].join(","),
              sort: ["timestamp"],
              limit: limit,
              offset: offset,
            },
          }
        );

        const newTrades = response.data.data || [];
        allTrades = [...allTrades, ...newTrades];

        hasMore = newTrades.length === limit;
        offset += limit;

        if (newTrades.length < limit) break;
      }

      console.log(`Fetched ${allTrades.length} trades for ${timeframe}`);

      if (allTrades.length === 0) {
        return { trades: [], prices: {} };
      }

      const currencies = [
        ...new Set(allTrades.map((trade) => trade.currency)),
      ].filter(Boolean);

      if (currencies.length > 0) {
        const prices = await fetchCurrencyPrices(currencies);
        setCurrencyPrices(prices);
        return { trades: allTrades, prices };
      }

      return { trades: allTrades, prices: {} };
    } catch (error) {
      console.error("Error fetching trades:", error);
      setError("Failed to load trading data");
      return { trades: [], prices: {} };
    }
  };

  // Chart init
  useEffect(() => {
    if (!chartContainerRef.current) return;

    try {
      const chart = createChart(chartContainerRef.current, {
        layout: {
          background: { type: ColorType.Solid, color: "#192630" },
          textColor: "#ffffff",
          fontSize: 12,
          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
        },
        width: chartContainerRef.current.clientWidth,
        height: 450,
        grid: {
          vertLines: { color: "#2c3e50", style: 1, visible: true },
          horzLines: { color: "#2c3e50", style: 1, visible: true },
        },
        crosshair: {
          mode: 1,
          vertLine: { width: 1, color: "#758CA3", style: 3 },
          horzLine: { width: 1, color: "#758CA3", style: 3 },
        },
        rightPriceScale: {
          borderColor: "#485c7b",
          textColor: "#ffffff",
          scaleMargins: { top: 0.1, bottom: 0.1 },
        },
        timeScale: {
          borderColor: "#485c7b",
          textColor: "#ffffff",
          timeVisible: true,
          secondsVisible: false,
          rightOffset: 12,
          barSpacing: 3,
          fixLeftEdge: false,
          lockVisibleTimeRangeOnResize: true,
          rightBarStaysOnScroll: true,
          borderVisible: false,
          visible: true,
        },
        handleScroll: {
          mouseWheel: true,
          pressedMouseMove: true,
          horzTouchDrag: true,
          vertTouchDrag: true,
        },
        handleScale: {
          axisPressedMouseMove: true,
          mouseWheel: true,
          pinch: true,
        },
      });

      const lineSeries = chart.addSeries(LineSeries, {
        color: "#4caf50",
        lineWidth: 2,
        lineStyle: 0,
        lineType: 0,
        crosshairMarkerVisible: true,
        crosshairMarkerRadius: 4,
        crosshairMarkerBorderColor: "#4caf50",
        crosshairMarkerBackgroundColor: "#4caf50",
        lastValueVisible: true,
        priceLineVisible: true,
        priceLineSource: 0,
        priceLineWidth: 1,
        priceLineColor: "#4caf50",
        priceLineStyle: 2,
        baseLineVisible: false,
        priceFormat: {
          type: "price",
          precision: 6,
          minMove: 0.000001,
        },
      });

      chartRef.current = chart;
      seriesRef.current = lineSeries;

      const handleResize = () => {
        if (chartContainerRef.current && chartRef.current) {
          chartRef.current.applyOptions({
            width: chartContainerRef.current.clientWidth,
          });
        }
      };

      window.addEventListener("resize", handleResize);

      return () => {
        window.removeEventListener("resize", handleResize);
        if (chartRef.current) {
          chartRef.current.remove();
          chartRef.current = null;
          seriesRef.current = null;
        }
      };
    } catch (error) {
      console.error("Error initializing chart:", error);
      setError("Failed to initialize chart");
    }
  }, []);

  // TRADES YÜKLE - DÜZELTME
  useEffect(() => {
    const loadTrades = async () => {
      if (!project?.id) return;

      setLoading(true);

      const { trades: tradesData, prices } = await fetchTrades(
        project.id,
        timeFilter
      );
      setTrades(tradesData);

      // EĞER TİMEFRAME'DE TRADE YOKSA SON BİLİNEN FİYATI AL
      if (tradesData.length === 0) {
        console.log(
          "❌ Bu timeframe'de trade yok, son bilinen fiyat alınıyor..."
        );
        const lastPrice = await fetchLastKnownPrice(project.id);
        setLastKnownPrice(lastPrice);
        setAggregatedData([]);
        if (seriesRef.current) {
          seriesRef.current.setData([]);
        }
      } else {
        console.log("✅ Trade var, normal işlem");
        setLastKnownPrice(null);
        const aggregated = aggregateTradeData(tradesData, timeFilter, prices);
        setAggregatedData(aggregated);

        if (seriesRef.current) {
          if (aggregated.length > 0) {
            seriesRef.current.setData(aggregated);
            setTimeout(() => {
              if (chartRef.current) {
                chartRef.current.timeScale().fitContent();
              }
            }, 100);
          } else {
            seriesRef.current.setData([]);
          }
        }
      }

      setLoading(false);
    };

    loadTrades();
  }, [project?.id, timeFilter]);

  // STATS HESAPLAMA - CHANGE HESAPLAMASINI DÜZELT
  const calculateStats = () => {
    // EĞER DATA YOK AMA SON BİLİNEN FİYAT VARSA
    if (aggregatedData.length === 0) {
      if (lastKnownPrice) {
        console.log("📊 Son bilinen fiyat kullanılıyor:", lastKnownPrice.price);
        return {
          totalVolume: 0,
          lastPrice: lastKnownPrice.price,
          priceChange: 0,
          priceChangePercent: 0,
          totalTrades: 0,
          high24h: lastKnownPrice.price,
          low24h: lastKnownPrice.price,
          avgPrice: lastKnownPrice.price,
          isLastKnown: true,
        };
      }

      return {
        totalVolume: 0,
        lastPrice: 0,
        priceChange: 0,
        priceChangePercent: 0,
        totalTrades: 0,
        high24h: 0,
        low24h: 0,
        avgPrice: 0,
        isLastKnown: false,
      };
    }

    const totalVolume = aggregatedData.reduce(
      (sum, item) => sum + (item.volume || 0),
      0
    );
    const totalTrades = aggregatedData.reduce(
      (sum, item) => sum + (item.trades || 0),
      0
    );

    // HAM DEĞERLER - PRECISION İLE
    const lastDataPoint = aggregatedData[aggregatedData.length - 1];
    const firstDataPoint = aggregatedData[0];

    // PRECISION 15 HANELİ HESAPLAMA
    const lastPrice = Number(lastDataPoint?.value || 0);
    const firstPrice = Number(firstDataPoint?.value || 0);

    // CHANGE HESAPLAMASINI DÜZELT
    const priceChange = lastPrice - firstPrice;

    // YÜZDE HESAPLAMASINI TAM DOĞRU YAP
    let priceChangePercent = 0;
    if (firstPrice > 0) {
      priceChangePercent = ((lastPrice - firstPrice) / firstPrice) * 100;
    }

    // DETAYLI DEBUG - HER HESAPLAMADA GÖSTER
    console.log("🔥 CHANGE HESAPLAMA DEBUG:");
    console.log("===============================");
    console.log("First Price (başlangıç):", firstPrice);
    console.log("Last Price (son):", lastPrice);
    console.log("Price Change (fark):", priceChange);
    console.log(
      "Hesaplama: (" +
        lastPrice +
        " - " +
        firstPrice +
        ") / " +
        firstPrice +
        " * 100"
    );
    console.log("Sonuç:", priceChangePercent);
    console.log("Yuvarlanmış:", priceChangePercent.toFixed(2));
    console.log("===============================");

    // MANUEL TEST - 1.331 -> 1.597200
    if (firstPrice > 0) {
      const manualTest = ((1.5972 - 1.331) / 1.331) * 100;
      console.log(
        "MANUEL TEST (1.331 -> 1.597200):",
        manualTest.toFixed(4),
        "%"
      );
    }

    const allPrices = aggregatedData
      .map((item) => item.value)
      .filter((price) => price > 0);

    const high24h = allPrices.length > 0 ? Math.max(...allPrices) : 0;
    const low24h = allPrices.length > 0 ? Math.min(...allPrices) : 0;
    const avgPrice =
      allPrices.length > 0
        ? allPrices.reduce((a, b) => a + b, 0) / allPrices.length
        : 0;

    return {
      totalVolume,
      lastPrice,
      priceChange,
      priceChangePercent,
      totalTrades,
      high24h,
      low24h,
      avgPrice,
      isLastKnown: false,
    };
  };

  const stats = calculateStats();

  return (
    <div className="bg-[#192630] rounded-2xl border border-gray-700 overflow-hidden">
      {/* Chart Header */}
      <div className="p-6 border-b border-gray-700 bg-gradient-to-r from-gray-800/50 to-gray-700/50">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-white">
              ${project?.symbol?.toUpperCase() || "TKN"} Price Chart
            </h2>
            <p className="text-gray-400 text-sm mt-1">
              {loading
                ? "Loading price data..."
                : aggregatedData.length > 0
                ? `${
                    aggregatedData.length
                  } data points • ${timeFilter.toUpperCase()} timeframe • USD prices`
                : stats.isLastKnown
                ? `No data for ${timeFilter.toUpperCase()} • Showing last known price`
                : `No data for ${timeFilter.toUpperCase()} period`}
            </p>
          </div>

          {/* Time Filter Buttons */}
          <div className="flex flex-wrap bg-gray-800/50 rounded-lg p-1 gap-1">
            {timeFilters.map((filter) => (
              <button
                key={filter.value}
                onClick={() => setTimeFilter(filter.value)}
                disabled={loading}
                className={`px-3 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
                  timeFilter === filter.value
                    ? "bg-blue-600 text-white shadow-lg"
                    : "text-gray-400 hover:text-white hover:bg-gray-700"
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {filter.label}
              </button>
            ))}
          </div>

          {/* SON FİYAT GÖSTER - DATA VAR VEYA SON BİLİNEN FİYAT VARSA */}
          {!loading && stats.lastPrice > 0 && (
            <div className="text-right">
              <div className="text-2xl font-bold text-white">
                ${stats.lastPrice.toFixed(6)}
                {stats.isLastKnown && (
                  <span className="text-xs text-yellow-400 ml-2">
                    Last Known
                  </span>
                )}
              </div>
              {!stats.isLastKnown && stats.priceChangePercent !== 0 && (
                <div
                  className={`text-sm font-medium ${
                    stats.priceChangePercent >= 0
                      ? "text-green-400"
                      : "text-red-400"
                  }`}
                >
                  {/* HASSAS CHANGE GÖSTER */}
                  {stats.priceChangePercent >= 0 ? "+" : ""}
                  {Number(stats.priceChangePercent).toFixed(2)}%
                  <span className="text-gray-400 ml-1">
                    (${stats.priceChange >= 0 ? "+" : ""}
                    {Number(stats.priceChange).toFixed(6)})
                  </span>
                  {/* DEBUG BİLGİSİ - DEVELOPMENT İÇİN */}
                  <div className="text-xs text-gray-500 mt-1">
                    Raw: {Number(stats.priceChangePercent).toFixed(6)}%
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Chart Container */}
      <div className="relative">
        {loading && (
          <div className="absolute inset-0 bg-gray-900/50 flex items-center justify-center z-10 backdrop-blur-sm">
            <div className="flex items-center gap-3 text-white bg-gray-800/80 px-6 py-3 rounded-lg">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
              <span className="font-medium">Loading {timeFilter} data...</span>
            </div>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 bg-gray-900/50 flex items-center justify-center z-10">
            <div className="text-center bg-gray-800/90 p-6 rounded-lg border border-red-500/20">
              <div className="text-red-400 text-lg font-semibold mb-2">
                Chart Error
              </div>
              <div className="text-gray-300 text-sm">{error}</div>
              <button
                onClick={() => window.location.reload()}
                className="mt-3 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm transition-colors"
              >
                Retry
              </button>
            </div>
          </div>
        )}

        <div ref={chartContainerRef} className="w-full h-[450px]" />

        {/* DATA YOK AMA SON FİYAT VAR */}
        {!loading &&
          !error &&
          aggregatedData.length === 0 &&
          stats.isLastKnown && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-gray-400 text-center">
                <div className="text-6xl mb-4">⏰</div>
                <div className="text-xl font-semibold mb-2">
                  No Recent Trades
                </div>
                <div className="text-sm">
                  No trades in {timeFilter.toUpperCase()} period
                </div>
                <div className="text-yellow-400 text-lg mt-3 font-semibold">
                  Last Known Price: ${stats.lastPrice.toFixed(6)}
                </div>
              </div>
            </div>
          )}

        {/* HİÇ DATA YOK */}
        {!loading &&
          !error &&
          aggregatedData.length === 0 &&
          !stats.isLastKnown && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-gray-400 text-center">
                <div className="text-6xl mb-4">📈</div>
                <div className="text-xl font-semibold mb-2">
                  No Trading Data
                </div>
                <div className="text-sm">
                  No trades found for the {timeFilter.toUpperCase()} period
                </div>
                <div className="text-xs text-gray-500 mt-2">
                  Try selecting a different time range
                </div>
              </div>
            </div>
          )}
      </div>

      {/* Chart Stats - CHANGE KISMINI DÜZELT */}
      {!loading && (aggregatedData.length > 0 || stats.isLastKnown) && (
        <div className="p-6 border-t border-gray-700">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
            <div className="text-center">
              <div className="text-sm text-gray-400 mb-1">Volume (USD)</div>
              <div className="text-lg font-bold text-white">
                $
                {stats.totalVolume.toLocaleString(undefined, {
                  maximumFractionDigits: 2,
                  notation:
                    stats.totalVolume > 1000000 ? "compact" : "standard",
                })}
              </div>
            </div>

            <div className="text-center">
              <div className="text-sm text-gray-400 mb-1">Trades</div>
              <div className="text-lg font-bold text-white">
                {stats.totalTrades.toLocaleString()}
              </div>
            </div>

            <div className="text-center">
              <div className="text-sm text-gray-400 mb-1">
                {stats.isLastKnown ? "Last Known Price" : "Current Price"}
              </div>
              <div className="text-lg font-bold text-white">
                $
                {stats.lastPrice > 0
                  ? stats.lastPrice.toFixed(8)
                  : "0.00000000"}
              </div>
            </div>

            <div className="text-center">
              <div className="text-sm text-gray-400 mb-1">Change</div>
              <div
                className={`text-lg font-bold ${
                  stats.isLastKnown
                    ? "text-gray-400"
                    : stats.priceChangePercent >= 0
                    ? "text-green-400"
                    : "text-red-400"
                }`}
              >
                {stats.isLastKnown ? (
                  "N/A"
                ) : (
                  <>
                    {stats.priceChangePercent >= 0 ? "+" : ""}
                    {Number(stats.priceChangePercent).toFixed(2)}%
                    {/* DEBUG ALTINDA HAM DEĞER GÖSTER */}
                    <div className="text-xs text-gray-500 font-normal">
                      Raw: {Number(stats.priceChangePercent).toFixed(6)}%
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="text-center">
              <div className="text-sm text-gray-400 mb-1">High</div>
              <div className="text-lg font-bold text-white">
                ${stats.high24h > 0 ? stats.high24h.toFixed(8) : "0.00000000"}
              </div>
            </div>

            <div className="text-center">
              <div className="text-sm text-gray-400 mb-1">Low</div>
              <div className="text-lg font-bold text-white">
                ${stats.low24h > 0 ? stats.low24h.toFixed(8) : "0.00000000"}
              </div>
            </div>

            <div className="text-center">
              <div className="text-sm text-gray-400 mb-1">Avg Price</div>
              <div className="text-lg font-bold text-white">
                ${stats.avgPrice > 0 ? stats.avgPrice.toFixed(8) : "0.00000000"}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Currency Rates Info */}
      {!loading &&
        Object.keys(currencyPrices).length > 0 &&
        aggregatedData.length > 0 && (
          <div className="px-6 pb-4">
            <div className="text-xs text-gray-500">
              Current rates used:{" "}
              {Object.entries(currencyPrices)
                .map(
                  ([currency, price]) =>
                    `${currency.toUpperCase()}=$${price.toFixed(2)}`
                )
                .join(", ")}
            </div>
          </div>
        )}
    </div>
  );
};

export default TradingChart;
