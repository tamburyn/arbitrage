import { BaseCollector, ExchangeConfig, PriceSnapshot, OrderBookSnapshot, TimeSeriesOptions } from './base-collector';
import axios from 'axios';

interface ZondaStatsResponse {
  status: string;
  items: {
    [key: string]: {
      m: string;    // Market code
      h: string;    // High
      l: string;    // Low
      v: string;    // Volume
      r24h: string; // Last rate (current price)
    };
  };
}

interface ZondaOrderBookResponse {
  status: string;
  buy: Array<{
    ra: string;  // Rate of the order
    ca: string;  // Current amount of cryptocurrency in the order
    sa: string;  // Starting amount of cryptocurrency in the order
    pa: string;  // Amount of cryptocurrency before the last change
    co: number;  // Amount of orders in the position at specific rate
  }>;
  sell: Array<{
    ra: string;  // Rate of the order
    ca: string;  // Current amount of cryptocurrency in the order
    sa: string;  // Starting amount of cryptocurrency in the order
    pa: string;  // Amount of cryptocurrency before the last change
    co: number;  // Amount of orders in the position at specific rate
  }>;
  timestamp: string;  // Time of execution on server
  seqNo: number;     // Sequence number for keeping order of received data
}

interface ZondaTickerResponse {
  status: string;
  items: {
    [key: string]: {
      market: {
        code: string;
        first: string;
        second: string;
      };
      rate: string;
      stats: {
        v: string;  // volume
        r24h: string;  // 24h change
      };
    };
  };
}

interface ZondaMarketResponse {
  status: string;
  items: Array<{
    market: {
      code: string;
      first: string;
      second: string;
    };
  }>;
}

export class ZondaCollector implements BaseCollector {
  private baseUrl: string;
  private tradingUrl: string;
  private availableMarkets: Set<string>;
  private plnToUsdtRate: number = 0.252; // Default fallback rate
  private lastRateUpdateTime: number = 0;
  private readonly RATE_UPDATE_INTERVAL = 3600000; // Update rate every hour (in milliseconds)

  constructor() {
    this.baseUrl = 'https://api.zondacrypto.exchange/rest';
    this.tradingUrl = `${this.baseUrl}/trading`;
    this.availableMarkets = new Set();
  }

  private async safeApiCall<T>(endpoint: string, params: Record<string, string> = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const queryString = new URLSearchParams(params).toString();
    const fullUrl = queryString ? `${url}?${queryString}` : url;

    try {
      const response = await axios.get<T>(fullUrl, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 404 || error.response?.status === 403) {
          // Try alternative domains if the main one fails
          const alternativeDomains = [
            'https://api.zondaglobal.com/rest',
            'https://api.zonda.exchange/rest'
          ];

          for (const domain of alternativeDomains) {
            try {
              const altUrl = fullUrl.replace(this.baseUrl, domain);
              const response = await axios.get<T>(altUrl, {
                headers: {
                  'Content-Type': 'application/json'
                }
              });
              // If successful, update the base URL
              this.baseUrl = domain;
              this.tradingUrl = `${domain}/trading`;
              return response.data;
            } catch (altError) {
              continue;
            }
          }
        }
        throw new Error(`Zonda API error: ${error.response?.data ? JSON.stringify(error.response.data) : error.message}`);
      }
      throw error;
    }
  }

  async initialize(_config: ExchangeConfig): Promise<void> {
    try {
      // Get available markets from stats endpoint
      const data = await this.safeApiCall<ZondaStatsResponse>('/trading/stats');
      
      if (data.status === 'Ok') {
        this.availableMarkets = new Set(
          Object.keys(data.items)
        );
        console.log('Available Zonda markets:', Array.from(this.availableMarkets).sort());

        // Try to get PLN-USD rate from available markets
        await this.updatePlnUsdRate();
      } else {
        throw new Error(`Failed to fetch markets: ${JSON.stringify(data)}`);
      }
    } catch (error) {
      console.error('Error initializing Zonda markets:', error);
      throw error;
    }
  }

  private async updatePlnUsdRate(): Promise<void> {
    try {
      // Check if we need to update the rate (only update once per hour)
      const now = Date.now();
      if (now - this.lastRateUpdateTime < this.RATE_UPDATE_INTERVAL) {
        return; // Rate was updated recently, no need to update again
      }
      
      // Try multiple exchange rate APIs for reliability
      await this.tryMultipleExchangeRateApis();
      
      // If all external APIs fail, fall back to using crypto pairs for rate calculation
      if (now - this.lastRateUpdateTime >= this.RATE_UPDATE_INTERVAL) {
        await this.fallbackToCryptoPairsForRate();
      }
    } catch (error) {
      console.warn('Could not update PLN-USD rate, using current value:', this.plnToUsdtRate);
    }
  }
  
  private async tryMultipleExchangeRateApis(): Promise<void> {
    try {
      // Try ExchangeRate-API first
      const response = await axios.get('https://open.er-api.com/v6/latest/USD');
      if (response.data && response.data.rates && response.data.rates.PLN) {
        const plnRate = response.data.rates.PLN;
        if (plnRate > 0) {
          this.plnToUsdtRate = 1 / plnRate;
          this.lastRateUpdateTime = Date.now();
          console.log('Updated PLN-USD rate from ExchangeRate-API:', this.plnToUsdtRate);
          return;
        }
      }
    } catch (error) {
      console.warn('Error fetching from ExchangeRate-API, trying alternative...');
    }
    
    try {
      // Try Frankfurter API as backup
      const response = await axios.get('https://api.frankfurter.app/latest?from=USD&to=PLN');
      if (response.data && response.data.rates && response.data.rates.PLN) {
        const plnRate = response.data.rates.PLN;
        if (plnRate > 0) {
          this.plnToUsdtRate = 1 / plnRate;
          this.lastRateUpdateTime = Date.now();
          console.log('Updated PLN-USD rate from Frankfurter API:', this.plnToUsdtRate);
          return;
        }
      }
    } catch (error) {
      console.warn('Error fetching from Frankfurter API, trying alternative...');
    }
  }
  
  private async fallbackToCryptoPairsForRate(): Promise<void> {
    try {
      // Fetch USDT-PLN rate from Zonda as it's more commonly available
      const orderBookResponse = await this.safeApiCall<ZondaOrderBookResponse>('/trading/orderbook/USDT-PLN');
      
      if (orderBookResponse.status === 'Ok' && orderBookResponse.sell.length > 0) {
        // Use the first ask price as the PLN/USDT rate
        const plnUsdtRate = parseFloat(orderBookResponse.sell[0].ra);
        if (plnUsdtRate > 0) {
          this.plnToUsdtRate = 1 / plnUsdtRate;
          this.lastRateUpdateTime = Date.now();
          console.log('Updated PLN-USD rate from USDT-PLN pair:', this.plnToUsdtRate);
          return;
        }
      }

      // Fallback to fetching BTC pairs if USDT-PLN is not available
      const btcPlnBook = await this.safeApiCall<ZondaOrderBookResponse>('/trading/orderbook/BTC-PLN');
      const btcUsdBook = await this.safeApiCall<ZondaOrderBookResponse>('/trading/orderbook/BTC-USD');
      
      if (btcPlnBook.status === 'Ok' && btcUsdBook.status === 'Ok' &&
          btcPlnBook.sell.length > 0 && btcUsdBook.sell.length > 0) {
        const btcPlnPrice = parseFloat(btcPlnBook.sell[0].ra);
        const btcUsdPrice = parseFloat(btcUsdBook.sell[0].ra);
        if (btcPlnPrice > 0 && btcUsdPrice > 0) {
          this.plnToUsdtRate = btcUsdPrice / btcPlnPrice;
          this.lastRateUpdateTime = Date.now();
          console.log('Updated PLN-USD rate (via BTC):', this.plnToUsdtRate);
          return;
        }
      }
    } catch (error) {
      console.warn('Could not update PLN-USD rate from crypto pairs, using default:', this.plnToUsdtRate);
    }
  }

  private getSymbolPair(symbol: string, quote: string): string {
    console.log(`Finding pair for ${symbol}/${quote}`);
    
    // For consistency in conversion, prioritize PLN pairs and convert ourselves
    const plnPair = `${symbol}-PLN`;
    if (this.availableMarkets.has(plnPair)) {
      console.log(`Using PLN pair for consistent conversion: ${plnPair}`);
      return plnPair;
    }
    
    // If PLN pair is not available, try direct pair
    const directPair = `${symbol}-${quote}`;
    if (this.availableMarkets.has(directPair)) {
      console.log(`Found direct pair: ${directPair}`);
      return directPair;
    }
    
    // Try USD pair next
    const usdPair = `${symbol}-USD`;
    if (this.availableMarkets.has(usdPair)) {
      console.log(`Found USD pair: ${usdPair}`);
      return usdPair;
    }

    // Try USDT pair next
    const usdtPair = `${symbol}-USDT`;
    if (this.availableMarkets.has(usdtPair)) {
      console.log(`Found USDT pair: ${usdtPair}`);
      return usdtPair;
    }
    
    // Try USDC pair next (often equivalent to USDT)
    const usdcPair = `${symbol}-USDC`;
    if (this.availableMarkets.has(usdcPair)) {
      console.log(`Found USDC pair: ${usdcPair}`);
      return usdcPair;
    }

    throw new Error(`No suitable market pair found for ${symbol}`);
  }

  private convertToUsd(value: number, quoteCurrency: string): number {
    // Log the conversion for debugging
    console.log(`Converting ${value} ${quoteCurrency} to USDT with rate ${this.plnToUsdtRate}`);
    
    if (quoteCurrency === 'USDT' || quoteCurrency === 'USDC') {
      // USDT and USDC are kept as is
      return value;
    } else if (quoteCurrency === 'USD') {
      // Treat USD as equivalent to USDT for consistency
      return value;
    } else if (quoteCurrency === 'PLN') {
      // Apply PLN to USDT conversion without rounding to maintain precision
      const converted = value * this.plnToUsdtRate;
      console.log(`Converted ${value} PLN to ${converted} USDT`);
      return converted;
    }
    
    // For any other currency, log a warning and return as is
    console.warn(`Unhandled currency conversion: ${quoteCurrency} to USDT`);
    return value;
  }

  async fetchPrice(symbol: string, quote: string): Promise<PriceSnapshot> {
    try {
      // Update PLN/USD rate before fetching prices
      await this.updatePlnUsdRate();
      
      const pair = this.getSymbolPair(symbol, quote);
      const quoteCurrency = pair.split('-')[1];
      
      // Log the pair and quote currency for debugging
      console.log(`Fetching price for ${pair} (Quote: ${quoteCurrency})`);
      
      const [statsResponse, orderBookResponse] = await Promise.all([
        this.safeApiCall<ZondaStatsResponse>('/trading/stats'),
        this.safeApiCall<ZondaOrderBookResponse>(`/trading/orderbook/${pair}`)
      ]);

      if (statsResponse.status === 'Fail') {
        throw new Error(`Zonda API error: ${JSON.stringify(statsResponse)}`);
      }

      if (orderBookResponse.status === 'Fail') {
        throw new Error(`Zonda API error: ${JSON.stringify(orderBookResponse)}`);
      }

      const stats = statsResponse.items[pair];
      if (!stats) {
        throw new Error(`Market ${pair} not available in stats data`);
      }

      const orderBook = orderBookResponse;
      if (!orderBook.buy.length || !orderBook.sell.length) {
        throw new Error(`No order book data found for ${pair}`);
      }

      const price = parseFloat(stats.r24h);
      const volume = parseFloat(stats.v);
      const bid = parseFloat(orderBook.buy[0].ra);
      const ask = parseFloat(orderBook.sell[0].ra);

      // Log raw values for debugging
      console.log(`Raw ${quoteCurrency} values:`, { price, bid, ask, volume });
      
      // Convert all values to USD if necessary
      const convertedPrice = this.convertToUsd(price, quoteCurrency);
      const convertedBid = this.convertToUsd(bid, quoteCurrency);
      const convertedAsk = this.convertToUsd(ask, quoteCurrency);
      const convertedVolume = this.convertToUsd(volume * price, quoteCurrency);
      
      // Log converted values for debugging
      console.log(`Converted USD values:`, { 
        price: convertedPrice, 
        bid: convertedBid, 
        ask: convertedAsk, 
        volume: convertedVolume 
      });

      return {
        price: convertedPrice,
        volume24h: convertedVolume,
        bid: convertedBid,
        ask: convertedAsk,
        timestamp: new Date()
      };
    } catch (error) {
      console.error(`Error fetching Zonda price for ${symbol}:`, error);
      throw error;
    }
  }

  async fetchPrices(symbols: string[], quote: string): Promise<Map<string, PriceSnapshot>> {
    const result = new Map<string, PriceSnapshot>();
    
    try {
      // Get all stats at once
      const statsResponse = await this.safeApiCall<ZondaStatsResponse>('/trading/stats');

      if (statsResponse.status === 'Fail') {
        throw new Error('Failed to fetch stats');
      }

      // Process each symbol
      for (const symbol of symbols) {
        const pair = this.getSymbolPair(symbol, quote);
        try {
          const stats = statsResponse.items[pair];
          if (stats) {
            const orderBookResponse = await this.safeApiCall<ZondaOrderBookResponse>(`/trading/orderbook/${pair}`);

            if (orderBookResponse.status !== 'Fail' && 
                orderBookResponse.buy.length > 0 && 
                orderBookResponse.sell.length > 0) {
              const orderBook = orderBookResponse;
              result.set(symbol, {
                price: this.convertToUsd(parseFloat(stats.r24h), quote),
                volume24h: parseFloat(stats.v),
                bid: this.convertToUsd(parseFloat(orderBook.buy[0].ra), quote),
                ask: this.convertToUsd(parseFloat(orderBook.sell[0].ra), quote),
                timestamp: new Date()
              });
            }
          }
        } catch (error) {
          console.error(`Error fetching data for ${pair}:`, error);
        }
      }
    } catch (error) {
      console.error('Error fetching Zonda prices:', error);
    }

    return result;
  }

  async fetchOrderBook(symbol: string, quote: string, depth: number = 20): Promise<OrderBookSnapshot> {
    const pair = this.getSymbolPair(symbol, quote);
    
    try {
      const orderBook = await this.safeApiCall<ZondaOrderBookResponse>(`/trading/orderbook/${pair}`);

      if (orderBook.status === 'Fail') {
        throw new Error(`Invalid order book data received for ${pair}`);
      }

      return {
        lastUpdateId: orderBook.seqNo.toString(),
        timestamp: new Date(parseInt(orderBook.timestamp)),
        bids: orderBook.buy.slice(0, depth).map((bid: { ra: string; ca: string }) => [
          this.convertToUsd(parseFloat(bid.ra), quote),    // price
          parseFloat(bid.ca)     // quantity (current amount)
        ]),
        asks: orderBook.sell.slice(0, depth).map((ask: { ra: string; ca: string }) => [
          this.convertToUsd(parseFloat(ask.ra), quote),    // price
          parseFloat(ask.ca)     // quantity (current amount)
        ])
      };
    } catch (error) {
      console.error(`Error fetching Zonda order book for ${pair}:`, error);
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
    const snapshots: PriceSnapshot[] = [];
    
    try {
      // Update PLN/USD rate before fetching prices
      await this.updatePlnUsdRate();
      
      const pair = this.getSymbolPair(symbol, quote);
      const quoteCurrency = pair.split('-')[1];
      
      // Calculate number of intervals
      const totalTime = options.endTime.getTime() - options.startTime.getTime();
      const intervals = Math.floor(totalTime / options.interval);

      console.log(`Fetching ${intervals + 1} price points for ${pair} (Quote: ${quoteCurrency})`);

      // Fetch data for each interval
      for (let i = 0; i <= intervals; i++) {
        const timestamp = new Date(options.startTime.getTime() + (i * options.interval));
        
        const [statsResponse, orderBookResponse] = await Promise.all([
          this.safeApiCall<ZondaStatsResponse>('/trading/stats'),
          this.safeApiCall<ZondaOrderBookResponse>(`/trading/orderbook/${pair}`)
        ]);

        if (statsResponse.status === 'Fail') {
          throw new Error(`Zonda API error: ${JSON.stringify(statsResponse)}`);
        }

        if (orderBookResponse.status === 'Fail') {
          throw new Error(`Zonda API error: ${JSON.stringify(orderBookResponse)}`);
        }

        const stats = statsResponse.items[pair];
        if (!stats) {
          throw new Error(`Market ${pair} not available in stats data`);
        }

        const orderBook = orderBookResponse;
        if (!orderBook.buy.length || !orderBook.sell.length) {
          throw new Error(`No order book data found for ${pair}`);
        }

        const price = parseFloat(stats.r24h);
        const volume = parseFloat(stats.v);
        const bid = parseFloat(orderBook.buy[0].ra);
        const ask = parseFloat(orderBook.sell[0].ra);

        // Convert all values to USD if necessary
        const convertedPrice = this.convertToUsd(price, quoteCurrency);
        const convertedBid = this.convertToUsd(bid, quoteCurrency);
        const convertedAsk = this.convertToUsd(ask, quoteCurrency);
        const convertedVolume = this.convertToUsd(volume * price, quoteCurrency);

        snapshots.push({
          price: convertedPrice,
          volume24h: convertedVolume,
          bid: convertedBid,
          ask: convertedAsk,
          timestamp: timestamp
        });

        // Add a small delay to avoid rate limits
        if (i < intervals) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      return snapshots;
    } catch (error) {
      console.error(`Error fetching Zonda price time series for ${symbol}-${quote}:`, error);
      throw error;
    }
  }

  async fetchOrderBookTimeSeries(
    symbol: string,
    quote: string,
    depth: number,
    options: TimeSeriesOptions
  ): Promise<OrderBookSnapshot[]> {
    const snapshots: OrderBookSnapshot[] = [];
    const pair = this.getSymbolPair(symbol, quote);
    const quoteCurrency = pair.split('-')[1];
    
    try {
      // Update PLN/USD rate before fetching order books
      await this.updatePlnUsdRate();
      
      // Calculate number of intervals
      const totalTime = options.endTime.getTime() - options.startTime.getTime();
      const intervals = Math.floor(totalTime / options.interval);

      console.log(`Fetching ${intervals + 1} order book snapshots for ${pair}`);

      // Fetch data for each interval
      for (let i = 0; i <= intervals; i++) {
        const timestamp = new Date(options.startTime.getTime() + (i * options.interval));
        
        const orderBook = await this.safeApiCall<ZondaOrderBookResponse>(`/trading/orderbook/${pair}`);

        if (orderBook.status === 'Fail') {
          throw new Error(`Invalid order book data received for ${pair}`);
        }

        snapshots.push({
          lastUpdateId: orderBook.seqNo.toString(),
          timestamp: timestamp,
          bids: orderBook.buy.slice(0, depth).map((bid: { ra: string; ca: string }) => [
            this.convertToUsd(parseFloat(bid.ra), quoteCurrency),    // price
            parseFloat(bid.ca)     // quantity (current amount)
          ]),
          asks: orderBook.sell.slice(0, depth).map((ask: { ra: string; ca: string }) => [
            this.convertToUsd(parseFloat(ask.ra), quoteCurrency),    // price
            parseFloat(ask.ca)     // quantity (current amount)
          ])
        });

        // Add a small delay to avoid rate limits
        if (i < intervals) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      return snapshots;
    } catch (error) {
      console.error(`Error fetching Zonda order book time series for ${pair}:`, error);
      throw error;
    }
  }
} 