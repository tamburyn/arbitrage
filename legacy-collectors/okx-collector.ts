import axios from 'axios';
import CryptoJS from 'crypto-js';
import crypto from 'crypto';
import { BaseCollector, ExchangeConfig, PriceSnapshot, OrderBookSnapshot, TimeSeriesOptions } from './base-collector';

interface OKXOrderBookResponse {
  code: string;
  msg: string;
  data: Array<{
    asks: [string, string, string, string][];  // [price, size, liquidated orders, num orders]
    bids: [string, string, string, string][];  // [price, size, liquidated orders, num orders]
    ts: string;
  }>;
}

interface OKXTickerResponse {
  code: string;
  msg: string;
  data: Array<{
    instId: string;
    last: string;
    lastSz: string;
    askPx: string;
    askSz: string;
    bidPx: string;
    bidSz: string;
    open24h: string;
    high24h: string;
    low24h: string;
    vol24h: string;
    volCcy24h: string;
    ts: string;
    sodUtc0: string;
    sodUtc8: string;
  }>;
}

export class OKXCollector implements BaseCollector {
  private readonly BASE_URL = 'https://www.okx.com';
  private apiKey: string | null;
  private secretKey: string | null;
  private passphrase: string | null;

  constructor() {
    this.apiKey = null;
    this.secretKey = null;
    this.passphrase = null;
  }

  async initialize(config: ExchangeConfig): Promise<void> {
    this.apiKey = config.apiKey || null;
    this.secretKey = config.secretKey || null;
    this.passphrase = config.passphrase || null;
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
    const url = `${this.BASE_URL}${endpoint}${queryString ? '?' + queryString : ''}`;
    
    try {
      const response = await axios.request<T>({
        method,
        url,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        }
      });

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.data) {
        throw new Error(`OKX API error: ${JSON.stringify(error.response.data)}`);
      }
      throw error;
    }
  }

  async fetchPrice(symbol: string, quote: string): Promise<PriceSnapshot> {
    const instId = `${symbol}-${quote}`;
    
    try {
      // Get order book data first
      const orderBookResponse = await this.safeApiCall<OKXOrderBookResponse>(
        'GET',
        '/api/v5/market/books',
        { 
          instId,
          sz: '1' // Get just the best bid/ask
        }
      );

      if (orderBookResponse.code !== '0' || !orderBookResponse.data?.[0]) {
        throw new Error(`Invalid order book response for ${instId}: ${JSON.stringify(orderBookResponse)}`);
      }

      const orderBook = orderBookResponse.data[0];
      const bestBid = parseFloat(orderBook.bids[0][0]);
      const bestAsk = parseFloat(orderBook.asks[0][0]);

      // Get ticker data for volume and last price
      const tickerResponse = await this.safeApiCall<OKXTickerResponse>(
        'GET',
        '/api/v5/market/ticker',
        { 
          instId,
          instType: 'SPOT'
        }
      );

      if (tickerResponse.code !== '0' || !tickerResponse.data?.[0]) {
        throw new Error(`Invalid ticker response for ${instId}: ${JSON.stringify(tickerResponse)}`);
      }

      const ticker = tickerResponse.data[0];
      const lastPrice = parseFloat(ticker.last);
      const volume = parseFloat(ticker.volCcy24h); // Using quote currency volume

      // Validate all the data
      if (isNaN(lastPrice) || isNaN(bestBid) || isNaN(bestAsk) || isNaN(volume)) {
        throw new Error(`Invalid price/volume data for ${instId}: last=${ticker.last}, bid=${bestBid}, ask=${bestAsk}, vol=${volume}`);
      }

      if (lastPrice <= 0 || bestBid <= 0 || bestAsk <= 0 || volume <= 0) {
        throw new Error(`Zero or negative values for ${instId}: last=${lastPrice}, bid=${bestBid}, ask=${bestAsk}, vol=${volume}`);
      }

      if (bestBid >= bestAsk) {
        throw new Error(`Invalid bid/ask spread for ${instId}: bid=${bestBid} >= ask=${bestAsk}`);
      }

      // If last price is outside bid/ask spread, use mid price
      const price = (lastPrice < bestBid || lastPrice > bestAsk) 
        ? (bestBid + bestAsk) / 2 
        : lastPrice;

      return {
        price,
        volume24h: volume,
        bid: bestBid,
        ask: bestAsk,
        timestamp: new Date(parseInt(orderBook.ts))
      };
    } catch (error) {
      console.error(`Error fetching OKX price for ${instId}:`, error);
      throw error;
    }
  }

  async fetchPrices(symbols: string[], quote: string): Promise<Map<string, PriceSnapshot>> {
    const result = new Map<string, PriceSnapshot>();
    
    for (const symbol of symbols) {
      try {
        const priceSnapshot = await this.fetchPrice(symbol, quote);
        result.set(symbol, priceSnapshot);
      } catch (error) {
        console.error(`Error fetching price for ${symbol}-${quote}:`, error);
        // Continue with other symbols even if one fails
      }
    }

    return result;
  }

  async fetchOrderBook(symbol: string, quote: string, depth: number = 20): Promise<OrderBookSnapshot> {
    const instId = `${symbol}-${quote}`;
    
    try {
      const response = await this.safeApiCall<OKXOrderBookResponse>(
        'GET',
        '/api/v5/market/books',
        { 
          instId,
          sz: depth.toString()
        }
      );

      if (response.code !== '0' || !response.data?.[0]) {
        throw new Error(`Invalid order book response for ${instId}: ${JSON.stringify(response)}`);
      }

      const orderBook = response.data[0];

      return {
        lastUpdateId: orderBook.ts,
        timestamp: new Date(parseInt(orderBook.ts)),
        bids: orderBook.bids.map(([price, size]) => [
          parseFloat(price),
          parseFloat(size)
        ]),
        asks: orderBook.asks.map(([price, size]) => [
          parseFloat(price),
          parseFloat(size)
        ])
      };
    } catch (error) {
      console.error(`Error fetching OKX order book for ${instId}:`, error);
      throw error;
    }
  }

  async fetchPriceTimeSeries(
    symbol: string,
    quote: string,
    options: TimeSeriesOptions
  ): Promise<PriceSnapshot[]> {
    const instId = `${symbol}-${quote}`;
    const snapshots: PriceSnapshot[] = [];
    
    try {
      // Get order book data first
      const orderBookResponse = await this.safeApiCall<OKXOrderBookResponse>(
        'GET',
        '/api/v5/market/books',
        { 
          instId,
          sz: '1' // Get just the best bid/ask
        }
      );

      if (orderBookResponse.code !== '0' || !orderBookResponse.data?.[0]) {
        console.error(`Invalid order book response for ${instId}: ${JSON.stringify(orderBookResponse)}`);
        return [];
      }

      const orderBook = orderBookResponse.data[0];
      const bestBid = parseFloat(orderBook.bids[0][0]);
      const bestAsk = parseFloat(orderBook.asks[0][0]);

      // Get ticker data for volume and last price
      const tickerResponse = await this.safeApiCall<OKXTickerResponse>(
        'GET',
        '/api/v5/market/ticker',
        { 
          instId,
          instType: 'SPOT'
        }
      );

      if (tickerResponse.code !== '0' || !tickerResponse.data?.[0]) {
        console.error(`Invalid ticker response for ${instId}: ${JSON.stringify(tickerResponse)}`);
        return [];
      }

      const ticker = tickerResponse.data[0];
      const lastPrice = parseFloat(ticker.last);
      const volume = parseFloat(ticker.volCcy24h);

      snapshots.push({
        price: lastPrice,
        volume24h: volume,
        bid: bestBid,
        ask: bestAsk,
        timestamp: options.endTime
      });

      return snapshots;
    } catch (error) {
      console.error(`Error fetching OKX price time series for ${instId}:`, error);
      return [];
    }
  }

  async fetchOrderBookTimeSeries(
    symbol: string,
    quote: string,
    depth: number,
    options: TimeSeriesOptions
  ): Promise<OrderBookSnapshot[]> {
    const instId = `${symbol}-${quote}`;
    const snapshots: OrderBookSnapshot[] = [];
    
    try {
      const response = await this.safeApiCall<OKXOrderBookResponse>(
        'GET',
        '/api/v5/market/books',
        { 
          instId,
          sz: depth.toString()
        }
      );

      if (response.code !== '0' || !response.data?.[0]) {
        console.error(`Invalid order book response for ${instId}: ${JSON.stringify(response)}`);
        return [];
      }

      const orderBook = response.data[0];

      snapshots.push({
        lastUpdateId: orderBook.ts,
        timestamp: options.endTime,
        bids: orderBook.bids.map(([price, size]) => [
          parseFloat(price),
          parseFloat(size)
        ]),
        asks: orderBook.asks.map(([price, size]) => [
          parseFloat(price),
          parseFloat(size)
        ])
      });

      return snapshots;
    } catch (error) {
      console.error(`Error fetching OKX order book time series for ${instId}:`, error);
      return [];
    }
  }

  async subscribeToPriceUpdates(): Promise<void> {
    // Not implemented for historical data collection
  }

  async subscribeToOrderBookUpdates(): Promise<void> {
    // Not implemented for historical data collection
  }

  async cleanup(): Promise<void> {
    // Nothing to clean up for REST client
  }
} 