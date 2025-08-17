import Binance from 'node-binance-api';
import { BaseCollector, ExchangeConfig, PriceSnapshot, OrderBookSnapshot, TimeSeriesOptions } from './base-collector';
import WebSocket from 'ws';

interface BinanceBookTicker {
  symbol: string;
  bidPrice: string;
  askPrice: string;
}

interface BinanceStats {
  symbol: string;
  volume: string;
}

interface BinanceTrade {
  symbol: string;
  price: string;
}

interface BinanceDepth {
  symbol: string;
}

export class BinanceCollector implements BaseCollector {
  private client!: Binance;
  private wsConnections: Map<string, WebSocket>;

  constructor() {
    this.wsConnections = new Map();
  }

  async initialize(config: ExchangeConfig): Promise<void> {
    this.client = new Binance().options({
      APIKEY: config.apiKey,
      APISECRET: config.secretKey,
      useServerTime: true, // Sync with server time
      recvWindow: 60000, // Increase receive window
      test: false, // Use live trading API
      urls: {
        base: 'https://api.binance.us/api/', // Change to Binance US base URL
        stream: 'wss://stream.binance.us:9443/stream' // Change to Binance US WebSocket
      }
    });
  }

  async fetchPrice(symbol: string, quote: string): Promise<PriceSnapshot> {
    const pair = `${symbol}${quote}`;
    
    try {
      // Use promise-based methods
      const [ticker, ticker24h] = await Promise.all([
        this.client.prices(pair),
        this.client.prevDay(pair)
      ]);

      // Get current book prices
      const bookTicker = await this.client.bookTickers(pair);

      console.log('Binance responses:', {
        ticker,
        bookTicker,
        ticker24h
      });

      return {
        price: parseFloat(ticker[pair]),
        volume24h: parseFloat(ticker24h.volume),
        bid: parseFloat(bookTicker.bidPrice),
        ask: parseFloat(bookTicker.askPrice),
        timestamp: new Date()
      };
    } catch (error) {
      console.error(`Error fetching Binance price for ${pair}:`, error);
      throw error;
    }
  }

  async fetchPrices(symbols: string[], quote: string): Promise<Map<string, PriceSnapshot>> {
    const result = new Map<string, PriceSnapshot>();
    
    try {
      const tickers = await this.client.prices();
      const bookTickers = await this.client.bookTickers();
      
      for (const symbol of symbols) {
        const pair = `${symbol}${quote}`;
        try {
          const ticker24h = await this.client.prevDay(pair);
          const bookTicker = bookTickers[pair];

          if (tickers[pair] && bookTicker) {
            result.set(symbol, {
              price: parseFloat(tickers[pair]),
              volume24h: parseFloat(ticker24h.volume),
              bid: parseFloat(bookTicker.bidPrice),
              ask: parseFloat(bookTicker.askPrice),
              timestamp: new Date()
            });
          }
        } catch (error) {
          console.error(`Error fetching data for ${pair}:`, error);
        }
      }
    } catch (error) {
      console.error('Error fetching Binance prices:', error);
    }

    return result;
  }

  async fetchOrderBook(symbol: string, quote: string, depth: number = 20): Promise<OrderBookSnapshot> {
    const pair = `${symbol}${quote}`;
    
    try {
      // Use promise-based method
      const orderBook = await this.client.depth(pair);

      console.log('Binance order book response:', JSON.stringify(orderBook, null, 2));

      // Convert the object format to array format
      const bids = Object.entries(orderBook.bids).map(([price, quantity]) => [
        parseFloat(price),
        parseFloat(quantity as string)
      ]);

      const asks = Object.entries(orderBook.asks).map(([price, quantity]) => [
        parseFloat(price),
        parseFloat(quantity as string)
      ]);

      // Sort bids in descending order (highest first)
      bids.sort((a, b) => b[0] - a[0]);
      // Sort asks in ascending order (lowest first)
      asks.sort((a, b) => a[0] - b[0]);

      // Take only the requested depth
      const limitedBids = bids.slice(0, depth) as [number, number][];
      const limitedAsks = asks.slice(0, depth) as [number, number][];

      return {
        lastUpdateId: orderBook.lastUpdateId?.toString() || Date.now().toString(),
        timestamp: new Date(),
        bids: limitedBids,
        asks: limitedAsks
      };
    } catch (error) {
      console.error(`Error fetching Binance order book for ${pair}:`, error);
      throw error;
    }
  }

  async subscribeToPriceUpdates(): Promise<void> {
    // Not implemented for historical data collection
  }

  async subscribeToOrderBookUpdates(): Promise<void> {
    // Not implemented for historical data collection
  }

  async cleanup(): Promise<void> {
    // Close all WebSocket connections
    for (const [key, ws] of this.wsConnections) {
      if (ws && ws.close) {
        ws.close();
      }
    }
    this.wsConnections.clear();
  }

  async fetchPriceTimeSeries(
    symbol: string,
    quote: string,
    options: TimeSeriesOptions
  ): Promise<PriceSnapshot[]> {
    const pair = `${symbol}${quote}`;
    const snapshots: PriceSnapshot[] = [];
    
    try {
      // Check if the symbol is valid first
      try {
        // Use a simple ticker request to validate the symbol
        await this.client.prices(pair);
      } catch (error: any) {
        console.error(`Invalid symbol ${pair} for Binance: ${error?.message || 'Unknown error'}`);
        // Return empty array for invalid symbols instead of throwing
        return [];
      }
      
      // Use promise-based methods
      const [ticker, ticker24h, bookTicker] = await Promise.all([
        this.client.prices(pair),
        this.client.prevDay(pair),
        this.client.bookTickers(pair)
      ]);

      snapshots.push({
        price: parseFloat(ticker[pair]),
        volume24h: parseFloat(ticker24h.volume),
        bid: parseFloat(bookTicker.bidPrice),
        ask: parseFloat(bookTicker.askPrice),
        timestamp: options.endTime
      });

      return snapshots;
    } catch (error: any) {
      console.error(`Error fetching Binance price time series for ${pair}:`, error?.message || 'Unknown error');
      // Return empty array instead of throwing
      return [];
    }
  }

  async fetchOrderBookTimeSeries(
    symbol: string,
    quote: string,
    depth: number,
    options: TimeSeriesOptions
  ): Promise<OrderBookSnapshot[]> {
    const pair = `${symbol}${quote}`;
    const snapshots: OrderBookSnapshot[] = [];
    
    try {
      // Check if the symbol is valid first
      try {
        // Use a simple ticker request to validate the symbol
        await this.client.prices(pair);
      } catch (error: any) {
        console.error(`Invalid symbol ${pair} for Binance: ${error?.message || 'Unknown error'}`);
        // Return empty array for invalid symbols instead of throwing
        return [];
      }
      
      // Since we're not using lookback anymore, we'll just get current snapshot
      const orderBook = await this.client.depth(pair);

      // Convert the object format to array format
      const bids = Object.entries(orderBook.bids)
        .map(([price, quantity]) => [
          parseFloat(price),
          parseFloat(quantity as string)
        ])
        .sort((a, b) => b[0] - a[0]) // Sort bids in descending order
        .slice(0, depth) as [number, number][];

      const asks = Object.entries(orderBook.asks)
        .map(([price, quantity]) => [
          parseFloat(price),
          parseFloat(quantity as string)
        ])
        .sort((a, b) => a[0] - b[0]) // Sort asks in ascending order
        .slice(0, depth) as [number, number][];

      snapshots.push({
        lastUpdateId: orderBook.lastUpdateId?.toString() || Date.now().toString(),
        timestamp: options.endTime, // Use the current time
        bids,
        asks
      });

      return snapshots;
    } catch (error: any) {
      console.error(`Error fetching Binance order book time series for ${pair}:`, error?.message || 'Unknown error');
      // Return empty array instead of throwing
      return [];
    }
  }
} 