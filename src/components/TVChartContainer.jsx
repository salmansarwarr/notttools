import React, { useEffect, useRef } from 'react';
import { Connection } from '@solana/web3.js';
import BondingCurveDatafeed from '../utils/BondingCurveDataFeed';
import './TVChartContainer.css';

const TVChartContainer = ({ 
  symbol = 'TOKEN/SOL', 
  programId, 
  tokenMint,
  rpcUrl
}) => {
  const chartContainerRef = useRef();
  const tvWidgetRef = useRef(null);

  useEffect(() => {
    console.log('📊 TVChartContainer mounted');
    console.log('Props:', { symbol, programId, tokenMint, rpcUrl });

    let checkInterval;
    let checkCount = 0;
    const maxChecks = 50; // 5 seconds max

    const initializeChart = () => {
      console.log('🚀 Initializing chart...');
      
      try {
        const connection = new Connection(rpcUrl);
        
        const datafeed = new BondingCurveDatafeed(
          connection,
          programId,
          tokenMint
        );

        const widgetOptions = {
          symbol: symbol,
          datafeed: datafeed,
          interval: '15',
          container: chartContainerRef.current,
          library_path: '/charting_library/',
          locale: 'en',
          
          disabled_features: [
            'use_localstorage_for_settings',
            'volume_force_overlay',
            'header_compare',
            'header_screenshot',
            'header_saveload',
          ],
          
          enabled_features: [
            'study_templates',
          ],
          
          fullscreen: false,
          autosize: true,
          theme: 'Dark',
          
          overrides: {
            'mainSeriesProperties.candleStyle.upColor': '#26a69a',
            'mainSeriesProperties.candleStyle.downColor': '#ef5350',
            'mainSeriesProperties.candleStyle.borderUpColor': '#26a69a',
            'mainSeriesProperties.candleStyle.borderDownColor': '#ef5350',
            'mainSeriesProperties.candleStyle.wickUpColor': '#26a69a',
            'mainSeriesProperties.candleStyle.wickDownColor': '#ef5350',
            'paneProperties.background': '#131722',
            'paneProperties.backgroundType': 'solid',
            'paneProperties.vertGridProperties.color': '#2a2e39',
            'paneProperties.horzGridProperties.color': '#2a2e39',
            'scalesProperties.textColor': '#787b86',
            'scalesProperties.lineColor': '#2a2e39',
          },
          
          loading_screen: { 
            backgroundColor: '#131722',
            foregroundColor: '#2962ff',
          },
        };

        console.log('Creating TradingView widget...');
        const tvWidget = new window.TradingView.widget(widgetOptions);
        tvWidgetRef.current = tvWidget;

        tvWidget.onChartReady(() => {
          console.log('✅ Chart ready!');
        });

      } catch (error) {
        console.error('❌ Error initializing chart:', error);
      }
    };

    // Check for TradingView library
    checkInterval = setInterval(() => {
      checkCount++;
      
      if (window.TradingView?.widget) {
        console.log('✅ TradingView library loaded');
        clearInterval(checkInterval);
        initializeChart();
      } else if (checkCount >= maxChecks) {
        console.error('❌ TradingView library failed to load after 5 seconds');
        clearInterval(checkInterval);
      } else {
        console.log(`⏳ Waiting for TradingView library... (${checkCount}/${maxChecks})`);
      }
    }, 100);

    return () => {
      if (checkInterval) {
        clearInterval(checkInterval);
      }
      if (tvWidgetRef.current) {
        tvWidgetRef.current.remove();
        tvWidgetRef.current = null;
      }
    };
  }, [symbol, programId, tokenMint, rpcUrl]);

  return (
    <div className="tv-chart-container">
      <div ref={chartContainerRef} className="tv-chart" />
    </div>
  );
};

export default TVChartContainer;