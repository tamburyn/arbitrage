// Top 10 crypto assets to monitor - zgodne z seed data
export const TOP_CRYPTO_ASSETS = [
  'BTC',   // Bitcoin
  'ETH',   // Ethereum
  'BNB',   // Binance Coin
  'XRP',   // Ripple
  'ADA',   // Cardano
  'DOGE',  // Dogecoin
  'SOL',   // Solana
  'DOT',   // Polkadot
  'MATIC', // Polygon
  'AVAX'   // Avalanche
] as const;

export const QUOTE_CURRENCY = 'USDT';

// Configuration constants
export const CONFIG = {
  DATA_COLLECTION_INTERVAL: 60 * 1000, // 60 seconds (1 minute) in milliseconds
  ARBITRAGE_THRESHOLD: 0.01, // 0.01% threshold for testing (was 2.0%)
  BINANCE_API_RATE_LIMIT: 1200, // requests per minute
  BATCH_SIZE: 5, // number of symbols to process in parallel
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000, // milliseconds
  MINIMUM_SPREAD: 0.001 // minimum spread to satisfy DB constraint
} as const;

export type CryptoAsset = typeof TOP_CRYPTO_ASSETS[number]; 