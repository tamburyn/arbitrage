import dotenv from 'dotenv';
import path from 'path';
import { supabase } from '../database/supabase';
import { BinanceCollector } from '../collectors/binance-collector';
import { BybitCollector } from '../collectors/bybit-collector';
import { KrakenCollector } from '../collectors/kraken-collector';
import { OKXCollector } from '../collectors/okx-collector';
import { ZondaCollector } from '../collectors/zonda-collector';
import { BaseCollector, TimeSeriesOptions } from '../collectors/base-collector';
import { MarketPair, Market } from '../models/types';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env.local') });

interface MarketPairWithMarket extends Omit<MarketPair, 'markets'> {
  markets: Market;
}

export default class HistoricalDataCollector {
  private collectors: Map<string, BaseCollector>;
  private marketPairs: MarketPairWithMarket[];
  private exchangeErrors: Map<string, string>;
  private readonly INTERVAL = 60000; // 1 minute in milliseconds, change to 30000 for 30s
  private readonly LOOKBACK_PERIOD = 5 * 60 * 1000; // 5 minutes in milliseconds

  constructor() {
    this.collectors = new Map();
    this.marketPairs = [];
    this.exchangeErrors = new Map();
  }

  async initialize(): Promise<void> {
    console.log('Initializing collectors...');

    try {
      // Initialize collectors with error handling for each exchange
      await this.initializeExchange('Zonda', async () => {
        const collector = new ZondaCollector();
        await collector.initialize({});
        return collector;
      });

      if (process.env.BINANCE_API_KEY && process.env.BINANCE_SECRET_KEY) {
        await this.initializeExchange('Binance', async () => {
          const collector = new BinanceCollector();
          await collector.initialize({
            apiKey: process.env.BINANCE_API_KEY!,
            secretKey: process.env.BINANCE_SECRET_KEY!
          });
          return collector;
        });
      }

      if (process.env.BYBIT_API_KEY && process.env.BYBIT_SECRET_KEY) {
        await this.initializeExchange('Bybit', async () => {
          const collector = new BybitCollector();
          await collector.initialize({
            apiKey: process.env.BYBIT_API_KEY!,
            secretKey: process.env.BYBIT_SECRET_KEY!
          });
          return collector;
        });
      }

      if (process.env.KRAKEN_API_KEY && process.env.KRAKEN_SECRET_KEY) {
        await this.initializeExchange('Kraken', async () => {
          const collector = new KrakenCollector();
          await collector.initialize({
            apiKey: process.env.KRAKEN_API_KEY!,
            secretKey: process.env.KRAKEN_SECRET_KEY!
          });
          return collector;
        });
      }

      if (process.env.OKX_API_KEY && process.env.OKX_SECRET_KEY && process.env.OKX_PASSPHRASE) {
        await this.initializeExchange('OKX', async () => {
          const collector = new OKXCollector();
          await collector.initialize({
            apiKey: process.env.OKX_API_KEY!,
            secretKey: process.env.OKX_SECRET_KEY!,
            passphrase: process.env.OKX_PASSPHRASE!
          });
          return collector;
        });
      }

      console.log('\nLoading market pairs from database...');
      // Load market pairs from database
      const { data, error } = await supabase
        .from('market_pairs')
        .select(`
          id,
          market_id,
          coin_id,
          base_currency,
          quote_currency,
          is_active,
          markets (
            id,
            name,
            is_active,
            created_at,
            updated_at
          )
        `)
        .eq('is_active', true);

      if (error) throw error;

      if (!data || data.length === 0) {
        throw new Error('No active market pairs found in database');
      }

      console.log(`Found ${data.length} active market pairs in database`);

      // Transform and filter market pairs based on available collectors
      const availableCollectors = Array.from(this.collectors.keys());
      console.log(`Available collectors: ${availableCollectors.join(', ')}`);

      this.marketPairs = data
        .map(pair => {
          const market = Array.isArray(pair.markets) ? pair.markets[0] : pair.markets;
          return {
            id: pair.id,
            market_id: pair.market_id,
            coin_id: pair.coin_id,
            base_currency: pair.base_currency,
            quote_currency: pair.quote_currency,
            is_active: pair.is_active,
            markets: market
          };
        })
        .filter(pair => {
          const hasCollector = this.collectors.has(pair.markets.name);
          if (!hasCollector) {
            console.log(`Skipping ${pair.base_currency} on ${pair.markets.name} - collector not available`);
          }
          return hasCollector && pair.markets.is_active;
        });

      console.log('\nInitialization Summary:');
      console.log(`- Total market pairs found: ${data.length}`);
      console.log(`- Active market pairs after filtering: ${this.marketPairs.length}`);
      console.log(`- Successfully initialized exchanges: ${availableCollectors.join(', ')}`);

      if (this.exchangeErrors.size > 0) {
        console.log('\nExchange initialization errors:');
        this.exchangeErrors.forEach((error, exchange) => {
          console.log(`- ${exchange}: ${error}`);
        });
      }

      if (this.marketPairs.length === 0) {
        throw new Error('No valid market pairs to process after filtering');
      }
    } catch (error) {
      console.error('Error during initialization:', error);
      throw error;
    }
  }

  private async initializeExchange(
    name: string,
    initFn: () => Promise<BaseCollector>
  ): Promise<void> {
    try {
      const collector = await initFn();
      this.collectors.set(name, collector);
      console.log(`✓ Initialized ${name} collector`);
    } catch (error: any) {
      const errorMessage = error?.message || 'Unknown error';
      console.error(`✗ Failed to initialize ${name} collector:`, errorMessage);
      this.exchangeErrors.set(name, errorMessage);
    }
  }

  async collectData(): Promise<void> {
    console.log('\nStarting time series data collection...');
    const startTime = Date.now();
    let success = 0;
    let failed = 0;
    let skipped = 0;

    // Calculate time range for this collection
    const endTime = new Date();
    const startTimeData = new Date(endTime.getTime() - this.LOOKBACK_PERIOD);

    const timeSeriesOptions: TimeSeriesOptions = {
      startTime: startTimeData,
      endTime: endTime,
      interval: this.INTERVAL
    };

    console.log(`Collecting data from ${startTimeData.toISOString()} to ${endTime.toISOString()}`);
    console.log(`Interval: ${this.INTERVAL / 1000} seconds`);

    // Group pairs by exchange for more efficient processing
    const pairsByExchange = this.marketPairs.reduce((acc, pair) => {
      const exchange = pair.markets.name;
      if (!acc[exchange]) acc[exchange] = [];
      acc[exchange].push(pair);
      return acc;
    }, {} as Record<string, MarketPairWithMarket[]>);

    // Process all exchanges
    for (const [exchangeName, pairs] of Object.entries(pairsByExchange)) {
      console.log(`\nProcessing exchange: ${exchangeName} (${pairs.length} pairs)`);
      const collector = this.collectors.get(exchangeName);
      
      if (!collector) {
        console.log(`Skipping ${exchangeName} - collector not available`);
        skipped += pairs.length;
        continue;
      }

      // Process all pairs for this exchange
      for (const pair of pairs) {
        process.stdout.write(`\nProcessing ${pair.base_currency}/${pair.quote_currency}... `);
        
        try {
          console.log('Fetching time series data...');
          const [priceData, orderBookData] = await Promise.all([
            collector.fetchPriceTimeSeries(
              pair.base_currency,
              pair.quote_currency,
              timeSeriesOptions
            ),
            collector.fetchOrderBookTimeSeries(
              pair.base_currency,
              pair.quote_currency,
              5, // depth of 5 for order book
              timeSeriesOptions
            )
          ]);

          // Store price data
          console.log(`Storing ${priceData.length} price data points...`);
          const { error: priceError } = await supabase
            .from('price_data')
            .insert(priceData.map(price => ({
              market_pair_id: pair.id,
              timestamp: price.timestamp.toISOString(),
              price: price.price,
              volume_24h: price.volume24h,
              bid: price.bid,
              ask: price.ask
            })));

          if (priceError) throw priceError;

          // Store order books
          console.log(`Storing ${orderBookData.length} order book snapshots...`);
          const { data: orderBookEntries, error: orderBookError } = await supabase
            .from('order_books')
            .insert(orderBookData.map(orderBook => ({
              market_pair_id: pair.id,
              timestamp: orderBook.timestamp.toISOString(),
              last_update_id: orderBook.lastUpdateId
            })))
            .select();

          if (orderBookError || !orderBookEntries) throw orderBookError || new Error('No order book data returned');

          // Store order book entries
          const { error: entriesError } = await supabase
            .from('order_book_entries')
            .insert(orderBookData.flatMap((orderBook, index) => {
              const orderBookId = orderBookEntries[index].id;
              return [
                ...orderBook.bids.map((bid, position) => ({
                  order_book_id: orderBookId,
                  side: 'bid' as const,
                  price: bid[0],
                  quantity: bid[1],
                  total: bid[0] * bid[1],
                  position
                })),
                ...orderBook.asks.map((ask, position) => ({
                  order_book_id: orderBookId,
                  side: 'ask' as const,
                  price: ask[0],
                  quantity: ask[1],
                  total: ask[0] * ask[1],
                  position
                }))
              ];
            }));

          if (entriesError) throw entriesError;

          process.stdout.write('✓\n');
          success++;
        } catch (error: any) {
          process.stdout.write('✗\n');
          console.error(`Failed to process ${pair.base_currency}/${pair.quote_currency}: ${error.message}`);
          failed++;
        }
      }
    }

    const totalTime = (Date.now() - startTime) / 1000;
    console.log('\nCollection Summary:');
    console.log(`✓ Successfully processed: ${success} pairs`);
    console.log(`✗ Failed to process: ${failed} pairs`);
    console.log(`- Skipped: ${skipped} pairs`);
    console.log(`Total time: ${totalTime.toFixed(1)}s`);
  }

  async cleanup(): Promise<void> {
    for (const [name, collector] of this.collectors.entries()) {
      try {
        await collector.cleanup();
        console.log(`✓ Cleaned up ${name} collector`);
      } catch (error) {
        console.error(`✗ Error cleaning up ${name} collector:`, error);
      }
    }
  }

  filterPairsByExchange(exchangeName: string): void {
    console.log(`Filtering pairs for exchange: ${exchangeName}`);
    const originalCount = this.marketPairs.length;
    
    this.marketPairs = this.marketPairs.filter(pair => 
      pair.markets.name.toLowerCase() === exchangeName.toLowerCase()
    );
    
    console.log(`Filtered ${originalCount} pairs down to ${this.marketPairs.length} pairs for ${exchangeName}`);
  }
}

async function main() {
  console.log('Starting historical data collection script');
  console.log('Environment:', process.env.NODE_ENV || 'development');
  console.log('Timestamp:', new Date().toISOString());

  try {
    // Test Supabase connection first
    console.log('\nTesting Supabase connection...');
    const { data: testData, error: testError } = await supabase
      .from('market_pairs')
      .select('count')
      .limit(1);

    if (testError) {
      throw new Error(`Supabase connection test failed: ${testError.message}`);
    }
    console.log('✓ Supabase connection successful');

    const collector = new HistoricalDataCollector();
    
    console.log('\nInitializing collector...');
    await collector.initialize();
    
    console.log('\nStarting data collection...');
    await collector.collectData();
    
    console.log('\nCleaning up...');
    await collector.cleanup();
    
    console.log('\nData collection completed successfully!');
    
    // If running in Vercel, exit explicitly
    if (process.env.VERCEL) {
      console.log('Exiting Vercel environment...');
      process.exit(0);
    }
  } catch (error: any) {
    console.error('\nFatal error:', error.message);
    console.error('Stack trace:', error.stack);
    
    // If running in Vercel, exit with error
    if (process.env.VERCEL) {
      console.error('Exiting Vercel environment with error...');
      process.exit(1);
    }
    throw error;
  }
}

// Only run if this is the main module
if (require.main === module) {
  main().catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
} 