// OKX API response types
export interface OKXOrderBookEntry {
  price: string;
  size: string;
  liquidatedOrders: string;
  numOrders: string;
}

export interface OKXOrderBookResponse {
  code: string;
  msg: string;
  data: Array<{
    asks: [string, string, string, string][];  // [price, size, liquidated orders, num orders]
    bids: [string, string, string, string][];  // [price, size, liquidated orders, num orders]
    ts: string;
  }>;
}

export interface OKXTickerResponse {
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

// Our standardized OrderBook snapshot - zgodne z OrderbookDTO
export interface OKXOrderBookSnapshot {
  // Zgodne z OrderbookDTO interface
  asset_id: string;        // ID z tabeli assets
  exchange_id: string;     // ID z tabeli exchanges  
  snapshot: {              // JSONB zgodny z bazą
    bids: [number, number][];
    asks: [number, number][];
    lastUpdateId: string;
  };
  spread: number;          // Wymagane > 0
  timestamp: string;       // ISO string
  volume: number | null;   // Nullable
  
  // Pola pomocnicze (nie zapisywane do bazy)
  symbol: string;         
}

// Error types
export interface OKXError extends Error {
  code?: string | number;
  body?: any;
}

// Connection status
export interface OKXConnectionStatus {
  isConnected: boolean;
  lastUpdate: string | null;
  errorCount: number;
  lastError?: string;
  currentEndpoint?: string;
} 