import { Connection, PublicKey } from '@solana/web3.js';

class BondingCurveDatafeed {
  constructor(connection, programId, tokenMint) {
    this.connection = connection;
    this.programId = new PublicKey(programId);
    this.tokenMint = new PublicKey(tokenMint);
    this.subscribers = {};
    this.lastBar = null;
    this.bondingCurveData = null;
    
    console.log('📊 Datafeed initialized:', {
      programId: this.programId.toString(),
      tokenMint: this.tokenMint.toString(),
    });
  }

  onReady(callback) {
    console.log('[onReady]: Called');
    setTimeout(() => {
      callback({
        supported_resolutions: ['1', '5', '15', '60', '1D'],
        supports_marks: false,
        supports_timescale_marks: false,
        supports_time: true,
      });
    }, 0);
  }

  searchSymbols(userInput, exchange, symbolType, onResultReadyCallback) {
    console.log('[searchSymbols]: Called');
    onResultReadyCallback([]);
  }

  resolveSymbol(symbolName, onSymbolResolvedCallback, onResolveErrorCallback) {
    console.log('[resolveSymbol]: Called', symbolName);

    const symbolInfo = {
      ticker: symbolName,
      name: symbolName,
      description: 'Bonding Curve Token',
      type: 'crypto',
      session: '24x7',
      timezone: 'Etc/UTC',
      exchange: 'Solana',
      minmov: 1,
      pricescale: 100000000, // 8 decimals for price display
      has_intraday: true,
      has_no_volume: false,
      supported_resolutions: ['1', '5', '15', '60', '1D'],
      volume_precision: 2,
      data_status: 'streaming',
    };

    setTimeout(() => {
      onSymbolResolvedCallback(symbolInfo);
    }, 0);
  }

  async getBars(symbolInfo, resolution, periodParams, onHistoryCallback, onErrorCallback) {
    const { from, to, firstDataRequest } = periodParams;

    console.log('[getBars]: Called', {
      from: new Date(from * 1000).toISOString(),
      to: new Date(to * 1000).toISOString(),
      firstDataRequest,
    });

    try {
      // Step 1: Fetch bonding curve state
      console.log('Fetching bonding curve state...');
      const bondingCurveState = await this.fetchBondingCurveState();
      
      if (!bondingCurveState) {
        console.error('❌ No bonding curve state found');
        onHistoryCallback([], { noData: true });
        return;
      }

      console.log('✅ Bonding curve state:', bondingCurveState);
      this.bondingCurveData = bondingCurveState;

      // Calculate current price
      const currentPrice = this.calculateCurrentPrice(bondingCurveState);
      console.log('💰 Current price:', currentPrice);

      if (currentPrice === 0) {
        console.error('❌ Price is zero');
        onHistoryCallback([], { noData: true });
        return;
      }

      // Step 2: Try to fetch real trade history
      console.log('Fetching trade history...');
      const trades = await this.fetchTradeHistory(from, to);
      console.log(`📈 Found ${trades.length} trades`);

      let bars;

      if (trades.length === 0) {
        // No trades found - create synthetic data
        console.log('⚠️ No trades found, creating synthetic bars');
        bars = this.createSyntheticBars(currentPrice, from, to, resolution);
      } else {
        // Convert real trades to bars
        bars = this.convertTradesToBars(trades, resolution);
        
        // If still no bars, fallback to synthetic
        if (bars.length === 0) {
          console.log('⚠️ No bars after conversion, using synthetic');
          bars = this.createSyntheticBars(currentPrice, from, to, resolution);
        }
      }

      console.log(`📊 Returning ${bars.length} bars`);
      
      if (bars.length > 0) {
        this.lastBar = bars[bars.length - 1];
        console.log('Last bar:', this.lastBar);
        onHistoryCallback(bars, { noData: false });
      } else {
        console.log('❌ No bars to return');
        onHistoryCallback([], { noData: true });
      }

    } catch (error) {
      console.error('[getBars]: Error:', error);
      onErrorCallback(error.message);
    }
  }

  /**
   * Create synthetic bars when no real data exists
   */
  createSyntheticBars(price, fromTimestamp, toTimestamp, resolution) {
    const intervalMs = this.getIntervalMs(resolution);
    const bars = [];
    
    // Create bars from fromTimestamp to toTimestamp
    let currentTime = Math.floor(fromTimestamp * 1000 / intervalMs) * intervalMs;
    const endTime = toTimestamp * 1000;
    
    // Limit to max 100 bars
    let count = 0;
    while (currentTime <= endTime && count < 100) {
      bars.push({
        time: currentTime,
        open: price,
        high: price * 1.001, // Small variation
        low: price * 0.999,
        close: price,
        volume: 0,
      });
      
      currentTime += intervalMs;
      count++;
    }
    
    return bars;
  }

  async fetchBondingCurveState() {
    try {
      const [bondingCurvePDA] = PublicKey.findProgramAddressSync(
        [Buffer.from('bonding_curve'), this.tokenMint.toBuffer()],
        this.programId
      );

      console.log('Fetching PDA:', bondingCurvePDA.toString());

      const accountInfo = await this.connection.getAccountInfo(bondingCurvePDA);
      
      if (!accountInfo) {
        console.error('Account not found');
        return null;
      }

      const data = this.parseBondingCurveAccount(accountInfo.data);
      return data;
    } catch (error) {
      console.error('Error fetching bonding curve:', error);
      return null;
    }
  }

  parseBondingCurveAccount(data) {
    let offset = 8;

    const readU64 = () => {
      const value = data.readBigUInt64LE(offset);
      offset += 8;
      return Number(value);
    };

    const readPubkey = () => {
      const pubkey = new PublicKey(data.slice(offset, offset + 32));
      offset += 32;
      return pubkey;
    };

    const readBool = () => {
      const value = data[offset] !== 0;
      offset += 1;
      return value;
    };

    const readOptionPubkey = () => {
      const hasValue = data[offset] !== 0;
      offset += 1;
      if (hasValue) {
        return readPubkey();
      }
      return null;
    };

    const readI64 = () => {
      const value = data.readBigInt64LE(offset);
      offset += 8;
      return Number(value);
    };

    const readU8 = () => {
      const value = data[offset];
      offset += 1;
      return value;
    };

    return {
      tokenMint: readPubkey(),
      creator: readPubkey(),
      virtualTokenReserves: readU64(),
      virtualSolReserves: readU64(),
      realTokenReserves: readU64(),
      realSolReserves: readU64(),
      totalSupply: readU64(),
      migrationThreshold: readU64(),
      isMigrated: readBool(),
      migrationSol: readU64(),
      migrationTokens: readU64(),
      firstBuyer: readOptionPubkey(),
      firstBuyerLockedAmount: readU64(),
      firstBuyerLockActive: readBool(),
      holderThreshold: readU64(),
      volumeThreshold: readU64(),
      currentHolderCount: readU64(),
      totalVolumeUsd: readU64(),
      lastHolderUpdate: readI64(),
      lastVolumeUpdate: readI64(),
      unlockable: readBool(),
      oracleAuthority: readPubkey(),
      tokenVaultBump: readU8(),
      solVaultBump: readU8(),
      bump: readU8(),
    };
  }

  calculateCurrentPrice(bondingCurve) {
    const totalSol = bondingCurve.virtualSolReserves + bondingCurve.realSolReserves;
    const totalTokens = bondingCurve.virtualTokenReserves + bondingCurve.realTokenReserves;

    if (totalTokens === 0) return 0;

    // Price in lamports per token (before decimal adjustment)
    const priceRaw = totalSol / totalTokens;
    
    // Convert to human-readable: SOL (9 decimals) / Tokens (9 decimals)
    return priceRaw;
  }

  async fetchTradeHistory(fromTimestamp, toTimestamp) {
    try {
      const [bondingCurvePDA] = PublicKey.findProgramAddressSync(
        [Buffer.from('bonding_curve'), this.tokenMint.toBuffer()],
        this.programId
      );

      console.log('Fetching signatures...');
      
      // Fetch limited signatures
      const signatures = await this.connection.getSignaturesForAddress(
        bondingCurvePDA,
        { limit: 30 }
      );

      console.log(`Found ${signatures.length} signatures`);

      const trades = [];

      // Process in small batches
      for (let i = 0; i < Math.min(signatures.length, 10); i += 2) {
        const batch = signatures.slice(i, i + 2);
        
        try {
          const txs = await this.connection.getParsedTransactions(
            batch.map(sig => sig.signature),
            { maxSupportedTransactionVersion: 0 }
          );

          for (const tx of txs) {
            if (!tx?.blockTime) continue;
            if (tx.blockTime < fromTimestamp || tx.blockTime > toTimestamp) continue;

            const trade = this.parseTradeFromTransaction(tx);
            if (trade) {
              console.log('✅ Parsed trade:', trade);
              trades.push(trade);
            }
          }
        } catch (err) {
          console.error('Batch error:', err);
        }

        // Rate limit delay
        await new Promise(resolve => setTimeout(resolve, 250));
      }

      return trades.sort((a, b) => a.time - b.time);
    } catch (error) {
      console.error('Error fetching trades:', error);
      return [];
    }
  }

  parseTradeFromTransaction(tx) {
    if (!tx.meta?.logMessages) return null;

    const logs = tx.meta.logMessages;

    for (const log of logs) {
      // Match: "Program log: Buy: 1000000000 SOL for 50000000000 tokens"
      if (log.includes('Buy:')) {
        const match = log.match(/Buy:\s*(\d+)\s*SOL\s*for\s*(\d+)\s*tokens/i);
        if (match) {
          const solLamports = parseInt(match[1]);
          const tokenUnits = parseInt(match[2]);
          
          return {
            time: tx.blockTime * 1000,
            price: solLamports / tokenUnits,
            amount: tokenUnits / 1e9,
            solAmount: solLamports / 1e9,
            isBuy: true,
          };
        }
      } 
      
      if (log.includes('Sell:')) {
        const match = log.match(/Sell:\s*(\d+)\s*tokens\s*for\s*(\d+)\s*SOL/i);
        if (match) {
          const tokenUnits = parseInt(match[1]);
          const solLamports = parseInt(match[2]);
          
          return {
            time: tx.blockTime * 1000,
            price: solLamports / tokenUnits,
            amount: tokenUnits / 1e9,
            solAmount: solLamports / 1e9,
            isBuy: false,
          };
        }
      }
    }

    return null;
  }

  convertTradesToBars(trades, resolution) {
    const intervalMs = this.getIntervalMs(resolution);
    const bars = {};

    trades.forEach((trade) => {
      const barTime = Math.floor(trade.time / intervalMs) * intervalMs;

      if (!bars[barTime]) {
        bars[barTime] = {
          time: barTime,
          open: trade.price,
          high: trade.price,
          low: trade.price,
          close: trade.price,
          volume: trade.amount,
        };
      } else {
        bars[barTime].high = Math.max(bars[barTime].high, trade.price);
        bars[barTime].low = Math.min(bars[barTime].low, trade.price);
        bars[barTime].close = trade.price;
        bars[barTime].volume += trade.amount;
      }
    });

    return Object.values(bars).sort((a, b) => a.time - b.time);
  }

  getIntervalMs(resolution) {
    if (resolution.includes('D')) {
      return parseInt(resolution) * 24 * 60 * 60 * 1000;
    }
    return parseInt(resolution) * 60 * 1000;
  }

  subscribeBars(symbolInfo, resolution, onRealtimeCallback, subscriberUID) {
    console.log('[subscribeBars]:', subscriberUID);
    
    this.subscribers[subscriberUID] = {
      onRealtimeCallback,
      resolution,
    };

    // Start polling for updates every 10 seconds
    this.startPolling(subscriberUID, resolution, onRealtimeCallback);
  }

  unsubscribeBars(subscriberUID) {
    console.log('[unsubscribeBars]:', subscriberUID);
    
    if (this.subscribers[subscriberUID]?.intervalId) {
      clearInterval(this.subscribers[subscriberUID].intervalId);
    }
    
    delete this.subscribers[subscriberUID];
  }

  startPolling(subscriberUID, resolution, callback) {
    const intervalId = setInterval(async () => {
      try {
        const bondingCurve = await this.fetchBondingCurveState();
        if (!bondingCurve) return;

        const currentPrice = this.calculateCurrentPrice(bondingCurve);
        
        const trade = {
          time: Date.now(),
          price: currentPrice,
          amount: 0,
        };

        this.updateBar(trade, resolution, callback);
      } catch (error) {
        console.error('Polling error:', error);
      }
    }, 10000); // Poll every 10 seconds

    this.subscribers[subscriberUID].intervalId = intervalId;
  }

  updateBar(trade, resolution, callback) {
    const intervalMs = this.getIntervalMs(resolution);
    const barTime = Math.floor(trade.time / intervalMs) * intervalMs;

    if (!this.lastBar || barTime > this.lastBar.time) {
      const newBar = {
        time: barTime,
        open: trade.price,
        high: trade.price,
        low: trade.price,
        close: trade.price,
        volume: trade.amount,
      };
      this.lastBar = newBar;
      callback(newBar);
    } else if (barTime === this.lastBar.time) {
      this.lastBar.high = Math.max(this.lastBar.high, trade.price);
      this.lastBar.low = Math.min(this.lastBar.low, trade.price);
      this.lastBar.close = trade.price;
      this.lastBar.volume += trade.amount;
      callback(this.lastBar);
    }
  }
}

export default BondingCurveDatafeed;