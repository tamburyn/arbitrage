import Binance from 'node-binance-api';
import type { BinanceOrderBook, OrderBookSnapshot, ConnectionStatus } from './types';
import { logger } from '../../utils/logger';
import { ErrorHandler } from '../../utils/error-handler';
import { CONFIG, QUOTE_CURRENCY } from '../../constants/crypto-assets';
import { SupabaseService } from '../database/supabase-service';

export class BinanceClient {
  private client: Binance;
  private supabaseService: SupabaseService;
  private connectionStatus: ConnectionStatus = {
    isConnected: false,
    lastUpdate: null,
    errorCount: 0
  };

  constructor() {
    const apiKey = process.env.BINANCE_API_KEY;
    const secretKey = process.env.BINANCE_SECRET_KEY;

    if (!apiKey || !secretKey) {
      throw new Error('Missing required environment variables: BINANCE_API_KEY, BINANCE_SECRET_KEY');
    }

    this.client = new Binance().options({
      APIKEY: apiKey,
      APISECRET: secretKey,
      useServerTime: true,
      recvWindow: 60000,
      test: false,
      log: () => {} // Disable Binance internal logging
    });

    this.supabaseService = new SupabaseService();
    logger.info('BinanceClient initialized');
  }

  async getOrderBook(symbol: string, limit: number = 100): Promise<BinanceOrderBook> {
    const pair = `${symbol}${QUOTE_CURRENCY}`;
    
    return await ErrorHandler.withRetry(
      async () => {
        logger.debug(`Fetching orderbook for ${pair}`);
        const orderbook = await this.client.depth(pair, limit);
        
        if (!orderbook || !orderbook.bids || !orderbook.asks) {
          throw new Error(`Invalid orderbook response for ${pair}`);
        }
        
        return orderbook;
      },
      CONFIG.MAX_RETRIES,
      CONFIG.RETRY_DELAY,
      `BinanceClient.getOrderBook.${pair}`
    );
  }

  async get24hStats(symbol: string): Promise<any> {
    const pair = `${symbol}${QUOTE_CURRENCY}`;
    
    return await ErrorHandler.withRetry(
      async () => {
        logger.debug(`Fetching 24h stats for ${pair}`);
        const stats = await this.client.prevDay(pair);
        
        if (!stats) {
          throw new Error(`Invalid 24h stats response for ${pair}`);
        }
        
        return stats;
      },
      CONFIG.MAX_RETRIES,
      CONFIG.RETRY_DELAY,
      `BinanceClient.get24hStats.${pair}`
    );
  }

  async getMultipleOrderBooks(
    symbols: string[], 
    exchangeId: string
  ): Promise<Map<string, OrderBookSnapshot>> {
    const results = new Map<string, OrderBookSnapshot>();
    
    try {
      logger.info(`Starting batch orderbook collection for ${symbols.length} symbols`);
      
      // Process symbols in batches to avoid rate limits
      for (let i = 0; i < symbols.length; i += CONFIG.BATCH_SIZE) {
        const batch = symbols.slice(i, i + CONFIG.BATCH_SIZE);
        logger.debug(`Processing batch ${Math.floor(i / CONFIG.BATCH_SIZE) + 1}: ${batch.join(', ')}`);
        
        // Process batch in parallel
        const batchPromises = batch.map(symbol => this.processSymbol(symbol, exchangeId));
        const batchResults = await Promise.allSettled(batchPromises);
        
        // Collect successful results
        batchResults.forEach((result, index) => {
          const symbol = batch[index];
          if (result.status === 'fulfilled' && result.value) {
            results.set(symbol, result.value);
          } else if (result.status === 'rejected') {
            logger.error(`Failed to process ${symbol}:`, result.reason);
            this.connectionStatus.errorCount++;
          }
        });
        
        // Add delay between batches to respect rate limits
        if (i + CONFIG.BATCH_SIZE < symbols.length) {
          await this.delay(200);
        }
      }
      
      // Update connection status
      this.connectionStatus.isConnected = results.size > 0;
      this.connectionStatus.lastUpdate = new Date().toISOString();
      
      logger.info(`Batch collection completed: ${results.size}/${symbols.length} successful`);
      return results;
      
    } catch (error) {
      this.connectionStatus.errorCount++;
      ErrorHandler.handle(error, 'BinanceClient.getMultipleOrderBooks');
      throw error;
    }
  }

  private async processSymbol(symbol: string, exchangeId: string): Promise<OrderBookSnapshot | null> {
    try {
      // Get asset ID from database
      const assetId = await this.supabaseService.ensureAssetExists(symbol);
      
      // Fetch data from Binance API in parallel
      const [orderbook, stats] = await Promise.all([
        this.getOrderBook(symbol),
        this.get24hStats(symbol)
      ]);
      
      // Transform to our standardized format
      return this.transformOrderBookData(symbol, orderbook, stats, exchangeId, assetId);
      
    } catch (error) {
      if (ErrorHandler.isBinanceError(error)) {
        logger.warn(`Binance API error for ${symbol}: ${ErrorHandler.getBinanceErrorMessage(error)}`);
      } else {
        logger.error(`Failed to process symbol ${symbol}:`, error);
      }
      return null;
    }
  }

  private transformOrderBookData(
    symbol: string, 
    orderbook: BinanceOrderBook, 
    stats: any,
    exchangeId: string,
    assetId: string
  ): OrderBookSnapshot {
    try {
      // Convert bids (buy orders) - sorted descending by price
      const bids = orderbook.bids
        .map(entry => [parseFloat(entry.price), parseFloat(entry.quantity)])
        .sort((a, b) => b[0] - a[0]) as [number, number][];
      
      // Convert asks (sell orders) - sorted ascending by price
      const asks = orderbook.asks
        .map(entry => [parseFloat(entry.price), parseFloat(entry.quantity)])
        .sort((a, b) => a[0] - b[0]) as [number, number][];
      
      // Calculate spread
      const bestBid = bids[0]?.[0] || 0;
      const bestAsk = asks[0]?.[0] || 0;
      const spread = bestAsk > 0 && bestBid > 0 ? ((bestAsk - bestBid) / bestBid) * 100 : 0;
      
      // Ensure spread meets database constraint (> 0)
      const validSpread = Math.max(spread, CONFIG.MINIMUM_SPREAD);
      
      // Create snapshot compatible with OrderbookDTO
      const snapshot: OrderBookSnapshot = {
        // Database fields - zgodne z OrderbookDTO
        asset_id: assetId,
        exchange_id: exchangeId,
        snapshot: {
          bids,
          asks,
          lastUpdateId: orderbook.lastUpdateId?.toString() || Date.now().toString()
        },
        spread: validSpread,
        timestamp: new Date().toISOString(),
        volume: parseFloat(stats.volume || '0'),
        
        // Helper field (not saved to DB)
        symbol
      };
      
      logger.debug(`Transformed ${symbol}: spread=${validSpread.toFixed(4)}%, volume=${snapshot.volume}`);
      return snapshot;
      
    } catch (error) {
      ErrorHandler.handle(error, `BinanceClient.transformOrderBookData.${symbol}`);
      throw error;
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Health check methods
  async testConnection(): Promise<boolean> {
    try {
      logger.info('Testing Binance API connection...');
      
      // Test with a simple API call
      const ticker = await this.client.prices('BTCUSDT');
      const isConnected = !!ticker && !!ticker.BTCUSDT;
      
      this.connectionStatus.isConnected = isConnected;
      this.connectionStatus.lastUpdate = new Date().toISOString();
      
      if (isConnected) {
        logger.info('Binance API connection successful');
      } else {
        logger.error('Binance API connection failed');
      }
      
      return isConnected;
      
    } catch (error) {
      this.connectionStatus.isConnected = false;
      this.connectionStatus.errorCount++;
      this.connectionStatus.lastError = ErrorHandler.getBinanceErrorMessage(error);
      
      ErrorHandler.handle(error, 'BinanceClient.testConnection');
      return false;
    }
  }

  getConnectionStatus(): ConnectionStatus {
    return { ...this.connectionStatus };
  }

  // Get list of available trading pairs
  async getAvailablePairs(): Promise<string[]> {
    try {
      const exchangeInfo = await this.client.exchangeInfo();
      
      if (!exchangeInfo || !exchangeInfo.symbols) {
        throw new Error('Invalid exchange info response');
      }
      
      // Filter for USDT pairs that are trading
      const usdtPairs = exchangeInfo.symbols
        .filter((symbol: any) => 
          symbol.quoteAsset === 'USDT' && 
          symbol.status === 'TRADING'
        )
        .map((symbol: any) => symbol.baseAsset);
      
      logger.info(`Found ${usdtPairs.length} available USDT trading pairs`);
      return usdtPairs;
      
    } catch (error) {
      ErrorHandler.handle(error, 'BinanceClient.getAvailablePairs');
      return [];
    }
  }

  // Reset error count
  resetErrorCount(): void {
    this.connectionStatus.errorCount = 0;
    logger.info('Reset Binance error count');
  }
} 