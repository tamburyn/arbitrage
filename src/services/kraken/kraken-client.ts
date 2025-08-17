import type { 
  KrakenOrderBookResponse, 
  KrakenTickerResponse, 
  KrakenAssetPairsResponse,
  KrakenOrderBookSnapshot,
  KrakenConnectionStatus 
} from './types';
import { SupabaseService } from '../database/supabase-service';
import { logger } from '../../utils/logger';
import { ErrorHandler } from '../../utils/error-handler';
import { CONFIG } from '../../constants/crypto-assets';

export class KrakenClient {
  private baseUrl = 'https://api.kraken.com/0';
  private supabaseService: SupabaseService;
  private symbolMap: Map<string, string>;
  private pairMap: Map<string, string>;
  private exchangeId: string | null = null;
  private connectionStatus: KrakenConnectionStatus;

  constructor() {
    if (!process.env.KRAKEN_API_KEY || !process.env.KRAKEN_SECRET_KEY) {
      logger.warn('Kraken API credentials not found - Kraken integration will be disabled');
    }

    this.supabaseService = new SupabaseService();
    this.symbolMap = new Map();
    this.pairMap = new Map();
    
    // Initialize Kraken symbol mappings
    this.symbolMap.set('BTC', 'XBT');
    this.symbolMap.set('DOGE', 'XDG');
    this.symbolMap.set('USDT', 'USD');  // Kraken uses USD instead of USDT
    
    this.connectionStatus = {
      isConnected: false,
      lastUpdate: null,
      errorCount: 0
    };

    logger.info('KrakenClient initialized');
  }

  async initialize(): Promise<void> {
    try {
      // Ensure exchange exists in database
      this.exchangeId = await this.supabaseService.ensureExchangeExists('Kraken');
      
      // Initialize asset pairs mapping
      await this.initializePairMappings();
      
      this.connectionStatus.isConnected = true;
      this.connectionStatus.lastUpdate = new Date().toISOString();
      
      logger.info('✅ Kraken client initialized successfully');
    } catch (error) {
      this.connectionStatus.isConnected = false;
      this.connectionStatus.errorCount++;
      this.connectionStatus.lastError = error.message;
      
      ErrorHandler.handle(error, 'KrakenClient.initialize');
      throw error;
    }
  }

  private async initializePairMappings(): Promise<void> {
    try {
      const response = await this.makeRequest('/public/AssetPairs') as KrakenAssetPairsResponse;
      
      if (response.error && response.error.length > 0) {
        throw new Error(`Kraken API error: ${response.error.join(', ')}`);
      }

      // Store the mapping of our standard pairs to Kraken's pair names
      Object.entries(response.result).forEach(([krakenPair, info]) => {
        // Extract base and quote from wsname which is more reliable
        const wsname = info.wsname || krakenPair;
        const [base, quote] = wsname.split('/');
        
        if (base && quote) {
          const standardPair = `${base}/${quote}`;  // ✅ Use "/" separator like legacy
          this.pairMap.set(standardPair, krakenPair);
          
          // Also store common symbol mappings (with "/" separator)
          if (base === 'XBT') this.pairMap.set(`BTC/${quote}`, krakenPair);
          if (base === 'XXBT') this.pairMap.set(`BTC/${quote}`, krakenPair);
          if (quote === 'USD') this.pairMap.set(`${base}/USDT`, krakenPair);  // Map USD to USDT
          
          logger.debug(`Added Kraken pair mapping: ${standardPair} -> ${krakenPair}`);
        }
      });

      logger.info(`Initialized ${this.pairMap.size} Kraken pair mappings`);
    } catch (error) {
      ErrorHandler.handle(error, 'KrakenClient.initializePairMappings');
      throw error;
    }
  }

  private getKrakenSymbol(symbol: string): string {
    // Convert common symbols to Kraken format (like legacy)
    const baseSymbol = this.symbolMap.get(symbol) || symbol;
    const quoteSymbol = 'USD';  // Kraken uses USD, not USDT
    
    // Try to find the pair in our mapping (with "/" separator like legacy)
    const standardPair = `${baseSymbol}/${quoteSymbol}`;  // "BTC/USD"
    const usdtPair = `${baseSymbol}/USDT`;  // "BTC/USDT" mapped to USD pair
    
    const krakenPair = this.pairMap.get(standardPair) || this.pairMap.get(usdtPair);
    
    if (!krakenPair) {
      logger.debug(`No Kraken pair mapping found for: ${symbol}, trying fallback`);
      return `${baseSymbol}${quoteSymbol}`; // Fallback without "/"
    }

    logger.debug(`Using Kraken pair: ${symbol} -> ${krakenPair}`);
    return krakenPair;
  }

  private async makeRequest(endpoint: string, params: any = {}): Promise<any> {
    const url = new URL(`${this.baseUrl}${endpoint}`);
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, value as string);
    });

    const response = await fetch(url.toString());
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  }

  async getOrderBook(symbol: string): Promise<KrakenOrderBookSnapshot> {
    return await ErrorHandler.withRetry(
      async () => {
        const pair = this.getKrakenSymbol(symbol);
        
        logger.debug(`Fetching orderbook for ${symbol} (${pair})`);
        
        // Get asset ID
        const assetId = await this.supabaseService.ensureAssetExists(symbol);
        
        // Fetch orderbook and ticker data in parallel
        const [orderbookResponse, tickerResponse] = await Promise.all([
          this.makeRequest('/public/Depth', { pair, count: 20 }) as Promise<KrakenOrderBookResponse>,
          this.makeRequest('/public/Ticker', { pair }) as Promise<KrakenTickerResponse>
        ]);

        // Check for API errors
        if (orderbookResponse.error && orderbookResponse.error.length > 0) {
          throw new Error(`Kraken orderbook API error: ${orderbookResponse.error.join(', ')}`);
        }
        
        if (tickerResponse.error && tickerResponse.error.length > 0) {
          throw new Error(`Kraken ticker API error: ${tickerResponse.error.join(', ')}`);
        }

        // Get the orderbook data (first result key)
        const orderbookKey = Object.keys(orderbookResponse.result)[0];
        const orderbook = orderbookResponse.result[orderbookKey];
        
        if (!orderbook) {
          throw new Error(`No orderbook data returned for ${pair}`);
        }

        // Get ticker data for volume
        const tickerKey = Object.keys(tickerResponse.result)[0];
        const ticker = tickerResponse.result[tickerKey];
        
        // Transform to our standard format
        const bids: [number, number][] = orderbook.bids.map(([price, quantity]) => [
          parseFloat(price),
          parseFloat(quantity)
        ]);
        
        const asks: [number, number][] = orderbook.asks.map(([price, quantity]) => [
          parseFloat(price),
          parseFloat(quantity)
        ]);

        // Calculate spread
        const bestBid = bids[0]?.[0] || 0;
        const bestAsk = asks[0]?.[0] || 0;
        const spread = bestAsk > 0 && bestBid > 0 ? ((bestAsk - bestBid) / bestBid) * 100 : 0;
        const validSpread = Math.max(spread, CONFIG.MINIMUM_SPREAD);

        // Get volume (24h)
        const volume = ticker ? parseFloat(ticker.v[1]) : null;

        const snapshot: KrakenOrderBookSnapshot = {
          asset_id: assetId,
          exchange_id: this.exchangeId!,
          snapshot: {
            bids,
            asks,
            lastUpdateId: Date.now().toString() // Kraken doesn't provide update ID
          },
          spread: validSpread,
          timestamp: new Date().toISOString(),
          volume,
          symbol
        };

        this.connectionStatus.lastUpdate = new Date().toISOString();
        this.connectionStatus.errorCount = 0;

        logger.debug(`Transformed ${symbol} (Kraken): spread=${validSpread.toFixed(4)}%, volume=${volume}`);
        return snapshot;
      },
      3,  // maxRetries
      1000,  // delay
      `KrakenClient.getOrderBook.${symbol}`  // context
    );
  }

  async getMultipleOrderBooks(symbols: string[]): Promise<Map<string, KrakenOrderBookSnapshot>> {
    const results = new Map<string, KrakenOrderBookSnapshot>();
    
    logger.info(`Starting Kraken batch orderbook collection for ${symbols.length} symbols`);
    
    // Process symbols in batches to avoid rate limits
    const batchSize = 3; // Kraken has stricter rate limits
    const batches = [];
    
    for (let i = 0; i < symbols.length; i += batchSize) {
      batches.push(symbols.slice(i, i + batchSize));
    }

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      logger.debug(`Processing Kraken batch ${i + 1}: ${batch.join(', ')}`);
      
      const batchPromises = batch.map(async (symbol) => {
        try {
          const snapshot = await this.getOrderBook(symbol);
          return { symbol, snapshot, success: true };
        } catch (error) {
          ErrorHandler.handle(error, `KrakenClient.getMultipleOrderBooks.${symbol}`);
          return { symbol, error, success: false };
        }
      });

      const batchResults = await Promise.allSettled(batchPromises);
      
      batchResults.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value.success) {
          results.set(result.value.symbol, result.value.snapshot);
        }
      });

      // Add delay between batches to respect rate limits
      if (i < batches.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay
      }
    }

    const successCount = results.size;
    const failureCount = symbols.length - successCount;
    
    logger.info(`Kraken batch collection completed: ${successCount}/${symbols.length} successful`);
    
    if (failureCount > 0) {
      logger.warn(`${failureCount} Kraken symbols failed to collect`);
    }

    return results;
  }

  getConnectionStatus(): KrakenConnectionStatus {
    return { ...this.connectionStatus };
  }

  async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; details: any }> {
    try {
      // Simple API call to check connectivity
      const response = await this.makeRequest('/public/Time');
      
      if (response.error && response.error.length > 0) {
        throw new Error(`Kraken API error: ${response.error.join(', ')}`);
      }

      return {
        status: 'healthy',
        details: {
          connected: true,
          lastUpdate: this.connectionStatus.lastUpdate,
          errorCount: this.connectionStatus.errorCount,
          serverTime: response.result?.unixtime
        }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        details: {
          connected: false,
          error: error.message,
          errorCount: this.connectionStatus.errorCount
        }
      };
    }
  }
} 