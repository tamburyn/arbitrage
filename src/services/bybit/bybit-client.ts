import { RestClientV5 } from 'bybit-api';
import type { 
  BybitOrderBook, 
  BybitOrderBookSnapshot, 
  BybitConnectionStatus,
  BybitTickerResponse,
  BybitOrderBookResponse 
} from './types';
import { logger } from '../../utils/logger';
import { ErrorHandler } from '../../utils/error-handler';
import { CONFIG, QUOTE_CURRENCY } from '../../constants/crypto-assets';
import { SupabaseService } from '../database/supabase-service';

export class BybitClient {
  private client!: RestClientV5;
  private supabaseService: SupabaseService;
  private connectionStatus: BybitConnectionStatus = {
    isConnected: false,
    lastUpdate: null,
    errorCount: 0
  };

  private fallbackEndpoints = [
    'https://api.bybit.com',
    'https://api.bybit.us',
    'https://api.bybit.info',
    'https://api-testnet.bybit.com',
    'https://api.bytick.com'
  ];
  private currentEndpointIndex = 0;

  constructor() {
    this.supabaseService = new SupabaseService();
    this.initializeClient();
    logger.info('BybitClient initialized');
  }

  private initializeClient(): void {
    const apiKey = process.env.BYBIT_API_KEY;
    const secretKey = process.env.BYBIT_SECRET_KEY;

    if (!apiKey || !secretKey) {
      throw new Error('Missing required environment variables: BYBIT_API_KEY, BYBIT_SECRET_KEY');
    }

    const endpoint = this.fallbackEndpoints[this.currentEndpointIndex];
    this.connectionStatus.currentEndpoint = endpoint;

    this.client = new RestClientV5({
      key: apiKey,
      secret: secretKey,
      testnet: endpoint.includes('testnet'),
      baseUrl: endpoint,
      enable_time_sync: true,
      recv_window: 60000,
      strict_param_validation: false,
      encodeSerialisedValues: true
    });

    logger.info(`BybitClient initialized with endpoint: ${endpoint}`);
  }

  private async handleRequestWithFallback<T>(operation: () => Promise<T>): Promise<T> {
    try {
      return await operation();
    } catch (error: any) {
      logger.warn(`Bybit request failed with error:`, error);
      
      const errorCode = error?.code || error?.response?.status;
      const isBlockedError = errorCode === 403 || 
                            error?.message?.includes('ECONNREFUSED') ||
                            error?.message?.includes('blocked') ||
                            error?.message?.includes('Forbidden');
      
      if (isBlockedError && this.currentEndpointIndex < this.fallbackEndpoints.length - 1) {
        logger.warn(`Endpoint ${this.fallbackEndpoints[this.currentEndpointIndex]} failed with code ${errorCode}, trying next endpoint...`);
        this.currentEndpointIndex++;
        this.initializeClient();
        return await operation();
      }

      if (isBlockedError) {
        throw new Error(`All Bybit endpoints blocked. Last error: ${error?.message || 'Unknown error'}`);
      }
      throw error;
    }
  }

  async getOrderBook(symbol: string, limit: number = 100): Promise<BybitOrderBook> {
    const pair = `${symbol}${QUOTE_CURRENCY}`;
    
    return await ErrorHandler.withRetry(
      async () => {
        logger.debug(`Fetching orderbook for ${pair} from Bybit`);
        
        const response: BybitOrderBookResponse = await this.handleRequestWithFallback(async () => {
          return await this.client.getOrderbook({ 
            category: 'spot',
            symbol: pair,
            limit: Math.min(limit, 200) // Bybit max limit is 200
          });
        });
        
        if (response.retCode !== 0) {
          throw new Error(`Bybit API error: retCode ${response.retCode}`);
        }
        
        if (!response.result || !response.result.b || !response.result.a) {
          throw new Error(`Invalid orderbook response for ${pair}`);
        }
        
        return response.result;
      },
      CONFIG.MAX_RETRIES,
      CONFIG.RETRY_DELAY,
      `BybitClient.getOrderBook.${pair}`
    );
  }

  async get24hStats(symbol: string): Promise<any> {
    const pair = `${symbol}${QUOTE_CURRENCY}`;
    
    return await ErrorHandler.withRetry(
      async () => {
        logger.debug(`Fetching 24h stats for ${pair} from Bybit`);
        
        const response: BybitTickerResponse = await this.handleRequestWithFallback(async () => {
          return await this.client.getTickers({ 
            category: 'spot', 
            symbol: pair 
          });
        });
        
        if (response.retCode !== 0) {
          throw new Error(`Bybit API error: retCode ${response.retCode}`);
        }
        
        if (!response.result.list.length) {
          throw new Error(`No ticker data found for ${pair}`);
        }
        
        return response.result.list[0];
      },
      CONFIG.MAX_RETRIES,
      CONFIG.RETRY_DELAY,
      `BybitClient.get24hStats.${pair}`
    );
  }

  async getMultipleOrderBooks(
    symbols: string[], 
    exchangeId: string
  ): Promise<Map<string, BybitOrderBookSnapshot>> {
    const results = new Map<string, BybitOrderBookSnapshot>();
    
    try {
      logger.info(`Starting batch orderbook collection for ${symbols.length} symbols from Bybit`);
      
      // Process symbols in batches to avoid rate limits
      for (let i = 0; i < symbols.length; i += CONFIG.BATCH_SIZE) {
        const batch = symbols.slice(i, i + CONFIG.BATCH_SIZE);
        logger.debug(`Processing Bybit batch ${Math.floor(i / CONFIG.BATCH_SIZE) + 1}: ${batch.join(', ')}`);
        
        // Process batch in parallel
        const batchPromises = batch.map(symbol => this.processSymbol(symbol, exchangeId));
        const batchResults = await Promise.allSettled(batchPromises);
        
        // Collect successful results
        batchResults.forEach((result, index) => {
          const symbol = batch[index];
          if (result.status === 'fulfilled' && result.value) {
            results.set(symbol, result.value);
          } else if (result.status === 'rejected') {
            logger.error(`Failed to process ${symbol} on Bybit:`, result.reason);
            this.connectionStatus.errorCount++;
          }
        });
        
        // Add delay between batches to respect rate limits
        if (i + CONFIG.BATCH_SIZE < symbols.length) {
          await this.delay(300); // Slightly longer delay for Bybit
        }
      }
      
      // Update connection status
      this.connectionStatus.isConnected = results.size > 0;
      this.connectionStatus.lastUpdate = new Date().toISOString();
      
      logger.info(`Bybit batch collection completed: ${results.size}/${symbols.length} successful`);
      return results;
      
    } catch (error) {
      this.connectionStatus.errorCount++;
      ErrorHandler.handle(error, 'BybitClient.getMultipleOrderBooks');
      throw error;
    }
  }

  private async processSymbol(symbol: string, exchangeId: string): Promise<BybitOrderBookSnapshot | null> {
    try {
      // Get asset ID from database
      const assetId = await this.supabaseService.ensureAssetExists(symbol);
      
      // Fetch data from Bybit API in parallel
      const [orderbook, stats] = await Promise.all([
        this.getOrderBook(symbol),
        this.get24hStats(symbol)
      ]);
      
      // Transform to our standardized format
      return this.transformOrderBookData(symbol, orderbook, stats, exchangeId, assetId);
      
    } catch (error) {
      if (this.isBybitError(error)) {
        logger.warn(`Bybit API error for ${symbol}: ${this.getBybitErrorMessage(error)}`);
      } else {
        logger.error(`Failed to process symbol ${symbol} on Bybit:`, error);
      }
      return null;
    }
  }

  private transformOrderBookData(
    symbol: string, 
    orderbook: BybitOrderBook, 
    stats: any,
    exchangeId: string,
    assetId: string
  ): BybitOrderBookSnapshot {
    try {
      // Convert bids (buy orders) - sorted descending by price
      const bids = orderbook.b
        .map(([price, quantity]) => [parseFloat(price), parseFloat(quantity)])
        .sort((a, b) => b[0] - a[0]) as [number, number][];
      
      // Convert asks (sell orders) - sorted ascending by price
      const asks = orderbook.a
        .map(([price, quantity]) => [parseFloat(price), parseFloat(quantity)])
        .sort((a, b) => a[0] - b[0]) as [number, number][];
      
      // Calculate spread
      const bestBid = bids[0]?.[0] || 0;
      const bestAsk = asks[0]?.[0] || 0;
      const spread = bestAsk > 0 && bestBid > 0 ? ((bestAsk - bestBid) / bestBid) * 100 : 0;
      
      // Ensure spread meets database constraint (> 0)
      const validSpread = Math.max(spread, CONFIG.MINIMUM_SPREAD);
      
      // Create snapshot compatible with OrderbookDTO
      const snapshot: BybitOrderBookSnapshot = {
        // Database fields - zgodne z OrderbookDTO
        asset_id: assetId,
        exchange_id: exchangeId,
        snapshot: {
          bids,
          asks,
          lastUpdateId: orderbook.ts?.toString() || Date.now().toString()
        },
        spread: validSpread,
        timestamp: new Date().toISOString(),
        volume: parseFloat(stats.volume24h || '0'),
        
        // Helper field (not saved to DB)
        symbol
      };
      
      logger.debug(`Transformed ${symbol} (Bybit): spread=${validSpread.toFixed(4)}%, volume=${snapshot.volume}`);
      return snapshot;
      
    } catch (error) {
      ErrorHandler.handle(error, `BybitClient.transformOrderBookData.${symbol}`);
      throw error;
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Health check methods
  async testConnection(): Promise<boolean> {
    try {
      logger.info('Testing Bybit API connection...');
      
      // Test with a simple API call
      const response: BybitTickerResponse = await this.handleRequestWithFallback(async () => {
        return await this.client.getTickers({ 
          category: 'spot', 
          symbol: `BTC${QUOTE_CURRENCY}` 
        });
      });
      
      const isConnected = response.retCode === 0 && response.result.list.length > 0;
      
      this.connectionStatus.isConnected = isConnected;
      this.connectionStatus.lastUpdate = new Date().toISOString();
      
      if (isConnected) {
        logger.info('Bybit API connection successful');
      } else {
        logger.error('Bybit API connection failed');
      }
      
      return isConnected;
      
    } catch (error) {
      this.connectionStatus.isConnected = false;
      this.connectionStatus.errorCount++;
      this.connectionStatus.lastError = this.getBybitErrorMessage(error);
      
      ErrorHandler.handle(error, 'BybitClient.testConnection');
      return false;
    }
  }

  getConnectionStatus(): BybitConnectionStatus {
    return { ...this.connectionStatus };
  }

  // Get list of available trading pairs
  async getAvailablePairs(): Promise<string[]> {
    try {
      const response: BybitTickerResponse = await this.handleRequestWithFallback(async () => {
        return await this.client.getTickers({ category: 'spot' });
      });
      
      if (response.retCode !== 0) {
        throw new Error(`Bybit API error: retCode ${response.retCode}`);
      }
      
      // Filter for USDT pairs
      const usdtPairs = response.result.list
        .filter(ticker => ticker.symbol.endsWith(QUOTE_CURRENCY))
        .map(ticker => ticker.symbol.replace(QUOTE_CURRENCY, ''));
      
      logger.info(`Found ${usdtPairs.length} available USDT trading pairs on Bybit`);
      return usdtPairs;
      
    } catch (error) {
      ErrorHandler.handle(error, 'BybitClient.getAvailablePairs');
      return [];
    }
  }

  // Reset error count
  resetErrorCount(): void {
    this.connectionStatus.errorCount = 0;
    logger.info('Reset Bybit error count');
  }

  // Error handling helpers
  private isBybitError(error: any): boolean {
    return error?.retCode !== undefined || error?.retMsg !== undefined;
  }

  private getBybitErrorMessage(error: any): string {
    if (error?.retMsg) {
      return `Bybit API Error: ${error.retMsg} (Code: ${error.retCode})`;
    }
    
    if (error?.message) {
      return error.message;
    }
    
    return 'Unknown Bybit API error';
  }
} 