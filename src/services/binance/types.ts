// Binance API response types
export interface BinanceOrderBookEntry {
  price: string;
  quantity: string;
}

export interface BinanceOrderBook {
  lastUpdateId: number;
  bids: BinanceOrderBookEntry[];  // Array of {price, quantity} objects
  asks: BinanceOrderBookEntry[];  // Array of {price, quantity} objects
}

export interface BinanceTicker24h {
  symbol: string;
  volume: string;
  count: number;
}

// Our standardized OrderBook snapshot - zgodne z OrderbookDTO
export interface OrderBookSnapshot {
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
export interface BinanceError extends Error {
  code?: string | number;
  body?: any;
}

// Connection status
export interface ConnectionStatus {
  isConnected: boolean;
  lastUpdate: string | null;
  errorCount: number;
  lastError?: string;
} 