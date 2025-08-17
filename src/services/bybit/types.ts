// Bybit API response types
export interface BybitTicker {
  symbol: string;
  lastPrice: string;
  volume24h: string;
}

export interface BybitOrderBookEntry {
  0: string; // price
  1: string; // quantity
}

export interface BybitOrderBook {
  ts: number;
  b: BybitOrderBookEntry[]; // bids
  a: BybitOrderBookEntry[]; // asks
}

export interface BybitTickerResponse {
  retCode: number;
  result: {
    list: BybitTicker[];
  };
}

export interface BybitOrderBookResponse {
  retCode: number;
  result: BybitOrderBook;
}

// Our standardized OrderBook snapshot - zgodne z OrderbookDTO (identyczne jak Binance)
export interface BybitOrderBookSnapshot {
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
export interface BybitError extends Error {
  code?: string | number;
  retCode?: number;
  retMsg?: string;
}

// Connection status
export interface BybitConnectionStatus {
  isConnected: boolean;
  lastUpdate: string | null;
  errorCount: number;
  lastError?: string;
  currentEndpoint?: string;
} 