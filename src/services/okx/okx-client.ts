import axios from 'axios';
import CryptoJS from 'crypto-js';
import type { 
  OKXOrderBookResponse, 
  OKXTickerResponse, 
  OKXOrderBookSnapshot, 
  OKXConnectionStatus 
} from './types';
import { logger } from '../../utils/logger';
import { ErrorHandler } from '../../utils/error-handler';
import { CONFIG, QUOTE_CURRENCY } from '../../constants/crypto-assets';
import { SupabaseService } from '../database/supabase-service';

export class OKXClient {
  private readonly baseUrl = 'https://www.okx.com';
  private apiKey: string | null;
  private secretKey: string | null;
  private passphrase: string | null;
  private supabaseService: SupabaseService;
  private exchangeId: string | null = null;
  private connectionStatus: OKXConnectionStatus = {
    isConnected: false,
    lastUpdate: null,
    errorCount: 0
  };

  constructor() {
    this.apiKey = process.env.OKX_API_KEY || null;
    this.secretKey = process.env.OKX_SECRET_KEY || null;
    this.passphrase = process.env.OKX_PASSPHRASE || null;

    if (!this.apiKey || !this.secretKey || !this.passphrase) {
      logger.warn('OKX API credentials not found - OKX integration will be disabled');
    }

    this.supabaseService = new SupabaseService();
    this.connectionStatus.currentEndpoint = this.baseUrl;
    logger.info('OKXClient initialized');
  }

  async initialize(): Promise<void> {
    try {
      // Ensure exchange exists in database
      this.exchangeId = await this.supabaseService.ensureExchangeExists('OKX');
      
      this.connectionStatus.isConnected = true;
      this.connectionStatus.lastUpdate = new Date().toISOString();
      
      logger.info('✅ OKX client initialized successfully');
    } catch (error) {
      this.connectionStatus.isConnected = false;
      this.connectionStatus.errorCount++;
      this.connectionStatus.lastError = error.message;
      
      ErrorHandler.handle(error, 'OKXClient.initialize');
      throw error;
    }
  }

  private getTimestamp(): string {
    return new Date().toISOString();
  }

  private sign(timestamp: string, method: string, requestPath: string, body: string = ''): string {
    if (!this.secretKey) {
      throw new Error('Secret key is required for signing requests');
    }
    const message = timestamp + method + requestPath + body;
    return CryptoJS.HmacSHA256(message, this.secretKey).toString(CryptoJS.enc.Base64);
  }

  private getHeaders(method: string, requestPath: string, body: string = ''): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    if (this.apiKey && this.secretKey && this.passphrase) {
      const timestamp = this.getTimestamp();
      const sign = this.sign(timestamp, method, requestPath, body);
      
      headers['OK-ACCESS-KEY'] = this.apiKey;
      headers['OK-ACCESS-SIGN'] = sign;
      headers['OK-ACCESS-TIMESTAMP'] = timestamp;
      headers['OK-ACCESS-PASSPHRASE'] = this.passphrase;
    }

    return headers;
  }

  private async safeApiCall<T>(method: string, endpoint: string, params: Record<string, string> = {}): Promise<T> {
    const queryString = new URLSearchParams(params).toString();
    const url = `${this.baseUrl}${endpoint}${queryString ? '?' + queryString : ''}`;
    
    try {
      const response = await axios.request<T>({
        method,
        url,
        headers: this.getHeaders(method, endpoint),
        timeout: 10000
      });

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.data) {
        throw new Error(`OKX API error: ${JSON.stringify(error.response.data)}`);
      }
      throw error;
    }
  }

  async getOrderBook(symbol: string): Promise<OKXOrderBookSnapshot> {
    return await ErrorHandler.withRetry(
      async () => {
        const instId = `${symbol}-${QUOTE_CURRENCY}`;
        
        logger.debug(`Fetching orderbook for ${instId} from OKX`);
        
        // Get asset ID
        const assetId = await this.supabaseService.ensureAssetExists(symbol);
        
        // Fetch orderbook and ticker data in parallel
        const [orderbookResponse, tickerResponse] = await Promise.all([
          this.safeApiCall<OKXOrderBookResponse>('GET', '/api/v5/market/books', { 
            instId,
            sz: '20' // Get top 20 levels
          }),
          this.safeApiCall<OKXTickerResponse>('GET', '/api/v5/market/ticker', { 
            instId
          })
        ]);

        // Check for API errors
        if (orderbookResponse.code !== '0' || !orderbookResponse.data?.[0]) {
          throw new Error(`Invalid order book response for ${instId}: ${JSON.stringify(orderbookResponse)}`);
        }
        
        if (tickerResponse.code !== '0' || !tickerResponse.data?.[0]) {
          throw new Error(`Invalid ticker response for ${instId}: ${JSON.stringify(tickerResponse)}`);
        }

        const orderbook = orderbookResponse.data[0];
        const ticker = tickerResponse.data[0];
        
        // Transform to our standard format
        const bids: [number, number][] = orderbook.bids.map(([price, size]) => [
          parseFloat(price),
          parseFloat(size)
        ]);
        
        const asks: [number, number][] = orderbook.asks.map(([price, size]) => [
          parseFloat(price),
          parseFloat(size)
        ]);

        // Calculate spread
        const bestBid = bids[0]?.[0] || 0;
        const bestAsk = asks[0]?.[0] || 0;
        const spread = bestAsk > 0 && bestBid > 0 ? ((bestAsk - bestBid) / bestBid) * 100 : 0;
        const validSpread = Math.max(spread, CONFIG.MINIMUM_SPREAD);

        // Get volume (24h in quote currency)
        const volume = parseFloat(ticker.volCcy24h);

        const snapshot: OKXOrderBookSnapshot = {
          asset_id: assetId,
          exchange_id: this.exchangeId!,
          snapshot: {
            bids,
            asks,
            lastUpdateId: orderbook.ts
          },
          spread: validSpread,
          timestamp: new Date().toISOString(),
          volume: isNaN(volume) ? null : volume,
          symbol
        };

        this.connectionStatus.lastUpdate = new Date().toISOString();
        this.connectionStatus.errorCount = 0;

        logger.debug(`Transformed ${symbol} (OKX): spread=${validSpread.toFixed(4)}%, volume=${volume}`);
        return snapshot;
      },
      3,  // maxRetries
      1000,  // delay
      `OKXClient.getOrderBook.${symbol}`  // context
    );
  }

  async getMultipleOrderBooks(
    symbols: string[]
  ): Promise<Map<string, OKXOrderBookSnapshot>> {
    const results = new Map<string, OKXOrderBookSnapshot>();
    
    try {
      logger.info(`Starting OKX batch orderbook collection for ${symbols.length} symbols`);
      
      // Process symbols in batches to avoid rate limits
      for (let i = 0; i < symbols.length; i += CONFIG.BATCH_SIZE) {
        const batch = symbols.slice(i, i + CONFIG.BATCH_SIZE);
        logger.debug(`Processing OKX batch ${Math.floor(i / CONFIG.BATCH_SIZE) + 1}: ${batch.join(', ')}`);
        
        // Process batch in parallel
        const batchPromises = batch.map(symbol => this.processSymbol(symbol));
        const batchResults = await Promise.allSettled(batchPromises);
        
        // Collect successful results
        batchResults.forEach((result, index) => {
          const symbol = batch[index];
          if (result.status === 'fulfilled' && result.value) {
            results.set(symbol, result.value);
          } else if (result.status === 'rejected') {
            logger.error(`Failed to process ${symbol} on OKX:`, result.reason);
            this.connectionStatus.errorCount++;
          }
        });
        
        // Add delay between batches to respect rate limits
        if (i + CONFIG.BATCH_SIZE < symbols.length) {
          await this.delay(300); // OKX has stricter rate limits
        }
      }
      
      // Update connection status
      this.connectionStatus.isConnected = results.size > 0;
      this.connectionStatus.lastUpdate = new Date().toISOString();
      
      logger.info(`OKX batch collection completed: ${results.size}/${symbols.length} successful`);
      return results;
      
    } catch (error) {
      this.connectionStatus.errorCount++;
      ErrorHandler.handle(error, 'OKXClient.getMultipleOrderBooks');
      throw error;
    }
  }

  private async processSymbol(symbol: string): Promise<OKXOrderBookSnapshot | null> {
    try {
      return await this.getOrderBook(symbol);
    } catch (error) {
      logger.error(`Failed to process symbol ${symbol} on OKX:`, error);
      return null;
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async testConnection(): Promise<boolean> {
    try {
      logger.info('Testing OKX API connection...');
      
      // Test with a simple ticker request
      const response = await this.safeApiCall<OKXTickerResponse>(
        'GET', 
        '/api/v5/market/ticker', 
        { instId: 'BTC-USDT' }
      );
      
      if (response.code === '0' && response.data?.[0]) {
        this.connectionStatus.isConnected = true;
        this.connectionStatus.lastUpdate = new Date().toISOString();
        this.connectionStatus.errorCount = 0;
        logger.info('OKX API connection successful');
        return true;
      } else {
        throw new Error(`Invalid response: ${JSON.stringify(response)}`);
      }
    } catch (error) {
      this.connectionStatus.isConnected = false;
      this.connectionStatus.errorCount++;
      this.connectionStatus.lastError = error.message;
      
      logger.error('OKX API connection failed:', error);
      return false;
    }
  }

  getConnectionStatus(): OKXConnectionStatus {
    return { ...this.connectionStatus };
  }

  resetErrorCount(): void {
    this.connectionStatus.errorCount = 0;
  }
} 