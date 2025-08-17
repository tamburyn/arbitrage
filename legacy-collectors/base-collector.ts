import { PriceData, OrderBook, OrderBookEntry } from '../models/types';

export interface ExchangeConfig {
  apiKey?: string;
  secretKey?: string;
  passphrase?: string;
}

export interface PriceSnapshot {
  price: number;
  volume24h: number;
  bid: number;
  ask: number;
  timestamp: Date;
}

export interface OrderBookSnapshot {
  lastUpdateId: string;
  timestamp: Date;
  bids: [number, number][];  // [price, quantity][]
  asks: [number, number][];  // [price, quantity][]
}

export interface TimeSeriesOptions {
  startTime: Date;
  endTime: Date;
  interval: number; // interval in milliseconds (e.g., 30000 for 30s, 60000 for 1min)
}

export interface BaseCollector {
  initialize(config: ExchangeConfig): Promise<void>;
  
  // Time series data collection
  fetchPriceTimeSeries(
    symbol: string, 
    quote: string, 
    options: TimeSeriesOptions
  ): Promise<PriceSnapshot[]>;
  
  fetchOrderBookTimeSeries(
    symbol: string, 
    quote: string, 
    depth: number,
    options: TimeSeriesOptions
  ): Promise<OrderBookSnapshot[]>;
  
  // Single point data collection (for current data)
  fetchPrice(symbol: string, quote: string): Promise<PriceSnapshot>;
  fetchPrices(symbols: string[], quote: string): Promise<Map<string, PriceSnapshot>>;
  fetchOrderBook(symbol: string, quote: string, depth?: number): Promise<OrderBookSnapshot>;
  
  // Subscription methods for WebSocket
  subscribeToPriceUpdates(symbol: string, quote: string): Promise<void>;
  subscribeToOrderBookUpdates(symbol: string, quote: string): Promise<void>;
  
  // Cleanup
  cleanup(): Promise<void>;
} 