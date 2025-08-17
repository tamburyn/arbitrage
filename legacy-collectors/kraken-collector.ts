import { BaseCollector, ExchangeConfig, PriceSnapshot, OrderBookSnapshot, TimeSeriesOptions } from './base-collector';

interface KrakenOrderBookResponse {
  error: string[];
  result: {
    [key: string]: {
      asks: [string, string, number][];
      bids: [string, string, number][];
    };
  };
}

interface KrakenTickerResponse {
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

export class KrakenCollector implements BaseCollector {
  private baseUrl = 'https://api.kraken.com';
  private apiKey: string = '';
  private secretKey: string = '';
  private symbolMap: Map<string, string>;
  private pairMap: Map<string, string>;

  constructor() {
    this.symbolMap = new Map();
    this.pairMap = new Map();
    // Initialize common symbol mappings for Kraken
    this.symbolMap.set('BTC', 'XBT');
    this.symbolMap.set('DOGE', 'XDG');
    this.symbolMap.set('USDT', 'USD');  // Kraken doesn't use USDT
  }

  async initialize(config: ExchangeConfig): Promise<void> {
    if (!config.apiKey || !config.secretKey) {
      throw new Error('Kraken API key and secret key are required');
    }
    
    this.apiKey = config.apiKey;
    this.secretKey = config.secretKey;
    console.log('Initializing Kraken collector with API key:', this.apiKey.substring(0, 5) + '...');

    // Get all tradable pairs from Kraken
    try {
      const response = await this.makeRequest('/public/AssetPairs');
      console.log('Kraken pairs response:', JSON.stringify(response, null, 2));

      if (response.error && response.error.length > 0) {
        throw new Error(`Kraken API error: ${response.error.join(', ')}`);
      }

      // Store the mapping of our standard pairs to Kraken's pair names
      Object.entries(response.result).forEach(([krakenPair, info]: [string, any]) => {
        // Extract base and quote from wsname which is more reliable
        const [base, quote] = (info.wsname || krakenPair).split('/');
        const standardPair = `${base}/${quote}`;
        this.pairMap.set(standardPair, krakenPair);
        
        // Also store the reverse mapping for common symbols
        if (base === 'XBT') this.pairMap.set(`BTC/${quote}`, krakenPair);
        if (base === 'XXBT') this.pairMap.set(`BTC/${quote}`, krakenPair);
        if (quote === 'USD') this.pairMap.set(`${base}/USDT`, krakenPair);
        
        console.log('Added Kraken pair mapping:', { 
          standard: standardPair, 
          kraken: krakenPair,
          wsname: info.wsname,
          altname: info.altname 
        });
      });

    } catch (error) {
      console.error('Error initializing Kraken pairs:', error);
      throw error;
    }
  }

  private getKrakenSymbol(symbol: string, quote: string): string {
    // Convert common symbols to Kraken format
    const baseSymbol = this.symbolMap.get(symbol) || symbol;
    const quoteSymbol = quote === 'USDT' ? 'USD' : (this.symbolMap.get(quote) || quote);
    
    // Try to find the pair in our mapping
    const standardPair = `${baseSymbol}/${quoteSymbol}`;
    const krakenPair = this.pairMap.get(standardPair);
    
    if (!krakenPair) {
      console.log('No Kraken pair mapping found for:', standardPair);
      // Fall back to simple concatenation
      return `${baseSymbol}${quoteSymbol}`;
    }

    console.log('Using Kraken pair:', { standard: standardPair, kraken: krakenPair });
    return krakenPair;
  }

  private async makeRequest(endpoint: string, params: any = {}): Promise<any> {
    const url = new URL(`${this.baseUrl}/0${endpoint}`);
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, value as string);
    });

    const response = await fetch(url.toString());
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  }

  async fetchPrice(symbol: string, quote: string): Promise<PriceSnapshot> {
    const pair = this.getKrakenSymbol(symbol, quote);
    
    try {
      console.log('Fetching Kraken price for pair:', pair);
      
      const response = await this.makeRequest('/public/Ticker', { pair }) as KrakenTickerResponse;

      if (response.error && response.error.length > 0) {
        throw new Error(`Kraken API error: ${response.error.join(', ')}`);
      }

      // Try both the formatted pair and the original pair
      const result = response.result[pair] || response.result[`${symbol}${quote}`];
      if (!result) {
        throw new Error(`No data returned for ${pair}`);
      }

      return {
        price: parseFloat(result.c[0]),
        volume24h: parseFloat(result.v[1]),
        bid: parseFloat(result.b?.[0] || '0'),
        ask: parseFloat(result.a?.[0] || '0'),
        timestamp: new Date()
      };
    } catch (error) {
      console.error(`Error fetching Kraken price for ${pair}:`, error);
      throw error;
    }
  }

  async fetchPrices(symbols: string[], quote: string): Promise<Map<string, PriceSnapshot>> {
    const result = new Map<string, PriceSnapshot>();
    
    // Kraken doesn't have a bulk ticker endpoint, so we need to fetch each symbol individually
    for (const symbol of symbols) {
      try {
        const priceData = await this.fetchPrice(symbol, quote);
        result.set(symbol, priceData);
      } catch (error) {
        console.error(`Error fetching price for ${symbol}:`, error);
      }
    }

    return result;
  }

  async fetchOrderBook(symbol: string, quote: string, depth: number = 20): Promise<OrderBookSnapshot> {
    const pair = this.getKrakenSymbol(symbol, quote);
    
    try {
      const response = await this.makeRequest('/public/Depth', { pair, count: depth }) as KrakenOrderBookResponse;

      if (response.error.length > 0) {
        throw new Error(`Kraken API error: ${response.error.join(', ')}`);
      }

      const orderBook = response.result[Object.keys(response.result)[0]];

      return {
        lastUpdateId: Date.now().toString(), // Kraken doesn't provide an update ID
        timestamp: new Date(),
        bids: orderBook.bids.map(([price, quantity, _timestamp]: [string, string, number]) => [
          parseFloat(price),
          parseFloat(quantity)
        ]),
        asks: orderBook.asks.map(([price, quantity, _timestamp]: [string, string, number]) => [
          parseFloat(price),
          parseFloat(quantity)
        ])
      };
    } catch (error) {
      console.error(`Error fetching Kraken order book for ${pair}:`, error);
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
    // Nothing to clean up for REST client
  }

  async fetchPriceTimeSeries(
    symbol: string,
    quote: string,
    options: TimeSeriesOptions
  ): Promise<PriceSnapshot[]> {
    const pair = this.getKrakenSymbol(symbol, quote);
    const snapshots: PriceSnapshot[] = [];
    
    try {
      // Calculate number of intervals
      const totalTime = options.endTime.getTime() - options.startTime.getTime();
      const intervals = Math.floor(totalTime / options.interval);

      console.log(`Fetching ${intervals + 1} price points for ${pair}`);

      // Fetch data for each interval
      for (let i = 0; i <= intervals; i++) {
        const timestamp = new Date(options.startTime.getTime() + (i * options.interval));
        
        // Get ticker data
        const tickerResponse = await this.makeRequest('/public/Ticker', { pair });
        if (tickerResponse.error.length > 0) {
          throw new Error(`Kraken API error: ${tickerResponse.error.join(', ')}`);
        }

        const tickerData = tickerResponse.result[Object.keys(tickerResponse.result)[0]];
        
        // Get order book data
        const orderBookResponse = await this.makeRequest('/public/Depth', { pair, count: 1 });
        if (orderBookResponse.error.length > 0) {
          throw new Error(`Kraken API error: ${orderBookResponse.error.join(', ')}`);
        }

        const orderBook = orderBookResponse.result[Object.keys(orderBookResponse.result)[0]];

        snapshots.push({
          price: parseFloat(tickerData.c[0]),  // Last trade closed price
          volume24h: parseFloat(tickerData.v[1]), // 24h volume
          bid: parseFloat(orderBook.bids[0][0]),
          ask: parseFloat(orderBook.asks[0][0]),
          timestamp: timestamp
        });

        // Add a small delay to avoid rate limits
        if (i < intervals) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      return snapshots;
    } catch (error) {
      console.error(`Error fetching Kraken price time series for ${pair}:`, error);
      throw error;
    }
  }

  async fetchOrderBookTimeSeries(
    symbol: string,
    quote: string,
    depth: number,
    options: TimeSeriesOptions
  ): Promise<OrderBookSnapshot[]> {
    const pair = this.getKrakenSymbol(symbol, quote);
    const snapshots: OrderBookSnapshot[] = [];
    
    try {
      // Calculate number of intervals
      const totalTime = options.endTime.getTime() - options.startTime.getTime();
      const intervals = Math.floor(totalTime / options.interval);

      console.log(`Fetching ${intervals + 1} order book snapshots for ${pair}`);

      // Fetch data for each interval
      for (let i = 0; i <= intervals; i++) {
        const timestamp = new Date(options.startTime.getTime() + (i * options.interval));
        
        const response = await this.makeRequest('/public/Depth', { pair, count: depth });
        if (response.error.length > 0) {
          throw new Error(`Kraken API error: ${response.error.join(', ')}`);
        }

        const orderBook = response.result[Object.keys(response.result)[0]];

        snapshots.push({
          lastUpdateId: Date.now().toString(), // Kraken doesn't provide an update ID
          timestamp: timestamp,
          bids: orderBook.bids.map(([price, quantity, _timestamp]: [string, string, number]) => [
            parseFloat(price),
            parseFloat(quantity)
          ]),
          asks: orderBook.asks.map(([price, quantity, _timestamp]: [string, string, number]) => [
            parseFloat(price),
            parseFloat(quantity)
          ])
        });

        // Add a small delay to avoid rate limits
        if (i < intervals) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      return snapshots;
    } catch (error) {
      console.error(`Error fetching Kraken order book time series for ${pair}:`, error);
      throw error;
    }
  }
} 