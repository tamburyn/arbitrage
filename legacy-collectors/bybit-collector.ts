import { RestClientV5 } from 'bybit-api';
import { BaseCollector, ExchangeConfig, PriceSnapshot, OrderBookSnapshot, TimeSeriesOptions } from './base-collector';

export class BybitCollector implements BaseCollector {
  private restClient!: RestClientV5;
  private apiKey: string | null | undefined = null;
  private secretKey: string | null | undefined = null;
  private fallbackEndpoints = [
    'https://api.bybit.com',
    'https://api.bybit.us',
    'https://api.bybit.info',
    'https://api-testnet.bybit.com',
    'https://api.bytick.com'
  ];
  private currentEndpointIndex = 0;

  async initialize(config: ExchangeConfig): Promise<void> {
    this.apiKey = config.apiKey;
    this.secretKey = config.secretKey;
    await this.initializeWithEndpoint();
  }

  private async initializeWithEndpoint(): Promise<void> {
    const endpoint = this.fallbackEndpoints[this.currentEndpointIndex];
    console.log(`Initializing Bybit client with endpoint: ${endpoint}`);
    
    if (!this.apiKey || !this.secretKey) {
      throw new Error('API credentials not initialized');
    }

    this.restClient = new RestClientV5({
      key: this.apiKey,
      secret: this.secretKey,
      testnet: this.fallbackEndpoints[this.currentEndpointIndex].includes('testnet'),
      baseUrl: endpoint,
      enable_time_sync: true,
      recv_window: 60000,
      strict_param_validation: false,
      encodeSerialisedValues: true
    });
  }

  private async handleRequestWithFallback<T>(operation: () => Promise<T>): Promise<T> {
    try {
      return await operation();
    } catch (error: any) {
      console.log(`Bybit request failed with error:`, error);
      
      const errorCode = error?.code || error?.response?.status;
      const isBlockedError = errorCode === 403 || 
                            error?.message?.includes('ECONNREFUSED') ||
                            error?.message?.includes('blocked') ||
                            error?.message?.includes('Forbidden');
      
      if (isBlockedError && this.currentEndpointIndex < this.fallbackEndpoints.length - 1) {
        console.log(`Endpoint ${this.fallbackEndpoints[this.currentEndpointIndex]} failed with code ${errorCode}, trying next endpoint...`);
        this.currentEndpointIndex++;
        await this.initializeWithEndpoint();
        return await operation();
      }

      if (isBlockedError) {
        throw new Error(`All Bybit endpoints blocked. Last error: ${error?.message || 'Unknown error'}`);
      }
      throw error;
    }
  }

  async fetchPrice(symbol: string, quote: string): Promise<PriceSnapshot> {
    const pair = `${symbol}${quote}`;
    
    return await this.handleRequestWithFallback(async () => {
      const [tickerResponse, orderBookResponse] = await Promise.all([
        this.restClient.getTickers({ category: 'spot', symbol: pair }),
        this.restClient.getOrderbook({ category: 'spot', symbol: pair, limit: 1 })
      ]);

      if (tickerResponse.retCode !== 0 || orderBookResponse.retCode !== 0) {
        throw new Error('Failed to fetch ByBit data');
      }

      const ticker = tickerResponse.result.list[0];
      const orderbook = orderBookResponse.result;

      return {
        price: parseFloat(ticker.lastPrice),
        volume24h: parseFloat(ticker.volume24h),
        bid: parseFloat(orderbook.b[0][0]),
        ask: parseFloat(orderbook.a[0][0]),
        timestamp: new Date()
      };
    });
  }

  async fetchPrices(symbols: string[], quote: string): Promise<Map<string, PriceSnapshot>> {
    return await this.handleRequestWithFallback(async () => {
      const result = new Map<string, PriceSnapshot>();
      
      try {
        const { result: { list: tickers } } = await this.restClient.getTickers({ 
          category: 'spot' 
        });

        for (const symbol of symbols) {
          const pair = `${symbol}${quote}`;
          const ticker = tickers.find(t => t.symbol === pair);
          
          if (ticker) {
            const { result: orderbook } = await this.restClient.getOrderbook({ 
              category: 'spot', 
              symbol: pair,
              limit: 1
            });

            result.set(symbol, {
              price: parseFloat(ticker.lastPrice),
              volume24h: parseFloat(ticker.volume24h),
              bid: parseFloat(orderbook.b[0][0]),
              ask: parseFloat(orderbook.a[0][0]),
              timestamp: new Date()
            });
          }
        }
      } catch (error) {
        console.error('Error fetching ByBit prices:', error);
      }

      return result;
    });
  }

  async fetchOrderBook(symbol: string, quote: string, depth: number = 20): Promise<OrderBookSnapshot> {
    const pair = `${symbol}${quote}`;
    
    return await this.handleRequestWithFallback(async () => {
      const { result: orderbook } = await this.restClient.getOrderbook({ 
        category: 'spot',
        symbol: pair,
        limit: depth
      });

      return {
        lastUpdateId: orderbook.ts.toString(),
        timestamp: new Date(),
        bids: orderbook.b.map(([price, quantity]) => [parseFloat(price), parseFloat(quantity)]),
        asks: orderbook.a.map(([price, quantity]) => [parseFloat(price), parseFloat(quantity)])
      };
    });
  }

  async cleanup(): Promise<void> {
    // Nothing to clean up for REST client
  }

  // Remove WebSocket-related methods as they're not needed for historical data
  async subscribeToPriceUpdates(): Promise<void> {
    // Not implemented for historical data collection
  }

  async subscribeToOrderBookUpdates(): Promise<void> {
    // Not implemented for historical data collection
  }

  async fetchPriceTimeSeries(
    symbol: string,
    quote: string,
    options: TimeSeriesOptions
  ): Promise<PriceSnapshot[]> {
    const pair = `${symbol}${quote}`;
    
    return await this.handleRequestWithFallback(async () => {
      const snapshots: PriceSnapshot[] = [];
      
      try {
        // Just get current data
        const [tickerResponse, orderBookResponse] = await Promise.all([
          this.restClient.getTickers({ category: 'spot', symbol: pair }),
          this.restClient.getOrderbook({ category: 'spot', symbol: pair, limit: 1 })
        ]);

        if (tickerResponse.retCode !== 0 || orderBookResponse.retCode !== 0) {
          console.error(`Failed to fetch ByBit data for ${pair}`);
          return [];
        }

        if (!tickerResponse.result.list.length) {
          console.error(`No ticker data found for ${pair}`);
          return [];
        }

        const ticker = tickerResponse.result.list[0];
        const orderbook = orderBookResponse.result;

        snapshots.push({
          price: parseFloat(ticker.lastPrice),
          volume24h: parseFloat(ticker.volume24h),
          bid: parseFloat(orderbook.b[0][0]),
          ask: parseFloat(orderbook.a[0][0]),
          timestamp: options.endTime
        });

        return snapshots;
      } catch (error) {
        console.error(`Error in Bybit fetchPriceTimeSeries for ${pair}:`, error);
        return [];
      }
    });
  }

  async fetchOrderBookTimeSeries(
    symbol: string,
    quote: string,
    depth: number,
    options: TimeSeriesOptions
  ): Promise<OrderBookSnapshot[]> {
    const pair = `${symbol}${quote}`;
    
    return await this.handleRequestWithFallback(async () => {
      const snapshots: OrderBookSnapshot[] = [];
      
      try {
        // Just get current snapshot
        const orderBookResponse = await this.restClient.getOrderbook({ 
          category: 'spot',
          symbol: pair,
          limit: depth
        });

        if (orderBookResponse.retCode !== 0) {
          console.error(`Failed to fetch Bybit order book for ${pair}`);
          return [];
        }

        const orderbook = orderBookResponse.result;

        snapshots.push({
          lastUpdateId: Date.now().toString(),
          timestamp: options.endTime,
          bids: orderbook.b.map(([price, quantity]) => [
            parseFloat(price),
            parseFloat(quantity)
          ]),
          asks: orderbook.a.map(([price, quantity]) => [
            parseFloat(price),
            parseFloat(quantity)
          ])
        });

        return snapshots;
      } catch (error) {
        console.error(`Error in Bybit fetchOrderBookTimeSeries for ${pair}:`, error);
        return [];
      }
    });
  }
} 