// Kraken API response types
export interface KrakenOrderBookEntry {
  price: string;
  quantity: string;
  timestamp: number;
}

export interface KrakenOrderBookResponse {
  error: string[];
  result: {
    [key: string]: {
      asks: [string, string, number][];
      bids: [string, string, number][];
    };
  };
}

export interface KrakenTickerResponse {
  error: string[];
  result: {
    [key: string]: {
      c: string[];  // Last trade closed price, volume
      v: string[];  // Volume today, last 24 hours
      p: string[];  // Volume weighted average price today, last 24 hours
      t: number[];  // Number of trades today, last 24 hours
      l: string[];  // Low price today, last 24 hours
      h: string[];  // High price today, last 24 hours
      o: string;    // Today's opening price
      b: string[];  // Best bid price, whole lot volume, lot volume
      a: string[];  // Best ask price, whole lot volume, lot volume
    };
  };
}

export interface KrakenAssetPairsResponse {
  error: string[];
  result: {
    [key: string]: {
      altname: string;
      wsname: string;
      aclass_base: string;
      base: string;
      aclass_quote: string;
      quote: string;
      lot: string;
      pair_decimals: number;
      lot_decimals: number;
      lot_multiplier: number;
      leverage_buy: number[];
      leverage_sell: number[];
      fees: number[][];
      fees_maker: number[][];
      fee_volume_currency: string;
      margin_call: number;
      margin_stop: number;
      ordermin: string;
    };
  };
}

// Our standardized OrderBook snapshot - compatible with existing system
export interface KrakenOrderBookSnapshot {
  // Compatible with OrderbookDTO interface
  asset_id: string;        // ID from assets table
  exchange_id: string;     // ID from exchanges table  
  snapshot: {              // JSONB compatible with database
    bids: [number, number][];
    asks: [number, number][];
    lastUpdateId: string;
  };
  spread: number;          // Required > 0
  timestamp: string;       // ISO string
  volume: number | null;   // Nullable
  
  // Helper fields (not saved to database)
  symbol: string;         
}

// Error types
export interface KrakenError extends Error {
  code?: string | number;
  body?: any;
}

// Connection status
export interface KrakenConnectionStatus {
  isConnected: boolean;
  lastUpdate: string | null;
  errorCount: number;
  lastError?: string;
} 